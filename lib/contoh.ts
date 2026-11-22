// Data contoh sampai Supabase disambungkan. Bentuknya mengikuti skema di supabase/migrations.
export const tenantContoh = {
  nama: "Privat Renang Ilham",
  slug: "renang-ilham",
  kategori: "Renang anak & dewasa",
  kota: "Bekasi",
  kategoriUsaha: "Renang",
  deskripsi: "Les renang privat dan semi privat untuk anak dan dewasa. Kelas kecil, pelatih sabar, dari belajar mengapung sampai gaya bebas yang rapi.",
  area: "Kolam A dan B, Bekasi",
  noWa: "081234567890",
  pemilik: "Coach Ilham",
  istilah: { murid: "murid", sesi: "sesi", pengajar: "coach" },
};

export const ringkasanContoh = {
  pemasukanBulanIni: 4350000,
  pendaftaranMenunggu: [] as { id: string; nama: string; kategori: string; slot: string }[],
  hariIni: [
    { id: "pagi", label: "PAGI", jumlah: 2, jam: "07.00 – 10.00" },
    { id: "siang", label: "SIANG", jumlah: 0, jam: "" },
    { id: "sore", label: "SORE", jumlah: 3, jam: "16.00 – 18.00" },
  ],
};

export const pengajarContoh = [
  { id: "ilham", nama: "Coach Ilham" },
  { id: "riska", nama: "Coach Riska" },
];

export const hariContoh = [
  { id: "2026-11-06", hari: "Kam", tgl: 6, lewat: true },
  { id: "2026-11-07", hari: "Jum", tgl: 7 },
  { id: "2026-11-08", hari: "Sab", tgl: 8 },
  { id: "2026-11-09", hari: "Min", tgl: 9 },
  { id: "2026-11-10", hari: "Sen", tgl: 10 },
];

export const slotContoh = [
  { id: "s1", jam: "07.00", nama: "Privat anak", kuota: 1, terisi: 1 },
  { id: "s2", jam: "08.30", nama: "Privat anak", kuota: 1, terisi: 0 },
  { id: "s3", jam: "15.00", nama: "Semi privat", kuota: 3, terisi: 1 },
  { id: "s4", jam: "16.00", nama: "Semi privat", kuota: 3, terisi: 2 },
  { id: "s5", jam: "17.00", nama: "Privat dewasa", kuota: 1, terisi: 0 },
];

export const paketContoh = [
  { id: "k4", nama: "4x per bulan", kategori: "anak", jenis: "privat", jumlahSesi: 4, masaHari: 35, harga: 400000, catatan: "Berlaku 5 minggu" },
  { id: "k8", nama: "8x per bulan", kategori: "anak", jenis: "privat", jumlahSesi: 8, masaHari: 35, harga: 720000, catatan: "Paling banyak dipilih" },
  { id: "kk", nama: "Paket keluarga", kategori: "anak", jenis: "keluarga", jumlahSesi: 8, masaHari: 35, harga: 1300000, catatan: "2 anak · 8x per bulan" },
  { id: "d4", nama: "Dewasa 4x per bulan", kategori: "dewasa", jenis: "privat", jumlahSesi: 4, masaHari: 35, harga: 600000, catatan: "Berlaku 5 minggu" },
  { id: "d8", nama: "Dewasa 8x per bulan", kategori: "dewasa", jenis: "privat", jumlahSesi: 8, masaHari: 35, harga: 1100000, catatan: "Hemat Rp 100rb" },
];

export const promoContoh = [
  { kode: "RAKA", jenis: "nominal" as const, nilai: 50000 },
  { kode: "HEMAT10", jenis: "persen" as const, nilai: 10 },
];

export const aturanContoh = [
  "Izin maksimal 2 jam sebelum sesi dimulai.",
  "Paket hangus setelah masa berlaku habis.",
  "Pembayaran dilakukan setelah pendaftaran disetujui.",
];

