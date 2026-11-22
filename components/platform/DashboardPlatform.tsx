"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/Icon";
import { ringkasRupiah } from "@/lib/format";
import { hitungMrr, komposisiPaket, geserBulan, hitungPerFase, jatuhTempoMinggu, konversiTrial, pendapatanBulan, perluPerhatian, tren, linkPengingatWa } from "@/lib/platform";
import type { Fase } from "@/lib/langganan";
import { kelasFase, labelFase, tgl, useRp, waktuAudit } from "./umum";
import { usePlatform } from "./PlatformProvider";
import { labelTanggal } from "@/lib/sesi";

const URUT_FASE: Fase[] = ["trial", "aktif", "jatuh_tempo", "ditangguhkan", "berhenti"];
// Nama kelas ditulis utuh supaya tidak dibuang Tailwind (kelas yang dirangkai dari variabel tidak terdeteksi).
const KELAS_TITIK: Record<Fase, string> = { trial: "f-trial", aktif: "f-aktif", jatuh_tempo: "f-jatuh_tempo", ditangguhkan: "f-ditangguhkan", berhenti: "f-berhenti" };
const JENIS_LABEL = { telat_bayar: "Telat bayar", tagihan_minggu_ini: "Jatuh tempo", trial_habis: "Trial habis", tidak_aktif: "Tidak aktif" } as const;

