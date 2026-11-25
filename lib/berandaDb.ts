// Murni: hitung slot publik per TANGGAL dari jadwal tetap + sesi nyata (tidak disimpan, selalu dihitung ulang).
import type { SlotJadwal } from "./jadwal";
import { menit } from "./jadwal";
import { nomorHari, tambahHari } from "./sesi";
import { hitungSlot } from "./slot";

export interface BarisJadwalDb { id: string; pengajar_id: string; hari: number; jam_mulai: string; durasi_menit: number; nama: string; kuota: number; lokasi: string | null }
export interface BarisTutup { jadwal_id: string; tanggal: string }

/** Hari DB 0 = Senin … 6 = Minggu; aplikasi 1 = Senin … 7 = Minggu. Jam "08:30:00" → "08.30". */
export function dariBarisJadwal(b: BarisJadwalDb): SlotJadwal {
  return { id: b.id, pengajarId: b.pengajar_id, hari: b.hari + 1, jam: b.jam_mulai.slice(0, 5).replace(":", "."), nama: b.nama, durasi: b.durasi_menit, kuota: b.kuota, lokasi: b.lokasi ?? undefined, terisi: 0 };
}

const kunci = (jadwalId: string, tanggal: string) => `${jadwalId}|${tanggal}`;

/** Terisi = jumlah PESERTA TETAP slot (murid yang terdaftar tetap tiap minggu), sama di semua tanggal. Kunci peta = id slot. */
export function hitungTerisi(peserta: { jadwal_id: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of peserta) m.set(p.jadwal_id, (m.get(p.jadwal_id) ?? 0) + 1);
  return m;
}

export const setTutup = (t: BarisTutup[]) => new Set(t.map((x) => kunci(x.jadwal_id, x.tanggal)));
export const terisiPada = (m: Map<string, number>, jadwalId: string, _tanggal?: string) => m.get(jadwalId) ?? 0;

export interface SlotTanggal { tanggal: string; slot: SlotJadwal; terisi: number; sisa: number; ditutup: boolean }

/** Semua slot pada satu tanggal, urut jam. `jamSekarang` ("HH.MM") menyembunyikan slot hari ini yang sudah lewat bila diberikan. */
export function slotPadaTanggal(jadwal: SlotJadwal[], terisi: Map<string, number>, tutup: Set<string>, tanggal: string, jamSekarang?: string): SlotTanggal[] {
  return jadwal
    .filter((s) => s.hari === nomorHari(tanggal))
    .filter((s) => !jamSekarang || menit(s.jam) > menit(jamSekarang))
    .sort((a, b) => menit(a.jam) - menit(b.jam))
    .map((slot) => {
      const ditutup = tutup.has(kunci(slot.id, tanggal));
      const t = terisiPada(terisi, slot.id, tanggal);
      return { tanggal, slot, terisi: t, sisa: hitungSlot(slot.kuota, t, ditutup).sisa, ditutup };
    });
}

/** Slot terdekat yang masih punya tempat, mulai hari ini (hari ini hanya yang jamnya belum lewat). */
export function slotTerdekatDb(jadwal: SlotJadwal[], terisi: Map<string, number>, tutup: Set<string>, hariIni: string, jamSekarang: string, banyak = 3, hariMaks = 14): SlotTanggal[] {
  const hasil: SlotTanggal[] = [];
  for (let i = 0; i <= hariMaks && hasil.length < banyak; i++) {
    const tanggal = tambahHari(hariIni, i);
    for (const s of slotPadaTanggal(jadwal, terisi, tutup, tanggal, i === 0 ? jamSekarang : undefined)) {
      if (s.sisa > 0 && hasil.length < banyak) hasil.push(s);
    }
  }
  return hasil;
}
