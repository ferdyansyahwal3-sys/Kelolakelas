"use server";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";
import { hashKode } from "@/lib/hashKode";
import { pesanGalatTerima } from "@/lib/pengajarDb";
import { klienServer } from "@/lib/supabase/server";

export type HasilTerima = { ok: true; usaha: string } | { ok: false; pesan: string };

/** Pelatih yang sudah masuk menerima undangan: email akunnya harus sama dengan email yang diundang (dicek di database). */
export async function terimaUndangan(kode: string): Promise<HasilTerima> {
  if (!(await bolehLanjut("undangan"))) return { ok: false, pesan: PESAN_TERLALU_SERING };
  if (!/^[A-Za-z0-9]{6,32}$/.test(String(kode))) return { ok: false, pesan: "Kode undangan tidak valid." };
  const db = klienServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false, pesan: "Masuk dulu." };
  const { data, error } = await db.rpc("terima_undangan", { p_hash: hashKode(kode) });
  return error ? { ok: false, pesan: pesanGalatTerima(error) } : { ok: true, usaha: String(data) };
}
