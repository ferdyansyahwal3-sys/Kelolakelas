"use server";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";
import { bisaAjukanIzin } from "@/lib/portal";
import { nomorHari } from "@/lib/sesi";
import { cariPortal } from "@/lib/supabase/portalData";
import { klienAdmin } from "@/lib/supabase/server";
import { aturanUntuk } from "@/lib/pengaturan";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export type HasilIzin = { ok: true } | { ok: false; pesan: string };

/**
 * Murid mengajukan izin untuk sesi tetapnya lewat link pribadi. Server memeriksa: token sah, slot memang milik murid itu,
 * tanggal jatuh di hari slot, masih di dalam batas jam izin usaha, dan sesi itu belum diabsen hadir/alpa.
 */
export async function ajukanIzin(slug: string, token: string, slotId: string, tanggal: string): Promise<HasilIzin> {
  if (!(await bolehLanjut("izin"))) return { ok: false, pesan: PESAN_TERLALU_SERING };
  if (!UUID.test(String(slotId)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  const db = klienAdmin();
  const c = await cariPortal(db, String(slug), String(token));
  if (!c) return { ok: false, pesan: "Link tidak berlaku." };

  const [{ data: ps }, { data: slot }, { data: ada }] = await Promise.all([
    db.from("peserta_tetap").select("id").eq("tenant_id", c.tenantId).eq("murid_id", c.muridId).eq("jadwal_id", slotId).maybeSingle(),
    db.from("jadwal_template").select("id, hari, jam_mulai, pengajar_id").eq("tenant_id", c.tenantId).eq("id", slotId).maybeSingle(),
    db.from("sesi").select("status").eq("tenant_id", c.tenantId).eq("murid_id", c.muridId).eq("jadwal_id", slotId).eq("tanggal", tanggal).maybeSingle(),
  ]);
  if (!ps || !slot) return { ok: false, pesan: "Sesi ini bukan milikmu." };
  if (nomorHari(tanggal) - 1 !== slot.hari) return { ok: false, pesan: "Tanggal tidak sesuai jadwal." };
  if (ada && ada.status !== "terjadwal" && ada.status !== "izin") return { ok: false, pesan: "Sesi ini sudah diabsen." };

  const jam = String(slot.jam_mulai).slice(0, 5);
  const batas = ((c.pengaturan ?? {}) as { aturan?: { batasIzinJam?: unknown } }).aturan?.batasIzinJam;
  const batasJam = typeof batas === "number" && batas >= 0 && batas <= 72 ? batas : aturanUntuk(c.kategori).batasIzinJam;
  if (!bisaAjukanIzin(`${tanggal}T${jam}:00+07:00`, new Date().toISOString(), batasJam)) return { ok: false, pesan: `Izin harus diajukan paling lambat ${batasJam} jam sebelum sesi dimulai.` };

  const { error } = await db.from("sesi").upsert({ tenant_id: c.tenantId, murid_id: c.muridId, jadwal_id: slotId, pengajar_id: slot.pengajar_id, tanggal, jam_mulai: slot.jam_mulai, status: "izin" }, { onConflict: "jadwal_id,tanggal,murid_id" });
  return error ? { ok: false, pesan: "Izin belum tersimpan. Coba lagi sebentar." } : { ok: true };
}
