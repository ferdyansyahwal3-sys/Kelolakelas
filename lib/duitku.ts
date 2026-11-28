// Murni (tanpa jaringan/DB): tanda tangan, pemetaan status, pembacaan konfigurasi, bentuk order id DuitKu.
// Rumus dari docs.duitku.com (dicek 2026-11-28): semua tanda tangan = HMAC-SHA256(stringToSign, apiKey) heks huruf kecil.
// MD5 dan SHA256 polos di dokumentasi lama sudah ditandai usang. Kunci tidak pernah dicatat atau dikembalikan dari modul ini.
import { createHmac, timingSafeEqual } from "node:crypto";

export const hmacHex = (data: string, kunci: string): string => createHmac("sha256", kunci).update(data).digest("hex");

/** Permintaan transaksi (inquiry): merchantCode + merchantOrderId + paymentAmount. */
export const tandaTanganInquiry = (kode: string, orderId: string, jumlah: number, kunci: string) => hmacHex(`${kode}${orderId}${jumlah}`, kunci);
/** Callback dari DuitKu: merchantCode + amount (teks persis seperti diterima) + merchantOrderId. */
export const tandaTanganCallback = (kode: string, amount: string, orderId: string, kunci: string) => hmacHex(`${kode}${amount}${orderId}`, kunci);
/** Daftar metode bayar: merchantcode + amount + datetime (yyyy-MM-dd HH:mm:ss). */
export const tandaTanganMetode = (kode: string, jumlah: number, datetime: string, kunci: string) => hmacHex(`${kode}${jumlah}${datetime}`, kunci);
/** Cek transaksi: merchantCode + merchantOrderId. */
export const tandaTanganStatus = (kode: string, orderId: string, kunci: string) => hmacHex(`${kode}${orderId}`, kunci);

/** Banding waktu-konstan; panjang berbeda langsung salah. */
export function samaAman(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------- konfigurasi ----------
export interface KonfigDuitku { kode: string; kunci: string; produksi: boolean; basis: string }
const BASIS = { sandbox: "https://sandbox.duitku.com/webapi/api/merchant", produksi: "https://passport.duitku.com/webapi/api/merchant" };
const LOKAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?(\/[A-Za-z0-9_\-/]*)?$/;

/**
 * Membaca konfigurasi dari env. Bawaan SANDBOX; produksi hanya bila DUITKU_ENV=production persis.
 * DUITKU_API_URL (server tiruan lokal untuk uji) hanya diterima di sandbox dan hanya alamat localhost.
 */
export function bacaKonfigDuitku(env: Record<string, string | undefined>): { ok: true; konfig: KonfigDuitku } | { ok: false; alasan: string } {
  const kode = (env.DUITKU_MERCHANT_CODE ?? "").trim();
  const kunci = (env.DUITKU_API_KEY ?? "").trim();
  if (!kode || !kunci) return { ok: false, alasan: "Kunci DuitKu belum diisi di server." };
  if (!/^[A-Za-z0-9]{3,20}$/.test(kode)) return { ok: false, alasan: "DUITKU_MERCHANT_CODE tidak wajar." };
  const mode = (env.DUITKU_ENV ?? "sandbox").trim().toLowerCase();
  if (mode !== "sandbox" && mode !== "production") return { ok: false, alasan: "DUITKU_ENV harus sandbox atau production." };
  const produksi = mode === "production";
  const ganti = (env.DUITKU_API_URL ?? "").trim().replace(/\/$/, "");
  if (ganti) {
    if (produksi) return { ok: false, alasan: "DUITKU_API_URL tidak boleh dipakai di produksi." };
    if (!LOKAL.test(ganti)) return { ok: false, alasan: "DUITKU_API_URL hanya boleh alamat localhost." };
    return { ok: true, konfig: { kode, kunci, produksi, basis: ganti } };
  }
  return { ok: true, konfig: { kode, kunci, produksi, basis: produksi ? BASIS.produksi : BASIS.sandbox } };
}

// ---------- order id ----------
export const FORMAT_ORDER_INVOICE = /^KK-\d{6}-\d{4}$/;
const FORMAT_ORDER_DUITKU = /^(KK-\d{6}-\d{4})-(\d{1,2})$/;
/** Tiap percobaan bayar memakai merchantOrderId baru (aturan DuitKu): `<order invoice>-<urutan>`. */
export const merchantOrderId = (orderInvoice: string, urutan: number) => `${orderInvoice}-${urutan}`;
export function orderDariMerchant(m: string): { order: string; urutan: number } | null {
  const h = FORMAT_ORDER_DUITKU.exec(m);
  return h ? { order: h[1]!, urutan: Number(h[2]) } : null;
}

// ---------- status ----------
export type HasilDuitku = "berhasil" | "menunggu" | "gagal";
/** Callback resultCode: 00 sukses, 01 gagal. Selain itu diabaikan (menunggu). */
export function petaCallback(kode: string | null | undefined): HasilDuitku {
  const k = (kode ?? "").trim();
  return k === "00" ? "berhasil" : k === "01" ? "gagal" : "menunggu";
}
/** Cek transaksi statusCode: 00 sukses, 01 pending, 02 batal/kedaluwarsa. Tak dikenal = menunggu, tidak pernah berhasil. */
export function petaCekStatus(kode: string | null | undefined): HasilDuitku {
  const k = (kode ?? "").trim();
  return k === "00" ? "berhasil" : k === "02" ? "gagal" : "menunggu";
}

// ---------- callback ----------
export interface CallbackDuitku { merchantCode: string; amountMentah: string; jumlah: number; merchantOrderId: string; resultCode: string; reference: string; signature: string }
const POLA_JUMLAH = /^(\d{1,9})(\.0{1,2})?$/;

/** Memeriksa bentuk isian callback (belum tanda tangan). Isian yang tak wajar ditolak sebelum menyentuh apa pun. */
export function bacaCallback(f: Record<string, string | undefined>): { ok: true; data: CallbackDuitku } | { ok: false; alasan: string } {
  const merchantCode = (f.merchantCode ?? "").trim();
  const amountMentah = (f.amount ?? "").trim();
  const order = (f.merchantOrderId ?? "").trim();
  const resultCode = (f.resultCode ?? "").trim();
  const reference = (f.reference ?? "").trim();
  const signature = (f.signature ?? "").trim();
  if (!merchantCode || !amountMentah || !order || !resultCode || !signature) return { ok: false, alasan: "isian wajib kosong" };
  if (order.length > 50 || reference.length > 120 || signature.length !== 64 || !/^[0-9a-fA-F]+$/.test(signature)) return { ok: false, alasan: "isian tidak wajar" };
  const j = POLA_JUMLAH.exec(amountMentah);
  if (!j) return { ok: false, alasan: "jumlah tidak wajar" };
  return { ok: true, data: { merchantCode, amountMentah, jumlah: Number(j[1]), merchantOrderId: order, resultCode, reference, signature } };
}

export function tandaTanganCallbackValid(d: CallbackDuitku, kode: string, kunci: string): boolean {
  if (d.merchantCode !== kode) return false;
  return samaAman(tandaTanganCallback(kode, d.amountMentah, d.merchantOrderId, kunci), d.signature);
}

// ---------- metode & biaya ----------
export interface MetodeBayar { kode: string; nama: string; biaya: number }
const BIAYA_MAKS = 500000;

/** Biaya admin dari DuitKu ("totalFee": "4000" atau 4000). Tak wajar = null (metode dibuang). */
export function bacaBiaya(x: unknown): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" && /^\d{1,7}(\.\d{1,2})?$/.test(x.trim()) ? Number(x) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > BIAYA_MAKS) return null;
  return Math.ceil(n);
}

