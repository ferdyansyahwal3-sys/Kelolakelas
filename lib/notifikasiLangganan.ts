// Server saja: email langganan KelolaKelas -> PEMILIK usaha (pengingat periode, invoice terbit, struk lunas).
// Memakai service role: SETIAP query disaring tenant_id. Jangan diimpor dari komponen client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { asalSitus, kirimEmail, type HasilEmail } from "./kirimEmail";
import { emailInvoiceLangganan, emailPengingatLangganan, emailStrukLangganan, kunciInvoiceTerbit, kunciLangganan, kunciStrukLangganan, tahapLangganan, emailValid, type TahapLangganan } from "./notifikasi";
import { hariIniJakarta, tanggalJakarta } from "./langgananData";

const DIABAIKAN = new Set(["ditangguhkan", "berhenti"]);

/** Email pemilik (tenants.owner_id harus anggota 'owner' tenant itu). null bila tak ada/tak valid. */
export async function emailPemilik(db: SupabaseClient, tenantId: string): Promise<{ email: string; usaha: string } | null> {
  const { data: t } = await db.from("tenants").select("id, nama, owner_id").eq("id", tenantId).maybeSingle();
  if (!t) return null;
  const { data: m } = await db.from("tenant_members").select("user_id").eq("tenant_id", tenantId).eq("user_id", t.owner_id as string).eq("role", "owner").maybeSingle();
  if (!m) return null;
  const { data: u, error } = await db.auth.admin.getUserById(t.owner_id as string);
  const email = u?.user?.email?.trim().toLowerCase() ?? "";
  if (error || !emailValid(email)) return null;
  return { email, usaha: t.nama as string };
}

const linkLangganan = () => `${asalSitus()}/app/langganan`;
const TIDAK_ADA: HasilEmail = { ok: false, status: "dilewati", pesan: "Email pemilik tidak ditemukan." };

interface Invoice { id: string; tenant_id: string; order_id: string; plan: string; period_months: number; amount: number; status: string; due_at: string; terbit_pada: string; paid_at: string | null; promo_code: string | null; metode: string | null; referensi: string | null }
async function muatInvoice(db: SupabaseClient, invoiceId: string): Promise<Invoice | null> {
  const { data } = await db.from("subscription_invoices").select("id, tenant_id, order_id, plan, period_months, amount, status, due_at, terbit_pada, paid_at, promo_code, metode, referensi").eq("id", invoiceId).maybeSingle();
  return (data as Invoice | null) ?? null;
}

/** Dipanggil saat invoice baru dibuat (B6). Best effort. */
export async function kirimInvoiceTerbit(db: SupabaseClient, invoiceId: string): Promise<HasilEmail> {
  const inv = await muatInvoice(db, invoiceId);
  if (!inv || inv.status !== "belum_bayar") return { ok: false, status: "dilewati", pesan: "Tagihan tidak ditemukan atau sudah tidak berlaku." };
  const p = await emailPemilik(db, inv.tenant_id);
  if (!p) return TIDAK_ADA;
  const isi = emailInvoiceLangganan(p.usaha, { plan: inv.plan, bulan: inv.period_months, nominal: inv.amount, tempo: tanggalJakarta(inv.due_at), orderId: inv.order_id, terbit: tanggalJakarta(inv.terbit_pada), email: p.email, promo: inv.promo_code }, `${asalSitus()}/app/langganan/bayar/${inv.order_id}`);
  return kirimEmail({ tenantId: inv.tenant_id, jenis: "langganan_invoice", kunci: kunciInvoiceTerbit(inv.id), ke: p.email, isi });
}

