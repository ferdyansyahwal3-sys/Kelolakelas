"use server";
import { redirect } from "next/navigation";
import { klienServer } from "@/lib/supabase/server";
import { ambilPeran } from "@/lib/supabase/peran";
import { PESAN_MASUK_GAGAL, pesanGalatAuth, tujuanSetelahMasuk } from "@/lib/daftarUsaha";
import { bacaEnvPublik, supabaseTersambung } from "@/lib/supabase/env";

export type HasilMasuk = { ok: true; ke: string; nama: string } | { ok: false; pesan: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function masuk(email: string, sandi: string, lanjut: string | null): Promise<HasilMasuk> {
  if (!supabaseTersambung()) return { ok: false, pesan: "Layanan belum dikonfigurasi." };
  const alamat = String(email ?? "").trim();
  // Pesan sama untuk semua kegagalan kredensial: tidak membocorkan apakah email terdaftar.
  if (!EMAIL.test(alamat) || alamat.length > 120 || typeof sandi !== "string" || sandi.length < 1 || sandi.length > 72) return { ok: false, pesan: PESAN_MASUK_GAGAL };
  const db = klienServer();
  const { data, error } = await db.auth.signInWithPassword({ email: alamat, password: sandi });
  if (error) return { ok: false, pesan: pesanGalatAuth(error.code, error.status) };
  const peran = await ambilPeran(db, data.user?.id ?? "");
  const meta = data.user?.user_metadata ?? {};
  return { ok: true, ke: tujuanSetelahMasuk(peran, lanjut), nama: String(meta.nama ?? meta.full_name ?? meta.name ?? "").trim() };
}

export async function keluar() {
  if (supabaseTersambung()) await klienServer().auth.signOut();
  redirect("/masuk");
}

/**
 * Apakah penyedia Google sudah diaktifkan di proyek Supabase ini? Dibaca dari endpoint pengaturan publik (hanya anon key),
 * supaya tombol bisa memberi pesan ramah alih-alih membuka halaman galat mentah dari Supabase.
 */
export async function googleTersedia(): Promise<boolean> {
  const env = bacaEnvPublik();
  if (!env) return false;
  try {
    const r = await fetch(`${env.url}/auth/v1/settings`, { headers: { apikey: env.anonKey }, cache: "no-store" });
    if (!r.ok) return false;
    const j = (await r.json()) as { external?: { google?: boolean } };
    return j.external?.google === true;
  } catch { return false; }
}
