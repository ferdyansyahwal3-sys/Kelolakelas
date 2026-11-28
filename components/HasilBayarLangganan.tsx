"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cekStatusBayar } from "@/app/app/langganan/bayar/actions";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { labelPlan, type PlanKey } from "@/lib/paketLangganan";
import { Icon } from "./Icon";

const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const tgl = (iso: string) => `${tglPendek(iso)} ${iso.slice(0, 4)}`;
const JEDA = [3, 5, 8, 13, 15]; // detik; lalu tetap 15
const MAKS_CEK = 24;

export interface RingkasBayar { orderId: string; plan: PlanKey; bulan: number; nominal: number; biayaAdmin: number; aktifSampai: string | null }

/**
 * Hasil bayar NYATA. `awal` = status di database saat halaman dibuat: "berhasil" hanya bila invoice sudah lunas (diaktifkan callback
 * DuitKu yang tanda tangannya terverifikasi, atau cek status server-ke-server). Selama menunggu, halaman bertanya ke server (yang
 * bertanya ke DuitKu); begitu server bilang lunas, halaman dimuat ulang dari database. Tidak ada simulasi dan tidak ada "berhasil" dari browser.
 */
export function HasilBayarLangganan({ ringkas, awal, urlBayar }: { ringkas: RingkasBayar; awal: "berhasil" | "menunggu" | "gagal"; urlBayar: string | null }) {
  const router = useRouter();
  const [hasil, setHasil] = useState(awal);
  const [cek, setCek] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const jalan = useRef({ n: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mulai = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const id = ++jalan.current.n;
    let ke = 0;
    const langkah = async () => {
      if (id !== jalan.current.n) return;
      ke += 1; setCek(ke);
      let r: Awaited<ReturnType<typeof cekStatusBayar>>;
      try { r = await cekStatusBayar(ringkas.orderId); } catch { r = { hasil: "menunggu", pesan: "Gagal memeriksa. Mencoba lagi." }; }
      if (id !== jalan.current.n) return;
      setPesan(r.pesan ?? null);
      if (r.hasil === "berhasil") { router.refresh(); return; }
      if (r.hasil === "gagal") { setHasil("gagal"); return; }
      if (ke >= MAKS_CEK) return;
      timer.current = setTimeout(() => void langkah(), (JEDA[Math.min(ke - 1, JEDA.length - 1)] ?? 15) * 1000);
    };
    timer.current = setTimeout(() => void langkah(), 1500);
  }, [ringkas.orderId, router]);

  useEffect(() => { setHasil(awal); }, [awal]);
  useEffect(() => {
    if (awal !== "menunggu") return;
    const penanda = jalan.current;
    mulai();
    return () => { penanda.n++; if (timer.current) clearTimeout(timer.current); };
  }, [awal, mulai]);

  const namaPlan = labelPlan(ringkas.plan);
  const total = ringkas.nominal + ringkas.biayaAdmin;
  const habisCek = hasil === "menunggu" && cek >= MAKS_CEK;

  return (
    <>
      <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }} aria-live="polite">
        {hasil === "berhasil" ? (
          <>
            <div className="hasil-baris"><span className="st st-ok">Pembayaran berhasil</span><span className="circ glow" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true"><Icon name="check" /></span></div>
            <h2 className="h2" style={{ fontSize: 22 }}>Langganan {namaPlan} aktif{ringkas.aktifSampai ? ` sampai ${tgl(ringkas.aktifSampai)}` : ""}</h2>
            <p className="sub" style={{ margin: 0 }}>Terima kasih. Pembayaranmu sudah kami terima dan terverifikasi. Struk dikirim ke email pemilik usaha.</p>
            <Link href="/app/langganan" className="btn">Kembali ke Langganan</Link>
          </>
        ) : hasil === "menunggu" ? (
          <>
            <div className="hasil-baris"><span className="st st-few">Menunggu pembayaran</span><span className="circ" aria-hidden="true"><Icon name="bill" /></span></div>
            <h2 className="h2" style={{ fontSize: 22 }}>Pembayaran belum kami terima</h2>
            <p className="sub" style={{ margin: 0 }}>
              {pesan ?? "Selesaikan pembayaran di aplikasi bank atau e-wallet kamu. Halaman ini memeriksa otomatis dan hanya menyatakan berhasil setelah DuitKu mengonfirmasi ke server kami."}
            </p>
            {!habisCek && <p className="meta" style={{ margin: 0 }}>Memeriksa… cek ke-{Math.max(cek, 1)}. Jangan tutup halaman ini.</p>}
            {habisCek && <p className="meta" style={{ margin: 0 }}>Belum ada konfirmasi. Kalau sudah membayar, tunggu beberapa menit lalu tekan Cek lagi. Aktivasi tetap berjalan otomatis begitu dana masuk.</p>}
            <div className="aksi">
              {urlBayar && <a href={urlBayar} className="btn">Lanjutkan pembayaran</a>}
              <button type="button" className={urlBayar ? "btn btn-2" : "btn"} onClick={mulai}>Cek lagi</button>
              <Link href={`/app/langganan/bayar/${ringkas.orderId}?ganti=1`} className="btn btn-2">Ganti metode</Link>
            </div>
          </>
        ) : (
          <>
            <div className="hasil-baris"><span className="st st-full">Pembayaran gagal</span><span className="circ" aria-hidden="true"><Icon name="x" /></span></div>
            <h2 className="h2" style={{ fontSize: 22 }}>Pembayaran tidak berhasil</h2>
            <p className="sub" style={{ margin: 0 }}>Transaksi dibatalkan atau kedaluwarsa. Masa aktifmu tidak berubah, jadi kamu bisa mencoba lagi kapan saja. Kalau dana sudah terpotong, hubungi kami dengan nomor order di bawah.</p>
            <div className="aksi">
              <Link href={`/app/langganan/bayar/${ringkas.orderId}?ganti=1`} className="btn">Pilih metode lagi</Link>
              <Link href="/app/langganan" className="btn btn-2">Kembali ke Langganan</Link>
            </div>
          </>
        )}
      </div>

      <section className="grp">
        <h2 className="h2">Rincian tagihan</h2>
        <div className="surface kartu-form">
          <div className="sum"><span className="sub">Nomor order</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{ringkas.orderId}</span></div>
          <div className="sum"><span className="sub">Paket</span><span>{namaPlan} · {ringkas.bulan} bulan</span></div>
          {hasil === "berhasil" && ringkas.aktifSampai && <div className="sum"><span className="sub">Aktif sampai</span><span>{tgl(ringkas.aktifSampai)}</span></div>}
          <div className="sum"><span className="sub">Harga paket</span><span>{rp(ringkas.nominal)}</span></div>
          {ringkas.biayaAdmin > 0 && <div className="sum"><span className="sub">Biaya admin pembayaran</span><span>{rp(ringkas.biayaAdmin)}</span></div>}
          <div className="sum total"><span>Total</span><b>{rp(total)}</b></div>
        </div>
      </section>
    </>
  );
}