export function DashboardPlatform() {
  const { hari, usaha, tagihan, audit, sembunyi } = usePlatform();
  const rp = useRp();
  const bulan = hari.slice(0, 7);
  const ini = pendapatanBulan(tagihan, bulan);
  const lalu = pendapatanBulan(tagihan, geserBulan(bulan, -1));
  const delta = lalu.total === 0 ? null : Math.round(((ini.total - lalu.total) / lalu.total) * 100);
  const mrr = hitungMrr(usaha, tagihan, hari);
  const kv = konversiTrial(usaha, tagihan, hari);
  const fase = hitungPerFase(usaha, hari);
  const baruBulanIni = usaha.filter((u) => u.dibuat.startsWith(bulan)).length;
  const grafik = useMemo(() => tren(usaha, tagihan, bulan, 6), [usaha, tagihan, bulan]);
  const perhatian = perluPerhatian(usaha, tagihan, hari);
  const kp = komposisiPaket(usaha, tagihan, hari);
  const minggu = jatuhTempoMinggu(tagihan, hari);
  const maks = Math.max(...grafik.map((g) => g.pendapatan), 1);
  const namaUsaha = (id: string) => usaha.find((u) => u.id === id)?.nama ?? "";
  const aktivitas = audit.slice(0, 5);

  return (
    <>
      <div className="plat-head">
        <div>
          <div className="label">Pemilik platform · {labelTanggal(hari)}</div>
          <h1 className="title">Ringkasan</h1>
        </div>
        <Link href="/platform/usaha" className="btn btn-2 btn-sm">Semua usaha <Icon name="arrow" /></Link>
      </div>

      <section className="plat-kpis" aria-label="Angka utama">
        <div className="surface plat-kpi">
          <span className="meta">Pendapatan bulan ini</span>
          <span className="angka">{rp(ini.total)}</span>
          <span className="meta">{ini.jumlah} tagihan lunas · {delta === null ? "tanpa pembanding" : `${delta >= 0 ? "naik" : "turun"} ${Math.abs(delta)}% dari bulan lalu`}</span>
        </div>
        <div className="surface plat-kpi">
          <span className="meta">MRR (langganan aktif)</span>
          <span className="angka">{rp(mrr.aktif)}</span>
          <span className="meta">{mrr.berisiko > 0 ? `${rp(mrr.berisiko)} berisiko (jatuh tempo)` : "tidak ada yang berisiko"}</span>
        </div>
        <div className="surface plat-kpi">
          <span className="meta">Usaha berbayar aktif</span>
          <span className="angka">{fase.aktif}</span>
          <span className="meta">{fase.trial} trial · {baruBulanIni} usaha baru bulan ini</span>
        </div>
        <div className="surface plat-kpi">
          <span className="meta">Konversi trial → bayar</span>
          <span className="angka">{kv.persen === null ? "—" : `${kv.persen}%`}</span>
          <span className="meta">{kv.bayar} dari {kv.selesai} usaha yang trial-nya selesai</span>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2" style={{ color: "var(--head-text)" }}>Status usaha · {usaha.length} total</h2>
        <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="plat-bar" role="img" aria-label={URUT_FASE.map((f) => `${labelFase[f]} ${fase[f]}`).join(", ")}>
            {URUT_FASE.filter((f) => fase[f] > 0).map((f) => <i key={f} className={KELAS_TITIK[f]} style={{ width: `${(fase[f] / usaha.length) * 100}%` }} />)}
          </div>
          <div className="plat-legend">
            {URUT_FASE.map((f) => <Link key={f} href={`/platform/usaha?status=${f}`}><i className={KELAS_TITIK[f]} />{labelFase[f]} <b>{fase[f]}</b></Link>)}
            <Link href="/platform/usaha?status=tidak_aktif"><i style={{ background: "transparent", outline: "2px solid var(--text-3)" }} />Tidak aktif 7 hari <b>{fase.tidak_aktif}</b></Link>
            <Link href="/platform/usaha?status=manual"><i style={{ background: "transparent", outline: "2px dashed var(--accent-text)" }} />Diatur manual <b>{fase.manual}</b></Link>
          </div>
        </div>
      </section>

      <div className="plat-2col sama-tinggi">
        <section className="grp kiri">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Perlu perhatian · {perhatian.length}</h2>
          <div className="surface plat-list batas">
            {perhatian.length === 0 ? <div className="sub">Tidak ada yang mendesak hari ini.</div> : perhatian.map((p) => {
              const u = usaha.find((x) => x.id === p.usahaId)!;
              const t = p.tagihanId ? tagihan.find((x) => x.id === p.tagihanId) : undefined;
              const wa = t ? linkPengingatWa(u, t, hari) : null;
              return (
                <div key={`${p.jenis}${p.usahaId}`} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className="grow">
                    <span className="name" style={{ display: "block", whiteSpace: "normal" }}>{p.judul}</span>
                    <span className="meta">{p.ket}</span>
                  </span>
                  <span className={p.jenis === "telat_bayar" ? "st st-full" : p.jenis === "tidak_aktif" ? "st st-free" : "st st-few"}>{JENIS_LABEL[p.jenis]}</span>
                  <span className="plat-aksi">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-2 btn-sm" aria-label={`WA pengingat ${u.nama}`}><Icon name="wa" />WA</a>}
                    <Link href={`/platform/usaha/${u.id}`} className="btn btn-2 btn-sm">Buka</Link>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="kanan">
        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Pendapatan 6 bulan</h2>
          <div className="surface" style={{ padding: "16px 12px 10px" }}>
            <svg viewBox="0 0 300 160" role="img" aria-label={`Pendapatan 6 bulan: ${grafik.map((g) => `${g.bulan} ${ringkasRupiah(g.pendapatan)}`).join(", ")}`} style={{ width: "100%", height: "auto", display: "block" }}>
              {grafik.map((g, i) => {
                const h = Math.round((g.pendapatan / maks) * 96);
                const x = 10 + i * 48;
                const sekarang = g.bulan === bulan;
                return (
                  <g key={g.bulan}>
                    <rect x={x} y={130 - Math.max(h, 2)} width={38} height={Math.max(h, 2)} rx={8} className={sekarang ? "bar-on" : "bar-off"} />
                    <text x={x + 19} y={130 - Math.max(h, 2) - 6} textAnchor="middle" className="bar-nilai">{sembunyi ? "•••" : ringkasRupiah(g.pendapatan)}</text>
                    <text x={x + 19} y={144} textAnchor="middle" className="bar-label">{["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][Number(g.bulan.slice(5)) - 1]}</text>
                    <text x={x + 19} y={156} textAnchor="middle" className="bar-label">+{g.usahaBaru} usaha</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Paket yang dipakai</h2>
          <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <DonutPaket paket={kp.paket} />
            <ul className="donut-legenda">
              {kp.paket.map((k) => (
                <li key={k.plan}>
                  <span className={k.plan === "pro" ? "donut-titik donut-titik-pro" : "donut-titik donut-titik-starter"} aria-hidden="true" />
                  <b>{k.plan === "pro" ? "Pro" : "Starter"}</b>
                  <span className="donut-persen">{k.persenMrr}%</span>
                  <span className="meta">{k.usaha} usaha · {rp(k.mrr)}</span>
                </li>
              ))}
            </ul>
            <p className="meta" style={{ margin: 0 }}>Bagian dari MRR {rp(kp.totalMrr)}. {kp.trial} usaha masih trial dan belum dihitung.</p>
          </div>
        </section>
        </div>
      </div>

      <div className="plat-2col">
        <section className="grp">
          <div className="sec-head" style={{ color: "var(--head-text)" }}>
            <h2 className="h2">Tagihan jatuh tempo minggu ini · {minggu.length}</h2>
            <Link href="/platform/tagihan" className="link" style={{ color: "var(--head-text-2)" }}>Semua tagihan</Link>
          </div>
          <div className="surface plat-list batas">
            {minggu.length === 0 ? <div className="sub">Tidak ada tagihan yang jatuh tempo dalam 7 hari.</div> : minggu.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="grow"><span className="name" style={{ display: "block" }}>{namaUsaha(t.usahaId)}</span><span className="meta">{t.orderId} · tempo {tgl(t.tempo)}</span></span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{rp(t.nominal)}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Aktivitas admin terbaru</h2>
          <div className="surface plat-list batas">
            {aktivitas.map((a) => (
              <div key={a.id}><span className="name" style={{ display: "block", whiteSpace: "normal" }}>{a.ringkas}</span><span className="meta">{waktuAudit(a.waktu)}{a.alasan ? ` · ${a.alasan}` : ""}</span></div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}


/** Donut komposisi paket menurut bagian MRR. Sengaja tanpa teks di gambar; ringkasan angka ada di label aksesibilitas. */
function DonutPaket({ paket }: { paket: { plan: "pro" | "starter"; usaha: number; mrr: number; persenMrr: number }[] }) {
  const R = 40;
  const K = 2 * Math.PI * R;
  const total = paket.reduce((n, p) => n + p.mrr, 0);
  const KELAS = { pro: "donut-pro", starter: "donut-starter" } as const;
  let awal = 0;
  const label = total === 0 ? "Belum ada langganan berbayar" : `Komposisi paket menurut MRR: ${paket.map((p) => `${p.plan === "pro" ? "Pro" : "Starter"} ${p.persenMrr}%`).join(", ")}`;
  return (
    <svg className="donut" viewBox="0 0 100 100" role="img" aria-label={label}>
      <circle className="donut-dasar" cx="50" cy="50" r={R} fill="none" strokeWidth="14" />
      {total > 0 && paket.filter((p) => p.mrr > 0).map((p) => {
        const panjang = (p.mrr / total) * K;
        const el = <circle key={p.plan} className={KELAS[p.plan]} cx="50" cy="50" r={R} fill="none" strokeWidth="14" strokeDasharray={`${Math.max(panjang - 1.2, 0)} ${K}`} strokeDashoffset={-awal} />;
        awal += panjang;
        return el;
      })}
    </svg>
  );
}
