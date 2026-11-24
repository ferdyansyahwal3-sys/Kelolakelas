// Murni: pemetaan antara baris tabel `paket` dan tipe aplikasi, plus pesan galat database yang ramah.
import { type InputPaket, type JenisPaket, type KategoriPaket, type PaketOwner } from "./paket";

export interface BarisPaket {
  id: string; nama: string; kategori: string; jenis: string;
  jumlah_sesi: number; masa_berlaku_hari: number; harga: number; anggota: number | null; aktif: boolean;
}

export const KOLOM_PAKET = "id, nama, kategori, jenis, jumlah_sesi, masa_berlaku_hari, harga, anggota, aktif";

const KATEGORI: KategoriPaket[] = ["anak", "dewasa"];
const JENIS: JenisPaket[] = ["privat", "grup", "keluarga"];

/** Baris dengan nilai di luar yang dikenal dibuang (null), bukan ditebak. */
export function dariBaris(b: BarisPaket): PaketOwner | null {
  if (!KATEGORI.includes(b.kategori as KategoriPaket) || !JENIS.includes(b.jenis as JenisPaket)) return null;
  return {
    id: b.id, nama: b.nama, kategori: b.kategori as KategoriPaket, jenis: b.jenis as JenisPaket,
    jumlahSesi: b.jumlah_sesi, masaBerlakuHari: b.masa_berlaku_hari, harga: b.harga,
    anggota: b.jenis === "keluarga" ? b.anggota : null, aktif: b.aktif,
  };
}

export const daftarPaket = (baris: BarisPaket[]): PaketOwner[] => baris.map(dariBaris).filter((p): p is PaketOwner => p !== null);

/** Kolom untuk insert/update. Anggota hanya untuk paket keluarga. */
export function keBaris(i: InputPaket) {
  return {
    nama: i.nama.trim(), kategori: i.kategori, jenis: i.jenis, jumlah_sesi: i.jumlahSesi,
    masa_berlaku_hari: i.masaBerlakuHari, harga: i.harga, anggota: i.jenis === "keluarga" ? i.anggota : null,
  };
}

/** Berapa murid AKTIF yang memakai tiap paket (murid yang sama dihitung sekali), dari tabel murid_paket. */
export function hitungDipakai(tagihan: { paket_id: string | null; murid_id: string; murid_aktif: boolean }[]): Record<string, number> {
  const per: Record<string, Set<string>> = {};
  for (const t of tagihan) if (t.paket_id && t.murid_aktif) (per[t.paket_id] ??= new Set()).add(t.murid_id);
  return Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.size]));
}

export interface GalatDb { code?: string; message?: string }

/** Pesan untuk pemilik. Kode tak dikenal tidak bocorkan detail database. */
export function pesanGalatPaket(e: GalatDb | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("batas_paket_jual")) return "Batas paket jual di langgananmu sudah penuh. Nonaktifkan paket lain atau naikkan paket langgananmu.";
  if (e?.code === "23505" || m.includes("paket_nama_unik")) return "Nama paket ini sudah ada di kategori yang sama.";
  if (e?.code === "23503") return "Paket ini sudah punya riwayat tagihan atau pendaftaran, jadi tidak bisa dihapus. Nonaktifkan saja.";
  if (e?.code === "23514") return "Isi paket belum sesuai batas. Periksa nama, jumlah sesi, masa berlaku, dan harga.";
  return "Belum bisa menyimpan. Coba lagi sebentar.";
}
