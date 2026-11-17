import { createBrowserClient } from "@supabase/ssr";
import { bacaEnvPublik } from "./env";

/** Klien untuk komponen browser. Memakai anon key, jadi semua akses dijaga RLS. */
export function klienBrowser() {
  const env = bacaEnvPublik();
  if (!env) throw new Error("Supabase belum dikonfigurasi: isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local");
  return createBrowserClient(env.url, env.anonKey);
}
