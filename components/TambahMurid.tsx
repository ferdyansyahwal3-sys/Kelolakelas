"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "./Icon";
import { pecahRupiah } from "@/lib/format";
import { kategoriTersedia } from "@/lib/paket";
import { normalisasiWa, validasiMurid, type GalatMurid, type InputMurid } from "@/lib/muridDb";

interface PaketPilih { id: string; nama: string; kategori: "anak" | "dewasa"; harga: number }
interface Props {
  paket: PaketPilih[];
  pengajar: { id: string; nama: string }[];
  hariIni: string;
  bolehUbah: boolean;
  /** Info batas, mis. "Murid aktif: 3 dari 10 (Guru Les Mulai)". null = tak terbatas. */
  batas: { aktif: number; maks: number | null; nama: string };
  tambah: (i: InputMurid) => Promise<{ ok: true; id: string } | { ok: false; galat: GalatMurid; pesan?: string }>;
}
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

export function TambahMurid({ paket, pengajar, hariIni, bolehUbah, batas, tambah }: Props) {
  const router = useRouter();
  const tersedia = kategoriTersedia(paket.map((p) => ({ kategori: p.kategori, aktif: true })));
  const [buka, setBuka] = useState(false);
  const [kategori, setKategori] = useState<"anak" | "dewasa">(tersedia[0] ?? "anak");
  const [nama, setNama] = useState("");
  const [usia, setUsia] = useState("");
  const [ortu, setOrtu] = useState("");
  const [wa, setWa] = useState("");
  const [paketId, setPaketId] = useState("");
  const [mulai, setMulai] = useState(hariIni);
  const [pengajarId, setPengajarId] = useState(pengajar[0]?.id ?? "");
  const [galat, setGalat] = useState<GalatMurid>({});
  const [pesan, setPesan] = useState("");
  const [sibuk, mulaiTransisi] = useTransition();

  const penuh = batas.maks !== null && batas.aktif >= batas.maks;
  const daftarPaket = paket.filter((p) => p.kategori === kategori);
  const bersih = (k: string) => setGalat((g) => { const { [k]: _, ...sisa } = g; return sisa; });

  function kirim() {
    setPesan("");
    const i: InputMurid = { nama, kategori, usia: usia ? Number(usia) : null, namaOrtu: ortu, noWa: normalisasiWa(wa), paketId, mulai, pengajarId: pengajarId || null };
    const g = validasiMurid(i, hariIni);
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    mulaiTransisi(async () => {
      const r = await tambah(i);
      if (r.ok) router.push(`/app/murid/${r.id}`);
      else { setGalat(r.galat); setPesan(r.pesan ?? ""); }
    });
  }

  if (!buka) {
    return (
      <>
        <button type="button" className="btn" disabled={penuh || !bolehUbah || tersedia.length === 0} onClick={() => setBuka(true)}><Icon name="users" />Tambah murid</button>
        <p className="meta" style={{ margin: 0 }}>
          {batas.maks !== null ? `Murid aktif: ${batas.aktif} dari ${batas.maks} (${batas.nama}). ` : ""}
          {tersedia.length === 0 ? "Buat paket dulu di menu Paket dan harga supaya murid bisa dipilihkan paket. " : ""}
          {penuh ? "Batas murid aktif sudah penuh: nonaktifkan murid yang selesai atau naikkan paket langganan. " : ""}
          {!bolehUbah ? "Langgananmu belum aktif, jadi data hanya bisa dilihat." : ""}
        </p>
      </>
    );
  }

  const E = ({ k }: { k: string }) => (galat[k] ? <span className="galat" role="alert">{galat[k]}</span> : null);
  return (
    <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); kirim(); }} noValidate>
      <h2 className="h2">Murid baru</h2>
      {tersedia.length > 1 && (
        <div className="seg" role="radiogroup" aria-label="Kategori murid">
          {tersedia.map((k) => <button key={k} type="button" role="radio" aria-checked={kategori === k} className={kategori === k ? "on" : ""} onClick={() => { setKategori(k); setPaketId(""); setGalat({}); }}>{k === "anak" ? "Anak" : "Dewasa"}</button>)}
        </div>
      )}
      <label className="field"><span className="label l2">{kategori === "anak" ? "Nama anak" : "Nama lengkap"}</span>
        <input value={nama} onChange={(e) => { setNama(e.target.value); bersih("nama"); }} maxLength={60} autoComplete="off" /><E k="nama" /></label>
      {kategori === "anak" && (
        <>
          <label className="field"><span className="label l2">Usia anak</span>
            <input inputMode="numeric" value={usia} onChange={(e) => { setUsia(e.target.value.replace(/\D/g, "").slice(0, 2)); bersih("usia"); }} /><E k="usia" /></label>
          <label className="field"><span className="label l2">Nama orang tua</span>
            <input value={ortu} onChange={(e) => { setOrtu(e.target.value); bersih("namaOrtu"); }} maxLength={60} /><E k="namaOrtu" /></label>
        </>
      )}
      <label className="field"><span className="label l2">{kategori === "anak" ? "WhatsApp orang tua" : "Nomor WhatsApp"}</span>
        <input inputMode="tel" value={wa} onChange={(e) => { setWa(e.target.value); bersih("noWa"); }} placeholder="08xxxxxxxxxx" maxLength={20} /><E k="noWa" /></label>
      <label className="field"><span className="label l2">Paket</span>
        <select value={paketId} onChange={(e) => { setPaketId(e.target.value); bersih("paketId"); }}>
          <option value="">Pilih paket</option>
          {daftarPaket.map((p) => <option key={p.id} value={p.id}>{p.nama} · {rp(p.harga)}</option>)}
        </select><E k="paketId" /></label>
      <label className="field"><span className="label l2">Mulai</span>
        <input type="date" value={mulai} onChange={(e) => { setMulai(e.target.value); bersih("mulai"); }} /><E k="mulai" /></label>
      {pengajar.length > 1 && (
        <label className="field"><span className="label l2">Pengajar</span>
          <select value={pengajarId} onChange={(e) => setPengajarId(e.target.value)}>{pengajar.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}</select><E k="pengajarId" /></label>
      )}
      <p className="meta" style={{ margin: 0 }}>Tagihan pertama dibuat otomatis (belum lunas, jatuh tempo 7 hari).</p>
      {pesan && <p className="galat" role="alert">{pesan}</p>}
      <div className="aksi">
        <button type="submit" className="btn" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan murid"}</button>
        <button type="button" className="btn btn-2" onClick={() => { setBuka(false); setGalat({}); setPesan(""); }}>Batal</button>
      </div>
    </form>
  );
}
