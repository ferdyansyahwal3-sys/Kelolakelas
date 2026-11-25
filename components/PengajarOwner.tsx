"use client";
import { Tautan as Link } from "@/components/BasisApp";
import { useState } from "react";
import { Icon } from "./Icon";
import { inisial } from "@/lib/format";
import { labelPlan } from "@/lib/paketLangganan";
import { BATAS_PENGAJAR, bisaUndang, jatahTerpakai, kodeUndangan, validasiUndangan, type PengajarOwner as Pengajar, type Plan } from "@/lib/pengajar";

interface Ringkas { murid: number; slot: number }
type Biasa = { ok: true } | { ok: false; pesan: string };
export interface AksiPengajar {
  undang: (i: { nama: string; email: string }) => Promise<{ ok: true; id: string; kode: string } | { ok: false; pesan: string; galat?: Record<string, string> }>;
  batalkan: (id: string) => Promise<Biasa>;
  ubahAktif: (id: string, aktif: boolean) => Promise<Biasa>;
}
interface Props { awal: Pengajar[]; plan: Plan; ringkas: Record<string, Ringkas>; aksi?: AksiPengajar; bolehUbah?: boolean }
const status = { aktif: { t: "Aktif", k: "st st-ok" }, menunggu: { t: "Menunggu", k: "st st-few" }, nonaktif: { t: "Nonaktif", k: "st st-free" } } as const;

