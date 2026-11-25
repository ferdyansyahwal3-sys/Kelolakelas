import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { bacaEnvPublik } from "./env";

/** Klien server atas nama pengguna yang login (anon key + cookie). RLS tetap berlaku. */
export function klienServer() {
  const env = bacaEnvPublik();
  if (!env) throw new Error("Supabase belum dikonfigurasi.");
  const jar = cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (daftar) => { try { daftar.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {} },
    },
  });
}

/**
 * Klien service role: MELEWATI RLS. Hanya untuk kode server yang memang harus (webhook pembayaran, cek token portal,
 * simpan bukti bayar dari murid tanpa login). Jangan pernah diimpor dari komponen client, dan jangan diberi awalan NEXT_PUBLIC_.
 */
export function klienAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local");
  // Tanpa cache: pembacaan lewat klien ini (token portal, slot publik, bukti bayar) tidak boleh basi.
  return createClient(url, kunci, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } });
}
