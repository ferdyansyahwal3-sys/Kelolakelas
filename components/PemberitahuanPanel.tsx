"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { belumDibaca, kabarUntuk, labelInfo, labelKabar, slotDiizinkan, tandaiDibaca, tandaiSemuaDibaca, targetDiizinkan, validasiPemberitahuan, type JenisInfo, type JenisKabar, type KabarPelatih, type Pemberitahuan, type Peran } from "@/lib/pemberitahuan";
import { tglPendek } from "@/lib/format";

export const KUNCI_INFO = "kk-pemberitahuan";
export const KUNCI_KABAR = "kk-kabar-pelatih";
interface SlotInfo { id: string; pengajarId: string; hari: number; jam: string; nama: string }
type HasilKirimInfo = { ok: true; info: Pemberitahuan } | { ok: false; pesan: string; galat?: Record<string, string> };
export interface AksiInfo { kirim: (i: { jenis: JenisInfo; judul: string; isi: string; target: string; slotId: string }) => Promise<HasilKirimInfo>; hapus: (id: string) => Promise<{ ok: true } | { ok: false; pesan: string }> }
interface Props { awal: Pemberitahuan[]; pengajar: { id: string; nama: string }[]; peran: Peran; saya: { id: string | null; nama: string }; hariIni: string; jadwal?: SlotInfo[]; onKabarUbah?: (belumDibaca: number) => void; aksi?: AksiInfo }
const HARI = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const kelas: Record<JenisInfo, string> = { umum: "st st-ok", tidak_hadir: "st st-full", aturan: "st st-few" };
const kelasKabar: Record<JenisKabar, string> = { ganti_disetujui: "st st-ok", ganti_masuk: "st st-few", ganti_ditolak: "st st-full", tukar_disetujui: "st st-ok", tukar_ditolak: "st st-full", tukar_dibatalkan: "st st-few", ganti_langsung: "st st-few" };

/** Dibaca dari localStorage; bentuk yang rusak diabaikan. */
export function bacaKabar(): KabarPelatih[] {
  try {
    const d = JSON.parse(localStorage.getItem(KUNCI_KABAR) ?? "null") as KabarPelatih[] | null;
    return Array.isArray(d) ? d.filter((k) => k && typeof k.id === "string" && typeof k.untukPelatihId === "string" && typeof k.judul === "string") : [];
  } catch { return []; }
}

