import type { SupabaseClient } from "@supabase/supabase-js";
import type { PeranPengguna } from "../daftarUsaha";

/**
 * Peran pengguna ini, dibaca lewat RLS. WAJIB disaring user_id: kebijakan members_baca membolehkan anggota melihat SELURUH
 * daftar tim usahanya (termasuk baris pemilik), jadi tanpa filter seorang pelatih akan terbaca sebagai owner.
 */
export async function ambilPeran(db: SupabaseClient, userId: string): Promise<PeranPengguna[]> {
  if (!userId) return [];
  const { data, error } = await db.from("tenant_members").select("role").eq("user_id", userId);
  if (error || !data) return [];
  const peran = new Set<PeranPengguna>();
  for (const r of data as { role: string }[]) if (r.role === "owner" || r.role === "pengajar") peran.add(r.role);
  return Array.from(peran);
}
