"use client";
import { Fragment, useEffect, useState } from "react";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { labelGaji, riwayatGaji, type GajiDibayar, type StatusGaji } from "@/lib/gaji";
import { namaBulan, type ModeBagi, type Pembayaran } from "@/lib/rekap";

export const KUNCI_BAGI = "kk-bagi-hasil";
export const KUNCI_GAJI = "kk-gaji-dibayar";

interface Props {
  pembayaran: Pembayaran[];
  pengajarId: string;
  bulanBerjalan: string;
  persenAwal: number;
  nominalAwal: number;
  dibayarAwal: GajiDibayar;
  /** Panel asli: mode bagi hasil dan angka datang dari database (localStorage diabaikan). */
  modeAwal?: ModeBagi;
  dariServer?: boolean;
}
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const KELAS: Record<StatusGaji, string> = { berjalan: "st st-few", sudah_masuk: "st st-ok", belum_masuk: "st st-free", kosong: "st st-full" };

export function GajiPelatih({ pembayaran, pengajarId, bulanBerjalan, persenAwal, nominalAwal, dibayarAwal, modeAwal = "persen", dariServer = false }: Props) {
  const [mode, setMode] = useState<ModeBagi>(modeAwal);
  const [nilai, setNilai] = useState({ persen: persenAwal, nominal: nominalAwal });
  const [dibayar, setDibayar] = useState<GajiDibayar>(dibayarAwal);
  const [buka, setBuka] = useState<string | null>(null);

  useEffect(() => {
    if (dariServer) return;
    try {
      const b = JSON.parse(localStorage.getItem(KUNCI_BAGI) ?? "null") as { mode?: ModeBagi; nilai?: { persen?: Record<string, number>; nominal?: Record<string, number> } } | null;
      if (b?.mode === "persen" || b?.mode === "nominal") setMode(b.mode);
      setNilai((n) => ({ persen: b?.nilai?.persen?.[pengajarId] ?? n.persen, nominal: b?.nilai?.nominal?.[pengajarId] ?? n.nominal }));
      const g = JSON.parse(localStorage.getItem(KUNCI_GAJI) ?? "null") as GajiDibayar | null;
      if (g && typeof g === "object" && !Array.isArray(g)) setDibayar(g);
    } catch {}
  }, [pengajarId, dariServer]);

  const riwayat = riwayatGaji(pembayaran, pengajarId, bulanBerjalan, nilai[mode], mode, dibayar, 6);
  const berjalan = riwayat[0]!;
  const terakhir = riwayat.find((r) => r.status !== "berjalan")!;
  const aturan = mode === "persen" ? `${nilai.persen}% dari omzet murid` : `nominal tetap ${rp(nilai.nominal)} per bulan`;

  return (
    <>
      <section className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="meta">Gaji {namaBulan(terakhir.bulan)}</span>
        <div className="big" style={{ color: "var(--panel-text)" }}>{rp(terakhir.bagian)}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={KELAS[terakhir.status]}>{labelGaji[terakhir.status]}{terakhir.dibayarTgl ? ` · ${tglPendek(terakhir.dibayarTgl)}` : ""}</span>
          <span className="meta">dari omzet murid {rp(terakhir.omzet)}</span>
        </div>
        {terakhir.status === "belum_masuk" && <p className="sub" style={{ margin: 0, fontSize: 13 }}>Pemilik belum menandai gaji bulan ini sudah ditransfer. Kalau sudah masuk ke rekeningmu, kabari pemilik supaya statusnya diperbarui.</p>}
      </section>

      <section className="grp">
        <h2 className="h2" style={{ color: "var(--head-text)" }}>Bulan berjalan</h2>
        <div className="surface kartu-form" style={{ gap: 6 }}>
          <div className="sum"><span className="sub">{namaBulan(berjalan.bulan)}</span><b>{rp(berjalan.bagian)}</b></div>
          <p className="meta" style={{ margin: 0 }}>Perkiraan sementara ({aturan}). Jadi final setelah bulannya selesai.</p>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2" style={{ color: "var(--head-text)" }}>Riwayat gaji</h2>
        <div className="surface batas batas-tinggi">
          {riwayat.map((r) => (
            <div key={r.bulan} className="baris">
              <button type="button" className="item buka" style={{ padding: "14px 16px", width: "100%" }} aria-expanded={buka === r.bulan} onClick={() => setBuka(buka === r.bulan ? null : r.bulan)}>
                <span className="grow" style={{ textAlign: "left" }}>
                  <span className="name" style={{ display: "block" }}>{namaBulan(r.bulan)}</span>
                  <span className="meta">{r.dibayarTgl ? `Masuk ${tglPendek(r.dibayarTgl)}` : `${r.pembayaran.length} pembayaran murid`}</span>
                </span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{rp(r.bagian)}</b>
                <span className={KELAS[r.status]}>{labelGaji[r.status]}</span>
              </button>
              {buka === r.bulan && (
                <div className="detail">
                  {r.pembayaran.length === 0 ? <span className="meta">Belum ada pembayaran murid di bulan ini.</span> : (
                    <dl className="mini-dl">
                      {r.pembayaran.map((p) => (<Fragment key={p.id}><dt>{p.nama} · {p.paket}</dt><dd>{rp(p.nominal)}</dd></Fragment>))}
                      <dt><b>Omzet murid</b></dt><dd><b>{rp(r.omzet)}</b></dd>
                    </dl>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="meta" style={{ margin: 0 }}>Status “Sudah masuk” ditandai pemilik di menu Rekap. Aturan bagi hasil diatur pemilik.</p>
      </section>
    </>
  );
}
