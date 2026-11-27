import type { KonteksOwner } from "./konteks";
import type { MuridContoh } from "../contoh";
import type { SlotPilih } from "../slotMurid";
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

/** Semua slot usaha + terisi + nama pelatih (untuk memilih slot murid). */
export async function muatSlotPilih(k: KonteksOwner): Promise<SlotPilih[]> {
  const [{ data: jad }, { data: peserta }, { data: pengajar }] = await Promise.all([
    k.db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota").eq("tenant_id", k.tenant.id).order("hari").order("jam_mulai"),
    k.db.from("peserta_tetap").select("jadwal_id").eq("tenant_id", k.tenant.id),
    k.db.from("pengajar").select("id, nama").eq("tenant_id", k.tenant.id),
  ]);
  const terisi = new Map<string, number>();
  for (const p of (peserta ?? []) as { jadwal_id: string }[]) terisi.set(p.jadwal_id, (terisi.get(p.jadwal_id) ?? 0) + 1);
  const namaPengajar = new Map(((pengajar ?? []) as { id: string; nama: string }[]).map((p) => [p.id, p.nama]));
  return ((jad ?? []) as { id: string; pengajar_id: string; hari: number; jam_mulai: string; durasi_menit: number; nama: string; kuota: number }[]).map((j) => ({
    id: j.id, nama: j.nama, hari: j.hari + 1, jam: j.jam_mulai.slice(0, 5).replace(":", "."), durasi: j.durasi_menit, kuota: j.kuota, terisi: terisi.get(j.id) ?? 0, pengajar: namaPengajar.get(j.pengajar_id) ?? "",
  }));
}

/** Id slot tempat murid ini terdaftar tetap. */
export async function muatSlotMurid(k: KonteksOwner, muridId: string): Promise<string[]> {
  const { data } = await k.db.from("peserta_tetap").select("jadwal_id").eq("tenant_id", k.tenant.id).eq("murid_id", muridId);
  return ((data ?? []) as { jadwal_id: string }[]).map((p) => p.jadwal_id);
}
