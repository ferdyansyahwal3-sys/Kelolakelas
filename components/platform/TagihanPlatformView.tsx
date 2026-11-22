"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { toCsv } from "@/lib/csv";
import { jatuhTempoMinggu, linkPengingatWa, pendapatanBulan, saringTagihan, telat, type FilterTagihan } from "@/lib/platform";
import { FormAktivasi } from "./FormAktivasi";
import { usePlatform } from "./PlatformProvider";
import { kelasTagihan, labelTagihan, tgl, unduhCsv, useRp } from "./umum";

const FILTER: { id: FilterTagihan; label: string }[] = [
  { id: "semua", label: "Semua" }, { id: "belum_bayar", label: "Belum bayar" }, { id: "telat", label: "Telat" }, { id: "lunas", label: "Lunas" }, { id: "kedaluwarsa", label: "Kedaluwarsa" }, { id: "batal", label: "Batal" },
];

export function TagihanPlatformView() {
  const p = usePlatform();
  const rp = useRp();
  const [filter, setFilter] = useState<FilterTagihan>("semua");
  const [q, setQ] = useState("");
  const [buka, setBuka] = useState<string | null>(null);
  const [toast, setToast] = useState<{ teks: string; galat: boolean } | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3800); return () => clearTimeout(t); }, [toast]);

  const hasil = saringTagihan(p.tagihan, p.usaha, q, filter, p.hari);
  const ini = pendapatanBulan(p.tagihan, p.hari.slice(0, 7));
  const belum = p.tagihan.filter((t) => t.status === "belum_bayar");
  const terlambat = belum.filter((t) => telat(t, p.hari));
  const minggu = jatuhTempoMinggu(p.tagihan, p.hari);
  const jumlah = (f: FilterTagihan) => (f === "semua" ? p.tagihan.length : f === "telat" ? terlambat.length : p.tagihan.filter((t) => t.status === f).length);
  const usahaDari = (id: string) => p.usaha.find((u) => u.id === id)!;

  function ekspor() {
    unduhCsv(`tagihan-${p.hari}.csv`, toCsv(hasil, [
      { judul: "Order", ambil: (t) => t.orderId }, { judul: "Usaha", ambil: (t) => usahaDari(t.usahaId).nama }, { judul: "Paket", ambil: (t) => t.plan }, { judul: "Bulan", ambil: (t) => t.bulan },
      { judul: "Harga normal", ambil: (t) => t.hargaNormal }, { judul: "Nominal", ambil: (t) => t.nominal }, { judul: "Kode promo", ambil: (t) => t.kodePromo }, { judul: "Status", ambil: (t) => (telat(t, p.hari) ? "telat" : t.status) },
      { judul: "Terbit", ambil: (t) => t.terbit }, { judul: "Jatuh tempo", ambil: (t) => t.tempo }, { judul: "Dibayar", ambil: (t) => t.dibayar }, { judul: "Metode", ambil: (t) => t.metode },
    ]));
  }

  function ingatkan(e: React.MouseEvent, tId: string) {
    const h = p.catatPengingat(tId, "wa");
    if (!h.ok) { e.preventDefault(); setToast({ teks: h.galat, galat: true }); }
  }

  return (
    <>
      <div className="plat-head">
        <div><div className="label">Pemilik platform</div><h1 className="title">Tagihan</h1></div>
        <button type="button" className="btn btn-2 btn-sm" onClick={ekspor} disabled={hasil.length === 0}>Ekspor CSV ({hasil.length})</button>
      </div>

      <section className="plat-kpis" aria-label="Ringkasan tagihan">
        <div className="surface plat-kpi"><span className="meta">Pendapatan bulan ini</span><span className="angka">{rp(ini.total)}</span><span className="meta">{ini.jumlah} tagihan lunas</span></div>
        <div className="surface plat-kpi"><span className="meta">Belum dibayar</span><span className="angka">{rp(belum.reduce((n, t) => n + t.nominal, 0))}</span><span className="meta">{belum.length} tagihan · {terlambat.length} telat</span></div>
        <div className="surface plat-kpi"><span className="meta">Jatuh tempo minggu ini</span><span className="angka">{minggu.length}</span><span className="meta">{minggu.length === 0 ? "tidak ada" : `${rp(minggu.reduce((n, t) => n + t.nominal, 0))} · ${minggu.map((t) => usahaDari(t.usahaId).nama).join(", ")}`}</span></div>
      </section>

      <label className="cari"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor order, usaha, atau kode promo" aria-label="Cari tagihan" /></label>
      <div className="chips" role="tablist" aria-label="Filter status tagihan">
        {FILTER.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? "chip on" : "chip"} onClick={() => setFilter(f.id)}>{f.label} · {jumlah(f.id)}</button>)}
      </div>

      <div className="surface plat-wrap batas-tabel">
        {hasil.length === 0 ? <div className="kosong"><h2 className="h2">Tidak ada tagihan yang cocok</h2><button type="button" className="btn btn-2" onClick={() => { setQ(""); setFilter("semua"); }}>Reset filter</button></div> : (
          <table className="plat-tbl">
            <thead><tr><th>Order</th><th>Usaha</th><th>Paket</th><th className="num">Nominal</th><th>Tempo</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {hasil.map((t) => {
                const u = usahaDari(t.usahaId);
                const wa = t.status === "belum_bayar" ? linkPengingatWa(u, t, p.hari) : null;
                return (
                  <Fragment key={t.id}>
                    <tr>
                      <td className="utama"><b>{t.orderId}</b><span className="meta" style={{ display: "block" }}>Terbit {tgl(t.terbit)}</span></td>
                      <td data-label="Usaha"><Link href={`/platform/usaha/${u.id}`} className="link">{u.nama}</Link></td>
                      <td data-label="Paket">{t.plan === "pro" ? "Pro" : "Starter"} · {t.bulan === 12 ? "1 tahun" : `${t.bulan} bln`}{t.kodePromo && <span className="meta"> · {t.kodePromo}</span>}</td>
                      <td data-label="Nominal" className="num">{rp(t.nominal)}{t.nominal < t.hargaNormal && <span className="meta" style={{ display: "block" }}>normal {rp(t.hargaNormal)}</span>}</td>
                      <td data-label="Tempo">{tgl(t.tempo)}</td>
                      <td data-label="Status"><span className={kelasTagihan[t.status]}>{telat(t, p.hari) ? "Telat" : labelTagihan[t.status]}</span></td>
                      <td className="aksi-sel">
                        {(t.status === "belum_bayar" || t.status === "kedaluwarsa") && (
                          <span className="plat-aksi">
                            <button type="button" className="btn btn-sm" aria-expanded={buka === t.id} onClick={() => setBuka(buka === t.id ? null : t.id)}>Aktivasi manual</button>
                            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-2 btn-sm" onClick={(e) => ingatkan(e, t.id)}><Icon name="wa" />WA</a>}
                            {t.status === "belum_bayar" && <button type="button" className="btn btn-2 btn-sm" disabled title="Butuh Resend, belum tersambung">Email</button>}
                          </span>
                        )}
                        {t.status === "lunas" && <span className="meta">{t.metode === "transfer_bank" ? `Transfer · ${t.referensi ?? ""}` : "DuitKu"} · {tgl(t.dibayar)}</span>}
                      </td>
                    </tr>
                    {buka === t.id && <tr><td colSpan={7} style={{ padding: 0 }}><FormAktivasi tagihan={t} usaha={u} onBatal={() => setBuka(null)} onSelesai={(m) => { setBuka(null); setToast({ teks: m, galat: false }); }} /></td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="meta" style={{ margin: 0 }}>Kuota promo dihitung saat tagihan lunas. Pengingat WA maksimal sekali per 24 jam per tagihan. Pengingat email butuh Resend dan belum tersambung.</p>
      {toast && <div className="toast" role={toast.galat ? "alert" : "status"}>{toast.teks}</div>}
    </>
  );
}
