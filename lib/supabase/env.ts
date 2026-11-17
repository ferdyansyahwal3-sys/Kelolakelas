/** Membaca kunci Supabase dari variabel lingkungan. Tidak ada nilai bawaan di kode. */
export function bacaEnvPublik(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export const supabaseTersambung = () => bacaEnvPublik() !== null;
