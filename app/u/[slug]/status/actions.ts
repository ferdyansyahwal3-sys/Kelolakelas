"use server";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";
import { bacaPencarian, namaSamar, type StatusDaftar } from "@/lib/status";
import { cariPendaftaranPublik } from "@/lib/supabase/publikData";

export type HasilStatus =
  | { ok: true; nama: string; slot: string; status: StatusDaftar }
  | { ok: false; pesan: string };

// Pencarian dilakukan di server dan HANYA di usaha `slug`: browser tidak pernah menerima daftar pendaftar, hanya satu hasil dengan nama disamarkan.
// Dibatasi per IP lewat lib/rateLimitServer.ts (20 percobaan / 10 menit).
export async function cariStatus(slug: string, teks: string): Promise<HasilStatus> {
  if (!(await bolehLanjut("status"))) return { ok: false, pesan: PESAN_TERLALU_SERING };
  const q = bacaPencarian(String(teks ?? "").slice(0, 40));
  if (q.jenis === "salah") return { ok: false, pesan: "Isi kode pendaftaran (6 karakter) atau nomor WhatsApp yang dipakai mendaftar." };
  const d = await cariPendaftaranPublik(String(slug), q);
  if (!d) return { ok: false, pesan: "Pendaftaran tidak ditemukan. Cek lagi kode atau nomornya." };
  return { ok: true, nama: namaSamar(d.nama), slot: d.slotLabel, status: d.status };
}
