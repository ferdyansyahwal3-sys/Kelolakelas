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

  if (!supabaseTersambung() || searchParams.get("error") || !searchParams.get("code")) return ke("/masuk?galat=google");

  const db = klienServer();
  const { data, error } = await db.auth.exchangeCodeForSession(searchParams.get("code")!);
  if (error || !data.user) return ke("/masuk?galat=google");

  const peran = await ambilPeran(db, data.user.id);
  // Pengguna baru (belum punya usaha) dari halaman registrasi: kembali ke wizard dengan pilihan paketnya.
  const keWizard = peran.length === 0 && aman !== null && aman.split(/[?#]/)[0] === "/daftar-usaha";
  return ke(keWizard ? aman! : tujuanSetelahMasuk(peran, aman));
}
