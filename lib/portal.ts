const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I, O, 0, 1 supaya tidak salah baca
export const PANJANG_TOKEN = 26; // 26 x 5 bit = 130 bit acak, tidak bisa ditebak

export function buatTokenPortal(): string {
  const b = crypto.getRandomValues(new Uint8Array(PANJANG_TOKEN));
  return Array.from(b, (x) => HURUF[x % HURUF.length]).join("");
}

export function tokenValid(t: string): boolean {
  return t.length === PANJANG_TOKEN && /^[A-HJ-NP-Z2-9]+$/.test(t);
}

export function linkPortal(origin: string, slug: string, token: string): string {
  return `${origin}/u/${slug}/murid/${token}`;
}

export function ringkasKuota(sisa: number, total: number) {
  const aman = Math.max(0, Math.min(sisa, total));
  return { terpakai: total - aman, sisa: aman, persenSisa: total === 0 ? 0 : Math.round((aman / total) * 100) };
}

/** Izin hanya bisa diajukan bila sesi masih cukup jauh (batas jam dari Pengaturan) dan belum dimulai. */
export function bisaAjukanIzin(mulaiISO: string, sekarangISO: string, batasJam: number): boolean {
  const selisihJam = (Date.parse(mulaiISO) - Date.parse(sekarangISO)) / 3_600_000;
  return selisihJam > 0 && selisihJam >= batasJam;
}
