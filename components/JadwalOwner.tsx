"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { bisaHapus, KUOTA_MAKS, ubahKuota, urutkan, validasiSlotBaru, type GalatSlot, type SlotJadwal } from "@/lib/jadwal";
import { hitungSlot, kelasStatusSlot } from "@/lib/slot";

interface Hari { hari: number; nama: string; tgl: string; angka: number }
interface Pengajar { id: string; nama: string }
interface Props { awal: SlotJadwal[]; pengajar: Pengajar[]; minggu: Hari[]; hariAwal: number }

export function JadwalOwner({ awal, pengajar, minggu, hariAwal }: Props) {
  const [slot, setSlot] = useState(awal);
  const [pid, setPid] = useState(pengajar[0]!.id);
  const [hari, setHari] = useState(hariAwal);
  const [tutup, setTutup] = useState<Set<string>>(new Set());
  const [buka, setBuka] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<string | null>(null);
  const [galatKuota, setGalatKuota] = useState("");
  const [formBuka, setFormBuka] = useState(false);
  const [form, setForm] = useState({ jam: "", nama: "", kuota: 1, durasi: 60, lokasi: "" });
  const [galat, setGalat] = useState<GalatSlot>({});
  const [toast, setToast] = useState("");

  const tgl = minggu.find((h) => h.hari === hari)!.tgl;
  const kunci = (id: string) => `${id}|${tgl}`;
  const duaHariIni = urutkan(slot.filter((s) => s.pengajarId === pid && s.hari === hari));
  const semuaTutup = duaHariIni.length > 0 && duaHariIni.every((s) => tutup.has(kunci(s.id)));
  const jumlahMurid = duaHariIni.reduce((n, s) => n + s.terisi, 0);

  function info(teks: string) {
    setToast(teks);
    setTimeout(() => setToast(""), 3500);
  }

  function pilih(fn: () => void) { setBuka(null); setKonfirmasiHapus(null); setGalatKuota(""); fn(); }

  function setKuota(s: SlotJadwal, baru: number) {
    const h = ubahKuota(s, baru);
    if (!h.ok) { setGalatKuota(h.galat); return; }
    setGalatKuota("");
    setSlot((d) => d.map((x) => (x.id === s.id ? { ...x, kuota: baru } : x)));
  }

  function alihTutup(id: string) {
    setTutup((t) => { const n = new Set(t); n.has(kunci(id)) ? n.delete(kunci(id)) : n.add(kunci(id)); return n; });
  }

  function alihLibur() {
    setTutup((t) => {
      const n = new Set(t);
      duaHariIni.forEach((s) => (semuaTutup ? n.delete(kunci(s.id)) : n.add(kunci(s.id))));
      return n;
    });
    info(semuaTutup ? "Hari ini dibuka lagi." : "Hari ini ditandai libur, semua slot ditutup.");
  }

  function hapus(s: SlotJadwal) {
    setSlot((d) => d.filter((x) => x.id !== s.id));
    setBuka(null);
    setKonfirmasiHapus(null);
    info(`Slot ${s.jam} dihapus dari jadwal tetap.`);
  }

  function tambah() {
    const h = validasiSlotBaru(form, duaHariIni);
    if (!h.ok) { setGalat(h.galat); return; }
    setSlot((d) => [...d, { id: `baru-${Date.now()}`, pengajarId: pid, hari, jam: h.jam, nama: form.nama.trim(), durasi: form.durasi, kuota: form.kuota, lokasi: form.lokasi.trim() || undefined, terisi: 0 }]);
    setForm({ jam: "", nama: "", kuota: 1, durasi: 60, lokasi: "" });
    setGalat({});
    setFormBuka(false);
    info(`Slot ${h.jam} ditambahkan ke jadwal tetap.`);
  }

  const namaHari = minggu.find((h) => h.hari === hari)!;

  return (
    <>
      <div className="seg" role="tablist" aria-label="Pengajar">
        {pengajar.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={pid === p.id} className={pid === p.id ? "on" : ""} onClick={() => pilih(() => setPid(p.id))}>{p.nama}</button>
        ))}
      </div>

      <div className="days d7" role="tablist" aria-label="Hari">
        {minggu.map((h) => {
          const n = slot.filter((s) => s.pengajarId === pid && s.hari === h.hari).length;
          return (
            <button key={h.hari} type="button" role="tab" aria-selected={hari === h.hari} className={hari === h.hari ? "hari on" : "hari"} onClick={() => pilih(() => setHari(h.hari))}>
              <small>{h.nama}</small><b>{h.angka}</b><i className={n > 0 ? "titik" : "titik titik-off"} />
            </button>
          );
        })}
      </div>

      <div className="sec-head">
        <h2 className="h2">{namaHari.nama} {namaHari.angka} Nov</h2>
        <span className="meta">{duaHariIni.length} slot · {jumlahMurid} murid</span>
      </div>

      {duaHariIni.length === 0 ? (
        <div className="surface kosong">
          <span className="circ"><Icon name="cal" /></span>
          <h2 className="h2">Belum ada slot di hari ini</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Tambahkan slot supaya murid bisa memilih jam latihan.</p>
          <button type="button" className="btn" onClick={() => setFormBuka(true)}>Tambah slot</button>
        </div>
      ) : (
        <div className="surface batas batas-tinggi">
          {duaHariIni.map((s) => {
            const ditutup = tutup.has(kunci(s.id));
            const h = hitungSlot(s.kuota, s.terisi, ditutup);
            const terbuka = buka === s.id;
            return (
              <div key={s.id} className="baris">
                <button type="button" className="item buka" style={{ padding: "14px 16px", width: "100%" }} aria-expanded={terbuka} onClick={() => { setBuka(terbuka ? null : s.id); setKonfirmasiHapus(null); setGalatKuota(""); }}>
                  <span className="time">{s.jam}</span>
                  <span className="grow" style={{ textAlign: "left" }}>
                    <span className="name" style={{ display: "block" }}>{s.nama}</span>
                    <span className="meta">{s.durasi} mnt{s.lokasi ? ` · ${s.lokasi}` : ""} · {s.terisi}/{s.kuota} murid</span>
                  </span>
                  <span className={kelasStatusSlot[h.status]}>{h.label}</span>
                </button>
                {terbuka && (
                  <div className="detail">
                    <div className="kuota">
                      <span className="sub">Kuota per sesi</span>
                      <div className="stepper">
                        <button type="button" aria-label="Kurangi kuota" onClick={() => setKuota(s, s.kuota - 1)}>−</button>
                        <b aria-live="polite">{s.kuota}</b>
                        <button type="button" aria-label="Tambah kuota" onClick={() => setKuota(s, s.kuota + 1)} disabled={s.kuota >= KUOTA_MAKS}>+</button>
                      </div>
                    </div>
                    {galatKuota && <p className="galat" role="alert" style={{ margin: 0 }}>{galatKuota}</p>}
                    <div className="aksi">
                      <button type="button" className="btn btn-2 btn-sm" onClick={() => alihTutup(s.id)}>{ditutup ? "Buka slot hari ini" : "Tutup slot hari ini"}</button>
                      {konfirmasiHapus === s.id ? (
                        <>
                          <button type="button" className="btn btn-2 btn-sm" onClick={() => hapus(s)}>Ya, hapus</button>
                          <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasiHapus(null)}>Batal</button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasiHapus(s.id)}>Hapus dari jadwal</button>
                      )}
                    </div>
                    {konfirmasiHapus === s.id && (
                      <p className="meta" style={{ margin: 0 }}>
                        {bisaHapus(s) ? "Slot ini hilang dari semua minggu." : `Masih ada ${s.terisi} murid di slot ini. Slot tetap bisa dihapus, tapi pindahkan murid dulu.`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {duaHariIni.length > 0 && (
        <div className="aksi">
          <button type="button" className="btn btn-2 btn-sm" onClick={alihLibur}>{semuaTutup ? "Buka lagi hari ini" : "Tandai libur"}</button>
        </div>
      )}

      {formBuka ? (
        <form className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }} onSubmit={(e) => { e.preventDefault(); tambah(); }} noValidate>
          <h2 className="h2">Slot baru · {namaHari.nama}</h2>
          <label className="field"><span className="label" style={{ color: "var(--text-2)" }}>Jam mulai</span>
            <input value={form.jam} onChange={(e) => { setForm({ ...form, jam: e.target.value }); setGalat((g) => ({ ...g, jam: undefined })); }} placeholder="08.30" inputMode="decimal" />
            {galat.jam && <span className="galat" role="alert">{galat.jam}</span>}</label>
          <label className="field"><span className="label" style={{ color: "var(--text-2)" }}>Nama kelas</span>
            <input value={form.nama} onChange={(e) => { setForm({ ...form, nama: e.target.value }); setGalat((g) => ({ ...g, nama: undefined })); }} placeholder="Privat anak" />
            {galat.nama && <span className="galat" role="alert">{galat.nama}</span>}</label>
          <div style={{ display: "flex", gap: 12 }}>
            <label className="field" style={{ flex: 1 }}><span className="label" style={{ color: "var(--text-2)" }}>Kuota</span>
              <input value={form.kuota} onChange={(e) => { setForm({ ...form, kuota: Number(e.target.value.replace(/\D/g, "")) }); setGalat((g) => ({ ...g, kuota: undefined })); }} inputMode="numeric" />
              {galat.kuota && <span className="galat" role="alert">{galat.kuota}</span>}</label>
            <label className="field" style={{ flex: 1 }}><span className="label" style={{ color: "var(--text-2)" }}>Durasi (menit)</span>
              <input value={form.durasi} onChange={(e) => { setForm({ ...form, durasi: Number(e.target.value.replace(/\D/g, "")) }); setGalat((g) => ({ ...g, durasi: undefined })); }} inputMode="numeric" />
              {galat.durasi && <span className="galat" role="alert">{galat.durasi}</span>}</label>
          </div>
          <label className="field"><span className="label" style={{ color: "var(--text-2)" }}>Lokasi (opsional)</span>
            <input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} placeholder="Kolam A" /></label>
          <div className="aksi">
            <button type="submit" className="btn">Simpan slot</button>
            <button type="button" className="btn btn-2" onClick={() => { setFormBuka(false); setGalat({}); }}>Batal</button>
          </div>
        </form>
      ) : duaHariIni.length > 0 && (
        <button type="button" className="btn" onClick={() => setFormBuka(true)}>Tambah slot</button>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
