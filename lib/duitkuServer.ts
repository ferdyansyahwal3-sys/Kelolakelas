// Server saja: panggilan ke API DuitKu + aktivasi. Memakai service role: SETIAP query disaring tenant_id.
// Jangan diimpor dari komponen client. Kunci DuitKu hanya dibaca dari env, tidak pernah dicatat atau dikirim ke browser.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bacaKonfigDuitku, bacaMetode, datetimeJakarta, petaCekStatus, tandaTanganInquiry, tandaTanganMetode, tandaTanganStatus, urlBayarAman,
  type HasilDuitku, type KonfigDuitku, type MetodeBayar,
} from "./duitku";
import { kirimStrukLangganan } from "./notifikasiLangganan";

export function konfigDuitku(): { ok: true; konfig: KonfigDuitku } | { ok: false; alasan: string } {
  return bacaKonfigDuitku(process.env as Record<string, string | undefined>);
}

async function panggil(k: KonfigDuitku, jalur: string, badan: Record<string, unknown>, form = false): Promise<{ status: number; json: unknown }> {
  const kontrol = new AbortController();
  const timer = setTimeout(() => kontrol.abort(), 12000);
  try {
    const r = await fetch(`${k.basis}/${jalur}`, {
      method: "POST",
      headers: { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json", Accept: "application/json" },
      body: form ? new URLSearchParams(badan as Record<string, string>).toString() : JSON.stringify(badan),
      cache: "no-store",
      signal: kontrol.signal,
    });
    let json: unknown = null;
    try { json = await r.json(); } catch { /* bukan JSON */ }
    return { status: r.status, json };
  } finally { clearTimeout(timer); }
}

/** Daftar metode bayar + biaya admin untuk nominal tertentu. null = DuitKu tidak bisa dihubungi / balasan tak wajar. */
export async function ambilMetodeDuitku(k: KonfigDuitku, jumlah: number): Promise<MetodeBayar[] | null> {
  try {
    const datetime = datetimeJakarta(new Date());
    const r = await panggil(k, "paymentmethod/getpaymentmethod", { merchantcode: k.kode, amount: jumlah, datetime, signature: tandaTanganMetode(k.kode, jumlah, datetime, k.kunci) });
    if (r.status !== 200) return null;
    const j = r.json as { responseCode?: string } | null;
    if (j?.responseCode !== "00") return null;
    const daftar = bacaMetode(r.json);
    return daftar.length ? daftar : null;
  } catch { return null; }
}

export interface BuatTransaksi { merchantOrderId: string; jumlah: number; metode: string; email: string; namaVa: string; produk: string; callbackUrl: string; returnUrl: string; menitKedaluwarsa: number }
export type HasilInquiry = { ok: true; url: string; referensi: string } | { ok: false; pesan: string };

export async function buatTransaksiDuitku(k: KonfigDuitku, t: BuatTransaksi): Promise<HasilInquiry> {
  try {
    const r = await panggil(k, "v2/inquiry", {
      merchantCode: k.kode, paymentAmount: t.jumlah, paymentMethod: t.metode, merchantOrderId: t.merchantOrderId,
      productDetails: t.produk.slice(0, 255), email: t.email, customerVaName: t.namaVa.slice(0, 20),
      callbackUrl: t.callbackUrl, returnUrl: t.returnUrl, expiryPeriod: t.menitKedaluwarsa,
      signature: tandaTanganInquiry(k.kode, t.merchantOrderId, t.jumlah, k.kunci),
    });
    const j = r.json as { statusCode?: string; paymentUrl?: string; reference?: string; Message?: string; statusMessage?: string } | null;
    if (r.status !== 200 || j?.statusCode !== "00") {
      console.error("[duitku] inquiry gagal", r.status, j?.statusCode, String(j?.statusMessage ?? j?.Message ?? "").slice(0, 120));
      return { ok: false, pesan: "DuitKu menolak permintaan pembayaran. Coba metode lain atau ulangi sebentar lagi." };
    }
    const url = urlBayarAman(j.paymentUrl, !k.produksi);
    const referensi = String(j.reference ?? "").slice(0, 120);
    if (!url || !referensi) return { ok: false, pesan: "Balasan DuitKu tidak lengkap. Coba lagi." };
    return { ok: true, url, referensi };
  } catch (e) {
    console.error("[duitku] inquiry galat", e instanceof Error ? e.name : "tak dikenal");
    return { ok: false, pesan: "DuitKu tidak bisa dihubungi sekarang. Coba lagi sebentar." };
  }
}

export type HasilCek = { ok: true; hasil: HasilDuitku; jumlah: number | null; referensi: string } | { ok: false };

/** Cek status transaksi ke server DuitKu (sumber kebenaran, bukan parameter dari browser). */
export async function cekStatusDuitku(k: KonfigDuitku, merchantOrderId: string): Promise<HasilCek> {
  try {
    const r = await panggil(k, "transactionStatus", { merchantCode: k.kode, merchantOrderId, signature: tandaTanganStatus(k.kode, merchantOrderId, k.kunci) });  // contoh kode resmi memakai badan JSON
    const j = r.json as { merchantOrderId?: string; amount?: string | number; statusCode?: string; reference?: string } | null;
    if (r.status !== 200 || !j || j.merchantOrderId !== merchantOrderId) return { ok: false };
    const jumlah = /^\d{1,9}(\.\d{1,2})?$/.test(String(j.amount ?? "")) ? Math.round(Number(j.amount)) : null;
    return { ok: true, hasil: petaCekStatus(j.statusCode), jumlah, referensi: String(j.reference ?? "").slice(0, 120) };
  } catch { return { ok: false }; }
}

export type StatusAktivasi = "aktif" | "sudah" | "bayar_ganda" | "perlu_tinjau" | "jumlah_tidak_cocok" | "tidak_dikenal";
export interface HasilAktivasi { status: StatusAktivasi; orderId?: string; tenantId?: string; invoiceId?: string; periodeBerakhir?: string }

/** Memanggil fungsi atomik di database. Jumlah wajib dari DuitKu (cek status), BUKAN dari browser. */
export async function aktifkanDariDuitku(db: SupabaseClient, merchantOrderId: string, jumlah: number, referensi: string): Promise<HasilAktivasi | null> {
  const { data, error } = await db.rpc("aktifkan_langganan_duitku", { p_merchant_order_id: merchantOrderId, p_jumlah: jumlah, p_referensi: referensi });
  if (error || !data) { console.error("[duitku] aktivasi galat", error?.code); return null; }
  const h = data as HasilAktivasi;
  if (h.status === "aktif" && h.invoiceId) {
    // Struk best effort: aktivasi sudah sah walau email gagal.
    try { await kirimStrukLangganan(db, h.invoiceId, h.periodeBerakhir ?? null); } catch (e) { console.error("[duitku] struk gagal", e instanceof Error ? e.name : ""); }
  }
  return h;
}

export type HasilVerifikasi =
  | { jenis: "aktivasi"; hasil: HasilAktivasi }
  | { jenis: "menunggu" }
  | { jenis: "gagal" }
  | { jenis: "galat_duitku" }
  | { jenis: "galat_db" };

/**
 * Satu-satunya jalan menuju "lunas": tanya DuitKu (server ke server) -> hanya bila statusCode 00 -> fungsi aktivasi
 * mencocokkan jumlah dengan invoice di database. Dipakai callback DAN pengecekan dari halaman hasil bayar.
 */
export async function verifikasiDanAktifkan(db: SupabaseClient, k: KonfigDuitku, merchantOrderId: string): Promise<HasilVerifikasi> {
  const cek = await cekStatusDuitku(k, merchantOrderId);
  if (!cek.ok) return { jenis: "galat_duitku" };
  if (cek.hasil === "gagal") return { jenis: "gagal" };
  if (cek.hasil !== "berhasil") return { jenis: "menunggu" };
  if (cek.jumlah === null) return { jenis: "galat_duitku" };
  const h = await aktifkanDariDuitku(db, merchantOrderId, cek.jumlah, cek.referensi);
  return h ? { jenis: "aktivasi", hasil: h } : { jenis: "galat_db" };
}
