import type { PendaftaranContoh, StatusPendaftaran } from "./contoh";

export interface BarisPendaftaranDb {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  usia: number | null;
  nama_ortu: string | null;
  no_wa: string;
  paket_id: string | null;
  jadwal_id: string | null;
  tanggal_mulai: string | null;
  kode_promo: string | null;
  total: number | null;
  status: string;
  jadwal_template: { hari: number; jam_mulai: string } | { hari: number; jam_mulai: string }[] | null;
  pendaftaran_bukti: { berkas_path: string; diunggah_pada: string; rekening_usaha: { bank: string } | { bank: string }[] | null }[] | null;
}

export const KOLOM_PENDAFTARAN =
  "id, kode, nama, kategori, usia, nama_ortu, no_wa, paket_id, jadwal_id, tanggal_mulai, kode_promo, total, status, " +
  "jadwal_template(hari, jam_mulai), pendaftaran_bukti(berkas_path, diunggah_pada, rekening_usaha(bank))";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const satu = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);

/** "Sab 8 Nov · 08.30"; tanpa jadwal/tanggal tampil "Jadwal belum dipilih". Hari DB: 0 = Senin. */
export function labelSlot(tanggal: string | null, jadwal: { hari: number; jam_mulai: string } | null): string {
  const jam = jadwal ? jadwal.jam_mulai.slice(0, 5).replace(":", ".") : null;
  if (tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    const [, m, d] = tanggal.split("-").map(Number);
    const hari = jadwal ? HARI[jadwal.hari] : HARI[(new Date(tanggal + "T00:00:00Z").getUTCDay() + 6) % 7];
    return `${hari} ${d} ${BULAN[m - 1]}${jam ? ` · ${jam}` : ""}`;
  }
  if (jadwal) return `${HARI[jadwal.hari]}${jam ? ` · ${jam}` : ""}`;
  return "Jadwal belum dipilih";
}

export function dariBarisPendaftaran(b: BarisPendaftaranDb): PendaftaranContoh & { total?: number } {
  const bukti = [...(b.pendaftaran_bukti ?? [])].sort((x, y) => y.diunggah_pada.localeCompare(x.diunggah_pada))[0];
  const bank = bukti ? satu(bukti.rekening_usaha)?.bank ?? "Rekening" : "";
  const status: StatusPendaftaran = b.status === "disetujui" || b.status === "ditolak" ? b.status : "menunggu";
  return {
    id: b.id,
    kode: b.kode,
    nama: b.nama,
    kategori: b.kategori === "dewasa" ? "dewasa" : "anak",
    usia: b.usia ?? undefined,
    namaOrtu: b.nama_ortu ?? undefined,
    noWa: b.no_wa,
    paketId: b.paket_id ?? "",
    slotLabel: labelSlot(b.tanggal_mulai, satu(b.jadwal_template)),
    kodePromo: b.kode_promo ?? undefined,
    status,
    total: b.total ?? undefined,
    bayar: bukti
      ? {
          bank,
          nominal: b.total ?? 0,
          diunggah: new Date(bukti.diunggah_pada).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }),
          berkas: bukti.berkas_path.split("/").pop() ?? "bukti",
        }
      : undefined,
  };
}

export function pesanGalatPendaftaran(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("sudah_diputuskan")) return "Pendaftaran ini sudah diputuskan. Muat ulang halaman.";
  if (m.includes("pendaftaran_tidak_ditemukan")) return "Pendaftaran tidak ditemukan.";
  if (m.includes("paket_tidak_ditemukan")) return "Paket pendaftaran ini sudah tidak ada. Tolak saja, atau buat paketnya lagi.";
  if (m.includes("paket_nonaktif")) return "Paket pendaftaran ini sedang nonaktif. Aktifkan paketnya dulu.";
  if (m.includes("batas_murid")) return "Batas murid aktif paketmu sudah penuh. Naikkan paket di halaman Langganan.";
  if (m.includes("kategori_tidak_cocok")) return "Kategori pendaftar tidak cocok dengan paketnya.";
  if (m.includes("pengajar_tidak_valid")) return "Pelatih yang dipilih tidak aktif lagi.";
  if (m.includes("usia_tidak_valid") || m.includes("data_murid_tidak_valid")) return "Data pendaftar belum lengkap atau tidak valid (cek usia dan nomor WhatsApp).";
  if (m.includes("slot_penuh")) return "Slot yang dipilih pendaftar sudah penuh. Tolak, atau naikkan kuota slotnya di halaman Jadwal dulu.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa memutuskan pendaftaran.";
  return "Gagal menyimpan. Coba lagi sebentar.";
}
