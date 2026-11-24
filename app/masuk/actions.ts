"use server";
import { redirect } from "next/navigation";
import { klienServer } from "@/lib/supabase/server";
import { ambilPeran } from "@/lib/supabase/peran";
import { PESAN_MASUK_GAGAL, pesanGalatAuth, tujuanSetelahMasuk } from "@/lib/daftarUsaha";
import { supabaseTersambung } from "@/lib/supabase/env";

export type HasilMasuk = { ok: true; ke: string } | { ok: false; pesan: string };

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
  return { ok: true, ke: tujuanSetelahMasuk(peran, lanjut) };
}

export async function keluar() {
  if (supabaseTersambung()) await klienServer().auth.signOut();
  redirect("/masuk");
}
