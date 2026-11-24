/**
 * Awalan alamat panel owner. Panel asli ada di `/app`, demo publik (tanpa login, data contoh) di `/demo`.
 * Komponen owner menulis alamat `/app/...` apa adanya; di demo alamat itu diganti lewat `ubahHref` supaya
 * semua navigasi tetap berada di dalam `/demo` dan tidak pernah menyentuh `/app` (yang dijaga login).
 */
export const BASIS_ASLI = "/app";
export const BASIS_DEMO = "/demo";

/** `/app` -> basis, `/app/x` -> basis/x. Halaman pelatih `/pengajar` -> basis/pelatih. Alamat lain tidak diubah. */
export function ubahHref(href: string, basis: string): string {
  if (basis === BASIS_ASLI) return href;
  if (href === "/app") return basis;
  if (href.startsWith("/app/") || href.startsWith("/app?") || href.startsWith("/app#")) return basis + href.slice(4);
  if (href === "/pengajar") return `${basis}/pelatih`;
  return href;
}

/** Benar bila alamat berada di dalam demo (`/demo` atau `/demo/...`). */
export function dalamDemo(path: string): boolean {
  return path === BASIS_DEMO || path.startsWith(`${BASIS_DEMO}/`);
}

export const AWALAN_KUNCI = "kk-";
export const AWALAN_KUNCI_DEMO = "kk-demo-";
/** Kunci yang tetap dipakai bersama (preferensi tema, bukan data usaha). */
const KUNCI_BERSAMA = ["kk-tema"];

/** Di demo, kunci penyimpanan `kk-x` dipindah ke `kk-demo-x` supaya tidak bercampur dengan data panel asli. */
export function kunciDemo(kunci: string): string {
  if (!kunci.startsWith(AWALAN_KUNCI) || kunci.startsWith(AWALAN_KUNCI_DEMO) || KUNCI_BERSAMA.includes(kunci)) return kunci;
  return AWALAN_KUNCI_DEMO + kunci.slice(AWALAN_KUNCI.length);
}
