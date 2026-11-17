"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { toCsv } from "@/lib/csv";
import { pecahRupiah, ringkasRupiah } from "@/lib/format";
import { bagiHasil, geserBulan, namaBulan, perPaket, perubahan, ringkasBulan, tren6, validasiNilai, type ModeBagi, type Pembayaran } from "@/lib/rekap";

interface Props { pembayaran: Pembayaran[]; pengajar: { id: string; nama: string }[]; persenAwal: Record<string, number>; nominalAwal: Record<string, number>; bulanAwal: string; bulanMin: string }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

export function RekapOwner({ pembayaran, pengajar, persenAwal, nominalAwal, bulanAwal, bulanMin }: Props) {
  const [bulan, setBulan] = useState(bulanAwal);
  const [mode, setMode] = useState<ModeBagi>("persen");
  const [nilai, setNilai] = useState<Record<ModeBagi, Record<string, number>>>({ persen: persenAwal, nominal: nominalAwal });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const ini = ringkasBulan(pembayaran, bulan);
  const lalu = ringkasBulan(pembayaran, geserBulan(bulan, -1));
  const delta = perubahan(ini.total, lalu.total);
  const tren = tren6(pembayaran, bulanAwal);
  const maks = Math.max(1, ...tren.map((t) => t.total));
  const paket = perPaket(pembayaran, bulan);
  const bagi = bagiHasil(pembayaran, bulan, pengajar.map((p) => ({ id: p.id, nama: p.nama, nilai: nilai[mode][p.id] ?? 0 })), mode);
  const bisaMundur = geserBulan(bulan, -1) >= bulanMin;
  const bisaMaju = geserBulan(bulan, 1) <= bulanAwal;

  function ganti(m: ModeBagi) {
    setMode(m);
    setGalat({});
  }

  function ubahNilai(id: string, el: HTMLInputElement) {
    const digit = el.value.replace(/\D/g, "");
    if (mode === "nominal") el.value = digit === "" ? "" : new Intl.NumberFormat("id-ID").format(Number(digit));
    const n = digit === "" ? 0 : Number(digit);
    const e = validasiNilai(n, mode);
    setGalat((g) => { const x = { ...g }; if (e) x[id] = e; else delete x[id]; return x; });
    if (!e) setNilai((v) => ({ ...v, [mode]: { ...v[mode], [id]: n } }));
  }

  function unduh() {
    const isi = toCsv(pembayaran.filter((p) => p.tgl.startsWith(bulan)), [
      { judul: "Tanggal", ambil: (p) => p.tgl }, { judul: "Nama", ambil: (p) => p.nama }, { judul: "Paket", ambil: (p) => p.paket },
      { judul: "Pengajar", ambil: (p) => pengajar.find((g) => g.id === p.pengajarId)?.nama }, { judul: "Nominal", ambil: (p) => p.nominal },
    ]);
    const url = URL.createObjectURL(new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `rekap-${bulan}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(`rekap-${bulan}.csv diunduh.`);
    setTimeout(() => setToast(""), 3500);
  }

  return (
    <>
      <div className="bulan" role="group" aria-label="Pilih bulan">
        <button type="button" className="circ" onClick={() => setBulan(geserBulan(bulan, -1))} disabled={!bisaMundur} aria-label="Bulan sebelumnya"><Icon name="back" /></button>
        <b aria-live="polite">{namaBulan(bulan)}</b>
        <button type="button" className="circ" onClick={() => setBulan(geserBulan(bulan, 1))} disabled={!bisaMaju} aria-label="Bulan berikutnya"><Icon name="arrow" /></button>
      </div>

      <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="meta">Pemasukan {namaBulan(bulan)}</span>
        <div className="big" style={{ color: "var(--panel-text)" }}>{rp(ini.total)}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {delta === null ? <span className="st st-ok">Tanpa pembanding</span>
            : <span className={delta >= 0 ? "st st-few" : "st st-free"}>{delta >= 0 ? "Naik" : "Turun"} {Math.abs(delta)}% dari bulan lalu</span>}
          <span className="meta">{ini.jumlah} pembayaran · rata-rata {ringkasRupiah(ini.rata)}</span>
        </div>
      </div>

      <section className="grp">
        <h2 className="h2">Tren 6 bulan</h2>
        <div className="surface" style={{ padding: "16px 12px 10px" }}>
          <svg viewBox="0 0 300 150" role="img" aria-label={`Pemasukan 6 bulan terakhir: ${tren.map((t) => `${namaBulan(t.bulan)} ${ringkasRupiah(t.total)}`).join(", ")}`} style={{ width: "100%", height: "auto", display: "block" }}>
            {tren.map((t, i) => {
              const h = Math.round((t.total / maks) * 96);
              const x = 10 + i * 48;
              const aktif = t.bulan === bulan;
              return (
                <g key={t.bulan} role="button" tabIndex={0} aria-label={`${namaBulan(t.bulan)}: ${rp(t.total)}`} style={{ cursor: "pointer" }}
                  onClick={() => setBulan(t.bulan)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBulan(t.bulan); } }}>
                  <rect x={x} y={20} width={38} height={110} fill="transparent" />
                  <rect x={x} y={130 - Math.max(h, 2)} width={38} height={Math.max(h, 2)} rx={8} className={aktif ? "bar-on" : "bar-off"} />
                  <text x={x + 19} y={130 - Math.max(h, 2) - 6} textAnchor="middle" className="bar-nilai" opacity={aktif ? 1 : 0}>{ringkasRupiah(t.total)}</text>
                  <text x={x + 19} y={146} textAnchor="middle" className="bar-label">{namaBulan(t.bulan).slice(0, 3)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Per paket</h2>
        {paket.length === 0 ? <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada pembayaran di bulan ini.</p> : (
          <div className="surface">
            {paket.map((p) => (
              <div key={p.paket} className="item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="name">{p.paket}</span><b>{ringkasRupiah(p.total)}</b>
                </div>
                <div className="bar" aria-hidden="true"><i style={{ width: `${Math.round((p.total / ini.total) * 100)}%` }} /></div>
                <span className="meta">{p.jumlah} pembayaran · {Math.round((p.total / ini.total) * 100)}% dari total</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grp">
        <div className="sec-head">
          <h2 className="h2">Bagi hasil pengajar</h2>
          <select className="pilih" aria-label="Cara hitung bagi hasil" value={mode} onChange={(e) => ganti(e.target.value as ModeBagi)}>
            <option value="persen">Persen (%)</option>
            <option value="nominal">Nominal (Rp)</option>
          </select>
        </div>
        <div className="surface">
          {bagi.baris.map((b) => (
            <div key={b.id} className="item" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div><div className="name">{b.nama}</div><div className="meta">Omzet murid {rp(b.omzet)}</div></div>
                <label className={mode === "persen" ? "persen" : "persen lebar"}>
                  {mode === "nominal" && <span>Rp</span>}
                  <input key={mode} inputMode="numeric" aria-label={`${mode === "persen" ? "Persen" : "Nominal"} bagi hasil ${b.nama}`}
                    defaultValue={mode === "persen" ? (nilai.persen[b.id] ?? 0) : new Intl.NumberFormat("id-ID").format(nilai.nominal[b.id] ?? 0)}
                    onChange={(e) => ubahNilai(b.id, e.target)} maxLength={mode === "persen" ? 3 : 12} />
                  {mode === "persen" && <span>%</span>}
                </label>
              </div>
              {galat[b.id] && <span className="galat" role="alert">{galat[b.id]}</span>}
              {b.melebihi && !galat[b.id] && <span className="meta">Nominal melebihi omzet bulan ini, dihitung sebesar omzetnya.</span>}
              <dl className="mini-dl"><dt>Bagian pengajar</dt><dd>{rp(b.bagianPengajar)}</dd><dt>Bagian owner</dt><dd>{rp(b.bagianOwner)}</dd></dl>
            </div>
          ))}
          <div className="item" style={{ justifyContent: "space-between" }}><b>Bersih untuk owner</b><b>{rp(bagi.ownerTotal)}</b></div>
        </div>
        <p className="meta" style={{ margin: 0 }}>{mode === "persen" ? "Persen dari omzet murid tiap pengajar, dibulatkan ke bawah." : "Nominal tetap per bulan untuk tiap pengajar, tidak melebihi omzetnya."} Diatur owner, dan baru berlaku di halaman ini sampai database tersambung.</p>
      </section>

      <button type="button" className="btn btn-2" onClick={unduh} disabled={ini.jumlah === 0}>Unduh rekap {namaBulan(bulan)} (CSV)</button>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
