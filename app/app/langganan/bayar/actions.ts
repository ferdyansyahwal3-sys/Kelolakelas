"use server";
import { FORMAT_ORDER_INVOICE, MENIT_KEDALUWARSA, merchantOrderId } from "@/lib/duitku";
import { ambilMetodeDuitku, buatTransaksiDuitku, konfigDuitku, verifikasiDanAktifkan } from "@/lib/duitkuServer";
import { asalSitus } from "@/lib/kirimEmail";
import { kirimInvoiceTerbit, emailPemilik } from "@/lib/notifikasiLangganan";
import { PROMO_PELANGGAN, hargaPeriode, labelPlan } from "@/lib/paketLangganan";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { klienAdmin } from "@/lib/supabase/server";
import { ambilKonteksOwner, type KonteksOwner } from "@/lib/supabase/konteks";

export type HasilSiapkan = { ok: true; order: string } | { ok: false; pesan: string };
export type HasilMulai = { ok: true; url: string } | { ok: false; pesan: string };
export type HasilCek = { hasil: "berhasil" | "menunggu" | "gagal"; pesan?: string };

const GALAT = "Terjadi masalah. Coba lagi sebentar.";

/** Memuat invoice usaha ini lewat klien pengguna (RLS: hanya pemilik). */
async function muatInvoice(k: KonteksOwner, order: string) {
  if (!FORMAT_ORDER_INVOICE.test(order)) return null;
  const { data } = await k.db.from("subscription_invoices").select("id, order_id, plan, period_months, amount, status").eq("tenant_id", k.tenant.id).eq("order_id", order).maybeSingle();
  return data as { id: string; order_id: string; plan: string; period_months: number; amount: number; status: string } | null;
}

/** Tombol "Bayar": nominal dihitung di SERVER dari paket langganan saat ini + harga promo pelanggan; browser hanya mengirim periode. */
export async function siapkanTagihan(periode: "bulanan" | "tahunan"): Promise<HasilSiapkan> {
  if (periode !== "bulanan" && periode !== "tahunan") return { ok: false, pesan: GALAT };
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: "Sesi habis. Masuk lagi." };
  if (!(await bolehLanjut("duitku"))) return { ok: false, pesan: PESAN_TERLALU_SERING };
  const h = hargaPeriode(k.plan, periode, Date.now(), PROMO_PELANGGAN);
  const admin = klienAdmin();
  const { data, error } = await admin.rpc("buat_invoice_langganan", { p_tenant: k.tenant.id, p_bulan: h.bulan, p_nominal: h.total });
  const inv = data as { id: string; orderId: string; baru: boolean } | null;
  if (error || !inv) { console.error("[bayar] buat invoice", error?.code); return { ok: false, pesan: GALAT }; }
  if (inv.baru) { try { await kirimInvoiceTerbit(admin, inv.id); } catch { /* email best effort */ } }
  return { ok: true, order: inv.orderId };
}

/**
 * Setelah pelanggan memilih metode: biaya admin diambil ULANG dari DuitKu (bukan dari browser), jumlah = harga invoice + biaya,
 * dibuat satu percobaan baru (merchantOrderId baru), lalu pelanggan diarahkan ke halaman bayar DuitKu.
 */