export type StatusPendaftaran = "menunggu" | "disetujui" | "ditolak";

export interface PendaftaranContoh {
  id: string;
  kode: string;
  nama: string;
  kategori: "anak" | "dewasa";
  usia?: number;
  namaOrtu?: string;
  noWa: string;
  paketId: string;
  slotLabel: string;
  kodePromo?: string;
  status: StatusPendaftaran;
  bayar?: { bank: string; nominal: number; diunggah: string; berkas: string };
}

export const pendaftaranContoh: PendaftaranContoh[] = [
  { id: "p1", kode: "G473FN", nama: "Dika Pratama", kategori: "anak", usia: 8, namaOrtu: "Budi Pratama", noWa: "081234567890", paketId: "k8", slotLabel: "Sab 8 Nov · 08.30", kodePromo: "RAKA", status: "menunggu" },
  { id: "p2", kode: "H8K2QW", nama: "Sari Wulandari", kategori: "dewasa", noWa: "081298765432", paketId: "d4", slotLabel: "Min 9 Nov · 17.00", status: "menunggu", bayar: { bank: "BCA", nominal: 600000, diunggah: "6 Nov 19.42", berkas: "bukti-sari-bca.jpg" } },
  { id: "p3", kode: "M5T9XC", nama: "Laras Anjani", kategori: "anak", usia: 10, namaOrtu: "Rina Anjani", noWa: "081377712345", paketId: "k4", slotLabel: "Sab 8 Nov · 15.00", status: "disetujui", bayar: { bank: "Mandiri", nominal: 400000, diunggah: "4 Nov 10.15", berkas: "tf-laras.png" } },
];

ringkasanContoh.pendaftaranMenunggu = pendaftaranContoh
  .filter((p) => p.status === "menunggu")
  .map((p) => ({ id: p.id, nama: p.nama, kategori: p.kategori === "anak" ? "Anak" : "Dewasa", slot: p.slotLabel.replace(/ \d+ Nov/, "") }));

export type StatusBayar = "lunas" | "belum" | "menunggu_verifikasi";

export interface MuridContoh {
  id: string;
  nama: string;
  kategori: "anak" | "dewasa";
  usia?: number;
  namaOrtu?: string;
  noWa: string;
  pengajar: string;
  paketId: string;
  sisaSesi: number;
  totalSesi: number;
  berlakuSampai: string;
  bayar: StatusBayar;
  aktif: boolean;
  riwayat: { tgl: string; status: "hadir" | "izin" | "alpa" }[];
  tagihan: { id: string; nominal: number; status: StatusBayar; tempo: string }[];
  catatan: { tgl: string; teks: string }[];
}

