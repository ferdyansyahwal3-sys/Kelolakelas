import { createHmac } from "node:crypto";

/** Aturan per aksi: maksimal `maks` percobaan per `detik` detik untuk satu IP. */
export const ATURAN = {
  status: { maks: 20, detik: 600 },
  bayar: { maks: 10, detik: 600 },
  portal: { maks: 60, detik: 600 },
  izin: { maks: 20, detik: 600 },
  daftar: { maks: 10, detik: 3600 },
  promo: { maks: 30, detik: 600 },
  undangan: { maks: 20, detik: 600 },
  masukAdmin: { maks: 10, detik: 600 },
} as const;
export type AksiBatas = keyof typeof ATURAN;

export const PESAN_TERLALU_SERING = "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";

const IP_WAJAR = /^[0-9a-fA-F:.]{3,45}$/;

/** IP klien dari x-forwarded-for (entri pertama). Tidak wajar / kosong = "tanpa-ip". */
export function ambilIp(xff: string | null | undefined): string {
  const pertama = String(xff ?? "").split(",")[0]?.trim() ?? "";
  return IP_WAJAR.test(pertama) ? pertama.toLowerCase() : "tanpa-ip";
}

/** Kunci tersimpan: HMAC-SHA256 dari IP dengan garam rahasia server; IP mentah tidak pernah disimpan. */
export function kunciIp(ip: string, garam: string): string {
  return createHmac("sha256", garam).update(ip).digest("hex");
}
