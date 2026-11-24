"use client";
import { fasePromo, sisaWaktu, type KonfigPromo } from "@/lib/paketLangganan";
import { useWaktu } from "./useWaktu";

const dua = (n: number) => String(n).padStart(2, "0");

export function Hitung({ sampaiMs, awalMs }: { sampaiMs: number; awalMs: number }) {
  const now = useWaktu(awalMs);
  const s = sisaWaktu(now, sampaiMs);
  return (
    <span className="s-hitung" role="timer" aria-label={`${s.jam} jam ${s.menit} menit ${s.detik} detik lagi`}>
      <b>{dua(s.jam)}</b><i>:</i><b>{dua(s.menit)}</b><i>:</i><b>{dua(s.detik)}</b>
    </span>
  );
}

/**
 * Strip promo di atas halaman. Jadwalnya satu untuk semua pengunjung (dihitung dari jam dan konfigurasi yang sama, bukan per perangkat):
 * hanya tampil saat promo berlaku (menghitung mundur sampai berakhir). Di masa jeda harga normal strip disembunyikan.
 */
export function PromoStrip({ konfig, awalMs }: { konfig: KonfigPromo | null; awalMs: number }) {
  const now = useWaktu(awalMs);
  const f = fasePromo(now, konfig);
  if (f.sampaiMs === null || !f.aktif) return null; // masa jeda: tidak ada hitung mundur "promo kembali"
  return (
    <div className={`s-promo ${f.aktif ? "" : "s-promo-jeda"}`}>
      <span className="s-promo-teks"><span className="dot" />{f.aktif ? "Harga promo berakhir dalam" : "Harga promo kembali dalam"}</span>
      <Hitung sampaiMs={f.sampaiMs} awalMs={awalMs} />
      <span className="s-promo-ket">{f.aktif ? "Setelah itu harga kembali normal" : "Saat ini berlaku harga normal"}</span>
    </div>
  );
}
