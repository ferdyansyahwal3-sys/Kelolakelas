export type KategoriPaket = "anak" | "dewasa";
export type JenisPaket = "privat" | "grup" | "keluarga";

export interface PaketOwner {
  id: string;
  nama: string;
  kategori: KategoriPaket;
  jenis: JenisPaket;
  jumlahSesi: number;
  masaBerlakuHari: number;
  harga: number;
  anggota: number | null; // hanya paket keluarga
  aktif: boolean;
}

export interface InputPaket { nama: string; kategori: KategoriPaket; jenis: JenisPaket; jumlahSesi: number; masaBerlakuHari: number; harga: number; anggota: number | null }

export const HARGA_MAKS = 50_000_000;

export const labelJenis: Record<JenisPaket, string> = { privat: "Privat", grup: "Grup", keluarga: "Keluarga" };

export function hargaPerSesi(p: Pick<InputPaket, "harga" | "jumlahSesi">): number {
  return p.jumlahSesi > 0 ? Math.round(p.harga / p.jumlahSesi) : 0;
}

/** Kategori peserta yang punya minimal satu paket aktif. Form pendaftaran hanya menawarkan ini, jadi usaha khusus dewasa tidak melihat pilihan Anak. */
export function kategoriTersedia(paket: { kategori: string; aktif?: boolean }[]): KategoriPaket[] {
  return (["anak", "dewasa"] as const).filter((k) => paket.some((p) => p.kategori === k && p.aktif !== false));
}

/** Paket yang masih dipakai murid aktif tidak boleh dihapus, hanya dinonaktifkan (tidak muncul di form daftar baru). */
export function bisaHapus(muridAktif: number): boolean {
  return muridAktif === 0;
}

/** `ada` = paket lain (tanpa paket yang sedang diubah). Nama harus unik per kategori, tak peka huruf besar. */
export function validasiPaket(i: InputPaket, ada: Pick<PaketOwner, "nama" | "kategori">[]): Record<string, string> {
  const g: Record<string, string> = {};
  const nama = i.nama.trim();
  if (nama.length < 2 || nama.length > 40) g.nama = "Nama 2–40 karakter.";
  else if (ada.some((p) => p.kategori === i.kategori && p.nama.trim().toLowerCase() === nama.toLowerCase())) g.nama = "Nama paket ini sudah ada di kategori yang sama.";
  if (!Number.isInteger(i.jumlahSesi) || i.jumlahSesi < 1 || i.jumlahSesi > 100) g.jumlahSesi = "Jumlah sesi 1–100.";
  if (!Number.isInteger(i.masaBerlakuHari) || i.masaBerlakuHari < 7 || i.masaBerlakuHari > 365) g.masaBerlakuHari = "Masa berlaku 7–365 hari.";
  if (!Number.isInteger(i.harga) || i.harga < 1000 || i.harga > HARGA_MAKS) g.harga = "Harga Rp 1.000–50.000.000.";
  if (i.jenis === "keluarga" && (i.anggota === null || !Number.isInteger(i.anggota) || i.anggota < 2 || i.anggota > 6)) g.anggota = "Paket keluarga untuk 2–6 anggota.";
  return g;
}