export const muridContoh: MuridContoh[] = [
  { id: "m1", nama: "Aisyah Rahma", kategori: "anak", usia: 7, namaOrtu: "Dewi Rahma", noWa: "081211110001", pengajar: "Coach Ilham", paketId: "k8", sisaSesi: 5, totalSesi: 8, berlakuSampai: "2026-12-05", bayar: "lunas", aktif: true,
    riwayat: [{ tgl: "7 Nov", status: "hadir" }, { tgl: "31 Okt", status: "hadir" }, { tgl: "24 Okt", status: "izin" }], tagihan: [{ id: "t1", nominal: 720000, status: "lunas", tempo: "2026-11-01" }],
    catatan: [{ tgl: "7 Nov", teks: "Sudah berani lepas pelampung, latihan napas masih perlu diulang." }] },
  { id: "m2", nama: "Bimo Tri Wibowo", kategori: "anak", usia: 9, namaOrtu: "Tri Wibowo", noWa: "081211110002", pengajar: "Coach Ilham", paketId: "k8", sisaSesi: 3, totalSesi: 8, berlakuSampai: "2026-11-28", bayar: "lunas", aktif: true,
    riwayat: [{ tgl: "7 Nov", status: "hadir" }, { tgl: "31 Okt", status: "hadir" }, { tgl: "24 Okt", status: "hadir" }], tagihan: [{ id: "t2", nominal: 720000, status: "lunas", tempo: "2026-10-20" }], catatan: [] },
  { id: "m3", nama: "Laras Anjani", kategori: "anak", usia: 10, namaOrtu: "Rina Anjani", noWa: "081377712345", pengajar: "Coach Riska", paketId: "k4", sisaSesi: 1, totalSesi: 4, berlakuSampai: "2026-11-20", bayar: "belum", aktif: true,
    riwayat: [{ tgl: "6 Nov", status: "hadir" }, { tgl: "30 Okt", status: "alpa" }], tagihan: [{ id: "t3", nominal: 400000, status: "belum", tempo: "2026-11-14" }],
    catatan: [{ tgl: "6 Nov", teks: "Gaya bebas sudah rapi, mulai belajar gaya punggung." }] },
  { id: "m4", nama: "Sari Wulandari", kategori: "dewasa", noWa: "081298765432", pengajar: "Coach Ilham", paketId: "d4", sisaSesi: 4, totalSesi: 4, berlakuSampai: "2026-12-12", bayar: "menunggu_verifikasi", aktif: true,
    riwayat: [], tagihan: [{ id: "t4", nominal: 600000, status: "menunggu_verifikasi", tempo: "2026-11-24" }], catatan: [] },
  { id: "m5", nama: "Raka Putra", kategori: "anak", usia: 6, namaOrtu: "Yudi Putra", noWa: "081211110005", pengajar: "Coach Riska", paketId: "k8", sisaSesi: 7, totalSesi: 8, berlakuSampai: "2026-12-10", bayar: "lunas", aktif: true,
    riwayat: [{ tgl: "7 Nov", status: "hadir" }], tagihan: [{ id: "t5", nominal: 670000, status: "lunas", tempo: "2026-11-05" }], catatan: [] },
  { id: "m6", nama: "Nadia Salsabila", kategori: "anak", usia: 11, namaOrtu: "Hana Salsabila", noWa: "081211110006", pengajar: "Coach Ilham", paketId: "k4", sisaSesi: 2, totalSesi: 4, berlakuSampai: "2026-11-25", bayar: "lunas", aktif: true,
    riwayat: [{ tgl: "5 Nov", status: "hadir" }, { tgl: "29 Okt", status: "hadir" }], tagihan: [{ id: "t6", nominal: 400000, status: "lunas", tempo: "2026-10-22" }], catatan: [] },
  { id: "m7", nama: "Fajar Ramadhan", kategori: "dewasa", noWa: "081211110007", pengajar: "Coach Riska", paketId: "d8", sisaSesi: 6, totalSesi: 8, berlakuSampai: "2026-12-08", bayar: "lunas", aktif: true,
    riwayat: [{ tgl: "6 Nov", status: "hadir" }, { tgl: "3 Nov", status: "hadir" }], tagihan: [{ id: "t7", nominal: 1100000, status: "lunas", tempo: "2026-11-01" }], catatan: [] },
  { id: "m8", nama: "Kenzo Alvaro", kategori: "anak", usia: 8, namaOrtu: "Mira Alvaro", noWa: "081211110008", pengajar: "Coach Ilham", paketId: "k8", sisaSesi: 0, totalSesi: 8, berlakuSampai: "2026-10-15", bayar: "lunas", aktif: false,
    riwayat: [{ tgl: "10 Okt", status: "hadir" }], tagihan: [{ id: "t8", nominal: 720000, status: "lunas", tempo: "2026-09-12" }], catatan: [] },
];

import type { SlotJadwal } from "./jadwal";

