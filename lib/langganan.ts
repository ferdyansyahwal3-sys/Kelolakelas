export type Fase = "trial" | "aktif" | "jatuh_tempo" | "ditangguhkan" | "berhenti";
export type Akses = "penuh" | "penuh_peringatan" | "hanya_lihat" | "ditutup";

export interface DataLangganan {
  trialBerakhir: string | null; // yyyy-mm-dd
  periodeBerakhir: string | null; // akhir periode berbayar terakhir
  graceSampai: string | null; // bila kosong: akhir periode + graceHari
}

export const GRACE_HARI = 7;
export const TANGGUH_HARI = 30;
export const PERINGATAN_HARI = 3;

const HARI = 24 * 60 * 60 * 1000;
export const selisih = (dari: string, ke: string) => Math.round((Date.parse(ke) - Date.parse(dari)) / HARI);
const tambahHari = (tgl: string, n: number) => new Date(Date.parse(tgl) + n * HARI).toISOString().slice(0, 10);

export interface HasilAkses { fase: Fase; akses: Akses; sisaHari: number | null; tenggat: string | null }

/**
 * Akses dihitung dari tanggal setiap kali dibaca, tidak disimpan sebagai flag (pelajaran status slot).
 * trial/aktif -> penuh (peringatan 3 hari terakhir) -> jatuh tempo (masa tenggang, penuh + peringatan)
 * -> ditangguhkan (hanya lihat dan ekspor, halaman pendaftaran publik ditutup) -> berhenti (ditutup).
 */
export function hitungAkses(d: DataLangganan, sekarang: string): HasilAkses {
  const akhir = d.periodeBerakhir ?? d.trialBerakhir;
  if (!akhir) return { fase: "berhenti", akses: "ditutup", sisaHari: null, tenggat: null };
  const grace = d.graceSampai ?? tambahHari(akhir, GRACE_HARI);
  const tangguh = tambahHari(grace, TANGGUH_HARI);

  if (sekarang <= akhir) {
    const sisa = selisih(sekarang, akhir);
    return { fase: d.periodeBerakhir ? "aktif" : "trial", akses: sisa <= PERINGATAN_HARI ? "penuh_peringatan" : "penuh", sisaHari: sisa, tenggat: akhir };
  }
  if (sekarang <= grace) return { fase: "jatuh_tempo", akses: "penuh_peringatan", sisaHari: selisih(sekarang, grace), tenggat: grace };
  if (sekarang <= tangguh) return { fase: "ditangguhkan", akses: "hanya_lihat", sisaHari: selisih(sekarang, tangguh), tenggat: tangguh };
  return { fase: "berhenti", akses: "ditutup", sisaHari: null, tenggat: null };
}

export const bolehTerimaPendaftaran = (a: Akses) => a === "penuh" || a === "penuh_peringatan";
export const bolehUbahData = bolehTerimaPendaftaran;
export const bolehLihatDanEkspor = (a: Akses) => a !== "ditutup";

function tambahBulan(tgl: string, n: number): string {
  const [y, m, d] = tgl.split("-").map(Number);
  const idx = y! * 12 + (m! - 1) + n;
  const tahun = Math.floor(idx / 12);
  const bulan = (idx % 12) + 1;
  const hariTerakhir = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  return `${tahun}-${String(bulan).padStart(2, "0")}-${String(Math.min(d!, hariTerakhir)).padStart(2, "0")}`;
}

/** Periode baru mulai dari yang lebih akhir antara hari ini dan akhir periode lama: bayar lebih awal tidak menghanguskan sisa hari, bayar telat tidak mendapat hari yang sudah lewat. */
export function perpanjangPeriode(akhirLama: string | null, sekarang: string, bulan: number): string {
  const mulai = akhirLama && akhirLama > sekarang ? akhirLama : sekarang;
  return tambahBulan(mulai, bulan);
}

// Harga dan paket: sumber kebenarannya `paketLangganan.ts` (dua jenis x tiga paket). HARGA = harga normal per bulan.
export { HARGA } from "./paketLangganan";