export async function mulaiBayar(order: string, metode: string): Promise<HasilMulai> {
  if (!/^[A-Z0-9]{2}$/.test(metode)) return { ok: false, pesan: "Pilih metode pembayaran." };
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: "Sesi habis. Masuk lagi." };
  if (!(await bolehLanjut("duitku"))) return { ok: false, pesan: PESAN_TERLALU_SERING };
  const cfg = konfigDuitku();
  if (!cfg.ok) return { ok: false, pesan: "Pembayaran online belum aktif di server ini." };
  const inv = await muatInvoice(k, order);
  if (!inv || inv.status !== "belum_bayar") return { ok: false, pesan: "Tagihan ini sudah tidak bisa dibayar. Buka Langganan dan mulai lagi." };
  if (inv.plan !== k.plan) return { ok: false, pesan: "Paketmu berubah sejak tagihan dibuat. Buka Langganan dan mulai lagi." };

  const daftar = await ambilMetodeDuitku(cfg.konfig, inv.amount);
  const pilih = daftar?.find((m) => m.kode === metode);
  if (!pilih) return { ok: false, pesan: "Metode itu tidak tersedia sekarang. Pilih yang lain." };
  const jumlah = inv.amount + pilih.biaya;

  const admin = klienAdmin();
  const nanti = new Date(Date.now() + MENIT_KEDALUWARSA * 60000).toISOString();
  // Percobaan yang sama (metode + jumlah, belum kedaluwarsa, sudah punya tautan): pakai lagi, jangan buat transaksi dobel.
  const { data: ada } = await admin.from("duitku_percobaan").select("payment_url, metode, jumlah, status, kedaluwarsa_pada")
    .eq("tenant_id", k.tenant.id).eq("invoice_id", inv.id).eq("status", "menunggu").not("payment_url", "is", null).order("dibuat_pada", { ascending: false }).limit(1);
  const lama = ada?.[0] as { payment_url: string; metode: string; jumlah: number; kedaluwarsa_pada: string } | undefined;
  if (lama && lama.metode === metode && lama.jumlah === jumlah && Date.parse(lama.kedaluwarsa_pada) > Date.now() + 60000) return { ok: true, url: lama.payment_url };

  const { count } = await admin.from("duitku_percobaan").select("id", { count: "exact", head: true }).eq("tenant_id", k.tenant.id).eq("invoice_id", inv.id);
  const urutan = (count ?? 0) + 1;
  if (urutan > 30) return { ok: false, pesan: "Terlalu banyak percobaan untuk tagihan ini. Buka Langganan dan mulai tagihan baru." };
  const mid = merchantOrderId(inv.order_id, urutan);
  const { data: baris, error } = await admin.from("duitku_percobaan").insert({ tenant_id: k.tenant.id, invoice_id: inv.id, merchant_order_id: mid, metode, biaya_admin: pilih.biaya, jumlah, kedaluwarsa_pada: nanti }).select("id").single();
  if (error || !baris) { console.error("[bayar] simpan percobaan", error?.code); return { ok: false, pesan: GALAT }; }

  const p = await emailPemilik(admin, k.tenant.id);
  const asal = asalSitus();
  const callbackUrl = (process.env.DUITKU_CALLBACK_URL ?? "").trim() || `${asal}/api/duitku/callback`;
  const hasil = await buatTransaksiDuitku(cfg.konfig, {
    merchantOrderId: mid, jumlah, metode, email: p?.email ?? "noreply@kelolakelas.web.id",
    namaVa: k.tenant.nama.replace(/[^A-Za-z0-9 ]/g, "").trim() || "KelolaKelas",
    produk: `Langganan KelolaKelas ${labelPlan(k.plan)} ${inv.period_months} bulan`,
    callbackUrl, returnUrl: `${asal}/app/langganan/bayar/${inv.order_id}`, menitKedaluwarsa: MENIT_KEDALUWARSA,
  });
  if (!hasil.ok) {
    await admin.from("duitku_percobaan").update({ status: "gagal" }).eq("id", baris.id as string).eq("tenant_id", k.tenant.id);
    return { ok: false, pesan: hasil.pesan };
  }
  await admin.from("duitku_percobaan").update({ payment_url: hasil.url, referensi: hasil.referensi }).eq("id", baris.id as string).eq("tenant_id", k.tenant.id);
  return { ok: true, url: hasil.url };
}

/**
 * Dipanggil halaman hasil bayar. "berhasil" HANYA bila database sudah lunas (diaktifkan callback terverifikasi atau cek status
 * server-ke-server). Cek ke DuitKu dibatasi sekali per 8 detik per invoice (DuitKu memblokir hit berlebihan).
 */
export async function cekStatusBayar(order: string): Promise<HasilCek> {
  const k = await ambilKonteksOwner();
  if (!k) return { hasil: "menunggu", pesan: "Sesi habis. Masuk lagi." };
  const inv = await muatInvoice(k, order);
  if (!inv) return { hasil: "gagal", pesan: "Tagihan tidak ditemukan." };
  if (inv.status === "lunas") return { hasil: "berhasil" };
  if (inv.status !== "belum_bayar") return { hasil: "gagal" };
  const cfg = konfigDuitku();
  if (!cfg.ok) return { hasil: "menunggu", pesan: "Pembayaran online belum aktif di server ini." };

  const admin = klienAdmin();
  const { data: daftar } = await admin.from("duitku_percobaan").select("id, merchant_order_id, status, kedaluwarsa_pada")
    .eq("tenant_id", k.tenant.id).eq("invoice_id", inv.id).eq("status", "menunggu").order("dibuat_pada", { ascending: false }).limit(5);
  const aktif = (daftar ?? []) as { id: string; merchant_order_id: string; kedaluwarsa_pada: string }[];
  if (aktif.length === 0) return { hasil: "gagal" };

  let adaMenunggu = false;
  for (const p of aktif) {
    const batas = new Date(Date.now() - 8000).toISOString();
    // Klaim atomik: hanya satu pengecek per 8 detik yang boleh menghubungi DuitKu.
    const { data: klaim } = await admin.from("duitku_percobaan").update({ cek_terakhir_pada: new Date().toISOString() })
      .eq("id", p.id).eq("tenant_id", k.tenant.id).eq("status", "menunggu").or(`cek_terakhir_pada.is.null,cek_terakhir_pada.lt.${batas}`).select("id");
    if (!klaim || klaim.length === 0) { adaMenunggu = true; continue; }
    const v = await verifikasiDanAktifkan(admin, cfg.konfig, p.merchant_order_id);
    if (v.jenis === "aktivasi") {
      if (v.hasil.status === "aktif" || v.hasil.status === "sudah") return { hasil: "berhasil" };
      if (v.hasil.status === "perlu_tinjau" || v.hasil.status === "bayar_ganda") return { hasil: "menunggu", pesan: "Pembayaranmu sudah kami terima dan sedang ditinjau tim kami. Hubungi kami bila tidak ada kabar." };
      continue;
    }
    if (v.jenis === "gagal") { await admin.from("duitku_percobaan").update({ status: "kedaluwarsa" }).eq("id", p.id).eq("tenant_id", k.tenant.id).eq("status", "menunggu"); continue; }
    adaMenunggu = true;
  }
  return adaMenunggu ? { hasil: "menunggu" } : { hasil: "gagal" };
}
