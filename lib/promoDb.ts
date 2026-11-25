// Murni: pemetaan baris tabel `promo` + pemakaian, dan pesan galat database.
import { tanggalJakarta } from "./langgananData";
import type { PromoOwner } from "./promo";

type Satu<T> = T | T[] | null;
export interface BarisPromoDb { id: string; kode: string; jenis: string; nilai: number; kuota: number | null; terpakai: number; kedaluwarsa: string | null; aktif: boolean; murid: Satu<{ nama: string }> }
export const KOLOM_PROMO = "id, kode, jenis, nilai, kuota, terpakai, kedaluwarsa, aktif, murid(nama)";

export function dariBarisPromo(b: BarisPromoDb): PromoOwner | null {
  if (b.jenis !== "persen" && b.jenis !== "nominal") return null;
  const m = Array.isArray(b.murid) ? b.murid[0] ?? null : b.murid;
  return { id: b.id, kode: b.kode, jenis: b.jenis, nilai: b.nilai, kuota: b.kuota, terpakai: b.terpakai, kedaluwarsa: b.kedaluwarsa, aktif: b.aktif, pemilik: m?.nama };
}

export interface BarisPemakaianDb { id: string; kode_promo: string | null; nama: string; total: number | null; diputuskan_pada: string | null; paket: Satu<{ harga: number }> }
export const KOLOM_PEMAKAIAN = "id, kode_promo, nama, total, diputuskan_pada, paket(harga)";

/** Potongan = harga paket - total yang dihitung server saat daftar. Baris tanpa kode/total dibuang. */
export function pemakaianPromo(baris: BarisPemakaianDb[]): { id: string; kode: string; nama: string; tgl: string; potongan: number }[] {
  const hasil: { id: string; kode: string; nama: string; tgl: string; potongan: number }[] = [];
  for (const b of baris) {
    const p = Array.isArray(b.paket) ? b.paket[0] ?? null : b.paket;
    if (!b.kode_promo || b.total === null || !p) continue;
    hasil.push({ id: b.id, kode: b.kode_promo, nama: b.nama, tgl: b.diputuskan_pada ? tanggalJakarta(b.diputuskan_pada) : "", potongan: Math.max(0, p.harga - b.total) });
  }
  return hasil;
}

export function pesanGalatPromo(e: { code?: string; message?: string } | null | undefined): string {
  if (e?.code === "23505") return "Kode ini sudah ada.";
  if (e?.code === "23514") return "Isian promo belum sah (kode 3–16 huruf/angka, nilai, batas pakai).";
  if (e?.code === "23503") return "Murid pemilik kode tidak ditemukan.";
  return "Gagal menyimpan. Coba lagi sebentar.";
}
