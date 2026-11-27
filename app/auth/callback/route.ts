import { NextResponse, type NextRequest } from "next/server";
import { klienServer } from "@/lib/supabase/server";
import { supabaseTersambung } from "@/lib/supabase/env";
import { ambilPeran } from "@/lib/supabase/peran";
import { lanjutAman, tujuanSetelahMasuk } from "@/lib/daftarUsaha";

/**
 * Tujuan balik setelah masuk dengan Google (OAuth, alur PKCE): menukar `code` jadi sesi, lalu mengarahkan.
 * `lanjut` divalidasi lewat `lanjutAman` (anti open-redirect: hanya jalur relatif di situs ini). Gagal apa pun = kembali ke /masuk dengan penanda galat.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const ke = (jalur: string) => NextResponse.redirect(new URL(jalur, origin));
  const aman = lanjutAman(searchParams.get("lanjut"));

  // Tautan reset kata sandi yang kedaluwarsa/dibuka di peramban lain: tampilkan pesan di /atur-sandi, bukan galat Google.
  const gagal = aman === "/atur-sandi" ? "/atur-sandi" : "/masuk?galat=google";
  if (!supabaseTersambung() || searchParams.get("error") || !searchParams.get("code")) return ke(gagal);

  const db = klienServer();
  const { data, error } = await db.auth.exchangeCodeForSession(searchParams.get("code")!);
  if (error || !data.user) return ke(gagal);

  // Tautan reset kata sandi: sesi pemulihan langsung ke halaman sandi baru (apa pun perannya).
  if (aman === "/atur-sandi") return ke("/atur-sandi");

  const peran = await ambilPeran(db, data.user.id);
  // Pengguna baru (belum punya usaha) dari halaman registrasi: kembali ke wizard dengan pilihan paketnya.
  const keWizard = peran.length === 0 && aman !== null && aman.split(/[?#]/)[0] === "/daftar-usaha";
  return ke(keWizard ? aman! : tujuanSetelahMasuk(peran, aman));
}
