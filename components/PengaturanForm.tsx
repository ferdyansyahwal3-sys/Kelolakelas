"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { toCsv } from "@/lib/csv";
import { aturanUntuk, isiTemplate, istilahUntuk, KATEGORI, slugDariNama, syaratUntuk, validasiPengaturan, VARIABEL, type Galat, type Pengaturan } from "@/lib/pengaturan";
import { labelMetode } from "@/lib/tagihan";
import { REKENING_MAKS } from "@/lib/rekening";
import type { MuridContoh } from "@/lib/contoh";
import type { TagihanOwner } from "@/lib/tagihan";

const KUNCI = "kk-pengaturan";
type HasilSimpan = { ok: true } | { ok: false; pesan: string; galat?: Galat };
interface Props { awal: Pengaturan; murid: MuridContoh[]; tagihan: TagihanOwner[]; /** Panel asli: simpan ke database. Tanpa ini = hanya di perangkat (demo). */ simpan?: (p: Pengaturan) => Promise<HasilSimpan> }

export function PengaturanForm({ awal, murid, tagihan, simpan: simpanServer }: Props) {
  const [p, setP] = useState(awal);
  const [tersimpan, setTersimpan] = useState(awal);
  const [galat, setGalat] = useState<Galat>({});
  const [toast, setToast] = useState("");
  const [tersalin, setTersalin] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (simpanServer) return; // panel asli: nilai awal dari database
    try {
      const raw = localStorage.getItem(KUNCI);
      if (raw) { const d = JSON.parse(raw) as Pengaturan; const gab = { ...awal, ...d, aturan: { ...awal.aturan, ...d.aturan }, rekening: Array.isArray(d.rekening) ? d.rekening : [] }; setP(gab); setTersimpan(gab); }
    } catch {}
  }, [awal, simpanServer]);

  const berubah = JSON.stringify(p) !== JSON.stringify(tersimpan);
  const link = `kelolakelas.id/u/${p.profil.slug || "…"}`;
  const bersih = (k: string) => setGalat((g) => { const n = { ...g }; delete n[k]; return n; });
  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };

  function ubah<K extends keyof Pengaturan>(grup: K, isi: Partial<Pengaturan[K]>, kunci: string) {
    setP((d) => ({ ...d, [grup]: { ...(d[grup] as object), ...isi } as Pengaturan[K] }));
    bersih(kunci);
  }

  async function simpan() {
    if (sibuk) return;
    const g = validasiPengaturan(p);
    setGalat(g);
    if (Object.keys(g).length > 0) { info("Ada isian yang perlu dibenahi."); return; }
    if (simpanServer) {
      setSibuk(true);
      const r = await simpanServer(p);
      setSibuk(false);
      if (!r.ok) { if (r.galat) setGalat(r.galat); info(r.pesan); return; }
      setTersimpan(p);
      info("Pengaturan disimpan.");
      return;
    }
    try { localStorage.setItem(KUNCI, JSON.stringify(p)); } catch {}
    setTersimpan(p);
    info("Pengaturan disimpan di perangkat ini.");
  }

  function pilihTema(t: "gelap" | "terang") {
    setP((d) => ({ ...d, tema: t }));
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("kk-tema", t); } catch {}
  }

  async function salin() {
    try { await navigator.clipboard.writeText(`https://${link}`); setTersalin(true); setTimeout(() => setTersalin(false), 2000); } catch {}
  }

  function unduh(nama: string, isi: string) {
    const url = URL.createObjectURL(new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = nama; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    info(`${nama} diunduh.`);
  }

  const contoh = { nama: "Dika", usaha: p.profil.nama || "usaha kamu", slot: "Sab 8 Nov · 08.30", total: "Rp 670.000", tempo: "14 Nov" };
  const E = ({ k }: { k: string }) => (galat[k] ? <span className="galat" role="alert">{galat[k]}</span> : null);

  return (
    <>
      <section className="grp">
        <h2 className="h2">Profil usaha</h2>
        <div className="surface kartu-form">
          <label className="field"><span className="label l2">Nama usaha</span>
            <input value={p.profil.nama} onChange={(e) => ubah("profil", { nama: e.target.value }, "profil.nama")} /><E k="profil.nama" /></label>
          <label className="field"><span className="label l2">Kategori</span>
            <select value={p.profil.kategori} onChange={(e) => ubah("profil", { kategori: e.target.value }, "profil.kategori")}>
              {KATEGORI.map((k) => <option key={k}>{k}</option>)}
            </select></label>
          <label className="field"><span className="label l2">Kota</span>
            <input value={p.profil.kota} onChange={(e) => ubah("profil", { kota: e.target.value }, "profil.kota")} /><E k="profil.kota" /></label>
          <label className="field"><span className="label l2">Area / lokasi latihan (tampil di halaman murid)</span>
            <input value={p.profil.area ?? ""} onChange={(e) => ubah("profil", { area: e.target.value }, "profil.area")} placeholder="Kolam A dan B, Bekasi" /><E k="profil.area" /></label>
          <label className="field"><span className="label l2">Nomor WhatsApp usaha (untuk tombol Chat WA)</span>
            <input value={p.profil.noWa ?? ""} onChange={(e) => ubah("profil", { noWa: e.target.value }, "profil.noWa")} inputMode="tel" placeholder="0812xxxxxxxx" /><E k="profil.noWa" /></label>
          <label className="field"><span className="label l2">Deskripsi singkat ({p.profil.deskripsi.length}/280)</span>
            <textarea rows={3} value={p.profil.deskripsi} onChange={(e) => ubah("profil", { deskripsi: e.target.value }, "profil.deskripsi")} /><E k="profil.deskripsi" /></label>
          <label className="field"><span className="label l2">Alamat link pendaftaran</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={p.profil.slug} onChange={(e) => ubah("profil", { slug: e.target.value.toLowerCase() }, "profil.slug")} style={{ flex: 1 }} autoCapitalize="none" spellCheck={false} />
              <button type="button" className="btn btn-2 btn-sm" style={{ height: 46 }} onClick={() => ubah("profil", { slug: slugDariNama(p.profil.nama) }, "profil.slug")}>Dari nama</button>
            </div>
            <E k="profil.slug" /></label>
          <div className="bukti"><span className="circ"><Icon name="link" /></span><div className="grow"><div className="name" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{link}</div><div className="meta">Bagikan ke grup WA murid</div></div>
            <button type="button" className="btn btn-2 btn-sm" onClick={salin}>{tersalin ? "Tersalin" : "Salin"}</button></div>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Tampilan</h2>
        <div className="surface kartu-form">
          <span className="label l2">Tema bawaan halaman murid</span>
          <div className="seg" role="radiogroup" aria-label="Tema">
            {(["gelap", "terang"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={p.tema === t} className={p.tema === t ? "on" : ""} onClick={() => pilihTema(t)}>{t === "gelap" ? "Gelap" : "Terang"}</button>
            ))}
          </div>
          <p className="meta" style={{ margin: 0 }}>Murid bisa mengganti sendiri lewat tombol matahari/bulan di tiap halaman.</p>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Istilah</h2>
        <div className="surface kartu-form">
          <p className="meta" style={{ margin: 0 }}>Sesuaikan kata yang dipakai di aplikasi, misalnya siswa, pertemuan, atau tutor.</p>
          <button type="button" className="btn btn-2 btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => { setP((d) => ({ ...d, istilah: istilahUntuk(d.profil.kategori) })); setGalat((g) => { const n = { ...g }; delete n["istilah.murid"]; delete n["istilah.sesi"]; delete n["istilah.pengajar"]; return n; }); }}>Pakai sebutan untuk {p.profil.kategori}</button>
          {(["murid", "sesi", "pengajar"] as const).map((k) => (
            <label key={k} className="field"><span className="label l2">Sebutan untuk “{k}”</span>
              <input value={p.istilah[k]} onChange={(e) => ubah("istilah", { [k]: e.target.value }, `istilah.${k}`)} /><E k={`istilah.${k}`} /></label>
          ))}
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Aturan sesi dan syarat</h2>
        <div className="surface kartu-form">
          <div style={{ display: "flex", gap: 12 }}>
            <label className="field" style={{ flex: 1 }}><span className="label l2">Batas izin (jam)</span>
              <input inputMode="numeric" value={p.aturan.batasIzinJam} onChange={(e) => ubah("aturan", { batasIzinJam: Number(e.target.value.replace(/\D/g, "")) }, "aturan.batasIzinJam")} /><E k="aturan.batasIzinJam" /></label>
            <label className="field" style={{ flex: 1 }}><span className="label l2">Masa berlaku (hari)</span>
              <input inputMode="numeric" value={p.aturan.masaBerlakuHari} onChange={(e) => ubah("aturan", { masaBerlakuHari: Number(e.target.value.replace(/\D/g, "")) }, "aturan.masaBerlakuHari")} /><E k="aturan.masaBerlakuHari" /></label>
          </div>
          <label className="field"><span className="label l2">Toleransi terlambat (menit)</span>
            <input inputMode="numeric" value={p.aturan.toleransiTelatMenit} onChange={(e) => ubah("aturan", { toleransiTelatMenit: Number(e.target.value.replace(/\D/g, "")) }, "aturan.toleransiTelatMenit")} /><E k="aturan.toleransiTelatMenit" /></label>
          <label className="cek"><input type="checkbox" checked={p.aturan.sesiPengganti} onChange={(e) => ubah("aturan", { sesiPengganti: e.target.checked }, "aturan.sesiPengganti")} /><span>{p.istilah.sesi[0]!.toUpperCase() + p.istilah.sesi.slice(1)} yang izin tepat waktu bisa diganti</span></label>
          <div className="aksi">
            <button type="button" className="btn btn-2 btn-sm" onClick={() => { const a = aturanUntuk(p.profil.kategori); setP((d) => ({ ...d, aturan: { ...a, daftar: syaratUntuk(d.profil.kategori, a, d.istilah.sesi) } })); setGalat({}); }}>Pakai aturan untuk {p.profil.kategori}</button>
            <button type="button" className="btn btn-2 btn-sm" onClick={() => { setP((d) => ({ ...d, aturan: { ...d.aturan, daftar: syaratUntuk(d.profil.kategori, d.aturan, d.istilah.sesi) } })); bersih("aturan.daftar"); }}>Susun syarat dari angka di atas</button>
          </div>
          <label className="field"><span className="label l2">Syarat dan ketentuan di form pendaftaran (satu per baris)</span>
            <textarea rows={4} value={p.aturan.daftar.join("\n")} onChange={(e) => ubah("aturan", { daftar: e.target.value.split("\n").filter((x) => x.trim() !== "") }, "aturan.daftar")} /><E k="aturan.daftar" /></label>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Rekening pembayaran</h2>
        <div className="surface kartu-form">
          <p className="meta" style={{ margin: 0 }}>Murid transfer ke rekening ini sebelum pendaftarannya di-ACC, lalu mengirim bukti bayar. Bisa lebih dari satu (maksimal {REKENING_MAKS}), misalnya bank dan e-wallet.</p>
          {p.rekening.length === 0 && <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada rekening. Tambahkan satu supaya murid tahu ke mana membayar.</p>}
          {p.rekening.map((r, i) => (
            <div key={r.id} className="rek">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>Rekening {i + 1}</b>
                <button type="button" className="btn btn-2 btn-sm" onClick={() => { setP((d) => ({ ...d, rekening: d.rekening.filter((x) => x.id !== r.id) })); setGalat({}); }}>Hapus</button></div>
              <label className="field"><span className="label l2">Bank atau e-wallet</span>
                <input value={r.bank} onChange={(e) => { setP((d) => ({ ...d, rekening: d.rekening.map((x) => (x.id === r.id ? { ...x, bank: e.target.value } : x)) })); bersih(`rekening.${i}.bank`); }} placeholder="BCA, Mandiri, GoPay…" /><E k={`rekening.${i}.bank`} /></label>
              <label className="field"><span className="label l2">Nomor</span>
                <input inputMode="numeric" autoComplete="off" value={r.nomor} onChange={(e) => { setP((d) => ({ ...d, rekening: d.rekening.map((x) => (x.id === r.id ? { ...x, nomor: e.target.value } : x)) })); bersih(`rekening.${i}.nomor`); }} /><E k={`rekening.${i}.nomor`} /></label>
              <label className="field"><span className="label l2">Atas nama</span>
                <input value={r.atasNama} onChange={(e) => { setP((d) => ({ ...d, rekening: d.rekening.map((x) => (x.id === r.id ? { ...x, atasNama: e.target.value } : x)) })); bersih(`rekening.${i}.atasNama`); }} /><E k={`rekening.${i}.atasNama`} /></label>
            </div>
          ))}
          <E k="rekening" />
          <button type="button" className="btn btn-2" disabled={p.rekening.length >= REKENING_MAKS} onClick={() => setP((d) => ({ ...d, rekening: [...d.rekening, { id: `rek-${Date.now()}-${d.rekening.length}`, bank: "", nomor: "", atasNama: "" }] }))}>Tambah rekening</button>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Pesan WhatsApp</h2>
        <div className="surface kartu-form">
          <p className="meta" style={{ margin: 0 }}>Variabel: {VARIABEL.map((v) => `{${v}}`).join(" ")}</p>
          {([["acc", "Saat pendaftaran disetujui"], ["tolak", "Saat pendaftaran ditolak"], ["pengingat", "Pengingat tagihan"]] as const).map(([k, judul]) => (
            <label key={k} className="field"><span className="label l2">{judul}</span>
              <textarea rows={4} value={p.templat[k]} onChange={(e) => ubah("templat", { [k]: e.target.value }, `templat.${k}`)} /><E k={`templat.${k}`} />
              {!galat[`templat.${k}`] && <span className="meta pratinjau">{isiTemplate(p.templat[k], contoh)}</span>}</label>
          ))}
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Ekspor data</h2>
        <div className="surface kartu-form">
          <p className="meta" style={{ margin: 0 }}>Datamu milikmu. Unduh kapan saja sebagai CSV, bisa dibuka di Excel atau Google Sheets.</p>
          <div className="aksi">
            <button type="button" className="btn btn-2 btn-sm" onClick={() => unduh("murid.csv", toCsv(murid, [
              { judul: "Nama", ambil: (m) => m.nama }, { judul: "Kategori", ambil: (m) => m.kategori }, { judul: "Orang tua", ambil: (m) => m.namaOrtu },
              { judul: "WhatsApp", ambil: (m) => m.noWa }, { judul: "Pengajar", ambil: (m) => m.pengajar }, { judul: "Sisa sesi", ambil: (m) => m.sisaSesi },
              { judul: "Berlaku sampai", ambil: (m) => m.berlakuSampai }, { judul: "Aktif", ambil: (m) => (m.aktif ? "ya" : "tidak") },
            ]))}>Unduh murid (CSV)</button>
            <button type="button" className="btn btn-2 btn-sm" onClick={() => unduh("tagihan.csv", toCsv(tagihan, [
              { judul: "Nama", ambil: (t) => t.nama }, { judul: "Paket", ambil: (t) => t.paket }, { judul: "Nominal", ambil: (t) => t.nominal },
              { judul: "Jatuh tempo", ambil: (t) => t.tempo }, { judul: "Status", ambil: (t) => t.status },
              { judul: "Dibayar", ambil: (t) => t.dibayar?.tanggal }, { judul: "Cara bayar", ambil: (t) => (t.dibayar ? labelMetode[t.dibayar.metode] : "") },
            ]))}>Unduh tagihan (CSV)</button>
          </div>
        </div>
      </section>

      <div className="simpan">
        <button type="button" className="btn" disabled={!berubah || sibuk} onClick={simpan}>{sibuk ? "Menyimpan…" : berubah ? "Simpan perubahan" : "Tersimpan"}</button>
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Sementara disimpan di perangkat ini, sampai database tersambung.</p>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
