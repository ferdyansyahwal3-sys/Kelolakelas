// Server saja: pembantu baca data pesan (template + nama usaha) untuk email. Semua query disaring tenant_id.
import type { SupabaseClient } from "@supabase/supabase-js";
import { templatAman, type Templat } from "./notifikasi";

/** Template WA dari Pengaturan usaha (bawaan bila kosong/rusak). */
export async function muatTemplat(db: SupabaseClient, tenantId: string): Promise<Templat> {
  const { data } = await db.from("tenants").select("pengaturan").eq("id", tenantId).maybeSingle();
  const p = (data?.pengaturan && typeof data.pengaturan === "object" ? data.pengaturan : {}) as { templat?: Record<string, unknown> };
  const t = p.templat ?? {};
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 500) : "");
  return templatAman({ acc: s(t.acc), tolak: s(t.tolak), pengingat: s(t.pengingat) });
}
