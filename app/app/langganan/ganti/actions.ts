"use server";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { adalahPlan } from "@/lib/paketLangganan";
import { bacaHasilGanti, pesanGalatGanti, type HasilGanti } from "@/lib/langgananGanti";

/**
 * Ganti paket / pindah jenis. Keputusan ada di database (fungsi ganti_paket): ditolak bila pemakaian melebihi batas paket tujuan,
 * dan yang dikembalikan daftar kelebihan. Tidak ada murid/slot/paket/pelatih/rekening yang diubah di sini.
 * Sengaja TIDAK memeriksa akses langganan: pemilik yang masa percobaannya habis harus tetap bisa memilih paket.
 */
export async function gantiPaket(plan: string): Promise<HasilGanti> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, galat: "lain", pesan: "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi." };
  if (!adalahPlan(plan)) return { ok: false, galat: "lain", pesan: "Paket tidak dikenal." };
  const { data, error } = await k.db.rpc("ganti_paket", { p_plan: plan });
  if (error) return { ok: false, galat: "lain", pesan: pesanGalatGanti(error.message) };
  return bacaHasilGanti(data);
}
