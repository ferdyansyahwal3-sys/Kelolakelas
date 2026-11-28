"use client";
import Link from "next/link";
import { useState } from "react";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { bolehTerimaPendaftaran, hitungAkses, perpanjangPeriode, type DataLangganan, type Fase } from "@/lib/langganan";
import { TombolBayarLangganan } from "./TombolBayarLangganan";
import { PROMO_PELANGGAN, hargaPeriode, labelPlan, type PlanKey } from "@/lib/paketLangganan";

interface Tagihan { id: string; orderId?: string; periode: string; nominal: number; status: "lunas" | "belum_bayar" | "kedaluwarsa" | "batal"; tempo: string }
interface Props { data: DataLangganan; plan: PlanKey; hariIni: string; tagihan: Tagihan[]; sekarangMs: number; /** false di panel asli: sembunyikan pilihan "pratinjau status" (hanya untuk contoh). */ pratinjau?: boolean }
const labelInvoice = { lunas: { t: "Lunas", k: "st st-ok" }, belum_bayar: { t: "Belum bayar", k: "st st-free" }, kedaluwarsa: { t: "Kedaluwarsa", k: "st st-full" }, batal: { t: "Dibatalkan", k: "st st-full" } } as const;
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

const fase: Record<Fase, { judul: string; kelas: string; pesan: (s: number | null, t: string | null) => string }> = {
  trial: { judul: "Masa percobaan", kelas: "st st-few", pesan: (s) => `Trial gratis ${s} hari lagi. Semua fitur paket terbuka.` },
  aktif: { judul: "Aktif", kelas: "st st-ok", pesan: (s) => (s !== null && s <= 3 ? `Berakhir ${s === 0 ? "hari ini" : `${s} hari lagi`}. Bayar sekarang supaya tidak terputus.` : "Semua fitur terbuka. Tagihan berikutnya terbit 7 hari sebelum jatuh tempo.") },
  jatuh_tempo: { judul: "Jatuh tempo", kelas: "st st-free", pesan: (s) => `Masa tenggang ${s} hari lagi. Akses masih penuh, mohon segera bayar.` },
  ditangguhkan: { judul: "Ditangguhkan", kelas: "st st-full", pesan: () => "Kamu masih bisa melihat dan mengekspor data. Pendaftaran murid ditutup sementara sampai tagihan dibayar." },
  berhenti: { judul: "Berhenti", kelas: "st st-full", pesan: () => "Akun dihentikan. Hubungi kami untuk mengaktifkan kembali." },
};
const contohHari: { label: string; tambah: number }[] = [
  { label: "Hari ini (contoh)", tambah: 0 }, { label: "3 hari sebelum berakhir", tambah: 25 }, { label: "Telat 2 hari", tambah: 30 },
  { label: "Telat 12 hari", tambah: 40 }, { label: "Telat 50 hari", tambah: 78 },
];

export function LanggananOwner({ data, plan, hariIni, tagihan, sekarangMs, pratinjau = true }: Props) {
  const [offset, setOffset] = useState(0);
  const [periode, setPeriode] = useState<"bulanan" | "tahunan">("bulanan");
  const sekarang = new Date(Date.parse(hariIni) + (pratinjau ? offset : 0) * 86400000).toISOString().slice(0, 10);
  const h = hitungAkses(data, sekarang);
  const f = fase[h.fase];
  const trialHabis = h.fase === "berhenti" && data.periodeBerakhir === null && data.trialBerakhir !== null;
  const bayar = hargaPeriode(plan, periode, sekarangMs, PROMO_PELANGGAN);
  const berikutnya = perpanjangPeriode(data.periodeBerakhir, sekarang, bayar.bulan);

  return (
    <>
      <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="meta">Paket {labelPlan(plan)}</span>
          <span className={f.kelas}>{trialHabis ? "Percobaan berakhir" : f.judul}</span>
        </div>
        <div className="big" style={{ color: "var(--panel-text)", fontSize: 28 }}>{h.tenggat ? `${h.fase === "aktif" || h.fase === "trial" ? "Sampai" : "Batas"} ${tglPendek(h.tenggat)}` : "Tidak aktif"}</div>
        <p className="sub" style={{ margin: 0, fontSize: 13 }}>{trialHabis ? "Masa percobaan berakhir. Pilih paket dan bayar untuk membuka kembali semua fitur." : f.pesan(h.sisaHari, h.tenggat)}</p>
        <div className="aksi" style={{ gap: 6 }}>
          <span className={bolehTerimaPendaftaran(h.akses) ? "st st-ok" : "st st-full"}>Pendaftaran murid {bolehTerimaPendaftaran(h.akses) ? "terbuka" : "ditutup"}</span>
        </div>
      </div>

      {pratinjau && <label className="field"><span className="label l2">Pratinjau status (hanya contoh)</span>
        <select value={offset} onChange={(e) => setOffset(Number(e.target.value))}>
          {contohHari.map((c) => <option key={c.tambah} value={c.tambah}>{c.label}</option>)}
        </select></label>}

      <section className="grp">
        <h2 className="h2">Bayar perpanjangan</h2>
        <div className="surface kartu-form">
          <div className="seg" role="radiogroup" aria-label="Periode">
            {(["bulanan", "tahunan"] as const).map((p) => <button key={p} type="button" role="radio" aria-checked={periode === p} className={periode === p ? "on" : ""} onClick={() => setPeriode(p)}>{p === "bulanan" ? "Bulanan" : "Tahunan · hemat 2 bln"}</button>)}
          </div>
          <div className="sum"><span className="sub">Paket {labelPlan(plan)} · {bayar.bulan} bulan</span><b>{bayar.promo && <s className="meta" style={{ marginRight: 8, fontWeight: 400 }}>{rp(bayar.normalTotal)}</s>}{rp(bayar.total)}</b></div>
          <div className="sum"><span className="sub">Aktif sampai</span><span>{tglPendek(berikutnya)} {berikutnya.slice(0, 4)}</span></div>
          <p className="meta" style={{ margin: 0 }}>Bayar lebih awal tidak menghanguskan sisa hari. Bayar telat dihitung mulai hari pembayaran.</p>
          {pratinjau ? <button type="button" className="btn" disabled>Bayar lewat DuitKu (pratinjau)</button> : <TombolBayarLangganan periode={periode} />}
          <Link href="/app/langganan/ganti" className="link" style={{ alignSelf: "center" }}>Ganti paket atau pindah jenis</Link>
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Riwayat tagihan</h2>
        <div className="surface batas">
          {tagihan.length === 0 && <div className="item"><span className="sub">Belum ada tagihan langganan.</span></div>}
          {tagihan.map((t) => (
            <div key={t.id} className="item">
              <div className="grow"><div className="name">{t.periode}</div><div className="meta">{rp(t.nominal)} · tempo {tglPendek(t.tempo)}</div></div>
              {t.status === "belum_bayar" && t.orderId && !pratinjau && <Link href={`/app/langganan/bayar/${t.orderId}`} className="link" style={{ marginRight: 8 }}>Bayar</Link>}
              <span className={labelInvoice[t.status].k}>{labelInvoice[t.status].t}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