export const mingguContoh = [
  { hari: 1, nama: "Sen", tgl: "2026-11-02", angka: 2 },
  { hari: 2, nama: "Sel", tgl: "2026-11-03", angka: 3 },
  { hari: 3, nama: "Rab", tgl: "2026-11-04", angka: 4 },
  { hari: 4, nama: "Kam", tgl: "2026-11-05", angka: 5 },
  { hari: 5, nama: "Jum", tgl: "2026-11-06", angka: 6 },
  { hari: 6, nama: "Sab", tgl: "2026-11-07", angka: 7 },
  { hari: 7, nama: "Min", tgl: "2026-11-08", angka: 8 },
];

export const jadwalContoh: SlotJadwal[] = [
  { id: "j1", pengajarId: "ilham", hari: 6, jam: "07.00", nama: "Privat anak", durasi: 60, kuota: 1, lokasi: "Kolam A", terisi: 1 },
  { id: "j2", pengajarId: "ilham", hari: 6, jam: "08.30", nama: "Privat anak", durasi: 60, kuota: 1, lokasi: "Kolam A", terisi: 0 },
  { id: "j3", pengajarId: "ilham", hari: 6, jam: "15.00", nama: "Semi privat", durasi: 60, kuota: 3, lokasi: "Kolam B", terisi: 1 },
  { id: "j4", pengajarId: "ilham", hari: 6, jam: "16.00", nama: "Semi privat", durasi: 60, kuota: 3, lokasi: "Kolam B", terisi: 2 },
  { id: "j5", pengajarId: "ilham", hari: 6, jam: "17.00", nama: "Privat dewasa", durasi: 60, kuota: 1, lokasi: "Kolam A", terisi: 0 },
  { id: "j6", pengajarId: "ilham", hari: 1, jam: "16.00", nama: "Semi privat", durasi: 60, kuota: 3, lokasi: "Kolam B", terisi: 1 },
  { id: "j7", pengajarId: "ilham", hari: 3, jam: "16.00", nama: "Privat anak", durasi: 60, kuota: 1, lokasi: "Kolam A", terisi: 1 },
  { id: "j8", pengajarId: "riska", hari: 6, jam: "09.00", nama: "Semi privat", durasi: 60, kuota: 3, lokasi: "Kolam B", terisi: 2 },
  { id: "j9", pengajarId: "riska", hari: 7, jam: "08.00", nama: "Privat dewasa", durasi: 60, kuota: 1, lokasi: "Kolam A", terisi: 1 },
  { id: "j10", pengajarId: "riska", hari: 5, jam: "15.30", nama: "Privat anak", durasi: 45, kuota: 1, lokasi: "Kolam A", terisi: 0 },
  { id: "j11", pengajarId: "riska", hari: 6, jam: "11.00", nama: "Semi privat", durasi: 60, kuota: 3, lokasi: "Kolam B", terisi: 1 },
  { id: "j12", pengajarId: "ilham", hari: 7, jam: "09.00", nama: "Kelas grup", durasi: 60, kuota: 10, lokasi: "Kolam B", terisi: 7 },
];

// Siapa yang terdaftar tetap di tiap slot (jumlahnya sama dengan `terisi` di jadwalContoh). Di database ini = baris murid yang terhubung ke jadwal.
export const pesertaTetapContoh: Record<string, string[]> = {
  j1: ["m1"], j2: [], j3: ["m6"], j4: ["m2", "m4"], j5: [],
  j6: ["m2"], j7: ["m1"], j8: ["m5", "m7"], j9: ["m7"], j10: [], j11: ["m3"], j12: ["m1", "m2", "m3", "m4", "m5", "m6", "m7"],
};

// Absen yang sudah terhitung di `sisaSesi` murid contoh (mis. Aisyah 7 Nov hadir = sisa 5 sudah memotongnya).
export const absensiAwalContoh: Record<string, "hadir" | "izin" | "alpa"> = {
  "j1|2026-11-07|m1": "hadir",
  "j8|2026-11-07|m5": "hadir",
};

import type { TagihanOwner } from "./tagihan";

