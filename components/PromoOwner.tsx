"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { kodeReferral, ringkasNilai, statusPromo, validasiPromo, type InputPromo, type PromoOwner as Promo, type StatusPromo } from "@/lib/promo";

interface Pemakaian { id: string; kode: string; nama: string; tgl: string; potongan: number }
type Biasa = { ok: true } | { ok: false; pesan: string };
type HasilBaru = { ok: true; promo: Promo } | { ok: false; pesan: string; galat?: Record<string, string> };
export interface AksiPromo { buat: (i: InputPromo) => Promise<HasilBaru>; buatReferral: (muridId: string, potongan: number) => Promise<HasilBaru>; ubahAktif: (id: string, aktif: boolean) => Promise<Biasa>; hapus: (id: string) => Promise<Biasa> }
interface Props { awal: Promo[]; pemakaian: Pemakaian[]; murid: { id: string; nama: string }[]; hariIni: string; aksi?: AksiPromo; bolehUbah?: boolean }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const label: Record<StatusPromo, { teks: string; kelas: string }> = {
  aktif: { teks: "Aktif", kelas: "st st-ok" }, nonaktif: { teks: "Nonaktif", kelas: "st st-free" },
  kedaluwarsa: { teks: "Kedaluwarsa", kelas: "st st-full" }, habis: { teks: "Habis", kelas: "st st-full" },
};
const kosongForm = { kode: "", jenis: "persen" as "persen" | "nominal", nilai: "", kuota: "", kedaluwarsa: "" };

