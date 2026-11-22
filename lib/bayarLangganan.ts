import { perpanjangPeriode } from "./langganan";

export type HasilBayar = "berhasil" | "menunggu" | "gagal";

/**
 * Kode status dari gateway ke tiga hasil yang ditampilkan. Kode yang tidak dikenal dianggap "menunggu", tidak pernah "berhasil":
 * lebih baik owner menunggu sebentar daripada tagihan ditandai lunas karena salah baca.
 * Catatan: sesuaikan daftar kode ini dengan dokumentasi DuitKu (docs.duitku.com) saat integrasi dibuat.
 */
export function petaStatus(kode: string | null | undefined): HasilBayar {
  const k = (kode ?? "").trim().toLowerCase();
  if (k === "00" || k === "settlement" || k === "paid" || k === "success") return "berhasil";
  if (k === "02" || k === "expire" || k === "expired" || k === "cancel" || k === "failed" || k === "deny" || k === "failure") return "gagal";
  return "menunggu";
}

export const MAKS_CEK = 5;
export const JEDA_CEK_DETIK = [2, 3, 5, 8, 13];

export type Langkah = { selesai: true; hasil: HasilBayar } | { selesai: false; jedaDetik: number };

/** `sudahCek` = jumlah cek yang sudah dilakukan (mulai 1). Berhasil dan gagal langsung selesai; menunggu diulang sampai batas, lalu tetap "menunggu". */
export function langkahVerify(hasilTerakhir: HasilBayar, sudahCek: number): Langkah {
  if (hasilTerakhir !== "menunggu") return { selesai: true, hasil: hasilTerakhir };
  if (sudahCek >= MAKS_CEK) return { selesai: true, hasil: "menunggu" };
  return { selesai: false, jedaDetik: JEDA_CEK_DETIK[Math.min(Math.max(sudahCek, 1), JEDA_CEK_DETIK.length) - 1]! };
}

export const FORMAT_ORDER = /^KK-\d{6}-\d{4}$/;

export interface TagihanLangganan {
  orderId: string;
  plan: "starter" | "pro";
  bulan: number;
  nominal: number;
  /** Akhir periode sebelum tagihan ini dibayar (null = belum pernah berbayar). */
  akhirLama: string | null;
}

/** Masa aktif yang berlaku setelah tagihan ini lunas. Dibaca dari tagihan, bukan dari browser. */
export function masaAktifBaru(t: Pick<TagihanLangganan, "akhirLama" | "bulan">, tanggalBayar: string): string {
  return perpanjangPeriode(t.akhirLama, tanggalBayar, t.bulan);
}