export const HARI_INI = "2026-11-07";

export const tagihanContoh: TagihanOwner[] = [
  { id: "th2", nama: "Sari Wulandari", noWa: "081298765432", paket: "Dewasa 4x per bulan", nominal: 600000, tempo: "2026-11-24", status: "menunggu_verifikasi", bukti: { metode: "transfer", diunggah: "6 Nov 19.42", berkas: "bukti-sari-bca.jpg" } },
  { id: "th5", nama: "Fajar Ramadhan", noWa: "081211110007", paket: "Dewasa 8x per bulan", nominal: 1100000, tempo: "2026-11-10", status: "menunggu_verifikasi", bukti: { metode: "qris", diunggah: "7 Nov 08.10", berkas: "qris-fajar.png" } },
  { id: "th1", nama: "Laras Anjani", namaOrtu: "Rina Anjani", noWa: "081377712345", paket: "4x per bulan", nominal: 400000, tempo: "2026-11-14", status: "belum" },
  { id: "th3", nama: "Dika Pratama", namaOrtu: "Budi Pratama", noWa: "081234567890", paket: "8x per bulan", nominal: 670000, tempo: "2026-11-24", status: "belum" },
  { id: "th4", nama: "Nadia Salsabila", namaOrtu: "Hana Salsabila", noWa: "081211110006", paket: "4x per bulan (perpanjangan)", nominal: 400000, tempo: "2026-11-03", status: "belum" },
  { id: "th6", nama: "Aisyah Rahma", namaOrtu: "Dewi Rahma", noWa: "081211110001", paket: "8x per bulan", nominal: 720000, tempo: "2026-11-01", status: "lunas", dibayar: { tanggal: "2026-11-01", metode: "transfer" } },
  { id: "th7", nama: "Bimo Tri Wibowo", namaOrtu: "Tri Wibowo", noWa: "081211110002", paket: "8x per bulan", nominal: 720000, tempo: "2026-10-20", status: "lunas", dibayar: { tanggal: "2026-10-19", metode: "tunai" } },
  { id: "th8", nama: "Raka Putra", namaOrtu: "Yudi Putra", noWa: "081211110005", paket: "8x per bulan", nominal: 670000, tempo: "2026-11-05", status: "lunas", dibayar: { tanggal: "2026-11-05", metode: "qris" } },
];

import type { Pembayaran } from "./rekap";

export const bagiHasilContoh: Record<string, number> = { ilham: 0, riska: 40 };
// Gaji pelatih yang sudah ditandai dibayar owner (kunci: pengajar|bulan -> tanggal uang masuk). Oktober sengaja belum, supaya alur "tandai dibayar" bisa dicoba.
export const gajiDibayarContoh: Record<string, string> = { "riska|2026-06": "2026-07-05", "riska|2026-07": "2026-08-05", "riska|2026-08": "2026-09-05", "riska|2026-09": "2026-10-05" };
export const bagiNominalContoh: Record<string, number> = { ilham: 0, riska: 750000 };

const NAMA_PAKET: Record<number, string> = { 400000: "4x per bulan", 600000: "Dewasa 4x per bulan", 670000: "8x per bulan (promo)", 720000: "8x per bulan" };

function bulanan(bulan: string, isi: [number, string, string][]): Pembayaran[] {
  return isi.map(([nominal, pengajarId, nama], i) => ({
    id: `${bulan}-${i + 1}`,
    tgl: `${bulan}-${String(1 + (bulan === "2026-11" ? i : (i * 4) % 27)).padStart(2, "0")}`,
    nama, paket: NAMA_PAKET[nominal]!, nominal, pengajarId,
  }));
}

