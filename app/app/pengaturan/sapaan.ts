"use server";
import { revalidatePath } from "next/cache";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

export type HasilSapaan = { ok: true; nama: string } | { ok: false; pesan: string };

/** Nama sapaan di dashboard ("Halo …!") = `nama` di data akun pengguna. Hanya mengubah akun yang sedang masuk. */
export async function simpanNamaSapaan(nama: string): Promise<HasilSapaan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: "Sesi habis. Masuk lagi." };
  const bersih = String(nama ?? "").replace(/\s+/g, " ").trim();
  if (bersih.length < 2 || bersih.length > 40) return { ok: false, pesan: "Nama sapaan 2–40 karakter." };
  if (/[<>]/.test(bersih)) return { ok: false, pesan: "Nama sapaan tidak boleh memuat < atau >." };
  const { error } = await k.db.auth.updateUser({ data: { nama: bersih } });
  if (error) return { ok: false, pesan: "Belum tersimpan. Coba lagi sebentar." };
  revalidatePath("/app", "layout");
  return { ok: true, nama: bersih };
}