export function PemberitahuanPanel({ awal, pengajar, peran, saya, hariIni, jadwal = [], onKabarUbah, aksi }: Props) {
  const [daftar, setDaftar] = useState(awal);
  const [kabar, setKabar] = useState<KabarPelatih[]>([]);
  const [form, setForm] = useState({ jenis: "umum" as JenisInfo, judul: "", isi: "", target: peran === "pelatih" ? (saya.id ?? "") : "semua", slotId: "" });
  const slotBisa = jadwal.filter((x) => slotDiizinkan(peran, saya.id, x.pengajarId)).sort((a, b) => a.hari - b.hari || a.jam.localeCompare(b.jam));
  const labelSlot = (x: SlotInfo) => `${HARI[x.hari]} ${x.jam} · ${x.nama}${peran === "owner" ? ` · ${pengajar.find((p) => p.id === x.pengajarId)?.nama ?? ""}` : ""}`;
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [hapus, setHapus] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!aksi) { try { const d = JSON.parse(localStorage.getItem(KUNCI_INFO) ?? "null") as Pemberitahuan[] | null; if (Array.isArray(d)) setDaftar(d); } catch {} }
    setKabar(bacaKabar());
  }, [aksi]);

  const kabarSaya = peran === "pelatih" && saya.id ? kabarUntuk(kabar, saya.id) : [];
  const baru = peran === "pelatih" && saya.id ? belumDibaca(kabar, saya.id) : 0;
  function ubahKabar(d: KabarPelatih[]) {
    setKabar(d);
    try { localStorage.setItem(KUNCI_KABAR, JSON.stringify(d)); } catch {}
    if (saya.id) onKabarUbah?.(belumDibaca(d, saya.id));
  }

  const simpanLokal = (d: Pemberitahuan[]) => { if (aksi) return; try { localStorage.setItem(KUNCI_INFO, JSON.stringify(d)); } catch {} };
  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };
  const bersih = (k: string) => setGalat((g) => { const n = { ...g }; delete n[k]; return n; });
  const tujuan = (p: Pemberitahuan) => (p.untukSlotId ? `Murid sesi ${(() => { const x = jadwal.find((j) => j.id === p.untukSlotId); return x ? `${HARI[x.hari]} ${x.jam} ${x.nama}` : "tertentu"; })()}` : p.untukPengajarId === null ? "Semua murid" : `Murid ${pengajar.find((x) => x.id === p.untukPengajarId)?.nama ?? ""}`);

  async function kirim() {
    const g = validasiPemberitahuan(form);
    const sesi = form.target === "sesi";
    const target = form.target === "semua" || sesi ? null : form.target;
    const slot = sesi ? jadwal.find((x) => x.id === form.slotId) : undefined;
    if (sesi) {
      if (!slot) g.target = "Pilih sesinya.";
      else if (!slotDiizinkan(peran, saya.id, slot.pengajarId)) g.target = "Kamu hanya bisa menulis untuk sesi milikmu sendiri.";
    } else if (!targetDiizinkan(peran, saya.id, target)) g.target = "Kamu hanya bisa menulis untuk muridmu sendiri.";
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    let baru: Pemberitahuan = { id: `info-${Date.now()}`, jenis: form.jenis, judul: form.judul.trim(), isi: form.isi.trim(), penulis: saya.nama, untukPengajarId: target, ...(slot ? { untukSlotId: slot.id } : {}), tgl: hariIni };
    if (aksi) {
      const r = await aksi.kirim({ jenis: form.jenis, judul: form.judul, isi: form.isi, target: form.target, slotId: form.slotId });
      if (!r.ok) { if (r.galat) setGalat(r.galat); info(r.pesan); return; }
      baru = r.info;
    }
    const d = [baru, ...daftar];
    setDaftar(d); simpanLokal(d);
    setForm({ ...form, judul: "", isi: "", slotId: "" });
    info("Pemberitahuan terkirim ke portal murid.");
  }

  return (
    <>
      {kabarSaya.length > 0 && (
        <section className="grp" aria-label="Kabar untukmu">
          <div className="sec-head">
            <h2 className="h2">Kabar untukmu{baru > 0 ? ` · ${baru} baru` : ""}</h2>
            {baru > 1 && saya.id && <button type="button" className="btn btn-2 btn-sm" onClick={() => ubahKabar(tandaiSemuaDibaca(kabar, saya.id!))}>Tandai semua dibaca</button>}
          </div>
          <div className="surface batas">
            {kabarSaya.map((k) => (
              <div key={k.id} className={k.dibaca ? "item kabar" : "item kabar kabar-baru"} style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className={kelasKabar[k.jenis]}>{labelKabar[k.jenis]}</span><span className="meta">{tglPendek(k.tgl)} · dari pemilik</span></div>
                <div className="name" style={{ whiteSpace: "normal" }}>{k.judul}</div>
                <div className="sub" style={{ fontSize: 13 }}>{k.isi}</div>
                {!k.dibaca && saya.id && <button type="button" className="btn btn-2 btn-sm" onClick={() => ubahKabar(tandaiDibaca(kabar, k.id, saya.id!))}><Icon name="check" />Tandai dibaca</button>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grp">
        <h2 className="h2">Tulis pemberitahuan</h2>
        <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); kirim(); }} noValidate>
          <div className="seg" role="radiogroup" aria-label="Jenis">
            {(Object.keys(labelInfo) as JenisInfo[]).map((j) => <button key={j} type="button" role="radio" aria-checked={form.jenis === j} className={form.jenis === j ? "on" : ""} onClick={() => setForm({ ...form, jenis: j })}>{j === "umum" ? "Info" : j === "tidak_hadir" ? "Tidak hadir" : "Peraturan"}</button>)}
          </div>
          <label className="field"><span className="label l2">Untuk</span>
            <select value={form.target} onChange={(e) => { setForm({ ...form, target: e.target.value, slotId: "" }); bersih("target"); }}>
              {peran === "owner" ? (
                <>
                  <option value="semua">Semua murid</option>
                  {pengajar.map((p) => <option key={p.id} value={p.id}>Murid {p.nama}</option>)}
                </>
              ) : <option value={saya.id ?? ""}>Semua murid {saya.nama}</option>}
              {slotBisa.length > 0 && <option value="sesi">Sesi tertentu…</option>}
            </select></label>
          {form.target === "sesi" && (
            <label className="field"><span className="label l2">Pilih sesi (hanya murid di sesi ini yang menerima)</span>
              <select value={form.slotId} onChange={(e) => { setForm({ ...form, slotId: e.target.value }); bersih("target"); }}>
                <option value="">Pilih sesi…</option>
                {slotBisa.map((x) => <option key={x.id} value={x.id}>{labelSlot(x)}</option>)}
              </select></label>
          )}
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
          <div className="surface batas batas-tinggi">
            {daftar.map((p) => (
              <div key={p.id} className="item" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className={kelas[p.jenis]}>{labelInfo[p.jenis]}</span><span className="meta">{tglPendek(p.tgl)} · {p.penulis} · {tujuan(p)}</span></div>
                <div className="name" style={{ whiteSpace: "normal" }}>{p.judul}</div>
                <div className="sub" style={{ fontSize: 13 }}>{p.isi}</div>
                {(peran === "owner" || p.penulis === saya.nama) && (hapus === p.id
                  ? <div className="aksi"><button type="button" className="btn btn-2 btn-sm" onClick={async () => { if (aksi) { const r = await aksi.hapus(p.id); if (!r.ok) { info(r.pesan); return; } } const d = daftar.filter((x) => x.id !== p.id); setDaftar(d); simpanLokal(d); setHapus(null); info("Pemberitahuan dihapus."); }}>Ya, hapus</button><button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(null)}>Batal</button></div>
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
