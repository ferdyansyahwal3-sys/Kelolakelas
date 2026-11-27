// Murni: memilih slot untuk murid (tambah manual, pindah, lepas). Aturan yang sama diulang di fungsi database (0031);
// di sini hanya untuk menonaktifkan pilihan di layar dan memberi alasan. Hari 1 = Senin … 7 = Minggu, jam "08.30".
const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export interface SlotPilih { id: string; nama: string; hari: number; jam: string; durasi: number; kuota: number; terisi: number; pengajar: string }
export interface OpsiSlot extends SlotPilih { penuh: boolean; bentrok: boolean; alasan: string | null }

const menit = (jam: string) => { const [h, m] = jam.split(".").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
export const labelSlot = (s: SlotPilih) => `${HARI[s.hari] ?? "?"} ${s.jam} · ${s.nama} (${s.terisi}/${s.kuota})`;

export function slotBentrok(a: SlotPilih, b: SlotPilih): boolean {
  if (a.hari !== b.hari) return false;
  return menit(a.jam) < menit(b.jam) + b.durasi && menit(b.jam) < menit(a.jam) + a.durasi;
}

/**
 * Menandai tiap slot: penuh (kecuali murid sudah di sana), bentrok dengan slot lain milik murid (kecuali `kecualiId`
 * = slot asal saat pindah), atau sudah ditempati murid itu. Slot yang sudah ditempati tidak ditawarkan.
 */
export function opsiSlot(semua: SlotPilih[], milikMurid: string[], kecualiId: string | null = null): OpsiSlot[] {
  const milik = semua.filter((s) => milikMurid.includes(s.id) && s.id !== kecualiId);
  return semua.filter((s) => !milikMurid.includes(s.id)).map((s) => {
    const penuh = s.terisi >= s.kuota;
    const bentrok = milik.some((m) => slotBentrok(m, s));
    return { ...s, penuh, bentrok, alasan: penuh ? "Penuh" : bentrok ? "Bentrok jadwal murid" : null };
  });
}

export function pesanGalatSlot(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("slot_penuh")) return "Slot itu sudah penuh.";
  if (m.includes("murid_bentrok")) return "Jam slot itu bentrok dengan slot lain milik murid ini.";
  if (m.includes("sudah_di_slot")) return "Murid sudah ada di slot itu.";
  if (m.includes("slot_sama")) return "Pilih slot tujuan yang berbeda.";
  if (m.includes("bukan_peserta")) return "Murid tidak terdaftar di slot itu (mungkin sudah dipindah). Muat ulang halaman.";
  if (m.includes("slot_tidak_ditemukan")) return "Slot tidak ditemukan di usahamu.";
  if (m.includes("murid_nonaktif")) return "Murid nonaktif. Aktifkan dulu.";
  if (m.includes("murid_tidak_ditemukan")) return "Murid tidak ditemukan.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa mengatur slot murid.";
  return "Belum bisa menyimpan. Coba lagi sebentar.";
}