/** Struk setelah lunas (dipanggil dari aktivasi manual; nanti webhook B6). Best effort: jangan membatalkan pelunasan. */
export async function kirimStrukLangganan(db: SupabaseClient, invoiceId: string, akhirBaru: string | null): Promise<HasilEmail> {
  const inv = await muatInvoice(db, invoiceId);
  if (!inv || inv.status !== "lunas") return { ok: false, status: "dilewati", pesan: "Tagihan belum lunas." };
  const p = await emailPemilik(db, inv.tenant_id);
  if (!p) return TIDAK_ADA;
  const isi = emailStrukLangganan(p.usaha, { plan: inv.plan, bulan: inv.period_months, nominal: inv.amount, akhirBaru, referensi: inv.referensi, orderId: inv.order_id, dibayar: inv.paid_at ? tanggalJakarta(inv.paid_at) : null, metode: inv.metode, email: p.email, promo: inv.promo_code }, `${asalSitus()}/app`);
  return kirimEmail({ tenantId: inv.tenant_id, jenis: "langganan_lunas", kunci: kunciStrukLangganan(inv.id), ke: p.email, isi });
}

export async function kirimPengingatLangganan(db: SupabaseClient, d: { tenantId: string; plan: string; akhir: string; tahap: TahapLangganan; tagihan?: { nominal: number; tempo: string } }): Promise<HasilEmail> {
  const p = await emailPemilik(db, d.tenantId);
  if (!p) return TIDAK_ADA;
  const isi = emailPengingatLangganan(p.usaha, { tahap: d.tahap, akhir: d.akhir, plan: d.plan, tagihan: d.tagihan }, linkLangganan());
  return kirimEmail({ tenantId: d.tenantId, jenis: "langganan_pengingat", kunci: kunciLangganan(d.akhir, d.tahap), ke: p.email, isi });
}

export interface HitungLangganan { kandidat: number; terkirim: number; duplikat: number; gagal: number; dilewati: number }

/** Dipanggil cron harian: langganan berbayar yang akhir periodenya H-7, H-3, hari-H, H+3 (WIB). Bergeser otomatis setelah bayar. */
export async function jalankanPengingatLangganan(db: SupabaseClient, hariIni = hariIniJakarta()): Promise<HitungLangganan> {
  const hitung: HitungLangganan = { kandidat: 0, terkirim: 0, duplikat: 0, gagal: 0, dilewati: 0 };
  const ms = Date.parse(hariIni + "T00:00:00Z");
  const dari = new Date(ms - 5 * 86_400_000).toISOString();
  const sampai = new Date(ms + 9 * 86_400_000).toISOString();
  const { data, error } = await db.from("subscriptions").select("tenant_id, plan, current_period_end, status_manual").gte("current_period_end", dari).lte("current_period_end", sampai).limit(2000);
  if (error) { console.error("[cron langganan]", error.message); hitung.gagal++; return hitung; }

  const terpilih: { tenantId: string; plan: string; akhir: string; tahap: TahapLangganan }[] = [];
  for (const s of (data ?? []) as { tenant_id: string; plan: string; current_period_end: string | null; status_manual: string | null }[]) {
    if (!s.current_period_end || (s.status_manual && DIABAIKAN.has(s.status_manual))) continue;
    const akhir = tanggalJakarta(s.current_period_end);
    const tahap = tahapLangganan(akhir, hariIni);
    if (tahap) terpilih.push({ tenantId: s.tenant_id, plan: s.plan, akhir, tahap });
  }
  hitung.kandidat = terpilih.length;
  if (!terpilih.length) return hitung;

  // Tagihan perpanjangan yang belum dibayar (bila ada) ikut dicantumkan; disaring ke tenant terpilih.
  const ids = terpilih.map((t) => t.tenantId);
  const { data: inv } = await db.from("subscription_invoices").select("tenant_id, amount, due_at").in("tenant_id", ids).eq("status", "belum_bayar").order("terbit_pada", { ascending: false });
  const petaInv = new Map<string, { nominal: number; tempo: string }>();
  for (const i of (inv ?? []) as { tenant_id: string; amount: number; due_at: string }[]) if (!petaInv.has(i.tenant_id)) petaInv.set(i.tenant_id, { nominal: i.amount, tempo: tanggalJakarta(i.due_at) });

  for (const t of terpilih) {
    const h = await kirimPengingatLangganan(db, { ...t, tagihan: petaInv.get(t.tenantId) });
    if (h.ok) hitung.terkirim++; else if (h.status === "duplikat") hitung.duplikat++; else if (h.status === "gagal") hitung.gagal++; else hitung.dilewati++;
  }
  return hitung;
}