export const pembayaranContoh: Pembayaran[] = [
  ...bulanan("2026-06", [[720000, "ilham", "Aisyah Rahma"], [720000, "ilham", "Bimo Tri"], [400000, "riska", "Nadia Salsabila"], [600000, "ilham", "Mita Lestari"], [400000, "riska", "Tara Wijaya"]]),
  ...bulanan("2026-07", [[720000, "ilham", "Aisyah Rahma"], [720000, "ilham", "Bimo Tri"], [720000, "riska", "Zahra Putri"], [400000, "riska", "Nadia Salsabila"], [600000, "ilham", "Mita Lestari"]]),
  ...bulanan("2026-08", [[720000, "ilham", "Aisyah Rahma"], [720000, "ilham", "Bimo Tri"], [720000, "riska", "Zahra Putri"], [670000, "riska", "Raka Putra"], [400000, "riska", "Nadia Salsabila"], [400000, "ilham", "Tara Wijaya"]]),
  ...bulanan("2026-09", [[720000, "ilham", "Aisyah Rahma"], [720000, "ilham", "Bimo Tri"], [720000, "riska", "Zahra Putri"], [720000, "ilham", "Naufal Akbar"], [670000, "riska", "Raka Putra"], [400000, "riska", "Nadia Salsabila"]]),
  ...bulanan("2026-10", [[720000, "ilham", "Aisyah Rahma"], [720000, "ilham", "Bimo Tri"], [720000, "riska", "Zahra Putri"], [670000, "riska", "Raka Putra"], [670000, "ilham", "Dika Pratama"], [600000, "ilham", "Mita Lestari"]]),
  ...bulanan("2026-11", [[720000, "ilham", "Aisyah Rahma"], [720000, "ilham", "Bimo Tri"], [720000, "riska", "Zahra Putri"], [720000, "ilham", "Naufal Akbar"], [670000, "riska", "Raka Putra"], [400000, "riska", "Tara Wijaya"], [400000, "ilham", "Nadia Salsabila"]]),
];

import type { PromoOwner } from "./promo";

export const promoOwnerContoh: PromoOwner[] = [
  { id: "pr1", kode: "HEMAT10", jenis: "persen", nilai: 10, kuota: 20, terpakai: 7, kedaluwarsa: "2026-12-31", aktif: true },
  { id: "pr2", kode: "AWALNOV", jenis: "nominal", nilai: 75000, kuota: 10, terpakai: 10, kedaluwarsa: null, aktif: true },
  { id: "pr3", kode: "OKTOBER", jenis: "persen", nilai: 15, kuota: null, terpakai: 4, kedaluwarsa: "2026-10-31", aktif: true },
  { id: "pr4", kode: "TEMAN5", jenis: "persen", nilai: 5, kuota: null, terpakai: 2, kedaluwarsa: null, aktif: false },
  { id: "rf1", kode: "RAKA10", jenis: "nominal", nilai: 50000, kuota: null, terpakai: 3, kedaluwarsa: null, aktif: true, pemilik: "Raka Putra" },
  { id: "rf2", kode: "AISYAH11", jenis: "nominal", nilai: 50000, kuota: null, terpakai: 1, kedaluwarsa: null, aktif: true, pemilik: "Aisyah Rahma" },
];

export const pemakaianPromoContoh: { id: string; kode: string; nama: string; tgl: string; potongan: number }[] = [
  { id: "u1", kode: "HEMAT10", nama: "Zahra Putri", tgl: "2026-11-06", potongan: 72000 },
  { id: "u2", kode: "HEMAT10", nama: "Naufal Akbar", tgl: "2026-11-04", potongan: 72000 },
  { id: "u3", kode: "RAKA10", nama: "Tara Wijaya", tgl: "2026-11-03", potongan: 50000 },
  { id: "u4", kode: "AWALNOV", nama: "Mita Lestari", tgl: "2026-11-02", potongan: 75000 },
];

import type { PengajarOwner, Plan } from "./pengajar";

export const PLAN_CONTOH: Plan = "pro";

