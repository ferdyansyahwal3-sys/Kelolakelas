import { EMAIL_VALID, validasiAkun } from "./daftarUsaha";

/** Galat form sandi baru (aturan sama dengan pendaftaran). Kosong = lolos. */
export function validasiSandiBaru(sandi: string, ulang: string, email: string): { sandi?: string; ulang?: string } {
  const g: { sandi?: string; ulang?: string } = {};
  const dasar = validasiAkun({ nama: "xx", email, sandi }).sandi;
  if (dasar) g.sandi = dasar;
  else if (sandi !== ulang) g.ulang = "Kedua kata sandi harus sama.";
  return g;
}

export const emailBenar = (e: string) => EMAIL_VALID.test(e.trim()) && e.trim().length <= 120;
