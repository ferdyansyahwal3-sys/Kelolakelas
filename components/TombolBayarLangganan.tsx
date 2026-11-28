"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { siapkanTagihan } from "@/app/app/langganan/bayar/actions";

/** Membuat/memakai tagihan (nominal dihitung di server dari paket + harga promo), lalu membuka halaman pilih metode bayar. */
export function TombolBayarLangganan({ periode, label = "Bayar lewat DuitKu" }: { periode: "bulanan" | "tahunan"; label?: string }) {
  const router = useRouter();
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function klik() {
    if (proses) return;
    setProses(true); setGalat(null);
    try {
      const r = await siapkanTagihan(periode);
      if (r.ok) { router.push(`/app/langganan/bayar/${r.order}`); return; }
      setGalat(r.pesan);
    } catch { setGalat("Terjadi masalah. Coba lagi sebentar."); }
    setProses(false);
  }

  return (
    <>
      <button type="button" className="btn" disabled={proses} aria-disabled={proses} onClick={() => void klik()}>{proses ? "Menyiapkan tagihan…" : label}</button>
      {galat && <p role="alert" className="sub" style={{ margin: 0, color: "var(--danger, #e5484d)" }}>{galat}</p>}
    </>
  );
}
