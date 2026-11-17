export interface SlotJadwal {
  id: string;
  pengajarId: string;
  hari: number; // 1 = Senin ... 7 = Minggu
  jam: string; // "HH.MM"
  nama: string;
  durasi: number; // menit
  kuota: number;
  lokasi?: string;
  terisi: number;
}

export const KUOTA_MAKS = 30;

export function normalisasiJam(teks: string): string | null {
  const m = teks.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (!m) return null;
  const jam = Number(m[1]);
  const menit = Number(m[2]);
  if (jam > 23 || menit > 59) return null;
  return `${String(jam).padStart(2, "0")}.${m[2]}`;
}

export function menit(jam: string): number {
  const [j, m] = jam.split(".").map(Number);
  return j! * 60 + m!;
}

export function bentrok(a: { jam: string; durasi: number }, b: { jam: string; durasi: number }): boolean {
  const as = menit(a.jam);
  const bs = menit(b.jam);
  return as < bs + b.durasi && bs < as + a.durasi;
}

export function urutkan<T extends { jam: string }>(daftar: T[]): T[] {
  return [...daftar].sort((x, y) => menit(x.jam) - menit(y.jam));
}

export type UbahKuota = { ok: true } | { ok: false; galat: string };

/** Kuota tidak boleh di bawah jumlah murid yang sudah terdaftar. */
export function ubahKuota(slot: Pick<SlotJadwal, "terisi">, baru: number): UbahKuota {
  if (!Number.isInteger(baru) || baru < 1) return { ok: false, galat: "Kuota minimal 1." };
  if (baru > KUOTA_MAKS) return { ok: false, galat: `Kuota maksimal ${KUOTA_MAKS}.` };
  if (baru < slot.terisi) return { ok: false, galat: `Sudah ada ${slot.terisi} murid, kuota tidak bisa di bawah itu.` };
  return { ok: true };
}

export function bisaHapus(slot: Pick<SlotJadwal, "terisi">): boolean {
  return slot.terisi === 0;
}

export interface InputSlot { jam: string; nama: string; kuota: number; durasi: number }
export type GalatSlot = Partial<Record<keyof InputSlot, string>>;
export type HasilSlotBaru = { ok: true; jam: string } | { ok: false; galat: GalatSlot };

/** `ada` = slot lain milik pengajar dan hari yang sama. */
export function validasiSlotBaru(input: InputSlot, ada: SlotJadwal[]): HasilSlotBaru {
  const galat: GalatSlot = {};
  const jam = normalisasiJam(input.jam);
  if (!jam) galat.jam = "Isi jam seperti 08.30.";
  if (input.nama.trim().length < 2) galat.nama = "Isi nama kelas.";
  if (!Number.isInteger(input.kuota) || input.kuota < 1 || input.kuota > KUOTA_MAKS) galat.kuota = `Kuota 1–${KUOTA_MAKS}.`;
  if (!Number.isInteger(input.durasi) || input.durasi < 15 || input.durasi > 240) galat.durasi = "Durasi 15–240 menit.";
  if (jam && !galat.durasi) {
    const tabrak = ada.find((s) => bentrok({ jam, durasi: input.durasi }, s));
    if (tabrak) galat.jam = `Bentrok dengan ${tabrak.nama} ${tabrak.jam}.`;
  }
  return Object.keys(galat).length > 0 ? { ok: false, galat } : { ok: true, jam: jam! };
}
