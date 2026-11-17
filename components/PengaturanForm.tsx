"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { toCsv } from "@/lib/csv";
import { isiTemplate, KATEGORI, slugDariNama, validasiPengaturan, VARIABEL, type Galat, type Pengaturan } from "@/lib/pengaturan";
import { labelMetode } from "@/lib/tagihan";
import type { MuridContoh } from "@/lib/contoh";
import type { TagihanOwner } from "@/lib/tagihan";

const KUNCI = "kk-pengaturan";
interface Props { awal: Pengaturan; murid: MuridContoh[]; tagihan: TagihanOwner[] }

export function PengaturanForm({ awal, murid, tagihan }: Props) {
  const [p, setP] = useState(awal);
  const [tersimpan, setTersimpan] = useState(awal);
  const [galat, setGalat] = useState<Galat>({});
  const [toast, setToast] = useState("");
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KUNCI);
      if (raw) { const d = JSON.parse(raw) as Pengaturan; setP(d); setTersimpan(d); }
    } catch {}
  }, []);

  const berubah = JSON.stringify(p) !== JSON.stringify(tersimpan);
  const link = `kelolakelas.id/u/${p.profil.slug || "…"}`;
  const bersih = (k: string) => setGalat((g) => { const n = { ...g }; delete n[k]; return n; });
  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };

  function ubah<K extends keyof Pengaturan>(grup: K, isi: Partial<Pengaturan[K]>, kunci: string) {
    setP((d) => ({ ...d, [grup]: { ...(d[grup] as object), ...isi } as Pengaturan[K] }));
    bersih(kunci);
  }

  function simpan() {
    const g = validasiPengaturan(p);
    setGalat(g);
    if (Object.keys(g).length > 0) { info("Ada isian yang perlu dibenahi."); return; }
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
          {(["murid", "sesi", "pengajar"] as const).map((k) => (
            <label key={k} className="field"><span className="label l2">Sebutan untuk “{k}”</span>
              <input value={p.istilah[k]} onChange={(e) => ubah("istilah", { [k]: e.target.value }, `istilah.${k}`)} /><E k={`istilah.${k}`} /></label>
          ))}
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Aturan sesi</h2>
        <div className="surface kartu-form">
          <div style={{ display: "flex", gap: 12 }}>
            <label className="field" style={{ flex: 1 }}><span className="label l2">Batas izin (jam)</span>
              <input inputMode="numeric" value={p.aturan.batasIzinJam} onChange={(e) => ubah("aturan", { batasIzinJam: Number(e.target.value.replace(/\D/g, "")) }, "aturan.batasIzinJam")} /><E k="aturan.batasIzinJam" /></label>
            <label className="field" style={{ flex: 1 }}><span className="label l2">Masa berlaku (hari)</span>
              <input inputMode="numeric" value={p.aturan.masaBerlakuHari} onChange={(e) => ubah("aturan", { masaBerlakuHari: Number(e.target.value.replace(/\D/g, "")) }, "aturan.masaBerlakuHari")} /><E k="aturan.masaBerlakuHari" /></label>
          </div>
          <label className="field"><span className="label l2">Aturan di form pendaftaran (satu per baris)</span>
            <textarea rows={4} value={p.aturan.daftar.join("\n")} onChange={(e) => ubah("aturan", { daftar: e.target.value.split("\n").filter((x) => x.trim() !== "") }, "aturan.daftar")} /><E k="aturan.daftar" /></label>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Info rekening</h2>
        <div className="surface kartu-form">
          <p className="meta" style={{ margin: 0 }}>Ditampilkan ke murid setelah pendaftarannya di-ACC, supaya tahu ke mana membayar.</p>
          <label className="field"><span className="label l2">Bank</span>
            <input value={p.rekening.bank} onChange={(e) => ubah("rekening", { bank: e.target.value }, "rekening")} placeholder="contoh: BCA" /></label>
          <label className="field"><span className="label l2">Nomor rekening</span>
            <input inputMode="numeric" value={p.rekening.nomor} onChange={(e) => { ubah("rekening", { nomor: e.target.value }, "rekening"); bersih("rekening.nomor"); }} autoComplete="off" /><E k="rekening.nomor" /></label>
          <label className="field"><span className="label l2">Atas nama</span>
            <input value={p.rekening.atasNama} onChange={(e) => ubah("rekening", { atasNama: e.target.value }, "rekening")} /><E k="rekening" /></label>
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
        <button type="button" className="btn" disabled={!berubah} onClick={simpan}>{berubah ? "Simpan perubahan" : "Tersimpan"}</button>
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Sementara disimpan di perangkat ini, sampai database tersambung.</p>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