export function PengajarOwnerList({ awal, plan, ringkas, aksi, bolehUbah = true }: Props) {
  const [daftar, setDaftar] = useState(awal);
  const [buka, setBuka] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<string | null>(null);
  const [formBuka, setFormBuka] = useState(false);
  const [form, setForm] = useState({ nama: "", email: "" });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [tautan, setTautan] = useState<{ nama: string; url: string } | null>(null);
  const [tersalin, setTersalin] = useState(false);
  const [toast, setToast] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const terpakai = jatahTerpakai(daftar);
  const batas = BATAS_PENGAJAR[plan];
  const boleh = bisaUndang(daftar, plan);
  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };

  async function jalankan(fn: () => Promise<Biasa>): Promise<boolean> {
    if (sibuk) return false;
    setSibuk(true);
    const r = await fn();
    setSibuk(false);
    if (!r.ok) { info(r.pesan); return false; }
    return true;
  }

  async function undang() {
    if (sibuk) return;
    const g = validasiUndangan(form, daftar);
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    let id = `undang-${Date.now()}`;
    let url = `kelolakelas.id/undang/${kodeUndangan()}`;
    if (aksi) {
      setSibuk(true);
      const r = await aksi.undang(form);
      setSibuk(false);
      if (!r.ok) { if (r.galat) setGalat(r.galat); else info(r.pesan); return; }
      id = r.id;
      url = `${window.location.host}/undang/${r.kode}`;
    }
    setDaftar((d) => [...d, { id, nama: form.nama.trim(), email: form.email.trim().toLowerCase(), pemilik: false, status: "menunggu" }]);
    setTautan({ nama: form.nama.trim(), url });
    setForm({ nama: "", email: "" }); setFormBuka(false);
    info("Undangan dibuat. Email belum dikirim, bagikan tautannya.");
  }

  async function nonaktifkan(p: Pengajar) {
    if (aksi && !(await jalankan(() => (p.status === "menunggu" ? aksi.batalkan(p.id) : aksi.ubahAktif(p.id, false))))) { setKonfirmasi(null); return; }
    setDaftar((d) => (p.status === "menunggu" ? d.filter((x) => x.id !== p.id) : d.map((x) => (x.id === p.id ? { ...x, status: "nonaktif" } : x))));
    setKonfirmasi(null); setBuka(null);
    info(p.status === "menunggu" ? "Undangan dibatalkan." : `${p.nama} dinonaktifkan.`);
  }

  async function aktifkan(p: Pengajar) {
    if (aksi && !(await jalankan(() => aksi.ubahAktif(p.id, true)))) return;
    setDaftar((d) => d.map((x) => (x.id === p.id ? { ...x, status: "aktif" } : x)));
    info(`${p.nama} diaktifkan lagi.`);
  }

  async function salin(url: string) {
    try { await navigator.clipboard.writeText(`https://${url}`); setTersalin(true); setTimeout(() => setTersalin(false), 2000); } catch {}
  }

  const E = ({ k }: { k: string }) => (galat[k] ? <span className="galat" role="alert">{galat[k]}</span> : null);

  return (
    <>
      <div className="surface" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span className="sub">Paket {labelPlan(plan)}</span>
          <b>{terpakai}{Number.isFinite(batas) ? ` / ${batas}` : ""} pengajar</b>
        </div>
        {Number.isFinite(batas) && <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (terpakai / batas) * 100)}%` }} /></div>}
        <span className="meta">{Number.isFinite(batas) ? `Paket ${labelPlan(plan)} untuk ${batas} pengajar. Naik paket untuk menambah pelatih lain.` : "Pengajar tidak dibatasi."}</span>
      </div>

      <div className="surface batas batas-tinggi">
        {daftar.map((p) => {
          const terbuka = buka === p.id;
          const r = ringkas[p.id] ?? { murid: 0, slot: 0 };
          return (
            <div key={p.id} className="baris">
              <button type="button" className="item buka" style={{ padding: "14px 16px", width: "100%" }} aria-expanded={terbuka} onClick={() => { setBuka(terbuka ? null : p.id); setKonfirmasi(null); }}>
                <span className="avatar s">{inisial(p.nama.replace(/^(Coach|Tutor|Pak|Bu) /, ""))}</span>
                <span className="grow" style={{ textAlign: "left" }}>
                  <span className="name" style={{ display: "block" }}>{p.nama}{p.pemilik ? " · Pemilik" : ""}</span>
                  <span className="meta">{p.status === "menunggu" ? "Belum menerima undangan" : `${r.murid} murid · ${r.slot} slot per minggu`}</span>
                </span>
                <span className={status[p.status].k}>{status[p.status].t}</span>
              </button>
              {terbuka && (
                <div className="detail">
                  <dl><dt>Email</dt><dd>{p.email}</dd><dt>Peran</dt><dd>{p.pemilik ? "Pemilik, mengajar sendiri" : "Pengajar"}</dd><dt>Murid aktif</dt><dd>{r.murid}</dd><dt>Slot per minggu</dt><dd>{r.slot}</dd></dl>
                  <div className="aksi">
                    <Link href="/app/rekap" className="btn btn-2 btn-sm">Atur bagi hasil</Link>
                    <Link href="/app/jadwal" className="btn btn-2 btn-sm">Lihat jadwal</Link>
                    {!p.pemilik && (konfirmasi === p.id ? (
                      <>
                        <button type="button" className="btn btn-2 btn-sm" disabled={!bolehUbah || sibuk} onClick={() => nonaktifkan(p)}>{p.status === "menunggu" ? "Ya, batalkan" : "Ya, nonaktifkan"}</button>
                        <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasi(null)}>Batal</button>
                      </>
                    ) : p.status === "nonaktif" ? (
                      <button type="button" className="btn btn-2 btn-sm" disabled={!boleh || !bolehUbah || sibuk} onClick={() => aktifkan(p)}>Aktifkan lagi</button>
                    ) : (
                      <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasi(p.id)}>{p.status === "menunggu" ? "Batalkan undangan" : "Nonaktifkan"}</button>
                    ))}
                  </div>
                  {konfirmasi === p.id && p.status === "aktif" && <p className="meta" style={{ margin: 0 }}>Jadwal dan murid {p.nama} tetap ada. Pindahkan dulu bila perlu.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tautan && (
        <div className="bukti"><span className="circ"><Icon name="link" /></span>
          <div className="grow"><div className="name" style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{tautan.url}</div><div className="meta">Tautan undangan untuk {tautan.nama}</div></div>
          <button type="button" className="btn btn-2 btn-sm" onClick={() => salin(tautan.url)}>{tersalin ? "Tersalin" : "Salin"}</button></div>
      )}

      {formBuka ? (
        <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); undang(); }} noValidate>
          <h2 className="h2">Undang pengajar</h2>
          <label className="field"><span className="label l2">Nama</span>
            <input value={form.nama} onChange={(e) => { setForm({ ...form, nama: e.target.value }); setGalat((g) => ({ ...g, nama: "" })); }} placeholder="Coach Dani" /><E k="nama" /></label>
          <label className="field"><span className="label l2">Email</span>
            <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setGalat((g) => ({ ...g, email: "" })); }} autoCapitalize="none" spellCheck={false} /><E k="email" /></label>
          <div className="aksi"><button type="submit" className="btn" disabled={!bolehUbah || sibuk}>{sibuk ? "Membuat…" : "Buat undangan"}</button><button type="button" className="btn btn-2" onClick={() => { setFormBuka(false); setGalat({}); }}>Batal</button></div>
        </form>
      ) : boleh ? (
        <button type="button" className="btn" onClick={() => setFormBuka(true)}>Undang pengajar</button>
      ) : (
        <div className="surface kartu-form"><p className="sub" style={{ margin: 0, fontSize: 13 }}>Paket {labelPlan(plan)} hanya untuk {batas} pengajar. Naik paket untuk mengundang pelatih lain.</p><button type="button" className="btn" disabled>Naik paket (segera)</button></div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
