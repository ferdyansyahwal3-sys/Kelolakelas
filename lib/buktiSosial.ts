import { labelPlan, type PlanKey } from "./paketLangganan";

/**
 * Notifikasi "baru berlangganan" di Landing/Harga.
 * ATURAN: di production hanya menampilkan kejadian NYATA (usaha yang benar-benar memilih/membayar paket), tanpa nama orang
 * (nama usaha + kota saja, keduanya sudah publik di halaman usaha). Tidak ada data karangan di production.
 * Di mode pengembangan, bila belum ada data nyata, tampil contoh yang diberi label "Contoh tampilan" supaya bisa dilihat desainnya.
 */
export interface Kejadian { id: string; usaha: string; kota: string; plan: PlanKey; waktu: number }
export interface KejadianTampil { id: string; usaha: string; kota: string; plan: PlanKey; menitLalu: number }

export const MAKS_UMUR_MS = 24 * 3600 * 1000;
export const MAKS_TAMPIL = 8;

/** Sumber data nyata. Diisi dari tabel langganan/tagihan lunas saat database tersambung; sekarang belum ada. */
export function ambilKejadianNyata(): Kejadian[] {
  return [];
}

export function kejadianContoh(sekarang: number): Kejadian[] {
  const m = (n: number) => sekarang - n * 60_000;
  return [
    { id: "c1", usaha: "Sari Yoga Studio", kota: "Bandung", plan: "guru_tumbuh", waktu: m(3) },
    { id: "c2", usaha: "Smash Badminton Club", kota: "Surabaya", plan: "agensi_klub", waktu: m(11) },
    { id: "c3", usaha: "Les Piano Bu Lina", kota: "Yogyakarta", plan: "guru_mulai", waktu: m(26) },
    { id: "c4", usaha: "Renang Aqua Kids", kota: "Tangerang", plan: "agensi_tim", waktu: m(47) },
  ];
}

export function pilihKejadian(nyata: Kejadian[], contoh: Kejadian[], dev: boolean, sekarang: number): { daftar: KejadianTampil[]; contoh: boolean } {
  const segar = (l: Kejadian[]) => l.filter((k) => k.waktu <= sekarang && sekarang - k.waktu <= MAKS_UMUR_MS).sort((a, b) => b.waktu - a.waktu).slice(0, MAKS_TAMPIL);
  const ubah = (l: Kejadian[]): KejadianTampil[] => l.map((k) => ({ id: k.id, usaha: k.usaha, kota: k.kota, plan: k.plan, menitLalu: Math.floor((sekarang - k.waktu) / 60_000) }));
  const n = segar(nyata);
  if (n.length > 0) return { daftar: ubah(n), contoh: false };
  if (dev) return { daftar: ubah(segar(contoh)), contoh: true };
  return { daftar: [], contoh: false };
}

export function labelUmur(menit: number): string {
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  return `${Math.floor(menit / 60)} jam lalu`;
}

export const teksKejadian = (k: KejadianTampil) => `${k.usaha}${k.kota ? ` · ${k.kota}` : ""} memilih paket ${labelPlan(k.plan)}`;
