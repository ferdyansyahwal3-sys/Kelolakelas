"use client";
import { labelPlan } from "@/lib/paketLangganan";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { langkahVerify, masaAktifBaru, MAKS_CEK, petaStatus, type HasilBayar, type TagihanLangganan } from "@/lib/bayarLangganan";

type Skenario = "berhasil" | "menunggu" | "gagal";
// Simulasi jawaban gateway per cek. Nanti diganti panggilan ke endpoint verify yang bertanya ke DuitKu.
const SKRIP: Record<Skenario, string[]> = {
  berhasil: ["01", "01", "00"],
  menunggu: ["01", "01", "01", "01", "01"],
  gagal: ["01", "02"],
};
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const tgl = (iso: string) => `${tglPendek(iso)} ${iso.slice(0, 4)}`;

export function HasilBayarLangganan({ tagihan, hariIni }: { tagihan: TagihanLangganan; hariIni: string }) {
  const [skenario, setSkenario] = useState<Skenario>("berhasil");
  const [hasil, setHasil] = useState<HasilBayar | null>(null);
  const [cek, setCek] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jalankan = useRef({ n: 0 });

  const mulai = useCallback((sk: Skenario, dariCek = 0) => {
    if (timer.current) clearTimeout(timer.current);
    const id = ++jalankan.current.n;
    setHasil(null);
    let ke = dariCek;
    const langkah = () => {
      if (id !== jalankan.current.n) return;
      ke += 1;
      setCek(ke);
      const l = langkahVerify(petaStatus(SKRIP[sk][Math.min(ke, SKRIP[sk].length) - 1]), ke);
      if (l.selesai) setHasil(l.hasil);
      else timer.current = setTimeout(langkah, 700); // di aplikasi nyata: l.jedaDetik * 1000
    };
    timer.current = setTimeout(langkah, 500);
  }, []);

  useEffect(() => {
    const penanda = jalankan.current;
    mulai(skenario);
    return () => { penanda.n++; if (timer.current) clearTimeout(timer.current); };
  }, [skenario, mulai]);

  const aktifSampai = masaAktifBaru(tagihan, hariIni);
  const namaPlan = labelPlan(tagihan.plan);

  return (
    <>
      <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }} aria-live="polite">
        {hasil === null ? (
          <>
            <div className="hasil-baris"><span className="st st-few">Memeriksa</span><span className="circ" aria-hidden="true"><Icon name="bill" /></span></div>
            <h2 className="h2" style={{ fontSize: 20 }}>Memeriksa pembayaranmu…</h2>
            <p className="sub" style={{ margin: 0 }}>Cek ke-{Math.max(cek, 1)} dari {MAKS_CEK}. Jangan tutup halaman ini.</p>
            <div className="skel" style={{ width: "100%" }} />
          </>
        ) : hasil === "berhasil" ? (
          <>
            <div className="hasil-baris"><span className="st st-ok">Pembayaran berhasil</span><span className="circ glow" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true"><Icon name="check" /></span></div>
            <h2 className="h2" style={{ fontSize: 22 }}>Langganan {namaPlan} aktif sampai {tgl(aktifSampai)}</h2>
            <p className="sub" style={{ margin: 0 }}>Terima kasih. Semua fitur {namaPlan} terbuka. Tagihan berikutnya terbit 7 hari sebelum {tgl(aktifSampai)}.</p>
            <Link href="/app/langganan" className="btn">Kembali ke Langganan</Link>
          </>
        ) : hasil === "menunggu" ? (
          <>
            <div className="hasil-baris"><span className="st st-few">Menunggu pembayaran</span><span className="circ" aria-hidden="true"><Icon name="bill" /></span></div>
            <h2 className="h2" style={{ fontSize: 22 }}>Pembayaran belum kami terima</h2>
            <p className="sub" style={{ margin: 0 }}>Kalau kamu memilih virtual account atau QRIS, kadang butuh beberapa menit. Selesaikan pembayaran di aplikasi bank atau e-wallet kamu, lalu cek lagi. Aktivasi berjalan otomatis begitu dana masuk, kamu tidak perlu mengirim bukti.</p>
            <div className="aksi">
              <button type="button" className="btn" onClick={() => mulai("berhasil", 0)}>Cek lagi</button>
              <Link href="/app/langganan" className="btn btn-2">Kembali ke Langganan</Link>
            </div>
          </>
        ) : (
          <>
            <div className="hasil-baris"><span className="st st-full">Pembayaran gagal</span><span className="circ" aria-hidden="true"><Icon name="x" /></span></div>
            <h2 className="h2" style={{ fontSize: 22 }}>Pembayaran tidak berhasil</h2>
            <p className="sub" style={{ margin: 0 }}>Transaksi dibatalkan atau kedaluwarsa. Tidak ada dana yang terpotong untuk tagihan ini. Masa aktifmu tidak berubah, jadi kamu bisa mencoba lagi kapan saja.</p>
            <div className="aksi">
              <Link href="/app/langganan" className="btn">Coba bayar lagi</Link>
            </div>
          </>
        )}
      </div>

      <section className="grp">
        <h2 className="h2">Rincian tagihan</h2>
        <div className="surface kartu-form">
          <div className="sum"><span className="sub">Nomor order</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{tagihan.orderId}</span></div>
          <div className="sum"><span className="sub">Paket</span><span>{namaPlan} · {tagihan.bulan} bulan</span></div>
          <div className="sum"><span className="sub">{hasil === "berhasil" ? "Aktif sampai" : "Akan aktif sampai"}</span><span>{tgl(aktifSampai)}</span></div>
          <div className="sum total"><span>Total</span><b>{rp(tagihan.nominal)}</b></div>
        </div>
      </section>

      <label className="field"><span className="label l2">Pratinjau hasil (hanya contoh, tanpa DuitKu)</span>
        <select value={skenario} onChange={(e) => setSkenario(e.target.value as Skenario)}>
          <option value="berhasil">Berhasil (cek ke-3)</option>
          <option value="menunggu">Menunggu (5 cek, belum masuk)</option>
          <option value="gagal">Gagal</option>
        </select></label>
    </>
  );
}