export function PromoOwnerList({ awal, pemakaian, murid, hariIni, aksi, bolehUbah = true }: Props) {
  const [daftar, setDaftar] = useState(awal);
  const [tab, setTab] = useState<"promo" | "referral">("promo");
  const [buka, setBuka] = useState<string | null>(null);
  const [hapus, setHapus] = useState<string | null>(null);
  const [formBuka, setFormBuka] = useState(false);
  const [form, setForm] = useState(kosongForm);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pilihMurid, setPilihMurid] = useState("");
  const [potonganRef, setPotonganRef] = useState("50000");
  const [toast, setToast] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const promo = daftar.filter((p) => !p.pemilik);
  const referral = daftar.filter((p) => p.pemilik);
  const tampil = tab === "promo" ? promo : referral;
  const kodeAda = daftar.map((p) => p.kode);
  const belumPunya = murid.filter((m) => !referral.some((r) => r.pemilik === m.nama));

  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };
  const bersih = (k: string) => setGalat((g) => { const n = { ...g }; delete n[k]; return n; });
  const ubah = (id: string, isi: Partial<Promo>) => setDaftar((d) => d.map((p) => (p.id === id ? { ...p, ...isi } : p)));

  async function buat() {
    if (sibuk) return;
    const i: InputPromo = { kode: form.kode, jenis: form.jenis, nilai: Number(form.nilai.replace(/\D/g, "")), kuota: form.kuota.trim() === "" ? null : Number(form.kuota.replace(/\D/g, "")), kedaluwarsa: form.kedaluwarsa || null };
    const g = validasiPromo(i, kodeAda, hariIni);
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    let baru: Promo = { id: `baru-${Date.now()}`, kode: i.kode.trim().toUpperCase(), jenis: i.jenis, nilai: i.nilai, kuota: i.kuota, terpakai: 0, kedaluwarsa: i.kedaluwarsa, aktif: true };
    if (aksi) {
      setSibuk(true);
      const r = await aksi.buat(i);
      setSibuk(false);
      if (!r.ok) { if (r.galat) setGalat(r.galat); else info(r.pesan); return; }
      baru = r.promo;
    }
    setDaftar((d) => [baru, ...d]);
    setForm(kosongForm); setFormBuka(false);
    info(`Kode ${baru.kode} dibuat.`);
  }

  async function buatReferral() {
    if (sibuk) return;
    const m = murid.find((x) => x.id === pilihMurid);
    if (!m) { setGalat({ murid: "Pilih murid dulu." }); return; }
    const nilai = Number(potonganRef.replace(/\D/g, ""));
    if (nilai < 1000 || nilai > 10_000_000) { setGalat({ potongan: "Nominal Rp 1.000–10.000.000." }); return; }
    let baru: Promo = { id: `ref-${Date.now()}`, kode: kodeReferral(m.nama, kodeAda), jenis: "nominal", nilai, kuota: null, terpakai: 0, kedaluwarsa: null, aktif: true, pemilik: m.nama };
    if (aksi) {
      setSibuk(true);
      const r = await aksi.buatReferral(m.id, nilai);
      setSibuk(false);
      if (!r.ok) { info(r.pesan); return; }
      baru = r.promo;
    }
    setDaftar((d) => [baru, ...d]);
    setPilihMurid(""); setGalat({});
    info(`Kode referral ${baru.kode} untuk ${m.nama} dibuat.`);
  }

  async function alihAktif(p: Promo) {
    if (sibuk) return;
    if (aksi) {
      setSibuk(true);
      const r = await aksi.ubahAktif(p.id, !p.aktif);
      setSibuk(false);
      if (!r.ok) { info(r.pesan); return; }
    }
    ubah(p.id, { aktif: !p.aktif });
    info(p.aktif ? `${p.kode} dinonaktifkan.` : `${p.kode} diaktifkan.`);
  }

  async function hapusKode(p: Promo) {
    if (sibuk) return;
    if (aksi) {
      setSibuk(true);
      const r = await aksi.hapus(p.id);
      setSibuk(false);
      if (!r.ok) { info(r.pesan); return; }
    }
    setDaftar((d) => d.filter((x) => x.id !== p.id)); setBuka(null); setHapus(null); info(`${p.kode} dihapus.`);
  }

  const E = ({ k }: { k: string }) => (galat[k] ? <span className="galat" role="alert">{galat[k]}</span> : null);

  return (
    <>
      <div className="seg" role="tablist" aria-label="Jenis kode">
        <button type="button" role="tab" aria-selected={tab === "promo"} className={tab === "promo" ? "on" : ""} onClick={() => { setTab("promo"); setBuka(null); setGalat({}); }}>Kode promo {promo.length}</button>
        <button type="button" role="tab" aria-selected={tab === "referral"} className={tab === "referral" ? "on" : ""} onClick={() => { setTab("referral"); setBuka(null); setGalat({}); }}>Referral {referral.length}</button>
      </div>
      <p className="meta" style={{ margin: 0 }}>Pemakaian dihitung saat tagihan lunas, jadi murid yang batal bayar tidak menghabiskan kuota.</p>

      {tampil.length === 0 ? (
        <div className="surface kosong">
          <span className="circ"><Icon name="tag" /></span>
          <h2 className="h2">{tab === "promo" ? "Belum ada kode promo" : "Belum ada kode referral"}</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>{tab === "promo" ? "Buat kode untuk diskon pendaftaran." : "Beri murid kode sendiri supaya bisa mengajak teman."}</p>
        </div>
      ) : (
        <div className="surface batas batas-tinggi">
          {tampil.map((p) => {
            const s = statusPromo(p, hariIni);
            const terbuka = buka === p.id;
            const log = pemakaian.filter((u) => u.kode === p.kode).slice(0, 3);
            return (
              <div key={p.id} className="baris">
                <button type="button" className="item buka" style={{ padding: "14px 16px", width: "100%" }} aria-expanded={terbuka} onClick={() => { setBuka(terbuka ? null : p.id); setHapus(null); }}>
                  <span className="grow" style={{ textAlign: "left" }}>
                    <span className="name" style={{ display: "block", letterSpacing: "0.04em" }}>{p.kode}</span>
                    <span className="meta">{ringkasNilai(p)}{p.pemilik ? ` · ${p.pemilik}` : ""} · {p.terpakai}{p.kuota !== null ? `/${p.kuota}` : ""} dipakai</span>
                  </span>
                  <span className={label[s].kelas}>{label[s].teks}</span>
                </button>
                {terbuka && (
                  <div className="detail">
                    <dl>
                      <dt>Potongan</dt><dd><b>{ringkasNilai(p)}</b></dd>
                      <dt>Batas pakai</dt><dd>{p.kuota === null ? "Tanpa batas" : `${p.kuota} kali`}</dd>
                      <dt>Berlaku sampai</dt><dd>{p.kedaluwarsa ? tglPendek(p.kedaluwarsa) : "Tanpa batas"}</dd>
                    </dl>
                    <div>
                      <div className="label" style={{ color: "var(--text-2)", marginBottom: 6 }}>Pemakaian terakhir</div>
                      {log.length === 0 ? <p className="meta" style={{ margin: 0 }}>Belum ada yang memakai.</p> : log.map((u) => (
                        <div key={u.id} className="sum"><span>{u.nama} · {tglPendek(u.tgl)}</span><span className="sub">−{rp(u.potongan)}</span></div>
                      ))}
                    </div>
                    <div className="aksi">
                      <button type="button" className="btn btn-2 btn-sm" disabled={!bolehUbah || sibuk} onClick={() => alihAktif(p)}>{p.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      {hapus === p.id ? (
                        <>
                          <button type="button" className="btn btn-2 btn-sm" disabled={!bolehUbah || sibuk} onClick={() => hapusKode(p)}>Ya, hapus</button>
                          <button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(null)}>Batal</button>
                        </>
                      ) : <button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(p.id)}>Hapus</button>}
                    </div>
                    {hapus === p.id && p.terpakai > 0 && <p className="meta" style={{ margin: 0 }}>Kode ini sudah dipakai {p.terpakai} kali. Riwayat pemakaian ikut hilang; lebih aman dinonaktifkan.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "promo" ? (
        formBuka ? (
          <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); buat(); }} noValidate>
            <h2 className="h2">Kode baru</h2>
            <label className="field"><span className="label l2">Kode</span>
              <input value={form.kode} onChange={(e) => { setForm({ ...form, kode: e.target.value.toUpperCase() }); bersih("kode"); }} placeholder="HEMAT20" autoCapitalize="characters" spellCheck={false} /><E k="kode" /></label>
            <div className="seg" role="radiogroup" aria-label="Jenis potongan">
              {(["persen", "nominal"] as const).map((j) => <button key={j} type="button" role="radio" aria-checked={form.jenis === j} className={form.jenis === j ? "on" : ""} onClick={() => setForm({ ...form, jenis: j })}>{j === "persen" ? "Persen (%)" : "Nominal (Rp)"}</button>)}
            </div>
            <label className="field"><span className="label l2">{form.jenis === "persen" ? "Potongan (%)" : "Potongan (Rp)"}</span>
              <input inputMode="numeric" value={form.nilai} onChange={(e) => { setForm({ ...form, nilai: e.target.value.replace(/\D/g, "") }); bersih("nilai"); }} /><E k="nilai" /></label>
            <div style={{ display: "flex", gap: 12 }}>
              <label className="field" style={{ flex: 1 }}><span className="label l2">Batas pakai</span>
                <input inputMode="numeric" value={form.kuota} placeholder="Tanpa batas" onChange={(e) => { setForm({ ...form, kuota: e.target.value.replace(/\D/g, "") }); bersih("kuota"); }} /><E k="kuota" /></label>
              <label className="field" style={{ flex: 1 }}><span className="label l2">Berlaku sampai</span>
                <input type="date" min={hariIni} value={form.kedaluwarsa} onChange={(e) => { setForm({ ...form, kedaluwarsa: e.target.value }); bersih("kedaluwarsa"); }} /><E k="kedaluwarsa" /></label>
            </div>
            <div className="aksi"><button type="submit" className="btn">Simpan kode</button><button type="button" className="btn btn-2" onClick={() => { setFormBuka(false); setGalat({}); }}>Batal</button></div>
          </form>
        ) : <button type="button" className="btn" onClick={() => setFormBuka(true)}>Buat kode baru</button>
      ) : (
        <div className="surface kartu-form">
          <h2 className="h2">Kode referral baru</h2>
          <label className="field"><span className="label l2">Murid</span>
            <select value={pilihMurid} onChange={(e) => { setPilihMurid(e.target.value); bersih("murid"); }}>
              <option value="">{belumPunya.length === 0 ? "Semua murid sudah punya kode" : "Pilih murid"}</option>
              {belumPunya.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select><E k="murid" /></label>
          <label className="field"><span className="label l2">Potongan untuk teman yang diajak (Rp)</span>
            <input inputMode="numeric" value={potonganRef} onChange={(e) => { setPotonganRef(e.target.value.replace(/\D/g, "")); bersih("potongan"); }} /><E k="potongan" /></label>
          <button type="button" className="btn" disabled={belumPunya.length === 0} onClick={buatReferral}>Buat kode referral</button>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
