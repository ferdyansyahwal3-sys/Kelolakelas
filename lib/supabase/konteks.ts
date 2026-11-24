import type { SupabaseClient } from "@supabase/supabase-js";
import { klienServer } from "./server";
import { supabaseTersambung } from "./env";
import { hitungAkses, type HasilAkses } from "../langganan";
import { dataLangganan, hariIniJakarta } from "../langgananData";
import { adalahPlan, type PlanKey } from "../paketLangganan";

export interface Tenant { id: string; nama: string; slug: string; jenis: string; kategori: string; tema: string; istilah: Record<string, string> }
export interface KonteksOwner { db: SupabaseClient; userId: string; namaPengguna: string; tenant: Tenant; plan: PlanKey; akses: HasilAkses }

/**
 * Konteks pemilik usaha untuk halaman dan aksi server: siapa yang masuk, usaha mana, paket langganan, dan akses (dihitung dari tanggal).
 * Semua query memakai klien pengguna (RLS berlaku). `user_id` WAJIB disaring: members_baca membolehkan anggota melihat seluruh timnya.
 * null = belum masuk, bukan pemilik, atau data langganan tidak ada (tertutup, bukan terbuka).
 */
export async function ambilKonteksOwner(): Promise<KonteksOwner | null> {
  if (!supabaseTersambung()) return null;
  const db = klienServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const userId = auth.user.id;

  const { data: anggota } = await db.from("tenant_members").select("tenants(id, nama, slug, jenis, kategori, tema, istilah, trial_ends_at)").eq("user_id", userId).eq("role", "owner").limit(1);
  const baris = anggota?.[0] as unknown as { tenants: (Tenant & { trial_ends_at: string | null }) | (Tenant & { trial_ends_at: string | null })[] } | undefined;
  const t = Array.isArray(baris?.tenants) ? baris?.tenants[0] : baris?.tenants;
  if (!t) return null;

  const { data: sub } = await db.from("subscriptions").select("plan, current_period_end, grace_until").eq("tenant_id", t.id).maybeSingle();
  if (!sub || !adalahPlan(sub.plan)) return null;

  const akses = hitungAkses(dataLangganan(t.trial_ends_at, sub.current_period_end, sub.grace_until), hariIniJakarta());
  return { db, userId, namaPengguna: String(auth.user.user_metadata?.nama ?? "").trim() || "Pemilik", tenant: { id: t.id, nama: t.nama, slug: t.slug, jenis: t.jenis, kategori: t.kategori, tema: t.tema, istilah: t.istilah }, plan: sub.plan, akses };
}
