"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { kirimBukti } from "@/app/u/[slug]/bayar/actions";
import { Icon } from "./Icon";
import { pecahRupiah } from "@/lib/format";
import { BUKTI_MAKS_BYTE, formatNomor, validasiBerkas, type Rekening } from "@/lib/rekening";

interface Info { nama: string; slot: string; total: number; sudahBayar: boolean }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

export function BayarMurid({ slug, kode, server, rekening }: { slug: string; kode: string; server: Info | null; rekening: Rekening[] }) {
  const [info, setInfo] = useState<Info | null>(server);
  const [rek, setRek] = useState<Rekening[]>(rekening);
  const [pilih, setPilih] = useState(rekening[0]?.id ?? "");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState("");
  const [galat, setGalat] = useState("");
  const [selesai, setSelesai] = useState(false);
  const [tersalin, setTersalin] = useState("");
  const [sibuk, mulai] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      // Pendaftaran baru belum ada di server (belum ada database): pakai catatan di perangkat murid sendiri.
      if (!server) {
        const lokal = (JSON.parse(localStorage.getItem("kk-pendaftaran-saya") ?? "[]") as { kode: string; nama: string; slot: string; total: number }[]).find((x) => x.kode === kode);
        if (lokal) setInfo({ nama: lokal.nama, slot: lokal.slot, total: lokal.total, sudahBayar: false });
      }
      // Pratinjau untuk owner: rekening dari Pengaturan di perangkat ini.
      const d = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { rekening?: Rekening[] } | null;
      if (Array.isArray(d?.rekening) && d!.rekening!.length > 0) { setRek(d!.rekening!); setPilih(d!.rekening![0]!.id); }
    } catch {}
  }, [server, kode]);

  useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau); }, [pratinjau]);

  function pilihBerkas(f: File | null) {
    setGalat("");
    if (pratinjau) URL.revokeObjectURL(pratinjau);
    setPratinjau("");
    if (!f) { setBerkas(null); return; }
    const salah = validasiBerkas({ tipe: f.type, ukuran: f.size });
    if (salah) { setBerkas(null); setGalat(salah); if (input.current) input.current.value = ""; return; }
    setBerkas(f);
    if (f.type.startsWith("image/")) setPratinjau(URL.createObjectURL(f));
  }

  async function salin(nomor: string, id: string) {
    try { await navigator.clipboard.writeText(nomor.replace(/\s/g, "")); setTersalin(id); setTimeout(() => setTersalin(""), 2000); } catch {}
  }

  function kirim() {
    if (!berkas) { setGalat("Pilih foto atau PDF bukti transfer."); return; }
    mulai(async () => {
      const r = await kirimBukti({ kode, rekeningId: pilih, berkas: { nama: berkas.name, tipe: berkas.type, ukuran: berkas.size } });
      if (r.ok) setSelesai(true); else setGalat(r.pesan);
    });
  }

  if (!info) {
    return (
      <div className="surface kosong"><span className="circ"><Icon name="doc" /></span><h2 className="h2">Pendaftaran tidak ditemukan</h2>
        <p className="sub" style={{ margin: 0, fontSize: 13 }}>Cek kode pendaftaranmu, atau daftar dulu lewat halaman slot.</p>
        <Link href={`/u/${slug}/slot`} className="btn">Ke halaman slot</Link></div>
    );
  }
  if (info.sudahBayar || selesai) {
    return (
      <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }} role="status">
        <span className="meta">Pendaftaran {info.nama}</span>
        <div className="big" style={{ color: "var(--panel-text)", fontSize: 26 }}>Bukti bayar terkirim</div>
        <p className="sub" style={{ margin: 0, fontSize: 13 }}>Pemilik akan memeriksa bukti bayarmu, lalu menyetujui pendaftaran dan menghubungi lewat WhatsApp.</p>
        <Link href={`/u/${slug}/status`} className="btn btn-sm" style={{ alignSelf: "flex-start" }}>Cek status</Link>
      </div>
    );
  }

  return (
    <>
      <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="meta">Pendaftaran {info.nama} · {info.slot}</span>
        <div className="big" style={{ color: "var(--panel-text)" }}>{rp(info.total)}</div>
        <span className="sub" style={{ fontSize: 13 }}>Transfer sesuai nominal ini, lalu kirim bukti di bawah.</span>
      </div>

      <section className="grp">
        <h2 className="h2">Transfer ke</h2>
        {rek.length === 0 ? <p className="sub" style={{ margin: 0, fontSize: 13 }}>Pemilik belum mengisi rekening. Hubungi pemilik lewat WhatsApp.</p> : (
          <div className="grp" role="radiogroup" aria-label="Rekening tujuan">
            {rek.map((r) => (
              <button key={r.id} type="button" role="radio" aria-checked={pilih === r.id} className={pilih === r.id ? "opt on" : "opt"} onClick={() => setPilih(r.id)}>
                <span className="radio" />
                <span className="grow" style={{ textAlign: "left" }}><span className="name" style={{ display: "block" }}>{r.bank} · {formatNomor(r.nomor)}</span><span className="meta">a.n. {r.atasNama}</span></span>
                <span role="button" tabIndex={0} className="st st-few" onClick={(e) => { e.stopPropagation(); salin(r.nomor, r.id); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); salin(r.nomor, r.id); } }}>{tersalin === r.id ? "Tersalin" : "Salin"}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grp">
        <h2 className="h2">Bukti transfer</h2>
        <div className="surface kartu-form">
          <label className="field"><span className="label l2">Foto atau PDF (maks {BUKTI_MAKS_BYTE / 1024 / 1024} MB)</span>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pilihBerkas(e.target.files?.[0] ?? null)} /></label>
          {pratinjau && (
            // Pratinjau lokal dari blob: URL, tidak bisa dioptimalkan oleh next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pratinjau} alt="Pratinjau bukti transfer" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 14, objectFit: "contain" }} />
          )}
          {berkas && !pratinjau && <p className="meta" style={{ margin: 0 }}>{berkas.name}</p>}
          {galat && <p className="galat" role="alert" style={{ margin: 0 }}>{galat}</p>}
          <button type="button" className="btn" disabled={sibuk || rek.length === 0} onClick={kirim}>{sibuk ? "Mengirim…" : "Kirim bukti bayar"}</button>
          <p className="meta" style={{ margin: 0 }}>Berkas belum tersimpan sampai penyimpanan tersambung; yang diperiksa baru jenis dan ukurannya.</p>
        </div>
      </section>
    </>
  );
}
