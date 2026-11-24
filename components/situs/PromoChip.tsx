"use client";
import { fasePromo, sisaWaktu, type KonfigPromo } from "@/lib/paketLangganan";
import { Icon } from "@/components/Icon";
import { useWaktu } from "./useWaktu";

const dua = (n: number) => String(n).padStart(2, "0");

/** Hitung mundur kecil di nav. Jadwal promo global. Hanya tampil saat promo berlaku; saat masa jeda (harga normal) tidak menampilkan hitung mundur "promo kembali". */
export function PromoChip({ konfig, awalMs }: { konfig: KonfigPromo | null; awalMs: number }) {
  const now = useWaktu(awalMs);
  const f = fasePromo(now, konfig);
  if (f.sampaiMs === null || !f.aktif) return null;
  const s = sisaWaktu(now, f.sampaiMs);
  return (
    <a href="#harga" className={`s-chip ${f.aktif ? "" : "s-chip-jeda"}`} role="timer" aria-label={`${f.aktif ? "Promo berakhir" : "Promo kembali"} dalam ${s.jam} jam ${s.menit} menit ${s.detik} detik`}>
      <Icon name="tag" className="ic" />
      <span className="s-chip-teks">{f.aktif ? "Promo berakhir" : "Promo kembali"}</span>
      <b>{dua(s.jam)}:{dua(s.menit)}:{dua(s.detik)}</b>
    </a>
  );
}
