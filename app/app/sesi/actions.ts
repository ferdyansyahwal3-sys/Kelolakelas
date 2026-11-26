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

function pesanGanti(e: { message?: string } | null): string {
  const m = e?.message ?? "";
  if (m.includes("pelatih_bentrok")) return "Pelatih itu sudah mengajar sesi lain di jam yang bentrok pada tanggal itu.";
  if (m.includes("pelatih_tidak_ditemukan")) return "Pelatih tidak ditemukan atau tidak aktif.";
  if (m.includes("sesi_lewat")) return "Sesi yang sudah lewat tidak bisa dialihkan.";
  if (m.includes("tanggal_tidak_sesuai")) return "Slot tidak ada di tanggal itu.";
  if (m.includes("slot_tidak_ditemukan")) return "Slot tidak ditemukan.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa mengganti pelatih.";
  return "Belum tersimpan. Coba lagi sebentar.";
}

/** Ganti pelatih sekali untuk satu sesi (slot + tanggal). pengajarId null = kembalikan ke pelatih tetap. Aturan diulang di fungsi database. */
export async function gantiPelatihSekali(jadwalId: string, tanggal: string, pengajarId: string | null): Promise<HasilAbsen> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(jadwalId)) || !TANGGAL.test(String(tanggal)) || (pengajarId !== null && !UUID.test(String(pengajarId)))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await k.db.rpc("ganti_pelatih_set", { p_jadwal: jadwalId, p_tanggal: tanggal, p_pengajar: pengajarId });
  return error ? { ok: false, pesan: pesanGanti(error) } : { ok: true };
}
