import type { KonteksOwner } from "./konteks";
import type { MuridContoh } from "../contoh";
import { KOLOM_MURID, dariBarisMurid, type BarisCatatanDb, type BarisMuridDb, type BarisSesiDb } from "../muridDb";

/** Semua murid usaha ini (RLS + filter tenant). Sesi dimuat sekali untuk menghitung sisa; skala pilot (puluhan murid). */
export async function muatDaftarMurid(k: KonteksOwner): Promise<MuridContoh[]> {
  const [{ data: murid, error: mErr }, { data: sesi }] = await Promise.all([
    k.db.from("murid").select(KOLOM_MURID).eq("tenant_id", k.tenant.id).order("nama"),
    k.db.from("sesi").select("murid_id, tanggal, status").eq("tenant_id", k.tenant.id),
  ]);
  if (mErr) console.error("[muatDaftarMurid]", mErr.code, mErr.message);
  return ((murid ?? []) as unknown as BarisMuridDb[]).map((b) => dariBarisMurid(b, (sesi ?? []) as BarisSesiDb[]));
}

export async function muatMurid(k: KonteksOwner, id: string): Promise<MuridContoh | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [{ data: m, error: mErr }, { data: sesi }, { data: cat }] = await Promise.all([
    k.db.from("murid").select(KOLOM_MURID).eq("tenant_id", k.tenant.id).eq("id", id).maybeSingle(),
    k.db.from("sesi").select("murid_id, tanggal, status").eq("tenant_id", k.tenant.id).eq("murid_id", id),
    k.db.from("catatan_murid").select("id, teks, dibuat_pada").eq("tenant_id", k.tenant.id).eq("murid_id", id).order("dibuat_pada", { ascending: false }).limit(50),
  ]);
  if (mErr) console.error("[muatMurid]", mErr.code, mErr.message);
  if (!m) return null;
  return dariBarisMurid(m as unknown as BarisMuridDb, (sesi ?? []) as BarisSesiDb[], (cat ?? []) as BarisCatatanDb[]);
}
