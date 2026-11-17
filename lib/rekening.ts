export interface Rekening { id: string; bank: string; nomor: string; atasNama: string }
export const REKENING_MAKS = 5;

export const bersihNomor = (n: string) => n.replace(/[\s-]/g, "");
export const formatNomor = (n: string) => bersihNomor(n).replace(/(.{4})/g, "$1 ").trim();

/** Kunci galat: "rekening" (umum) atau "rekening.<indeks>.<bank|nomor|atasNama>". Daftar kosong boleh (belum menerima transfer). */
export function validasiRekening(daftar: Rekening[]): Record<string, string> {
  const g: Record<string, string> = {};
  if (daftar.length > REKENING_MAKS) g.rekening = `Maksimal ${REKENING_MAKS} rekening.`;
  const dipakai = new Set<string>();
  daftar.forEach((r, i) => {
    const bank = r.bank.trim();
    const nomor = bersihNomor(r.nomor);
    if (bank.length < 2 || bank.length > 30) g[`rekening.${i}.bank`] = "Isi nama bank atau e-wallet.";
    if (!/^\d{6,20}$/.test(nomor)) g[`rekening.${i}.nomor`] = "Nomor 6–20 angka.";
    if (r.atasNama.trim().length < 3 || r.atasNama.trim().length > 60) g[`rekening.${i}.atasNama`] = "Isi nama pemilik rekening.";
    const kunci = `${bank.toLowerCase()}|${nomor}`;
    if (dipakai.has(kunci)) g[`rekening.${i}.nomor`] = "Rekening ini sudah ada.";
    dipakai.add(kunci);
  });
  return g;
}

export const TIPE_BUKTI = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const BUKTI_MAKS_BYTE = 5 * 1024 * 1024;

export function validasiBerkas(b: { tipe: string; ukuran: number }): string | null {
  if (!TIPE_BUKTI.includes(b.tipe)) return "Berkas harus foto (JPG, PNG, WEBP) atau PDF.";
  if (!(b.ukuran > 0)) return "Berkas kosong.";
  if (b.ukuran > BUKTI_MAKS_BYTE) return "Ukuran berkas maksimal 5 MB.";
  return null;
}