export const pengajarOwnerContoh: PengajarOwner[] = [
  { id: "ilham", nama: "Coach Ilham", email: "ilham@contoh.id", pemilik: true, status: "aktif" },
  { id: "riska", nama: "Coach Riska", email: "riska@contoh.id", pemilik: false, status: "aktif" },
];

import type { PaketOwner } from "./paket";

export const paketOwnerContoh: PaketOwner[] = paketContoh.map((p) => ({
  id: p.id, nama: p.nama, kategori: p.kategori as "anak" | "dewasa", jenis: p.jenis as "privat" | "grup" | "keluarga",
  jumlahSesi: p.jumlahSesi, masaBerlakuHari: p.masaHari, harga: p.harga, anggota: p.jenis === "keluarga" ? 2 : null, aktif: true,
}));

// Token contoh (di aplikasi nyata disimpan sebagai hash di database dan dibuat saat pendaftaran di-ACC).
export const tokenPortalContoh: Record<string, string> = {
  m1: "R7KQ4WM9XD2NBHT6FCYPZ3EAVG",
  m3: "M3TXA8QZ5HNEC2DKW7LRJ9VYBF",
};

export const SEKARANG_CONTOH = "2026-11-07T09:00:00+07:00";

export const sesiBerikutnyaContoh: Record<string, { label: string; mulai: string; nama: string }> = {
  m1: { label: "Sab 14 Nov · 07.00", mulai: "2026-11-14T07:00:00+07:00", nama: "Privat anak · Coach Ilham" },
  m3: { label: "Hari ini · 11.00", mulai: "2026-11-07T11:00:00+07:00", nama: "Semi privat · Coach Riska" },
};

// Rekening contoh (nomor palsu). Rekening asli diatur owner di Pengaturan dan akan dibaca dari database.
export const rekeningContoh = [
  { id: "r1", bank: "BCA", nomor: "1234567890", atasNama: "Ilham Pratama" },
  { id: "r2", bank: "Mandiri", nomor: "9876543210123", atasNama: "Ilham Pratama" },
];

import type { Pemberitahuan } from "./pemberitahuan";

export const pemberitahuanContoh: Pemberitahuan[] = [
  { id: "i1", jenis: "tidak_hadir", judul: "Coach Ilham tidak bisa hadir Sabtu 14 Nov", isi: "Sesi Sabtu 14 Nov diganti Minggu 15 Nov pukul 07.00. Kalau jadwal pengganti tidak cocok, hubungi pelatih.", penulis: "Coach Ilham", untukPengajarId: "ilham", tgl: "2026-11-06" },
  { id: "i2", jenis: "aturan", judul: "Wajib memakai topi renang silikon", isi: "Mulai pekan depan semua murid wajib memakai topi renang silikon di kolam.", penulis: "Pemilik", untukPengajarId: null, tgl: "2026-11-05" },
  { id: "i4", jenis: "umum", judul: "Bawa kacamata renang cadangan", isi: "Kolam B sedang bersihkan filter, air agak keruh. Murid sesi Sabtu 16.00 sebaiknya bawa kacamata cadangan.", penulis: "Coach Ilham", untukPengajarId: "ilham", untukSlotId: "j4", tgl: "2026-11-07" },
  { id: "i3", jenis: "umum", judul: "Libur 25 Desember", isi: "Tanggal 25 Desember tidak ada sesi. Sesi yang jatuh di tanggal itu diganti di jadwal lain.", penulis: "Pemilik", untukPengajarId: null, tgl: "2026-11-03" },
];

// Tagihan langganan KelolaKelas milik usaha contoh (dibayar owner lewat gateway). Di database: tabel subscription_invoices.
export const tagihanLanggananContoh = [
  { orderId: "KK-202611-0001", plan: "pro" as const, bulan: 1, nominal: 99000, akhirLama: "2026-12-05" as string | null },
  { orderId: "KK-202611-0002", plan: "pro" as const, bulan: 12, nominal: 990000, akhirLama: "2026-12-05" as string | null },
];
