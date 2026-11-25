"use server";
import { bolehUbahData } from "@/lib/langganan";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export type HasilAbsen = { ok: true } | { ok: false; pesan: string };

function pesanGalat(e: { message?: string } | null): string {
  const m = e?.message ?? "";
  if (m.includes("bukan_peserta")) return "Murid ini bukan peserta tetap slot itu.";
  if (m.includes("tanggal_tidak_sesuai")) return "Tanggal tidak sesuai hari slot.";
  if (m.includes("slot_tidak_ditemukan")) return "Slot tidak ditemukan.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa mengabsen.";
  return "Absen belum tersimpan. Coba lagi sebentar.";
}

/** Simpan satu absen (status null = batalkan). Aturan sisa sesi/masa berlaku diperiksa di layar; server memastikan slot, tanggal, dan kepesertaan. */
export async function absenSesi(jadwalId: string, tanggal: string, muridId: string, status: "hadir" | "izin" | "alpa" | null): Promise<HasilAbsen> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(jadwalId)) || !UUID.test(String(muridId)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  if (status !== null && !["hadir", "izin", "alpa"].includes(String(status))) return { ok: false, pesan: "Status tidak valid." };
  const { error } = await k.db.rpc("absen", { p_jadwal: jadwalId, p_tanggal: tanggal, p_murid: muridId, p_status: status });
  return error ? { ok: false, pesan: pesanGalat(error) } : { ok: true };
}
