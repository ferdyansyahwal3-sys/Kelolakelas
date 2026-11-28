"use client";
import { useState } from "react";
import { mulaiBayar } from "@/app/app/langganan/bayar/actions";
import { pecahRupiah } from "@/lib/format";
import { labelPlan, type PlanKey } from "@/lib/paketLangganan";

const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

export interface MetodeTampil { kode: string; nama: string; biaya: number }

/**
 * Pilih metode bayar. Rincian awal TANPA biaya admin; setelah metode dipilih baris "Biaya admin pembayaran" muncul (nominal dari DuitKu)
 * dan total ikut naik. Server menghitung ulang biaya saat Bayar, jadi angka di sini hanya tampilan.
 */
export function PilihMetodeBayar({ orderId, plan, bulan, nominal, metode }: { orderId: string; plan: PlanKey; bulan: number; nominal: number; metode: MetodeTampil[] }) {
  const [pilih, setPilih] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const m = metode.find((x) => x.kode === pilih) ?? null;

  async function bayar() {
    if (!m || proses) return;
    setProses(true); setGalat(null);
    try {
      const r = await mulaiBayar(orderId, m.kode);
      if (r.ok) { window.location.href = r.url; return; }
      setGalat(r.pesan);
    } catch { setGalat("Terjadi masalah. Coba lagi sebentar."); }
    setProses(false);
  }

  return (
    <>
      <section className="surface kartu-form" aria-label="Rincian pesanan">
        <h2 className="h2">Pesananmu</h2>
        <div className="sum"><span className="sub">Nomor order</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{orderId}</span></div>
        <div className="sum"><span className="sub">Paket</span><span>{labelPlan(plan)} · {bulan} bulan</span></div>
        <div className="sum"><span className="sub">Harga paket</span><span>{rp(nominal)}</span></div>
        {m && <div className="sum"><span className="sub">Biaya admin pembayaran · {m.nama}</span><span>{m.biaya > 0 ? rp(m.biaya) : "Gratis"}</span></div>}
        <div className="sum total"><span>Total</span><b>{rp(nominal + (m?.biaya ?? 0))}</b></div>
        {!m && <p className="meta" style={{ margin: 0 }}>Biaya admin muncul setelah kamu memilih metode pembayaran.</p>}
      </section>

      <section className="grp">
        <h2 className="h2">Pilih metode pembayaran</h2>
        <div role="radiogroup" aria-label="Metode pembayaran" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {metode.map((x) => (
            <button key={x.kode} type="button" role="radio" aria-checked={pilih === x.kode} className={pilih === x.kode ? "opt on" : "opt"} onClick={() => setPilih(x.kode)}>
              <span className="radio" aria-hidden="true" />
              <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>{x.nama}</span>
              <span className="meta">{x.biaya > 0 ? `+ ${rp(x.biaya)}` : "Tanpa biaya admin"}</span>
            </button>
          ))}
        </div>
      </section>

      {galat && <p role="alert" className="sub" style={{ margin: 0, color: "var(--danger, #e5484d)" }}>{galat}</p>}
      <button type="button" className="btn" disabled={!m || proses} aria-disabled={!m || proses} onClick={() => void bayar()}>
        {proses ? "Mengalihkan ke DuitKu…" : m ? `Bayar ${rp(nominal + m.biaya)}` : "Pilih metode dulu"}
      </button>
      <p className="meta" style={{ margin: 0 }}>Kamu akan diarahkan ke halaman pembayaran DuitKu. Langganan aktif otomatis setelah pembayaran terkonfirmasi, tidak perlu mengirim bukti.</p>
    </>
  );
}
