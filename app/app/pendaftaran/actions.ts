"use server";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { bolehUbahData } from "@/lib/langganan";
import { bolehTambah } from "@/lib/paketLangganan";
import { pesanGalatPendaftaran } from "@/lib/pendaftaranDb";
import { klienAdmin } from "@/lib/supabase/server";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HasilKeputusan = { ok: true; muridId?: string } | { ok: false; pesan: string };

/** ACC = murid + paket murid + tagihan + status 'disetujui' dalam satu fungsi database (atomik, tahan klik ganda). */
export async function setujuiPendaftaran(id: string): Promise<HasilKeputusan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pendaftaran tidak ditemukan." };

  const { count } = await k.db.from("murid").select("id", { count: "exact", head: true }).eq("tenant_id", k.tenant.id).eq("aktif", true);
  if (!bolehTambah(k.plan, "murid", count ?? 0)) return { ok: false, pesan: pesanGalatPendaftaran({ message: "batas_murid" }) };

  const { data, error } = await k.db.rpc("setujui_pendaftaran", { p_id: id });
  if (error) return { ok: false, pesan: pesanGalatPendaftaran(error) };
  return { ok: true, muridId: String(data) };
}

export async function tolakPendaftaran(id: string): Promise<HasilKeputusan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pendaftaran tidak ditemukan." };
  const { error } = await k.db.rpc("tolak_pendaftaran", { p_id: id });
  return error ? { ok: false, pesan: pesanGalatPendaftaran(error) } : { ok: true };
}

/** Tautan sementara (2 menit) ke bukti bayar terbaru. Hanya pemilik; bucket privat, baca lewat service role setelah memastikan baris milik usahanya. */
export async function urlBukti(id: string): Promise<{ ok: true; url: string } | { ok: false; pesan: string }> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pendaftaran tidak ditemukan." };
  const { data } = await k.db.from("pendaftaran_bukti").select("berkas_path").eq("tenant_id", k.tenant.id).eq("pendaftaran_id", id).order("diunggah_pada", { ascending: false }).limit(1).maybeSingle();
  if (!data || !String(data.berkas_path).startsWith(`${k.tenant.id}/`)) return { ok: false, pesan: "Belum ada bukti bayar." };
  const { data: tanda, error } = await klienAdmin().storage.from("bukti-bayar").createSignedUrl(data.berkas_path as string, 120);
  if (error || !tanda) return { ok: false, pesan: "Bukti belum bisa dibuka. Coba lagi." };
  return { ok: true, url: tanda.signedUrl };
}
