// Murni: pemeriksaan berkas bukti bayar di server. Jenis ditentukan dari ISI berkas, bukan dari nama/tipe kiriman browser.
import { BUKTI_MAKS_BYTE } from "./rekening";

export type JenisBukti = { mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; ext: "jpg" | "png" | "webp" | "pdf" };

const mulaiDengan = (b: Uint8Array, sig: number[], offset = 0) => sig.every((x, i) => b[offset + i] === x);

export function deteksiBerkas(b: Uint8Array): JenisBukti | null {
  if (b.length < 12) return null;
  if (mulaiDengan(b, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (mulaiDengan(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (mulaiDengan(b, [0x52, 0x49, 0x46, 0x46]) && mulaiDengan(b, [0x57, 0x45, 0x42, 0x50], 8)) return { mime: "image/webp", ext: "webp" };
  if (mulaiDengan(b, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export function periksaBukti(ukuran: number, isi: Uint8Array): { ok: true; jenis: JenisBukti } | { ok: false; pesan: string } {
  if (!(ukuran > 0) || isi.length === 0) return { ok: false, pesan: "Berkas kosong." };
  if (ukuran > BUKTI_MAKS_BYTE || isi.length > BUKTI_MAKS_BYTE) return { ok: false, pesan: "Ukuran berkas maksimal 5 MB." };
  const jenis = deteksiBerkas(isi);
  if (!jenis) return { ok: false, pesan: "Berkas harus foto (JPG, PNG, WEBP) atau PDF." };
  return { ok: true, jenis };
}

export const pathBukti = (tenantId: string, pendaftaranId: string, uuid: string, ext: string) => `${tenantId}/${pendaftaranId}/${uuid}.${ext}`;
export const BUKTI_MAKS_PER_PENDAFTARAN = 3;

/** Bukti bayar TAGIHAN dari portal murid (0030): path tetap diawali tenant_id supaya cocok aturan fungsi database. */
export const pathBuktiTagihan = (tenantId: string, tagihanId: string, uuid: string, ext: string) => `${tenantId}/tagihan/${tagihanId}/${uuid}.${ext}`;

export function pesanGalatBuktiTagihan(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("tagihan_tidak_menunggu_bayar")) return "Tagihan ini sudah dibayar atau buktinya sedang dicek pemilik.";
  if (m.includes("tagihan_tidak_ditemukan")) return "Tagihan tidak ditemukan.";
  if (m.includes("rekening_tidak_valid")) return "Pilih rekening tujuan transfer.";
  return "Bukti belum tersimpan. Coba lagi sebentar.";
}
