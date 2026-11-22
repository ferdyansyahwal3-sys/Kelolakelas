"use client";
import { Fragment, useEffect, useState } from "react";
import { HARGA } from "@/lib/langganan";
import { hargaSetelahPromo, pemakaianPromo, statusPromo, type GalatPromo } from "@/lib/platform";
import { usePlatform } from "./PlatformProvider";
import { kelasPromo, labelPromo, tgl, useRp } from "./umum";

const KOSONG = { kode: "", jenis: "persen" as "persen" | "nominal", nilai: "", kuota: "", kedaluwarsa: "", berlakuBulan: "1" };

export function PromoPlatformView() {
  const p = usePlatform();
  const rp = useRp();
  const [form, setForm] = useState(KOSONG);
  const [galat, setGalat] = useState<GalatPromo>({});
  const [formBuka, setFormBuka] = useState(false);
  const [laporan, setLaporan] = useState<string | null>(null);
  const [hapus, setHapus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const baris = p.promo.map((x) => ({ x, ...pemakaianPromo(x.kode, p.tagihan) })).map((r) => ({ ...r, status: statusPromo(r.x, r.terpakai, p.hari) }));
  const totalPotongan = baris.reduce((n, r) => n + r.totalPotongan, 0);
  const nilaiNum = Number(form.nilai.replace(/\D/g, ""));

  function simpan() {
    const h = p.buatPromo({ kode: form.kode, jenis: form.jenis, nilai: form.nilai === "" ? 0 : nilaiNum, kuota: form.kuota.trim() === "" ? null : Number(form.kuota.replace(/\D/g, "")), kedaluwarsa: form.kedaluwarsa || null, berlakuBulan: Number(form.berlakuBulan) });
    if (!h.ok) { setGalat(h.galat); return; }
    setToast(`Promo ${form.kode.trim().toUpperCase()} dibuat.`);
    setForm(KOSONG); setGalat({}); setFormBuka(false);
  }
  const set = <K extends keyof typeof KOSONG>(k: K, v: (typeof KOSONG)[K]) => { setForm({ ...form, [k]: v }); setGalat((g) => ({ ...g, [k === "berlakuBulan" ? "berlakuBulan" : k]: undefined })); };
  const contohHarga = (jenis: "persen" | "nominal", n: number) => hargaSetelahPromo("pro", n > 0 ? { jenis, nilai: n } : null);

  return (
    <>
      <div className="plat-head">
        <div><div className="label">Pemilik platform</div><h1 className="title">Promo langganan</h1></div>
        <button type="button" className="btn btn-sm" onClick={() => setFormBuka(!formBuka)} aria-expanded={formBuka}>{formBuka ? "Tutup form" : "Buat kode promo"}</button>
      </div>

      <section className="plat-kpis">
        <div className="surface plat-kpi"><span className="meta">Kode aktif</span><span className="angka">{baris.filter((r) => r.status === "aktif").length}</span><span className="meta">dari {baris.length} kode</span></div>
        <div className="surface plat-kpi"><span className="meta">Dipakai (tagihan lunas)</span><span className="angka">{baris.reduce((n, r) => n + r.terpakai, 0)}</span><span className="meta">kuota tidak terpotong sebelum bayar</span></div>
        <div className="surface plat-kpi"><span className="meta">Total potongan</span><span className="angka">{rp(totalPotongan)}</span><span className="meta">harga normal dikurangi yang dibayar</span></div>
      </section>

      {formBuka && (
        <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); simpan(); }} noValidate>
          <h2 className="h2">Kode promo baru</h2>
          <div className="plat-form" style={{ padding: 0, background: "none", border: 0 }}>
            <label className="field"><span className="label l2">Kode</span><input value={form.kode} onChange={(e) => set("kode", e.target.value.toUpperCase())} placeholder="HEMAT30" maxLength={16} />{galat.kode && <span className="galat" role="alert">{galat.kode}</span>}</label>
            <label className="field"><span className="label l2">Jenis</span><select value={form.jenis} onChange={(e) => set("jenis", e.target.value as "persen" | "nominal")}><option value="persen">Persen (%)</option><option value="nominal">Nominal (Rp)</option></select></label>
            <label className="field"><span className="label l2">Nilai {form.jenis === "persen" ? "(%)" : "(Rp)"}</span><input value={form.nilai} inputMode="numeric" onChange={(e) => set("nilai", e.target.value.replace(/\D/g, ""))} placeholder={form.jenis === "persen" ? "20" : "25000"} />{galat.nilai && <span className="galat" role="alert">{galat.nilai}</span>}</label>
            <label className="field"><span className="label l2">Kuota (kosong = tanpa batas)</span><input value={form.kuota} inputMode="numeric" onChange={(e) => set("kuota", e.target.value.replace(/\D/g, ""))} placeholder="20" />{galat.kuota && <span className="galat" role="alert">{galat.kuota}</span>}</label>
            <label className="field"><span className="label l2">Berlaku sampai (opsional)</span><input type="date" min={p.hari} value={form.kedaluwarsa} onChange={(e) => set("kedaluwarsa", e.target.value)} />{galat.kedaluwarsa && <span className="galat" role="alert">{galat.kedaluwarsa}</span>}</label>
            <label className="field"><span className="label l2">Potongan berlaku (bulan)</span><input value={form.berlakuBulan} inputMode="numeric" onChange={(e) => set("berlakuBulan", e.target.value.replace(/\D/g, ""))} />{galat.berlakuBulan && <span className="galat" role="alert">{galat.berlakuBulan}</span>}</label>
          </div>
          {nilaiNum > 0 && <p className="meta" style={{ margin: 0 }}>Contoh paket Pro {rp(HARGA.pro)}: bayar {rp(contohHarga(form.jenis, nilaiNum).bayar)} per bulan selama {form.berlakuBulan || 1} bulan pertama.</p>}
          <div className="aksi"><button type="submit" className="btn btn-sm">Simpan promo</button><button type="button" className="btn btn-2 btn-sm" onClick={() => { setFormBuka(false); setGalat({}); }}>Batal</button></div>
        </form>
      )}

      <div className="surface plat-wrap batas-tabel">
        <table className="plat-tbl">
          <thead><tr><th>Kode</th><th>Diskon</th><th>Terpakai</th><th>Berlaku</th><th>Sampai</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {baris.map(({ x, terpakai, totalPotongan: pot, status }) => (
              <Fragment key={x.id}>
                <tr>
                  <td className="utama"><b style={{ letterSpacing: "0.05em" }}>{x.kode}</b></td>
                  <td data-label="Diskon">{x.jenis === "persen" ? `${x.nilai}%` : rp(x.nilai)}</td>
                  <td data-label="Terpakai">{terpakai}{x.kuota !== null ? ` / ${x.kuota}` : " · tanpa batas"}{x.kuota !== null && <div className="bar" style={{ marginTop: 6, minWidth: 80 }} aria-hidden="true"><i style={{ width: `${Math.min(100, (terpakai / x.kuota) * 100)}%` }} /></div>}</td>
                  <td data-label="Berlaku">{x.berlakuBulan} bulan</td>
                  <td data-label="Sampai">{x.kedaluwarsa ? tgl(x.kedaluwarsa) : "Tanpa batas"}</td>
                  <td data-label="Status"><span className={kelasPromo[status]}>{labelPromo[status]}</span></td>
                  <td className="aksi-sel">
                    <span className="plat-aksi">
                      <button type="button" className="btn btn-2 btn-sm" aria-expanded={laporan === x.id} onClick={() => setLaporan(laporan === x.id ? null : x.id)}>Laporan</button>
                      <button type="button" className="btn btn-2 btn-sm" onClick={() => { p.alihPromo(x.id); setToast(`${x.kode} ${x.aktif ? "dinonaktifkan" : "diaktifkan"}.`); }}>{x.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      {hapus === x.id ? (
                        terpakai > 0 ? <span className="meta">Sudah dipakai, nonaktifkan saja <button type="button" className="link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setHapus(null)}>OK</button></span> : (
                          <><button type="button" className="btn btn-2 btn-sm" onClick={() => { p.hapusPromo(x.id); setHapus(null); setToast(`${x.kode} dihapus.`); }}>Ya, hapus</button><button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(null)}>Batal</button></>
                        )
                      ) : <button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(x.id)}>Hapus</button>}
                    </span>
                  </td>
                </tr>
                {laporan === x.id && (
                  <tr><td colSpan={7} style={{ padding: 0 }}>
                    <div className="plat-form" style={{ display: "block" }}>
                      <b>Laporan pemakaian {x.kode}</b>
                      <p className="meta" style={{ margin: "4px 0 8px" }}>{terpakai} tagihan lunas · total potongan {rp(pot)}. Tagihan yang belum dibayar tidak dihitung.</p>
                      {p.tagihan.filter((t) => t.status === "lunas" && t.kodePromo === x.kode).length === 0 ? <span className="sub">Belum ada yang memakai.</span> : p.tagihan.filter((t) => t.status === "lunas" && t.kodePromo === x.kode).map((t) => (
                        <div key={t.id} className="sum"><span>{p.usaha.find((u) => u.id === t.usahaId)?.nama} · {t.orderId} · {tgl(t.dibayar)}</span><b>−{rp(t.hargaNormal - t.nominal)}</b></div>
                      ))}
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
