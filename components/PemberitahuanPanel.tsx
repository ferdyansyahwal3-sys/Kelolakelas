"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { labelInfo, targetDiizinkan, validasiPemberitahuan, type JenisInfo, type Pemberitahuan, type Peran } from "@/lib/pemberitahuan";
import { tglPendek } from "@/lib/format";

export const KUNCI_INFO = "kk-pemberitahuan";
interface Props { awal: Pemberitahuan[]; pengajar: { id: string; nama: string }[]; peran: Peran; saya: { id: string | null; nama: string }; hariIni: string }
const kelas: Record<JenisInfo, string> = { umum: "st st-ok", tidak_hadir: "st st-full", aturan: "st st-few" };

export function PemberitahuanPanel({ awal, pengajar, peran, saya, hariIni }: Props) {
  const [daftar, setDaftar] = useState(awal);
  const [form, setForm] = useState({ jenis: "umum" as JenisInfo, judul: "", isi: "", target: peran === "pelatih" ? (saya.id ?? "") : "semua" });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [hapus, setHapus] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try { const d = JSON.parse(localStorage.getItem(KUNCI_INFO) ?? "null") as Pemberitahuan[] | null; if (Array.isArray(d)) setDaftar(d); } catch {}
  }, []);

  const simpanLokal = (d: Pemberitahuan[]) => { try { localStorage.setItem(KUNCI_INFO, JSON.stringify(d)); } catch {} };
  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };
  const bersih = (k: string) => setGalat((g) => { const n = { ...g }; delete n[k]; return n; });
  const tujuan = (p: Pemberitahuan) => (p.untukPengajarId === null ? "Semua murid" : `Murid ${pengajar.find((x) => x.id === p.untukPengajarId)?.nama ?? ""}`);

  function kirim() {
    const g = validasiPemberitahuan(form);
    const target = form.target === "semua" ? null : form.target;
    if (!targetDiizinkan(peran, saya.id, target)) g.target = "Kamu hanya bisa menulis untuk muridmu sendiri.";
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    const baru: Pemberitahuan = { id: `info-${Date.now()}`, jenis: form.jenis, judul: form.judul.trim(), isi: form.isi.trim(), penulis: saya.nama, untukPengajarId: target, tgl: hariIni };
    const d = [baru, ...daftar];
    setDaftar(d); simpanLokal(d);
    setForm({ ...form, judul: "", isi: "" });
    info("Pemberitahuan terkirim ke portal murid.");
  }

  return (
    <>
      <section className="grp">
        <h2 className="h2">Tulis pemberitahuan</h2>
        <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); kirim(); }} noValidate>
          <div className="seg" role="radiogroup" aria-label="Jenis">
            {(Object.keys(labelInfo) as JenisInfo[]).map((j) => <button key={j} type="button" role="radio" aria-checked={form.jenis === j} className={form.jenis === j ? "on" : ""} onClick={() => setForm({ ...form, jenis: j })}>{j === "umum" ? "Info" : j === "tidak_hadir" ? "Tidak hadir" : "Peraturan"}</button>)}
          </div>
          {peran === "owner" && (
            <label className="field"><span className="label l2">Untuk</span>
              <select value={form.target} onChange={(e) => { setForm({ ...form, target: e.target.value }); bersih("target"); }}>
                <option value="semua">Semua murid</option>
                {pengajar.map((p) => <option key={p.id} value={p.id}>Murid {p.nama}</option>)}
              </select></label>
          )}
          {peran === "pelatih" && <p className="meta" style={{ margin: 0 }}>Terkirim ke murid {saya.nama}.</p>}
          {galat.target && <span className="galat" role="alert">{galat.target}</span>}
          <label className="field"><span className="label l2">Judul</span>
            <input value={form.judul} onChange={(e) => { setForm({ ...form, judul: e.target.value }); bersih("judul"); }} placeholder="Contoh: Sesi Sabtu diganti Minggu" />{galat.judul && <span className="galat" role="alert">{galat.judul}</span>}</label>
          <label className="field"><span className="label l2">Isi ({form.isi.length}/500)</span>
            <textarea rows={4} value={form.isi} onChange={(e) => { setForm({ ...form, isi: e.target.value }); bersih("isi"); }} />{galat.isi && <span className="galat" role="alert">{galat.isi}</span>}</label>
          <button type="submit" className="btn">Kirim pemberitahuan</button>
        </form>
      </section>

      <section className="grp">
        <h2 className="h2">Terkirim</h2>
        {daftar.length === 0 ? <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada pemberitahuan.</p> : (
          <div className="surface">
            {daftar.map((p) => (
              <div key={p.id} className="item" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className={kelas[p.jenis]}>{labelInfo[p.jenis]}</span><span className="meta">{tglPendek(p.tgl)} · {p.penulis} · {tujuan(p)}</span></div>
                <div className="name" style={{ whiteSpace: "normal" }}>{p.judul}</div>
                <div className="sub" style={{ fontSize: 13 }}>{p.isi}</div>
                {(peran === "owner" || p.penulis === saya.nama) && (hapus === p.id
                  ? <div className="aksi"><button type="button" className="btn btn-2 btn-sm" onClick={() => { const d = daftar.filter((x) => x.id !== p.id); setDaftar(d); simpanLokal(d); setHapus(null); info("Pemberitahuan dihapus."); }}>Ya, hapus</button><button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(null)}>Batal</button></div>
                  : <button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(p.id)}><Icon name="x" />Hapus</button>)}
              </div>
            ))}
          </div>
        )}
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
