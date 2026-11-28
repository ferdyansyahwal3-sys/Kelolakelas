"use server";
import { headers } from "next/headers";
import { klienServer } from "@/lib/supabase/server";
import { supabaseTersambung } from "@/lib/supabase/env";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";
import { emailBenar, validasiSandiBaru } from "@/lib/aturSandi";

export type HasilLupa = { ok: true } | { ok: false; pesan: string };

/** Alamat situs untuk tautan di email. Utamakan NEXT_PUBLIC_SITE_URL (bukan rahasia); cadangan: header host (Supabase tetap hanya menerima alamat yang ada di daftar Redirect URLs). */
function asalSitus(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  return `${host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https"}://${host}`;
}

/** Selalu menjawab sama (ok) untuk email terdaftar maupun tidak: tidak membocorkan siapa yang punya akun. */
export async function kirimResetSandi(email: string): Promise<HasilLupa> {
  if (!supabaseTersambung()) return { ok: false, pesan: "Layanan belum dikonfigurasi." };
  const alamat = String(email ?? "").trim();
  if (!emailBenar(alamat)) return { ok: false, pesan: "Email belum benar." };
  if (!(await bolehLanjut("lupaSandi"))) return { ok: false, pesan: PESAN_TERLALU_SERING };
  const { error } = await klienServer().auth.resetPasswordForEmail(alamat, { redirectTo: `${asalSitus()}/auth/callback?lanjut=${encodeURIComponent("/atur-sandi")}` });
  // Batas kirim email dari Supabase disampaikan apa adanya; galat lain disamarkan ke pengguna (tidak membocorkan siapa terdaftar) tapi dicatat di log server.
  if (error && (error.code === "over_email_send_rate_limit" || error.status === 429)) return { ok: false, pesan: "Terlalu banyak email terkirim. Coba lagi sebentar lagi." };
  if (error) console.error("[kirimResetSandi] Supabase menolak permintaan reset sandi:", { status: error.status, code: error.code, pesan: error.message });
  return { ok: true };
}

export type HasilSandiBaru = { ok: true; ke: string } | { ok: false; pesan: string; galat?: { sandi?: string; ulang?: string } };

/** Hanya untuk pengguna yang sudah punya sesi (sesi pemulihan dari tautan email, atau sudah masuk). */
export async function simpanSandiBaru(sandi: string, ulang: string): Promise<HasilSandiBaru> {
  if (!supabaseTersambung()) return { ok: false, pesan: "Layanan belum dikonfigurasi." };
  const db = klienServer();
  const { data } = await db.auth.getUser();
  if (!data.user) return { ok: false, pesan: "Tautan sudah kedaluwarsa. Minta tautan baru." };
  const galat = validasiSandiBaru(String(sandi ?? ""), String(ulang ?? ""), data.user.email ?? "");
  if (galat.sandi || galat.ulang) return { ok: false, pesan: "", galat };
  const { error } = await db.auth.updateUser({ password: sandi });
  if (error) return { ok: false, pesan: error.code === "same_password" ? "Pakai kata sandi yang berbeda dari yang lama." : error.code === "weak_password" ? "Kata sandi terlalu lemah. Pakai kombinasi yang lebih panjang." : "Belum berhasil menyimpan. Coba lagi." };
  return { ok: true, ke: "/masuk" };
}
