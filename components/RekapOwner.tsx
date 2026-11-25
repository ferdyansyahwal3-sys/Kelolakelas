"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { toCsv } from "@/lib/csv";
import { pecahRupiah, ringkasRupiah } from "@/lib/format";
import { batalkanGajiDibayar, kunciGaji, tandaiGajiDibayar, type GajiDibayar } from "@/lib/gaji";
import { bagiHasil, geserBulan, namaBulan, perPaket, perubahan, ringkasBulan, tren6, validasiNilai, type ModeBagi, type Pembayaran } from "@/lib/rekap";

type Biasa = { ok: true } | { ok: false; pesan: string };
export interface SimpanRekap { bagiHasil: (v: { mode: ModeBagi; persen: Record<string, number>; nominal: Record<string, number> }) => Promise<Biasa>; gaji: (d: GajiDibayar) => Promise<Biasa> }
interface Props { hariIni: string; dibayarAwal: GajiDibayar; pembayaran: Pembayaran[]; pengajar: { id: string; nama: string }[]; persenAwal: Record<string, number>; nominalAwal: Record<string, number>; modeAwal?: ModeBagi; bulanAwal: string; bulanMin: string; simpan?: SimpanRekap }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

export function RekapOwner({ hariIni, dibayarAwal, pembayaran, pengajar, persenAwal, nominalAwal, modeAwal = "persen", bulanAwal, bulanMin, simpan }: Props) {
  const [bulan, setBulan] = useState(bulanAwal);
  const [mode, setMode] = useState<ModeBagi>(modeAwal);
  const [nilai, setNilai] = useState<Record<ModeBagi, Record<string, number>>>({ persen: persenAwal, nominal: nominalAwal });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [dibayar, setDibayar] = useState<GajiDibayar>(dibayarAwal);
  const [bukaGaji, setBukaGaji] = useState<string | null>(null);
  const [tglGaji, setTglGaji] = useState("");
  const [galatGaji, setGalatGaji] = useState("");

  // Bagi hasil dan status gaji disimpan di perangkat ini supaya halaman pelatih di perangkat yang sama membaca angka yang sama.
  useEffect(() => {
    if (simpan) return; // panel asli: nilai awal datang dari database
    try {
      const b = JSON.parse(localStorage.getItem("kk-bagi-hasil") ?? "null") as { mode?: ModeBagi; nilai?: Record<ModeBagi, Record<string, number>> } | null;
      if (b?.mode === "persen" || b?.mode === "nominal") setMode(b.mode);
      if (b?.nilai?.persen && b.nilai.nominal) setNilai({ persen: { ...persenAwal, ...b.nilai.persen }, nominal: { ...nominalAwal, ...b.nilai.nominal } });
      const g = JSON.parse(localStorage.getItem("kk-gaji-dibayar") ?? "null") as GajiDibayar | null;
      if (g && typeof g === "object" && !Array.isArray(g)) setDibayar(g);
    } catch {}
  }, [persenAwal, nominalAwal, simpan]);
  const awalMuat = useRef(true);
  useEffect(() => {
    if (simpan) {
      if (awalMuat.current) { awalMuat.current = false; return; }
      const t = setTimeout(async () => {
        const r = await simpan.bagiHasil({ mode, persen: nilai.persen, nominal: nilai.nominal });
        if (!r.ok) { setToast(r.pesan); setTimeout(() => setToast(""), 3500); }
      }, 700);
      return () => clearTimeout(t);
    }
    try { localStorage.setItem("kk-bagi-hasil", JSON.stringify({ mode, nilai })); } catch {}
  }, [mode, nilai, simpan]);
  const simpanDibayar = async (d: GajiDibayar) => {
    if (simpan) {
      const r = await simpan.gaji(d);
      if (!r.ok) { setGalatGaji(r.pesan); return; }
    }
    setDibayar(d);
    if (!simpan) { try { localStorage.setItem("kk-gaji-dibayar", JSON.stringify(d)); } catch {} }
  };

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
          <div className="surface batas">
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
              {bulan < bulanAwal && b.bagianPengajar > 0 && (() => {
                const tgl = dibayar[kunciGaji(b.id, bulan)];
                if (tgl) return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span className="st st-ok">Gaji sudah dibayar · {new Date(tgl).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                    <button type="button" className="btn btn-2 btn-sm" onClick={() => simpanDibayar(batalkanGajiDibayar(dibayar, b.id, bulan))}>Batalkan tanda</button>
                  </div>
                );
                if (bukaGaji === b.id) return (
                  <div className="form-catatan">
                    <label className="field"><span className="label l2">Tanggal uang masuk ke {b.nama}</span>
                      <input type="date" value={tglGaji} min={`${bulan}-01`} max={hariIni} onChange={(e) => { setTglGaji(e.target.value); setGalatGaji(""); }} />
                      {galatGaji && <span className="galat" role="alert">{galatGaji}</span>}</label>
                    <div className="aksi">
                      <button type="button" className="btn btn-sm" onClick={() => { const h = tandaiGajiDibayar(dibayar, b.id, bulan, tglGaji, hariIni, bulanAwal); if (!h.ok) { setGalatGaji(h.galat); return; } simpanDibayar(h.dibayar); setBukaGaji(null); setToast(`Gaji ${b.nama} ${namaBulan(bulan)} ditandai sudah dibayar.`); setTimeout(() => setToast(""), 3500); }}>Simpan</button>
                      <button type="button" className="btn btn-2 btn-sm" onClick={() => { setBukaGaji(null); setGalatGaji(""); }}>Batal</button>
                    </div>
                  </div>
                );
                return <button type="button" className="btn btn-2 btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => { setBukaGaji(b.id); setTglGaji(hariIni); setGalatGaji(""); }}>Tandai gaji {namaBulan(bulan)} sudah dibayar</button>;
              })()}
            </div>
          ))}
          <div className="item" style={{ justifyContent: "space-between" }}><b>Bersih untuk owner</b><b>{rp(bagi.ownerTotal)}</b></div>
        </div>
        <p className="meta" style={{ margin: 0 }}>{mode === "persen" ? "Persen dari omzet murid tiap pengajar, dibulatkan ke bawah." : "Nominal tetap per bulan untuk tiap pengajar, tidak melebihi omzetnya."} {simpan ? "Diatur owner dan tersimpan di akun usahamu." : "Diatur owner, dan hanya berlaku di halaman ini (demo)."}</p>
      </section>

      <button type="button" className="btn btn-2" onClick={unduh} disabled={ini.jumlah === 0}>Unduh rekap {namaBulan(bulan)} (CSV)</button>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
