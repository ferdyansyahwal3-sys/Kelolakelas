// Murni: menentukan sesi berikutnya untuk portal murid dari slot tetap + tanggal tutup + izin yang sudah tercatat.
import { menit, type SlotJadwal } from "./jadwal";
import { labelTanggal, nomorHari, tambahHari } from "./sesi";

export interface SesiBerikutnya { label: string; mulai: string; nama: string; slotId: string; tanggal: string }

/** Cari sesi terdekat (maks `hariMaks` hari ke depan). Hari ini hanya bila jamnya belum lewat. Tanggal yang ditutup atau yang sudah berstatus izin dilewati. */
export function sesiBerikutnya(slots: SlotJadwal[], hariIni: string, jamSekarang: string, tutup: Set<string>, izin: Set<string>, namaPelatih: (id: string) => string, hariMaks = 28): SesiBerikutnya | null {
  for (let i = 0; i <= hariMaks; i++) {
    const tanggal = tambahHari(hariIni, i);
    const hari = slots
      .filter((s) => s.hari === nomorHari(tanggal))
      .filter((s) => i > 0 || menit(s.jam) > menit(jamSekarang))
      .filter((s) => !tutup.has(`${s.id}|${tanggal}`) && !izin.has(`${s.id}|${tanggal}`))
      .sort((a, b) => menit(a.jam) - menit(b.jam));
    const s = hari[0];
    if (s) return { label: `${i === 0 ? "Hari ini" : labelTanggal(tanggal)} · ${s.jam}`, mulai: `${tanggal}T${s.jam.replace(".", ":")}:00+07:00`, nama: `${s.nama} · ${namaPelatih(s.pengajarId)}`, slotId: s.id, tanggal };
  }
  return null;
}
