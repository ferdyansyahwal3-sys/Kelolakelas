"use server";
import { bolehUbahData } from "@/lib/langganan";
import { pesanGalatTagihan } from "@/lib/tagihanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export type HasilTagihan = { ok: true } | { ok: false; pesan: string };

export async function lunasiTagihan(id: string, metode: string, tanggal: string): Promise<HasilTagihan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await k.db.rpc("tandai_lunas", { p_tagihan: id, p_metode: String(metode), p_tanggal: tanggal });
  return error ? { ok: false, pesan: pesanGalatTagihan(error) } : { ok: true };
}

export async function tolakBuktiTagihan(id: string): Promise<HasilTagihan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await k.db.rpc("tolak_bukti", { p_tagihan: id });
  return error ? { ok: false, pesan: pesanGalatTagihan(error) } : { ok: true };
}