/** Respons getpaymentmethod -> daftar metode yang aman ditampilkan. Kode harus 2 huruf/angka besar; nama dipotong. */
export function bacaMetode(json: unknown): MetodeBayar[] {
  const baris = (json as { paymentFee?: unknown } | null)?.paymentFee;
  if (!Array.isArray(baris)) return [];
  const hasil: MetodeBayar[] = [];
  for (const b of baris as Record<string, unknown>[]) {
    const kode = String(b?.paymentMethod ?? "");
    const biaya = bacaBiaya(b?.totalFee);
    if (!/^[A-Z0-9]{2}$/.test(kode) || biaya === null) continue;
    const nama = String(b?.paymentName ?? kode).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60) || kode;
    if (!hasil.some((m) => m.kode === kode)) hasil.push({ kode, nama, biaya });
  }
  return hasil;
}

/** Yang dibayar pelanggan = harga paket (dikunci di invoice) + biaya admin metode terpilih. */
export const totalBayar = (hargaInvoice: number, biaya: number) => hargaInvoice + biaya;

/** Tautan bayar dari DuitKu hanya diterima bila https ke duitku.com (atau http localhost untuk server tiruan). */
export function urlBayarAman(u: unknown, izinkanLokal: boolean): string | null {
  if (typeof u !== "string" || u.length > 600) return null;
  try {
    const x = new URL(u);
    if (x.protocol === "https:" && (x.hostname === "duitku.com" || x.hostname.endsWith(".duitku.com"))) return x.toString();
    if (izinkanLokal && x.protocol === "http:" && (x.hostname === "localhost" || x.hostname === "127.0.0.1")) return x.toString();
  } catch { /* tidak valid */ }
  return null;
}

/** "yyyy-MM-dd HH:mm:ss" waktu Jakarta (dipakai tanda tangan getpaymentmethod). */
export function datetimeJakarta(d: Date): string {
  const w = new Date(d.getTime() + 7 * 3600000).toISOString();
  return `${w.slice(0, 10)} ${w.slice(11, 19)}`;
}

export const MENIT_KEDALUWARSA = 120;
