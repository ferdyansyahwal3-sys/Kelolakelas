/** Rapikan alamat proyek: buang garis miring akhir dan awalan jalur salah isi (/rest/v1, /auth/v1) yang membuat semua panggilan auth 404. */
export function rapikanUrlSupabase(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "").replace(/\/+$/, "");
}

/** Membaca kunci Supabase dari variabel lingkungan. Tidak ada nilai bawaan di kode. */
export function bacaEnvPublik(): { url: string; anonKey: string } | null {
  const url = rapikanUrlSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export const supabaseTersambung = () => bacaEnvPublik() !== null;
