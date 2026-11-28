import { perpanjangPeriode, type Fase } from "./langganan";
import type { PlanKey } from "./paketLangganan";

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
  plan: PlanKey;
  bulan: number;
  nominal: number;
  /** Akhir periode sebelum tagihan ini dibayar (null = belum pernah berbayar). */
  akhirLama: string | null;
}

/** Masa aktif yang berlaku setelah tagihan ini lunas. Dibaca dari tagihan, bukan dari browser. */
export function masaAktifBaru(t: Pick<TagihanLangganan, "akhirLama" | "bulan">, tanggalBayar: string): string {
  return perpanjangPeriode(t.akhirLama, tanggalBayar, t.bulan);
}

/** Tombol bayar baru terbuka H-7 sebelum langganan berbayar berakhir (sama dengan pengingat email pertama). */
export const HARI_BUKA_BAYAR = 7;

/** Masa percobaan dan semua fase setelah berakhir selalu boleh bayar; langganan aktif hanya dalam 7 hari terakhir. Ganti paket tidak lewat sini. */
export function bolehBayarSekarang(fase: Fase, sisaHari: number | null): boolean {
  if (fase !== "aktif") return true;
  return sisaHari !== null && sisaHari <= HARI_BUKA_BAYAR;
}
