"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { pecahRupiah } from "@/lib/format";
import { BANDING, JENIS, PAKET, fasePromo, hargaPeriode, persenHemat, rupiah, singkatRupiah, type Jenis, type KonfigPromo, type Sel as NilaiSel } from "@/lib/paketLangganan";
import { useWaktu } from "./useWaktu";

type Periode = "bulanan" | "tahunan";

function Angka({ n }: { n: number }) {
  const p = pecahRupiah(n);
  return <span className="h-nilai"><span className="h-rp">Rp</span><span className="big h-angka">{p.depan}<span className="dim">{p.belakang}</span></span></span>;
}

function Nilai({ v }: { v: NilaiSel }) {
  if (v === true) return <><Icon name="check" className="ic h-ya" /><span className="sr">Ya</span></>;
  if (v === false) return <><span aria-hidden="true">–</span><span className="sr">Tidak ada</span></>;
  return <>{v}</>;
}

export function HargaPaket({ konfig, awalMs, jenisAwal = "guru_les", tanpaBanding = false }: { konfig: KonfigPromo | null; awalMs: number; jenisAwal?: Jenis; tanpaBanding?: boolean }) {
  const [jenis, setJenis] = useState<Jenis>(jenisAwal);
  const [periode, setPeriode] = useState<Periode>("bulanan");
  const now = useWaktu(awalMs);
  const promo = fasePromo(now, konfig).aktif;
  const paket = JENIS[jenis].paket;

  return (
    <div className="h-blok">
      <div className="h-kontrol">
        <div className="seg h-seg" role="tablist" aria-label="Jenis pengguna">
          {(Object.keys(JENIS) as Jenis[]).map((j) => (
            <button key={j} type="button" role="tab" aria-selected={jenis === j} className={jenis === j ? "on" : ""} onClick={() => setJenis(j)}>
              {JENIS[j].nama}
            </button>
          ))}
        </div>
        <div className="seg h-seg" role="tablist" aria-label="Periode bayar">
          <button type="button" role="tab" aria-selected={periode === "bulanan"} className={periode === "bulanan" ? "on" : ""} onClick={() => setPeriode("bulanan")}>Bulanan</button>
          <button type="button" role="tab" aria-selected={periode === "tahunan"} className={periode === "tahunan" ? "on" : ""} onClick={() => setPeriode("tahunan")}>Tahunan · gratis 2 bulan</button>
        </div>
      </div>
      <p className="h-untuk">{jenis === "guru_les" ? "Untuk kamu yang mengajar sendiri, tanpa pelatih lain." : "Untuk pemilik yang punya pelatih lain: tim, bagi hasil, dan jadwal per pelatih."}</p>

      <div className="h-grid">
        {paket.map((key) => {
          const p = PAKET[key];
          const h = hargaPeriode(key, periode, now, konfig);
          const satuan = periode === "bulanan" ? "/bulan" : "/tahun";
          return (
            <article key={key} className={`h-kartu ${p.sorot ? "panel h-sorot" : "surface"}`} aria-labelledby={`h-${key}`}>
              {p.sorot && <span className="h-badge">Paling dipilih</span>}
              <h3 id={`h-${key}`} className="h-nama">{p.nama}</h3>
              <p className="h-tag">{p.tagline}</p>
              <div className="h-harga">
                {promo && h.promo && (
                  <div className="h-baris-coret">
                    <s className="h-coret" aria-label={`Harga normal ${rupiah(h.normalTotal)}`}>{rupiah(h.normalTotal)}</s>
                    <span className="h-hemat">Hemat {persenHemat(key)}%</span>
                  </div>
                )}
                <div className="h-baris-angka"><Angka n={h.total} /><span className="meta">{satuan}</span></div>
                <span className="meta h-ket">
                  {periode === "tahunan" ? `Setara ${singkatRupiah(Math.round(h.total / 12))}/bulan · bayar 10 bulan untuk 12` : promo && h.promo ? "Harga promo peluncuran" : "Harga normal"}
                </span>
              </div>
              <Link href={`/checkout?paket=${key}&periode=${periode}`} className={`btn ${p.sorot ? "" : "btn-2"} h-cta`}>Lanjut ke checkout</Link>
              <ul className="h-list">
                {p.sorotan.map((s) => (
                  <li key={s}><Icon name="check" className="ic h-ya" /><span>{s}</span></li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {!tanpaBanding && <details className="surface h-banding">
        <summary>Bandingkan semua fitur</summary>
        <div className="h-tabel" tabIndex={0} role="region" aria-label={`Perbandingan paket ${JENIS[jenis].nama}`}>
          <table>
            <thead>
              <tr><th scope="col"><span className="sr">Fitur</span></th>{paket.map((k) => <th key={k} scope="col">{PAKET[k].nama}</th>)}</tr>
            </thead>
            {BANDING[jenis].map((g) => (
              <tbody key={g.judul}>
                <tr className="h-grup"><th scope="rowgroup" colSpan={4}>{g.judul}</th></tr>
                {g.baris.map((b) => (
                  <tr key={b.label}>
                    <th scope="row">{b.label}{b.segera && <span className="h-segera">segera hadir</span>}</th>
                    {b.nilai.map((v, i) => <td key={i}><Nilai v={v} /></td>)}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </details>}
    </div>
  );
}
