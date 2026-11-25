/**
 * Paket langganan KelolaKelas: dua jenis x tiga paket (keputusan Ferdy 2026-11-23, lihat Sistem Les/PAKET-DRAFT.md).
 * Satu sumber kebenaran untuk harga, batas, dan isi paket. Harga dan batas dipakai di server (cek saat tambah murid/pelatih/slot),
 * halaman Harga/Landing hanya menampilkan dari sini supaya angka tidak bisa beda dari aplikasi.
 */

export type Jenis = "guru_les" | "agensi";
export type PlanKey = "guru_mulai" | "guru_tumbuh" | "guru_penuh" | "agensi_tim" | "agensi_klub" | "agensi_jaringan";

export const TRIAL_HARI = 7;
export const TAHUNAN_BULAN_BAYAR = 10; // bayar 10 bulan untuk 12
export const TAHUNAN_BULAN = 12;

export const JENIS: Record<Jenis, { nama: string; singkat: string; untuk: string; paket: [PlanKey, PlanKey, PlanKey] }> = {
  guru_les: { nama: "Guru Les", singkat: "Guru Les", untuk: "Kamu mengajar sendiri", paket: ["guru_mulai", "guru_tumbuh", "guru_penuh"] },
  agensi: { nama: "Agensi / Club", singkat: "Agensi", untuk: "Kamu punya pelatih lain", paket: ["agensi_tim", "agensi_klub", "agensi_jaringan"] },
};

export const SEMUA_PLAN: PlanKey[] = [...JENIS.guru_les.paket, ...JENIS.agensi.paket];
export const adalahPlan = (x: unknown): x is PlanKey => typeof x === "string" && (SEMUA_PLAN as string[]).includes(x);
export const adalahJenis = (x: unknown): x is Jenis => x === "guru_les" || x === "agensi";

export interface BatasPaket {
  pelatih: number;
  murid: number;
  slot: number;
  paketJual: number;
  rekening: number;
  cabang: number;
  staf: number;
  /** tidak | manual (tombol wa.me) | otomatis (kuota null = belum ditentukan) */
  wa: { mode: "tidak" | "manual" | "otomatis"; kuota: number | null };
}

export interface DefPaket {
  key: PlanKey;
  jenis: Jenis;
  nama: string;
  tagline: string;
  /** Harga normal per bulan. Ini harga coret saat promo, dan harga yang ditagih setelah promo berakhir. */
  hargaNormal: number;
  /** Harga per bulan selama promo peluncuran berlaku. */
  hargaPromo: number;
  sorot: boolean;
  batas: BatasPaket;
  sorotan: string[];
}

const INF = Number.POSITIVE_INFINITY;

export const PAKET: Record<PlanKey, DefPaket> = {
  guru_mulai: {
    key: "guru_mulai", jenis: "guru_les", nama: "Mulai", tagline: "Untuk mulai merapikan jadwal dan tagihan.",
    hargaNormal: 59_000, hargaPromo: 29_000, sorot: false,
    batas: { pelatih: 1, murid: 10, slot: 5, paketJual: 2, rekening: 1, cabang: 1, staf: 0, wa: { mode: "tidak", kuota: null } },
    sorotan: ["10 murid aktif", "5 slot jadwal, 2 paket yang dijual", "Halaman usaha, pendaftaran, bukti bayar, absensi", "1 rekening, 1 tema", "Ekspor data kapan saja"],
  },
  guru_tumbuh: {
    key: "guru_tumbuh", jenis: "guru_les", nama: "Tumbuh", tagline: "Untuk guru les yang muridnya makin banyak.",
    hargaNormal: 120_000, hargaPromo: 59_000, sorot: true,
    batas: { pelatih: 1, murid: 100, slot: 30, paketJual: 10, rekening: 3, cabang: 1, staf: 0, wa: { mode: "manual", kuota: null } },
    sorotan: ["100 murid aktif", "30 slot jadwal, 10 paket yang dijual", "Promo dan referral", "Catatan perkembangan murid", "Pemberitahuan ke murid + template WA", "3 rekening, 3 tema"],
  },
  guru_penuh: {
    key: "guru_penuh", jenis: "guru_les", nama: "Penuh", tagline: "Tanpa batas, dengan otomasi.",
    hargaNormal: 200_000, hargaPromo: 99_000, sorot: false,
    batas: { pelatih: 1, murid: INF, slot: INF, paketJual: INF, rekening: 5, cabang: 1, staf: 0, wa: { mode: "otomatis", kuota: null } },
    sorotan: ["Murid, slot, dan paket tanpa batas", "Pengingat WA otomatis (segera hadir)", "Invoice PDF dan laporan bulanan (segera hadir)", "Sembunyikan merek, warna aksen sendiri", "Setup dibantu, dukungan prioritas"],
  },
  agensi_tim: {
    key: "agensi_tim", jenis: "agensi", nama: "Tim", tagline: "Tim kecil yang mulai terstruktur.",
    hargaNormal: 405_000, hargaPromo: 199_000, sorot: false,
    batas: { pelatih: 3, murid: 60, slot: 30, paketJual: 10, rekening: 3, cabang: 1, staf: 0, wa: { mode: "manual", kuota: null } },
    sorotan: ["3 pelatih, 60 murid aktif", "Undang pelatih + halaman jadwal pelatih", "Bagi hasil dan gaji pelatih", "Ganti pelatih sekali jadwal", "Pemberitahuan per pelatih dan per sesi", "30 slot jadwal, 10 paket yang dijual"],
  },
  agensi_klub: {
    key: "agensi_klub", jenis: "agensi", nama: "Klub", tagline: "Klub dengan banyak pelatih dan murid.",
    hargaNormal: 810_000, hargaPromo: 399_000, sorot: true,
    batas: { pelatih: 7, murid: 150, slot: 100, paketJual: 20, rekening: 3, cabang: 1, staf: 1, wa: { mode: "otomatis", kuota: 300 } },
    sorotan: ["7 pelatih, 150 murid aktif", "Semua fitur paket Tim", "Rekap per pelatih + ekspor gaji", "Pengingat WA otomatis 300 pesan/bulan (segera hadir)", "Invoice PDF dan laporan bulanan (segera hadir)", "1 staf admin, setup dibantu, dukungan prioritas"],
  },
  agensi_jaringan: {
    key: "agensi_jaringan", jenis: "agensi", nama: "Jaringan", tagline: "Beberapa cabang, banyak staf.",
    hargaNormal: 1_620_000, hargaPromo: 799_000, sorot: false,
    batas: { pelatih: 25, murid: 1000, slot: 500, paketJual: 60, rekening: 10, cabang: 10, staf: 10, wa: { mode: "otomatis", kuota: 1500 } },
    sorotan: ["25 pelatih, 1.000 murid aktif", "Semua fitur paket Klub", "10 cabang + dashboard lintas cabang (segera hadir)", "10 staf admin dengan hak akses terpisah (segera hadir)", "Audit log, domain sendiri, impor Excel (segera hadir)", "Pengingat WA 1.500 pesan/bulan (segera hadir), nomor dukungan khusus"],
  },
};

export const jenisDariPlan = (p: PlanKey): Jenis => PAKET[p].jenis;
export const labelPlan = (p: PlanKey) => `${JENIS[PAKET[p].jenis].singkat} ${PAKET[p].nama}`;
export const planAwal = (j: Jenis): PlanKey => JENIS[j].paket[0];

/** Harga normal per bulan (yang ditagih bila tidak ada promo). */
export const HARGA: Record<PlanKey, number> = Object.fromEntries(SEMUA_PLAN.map((p) => [p, PAKET[p].hargaNormal])) as Record<PlanKey, number>;

export const BATAS_PENGAJAR: Record<PlanKey, number> = Object.fromEntries(SEMUA_PLAN.map((p) => [p, PAKET[p].batas.pelatih])) as Record<PlanKey, number>;

// ---------- Promo berulang (harga coret + hitung mundur) ----------
/**
 * Promo = jendela waktu GLOBAL: `durasiJam` jam harga promo berlaku untuk semua orang, lalu `jedaJam` jam harga normal, lalu ulang.
 * Jendela dihitung dari jam server dan satu titik awal (`awal`), jadi semua pengunjung dan semua perangkat melihat harga dan
 * hitung mundur yang sama, dan harga yang tampil = harga yang ditagih (`hargaBerlaku`). Tidak ada timer per perangkat.
 * Saat promo tidak berlaku: harga normal tanpa coret, dan hitung mundur menunjukkan kapan promo mulai lagi.
 * `jedaJam: null` = satu jendela saja. `PROMO = null` = tidak ada promo. Ubah `awal` (ISO) saat Ferdy memulai promo.
 */
export interface KonfigPromo { awal: string; durasiJam: number; jedaJam: number | null }

export const PROMO: KonfigPromo | null = { awal: "2026-11-23T08:00:00Z", durasiJam: 15, jedaJam: 24 };

/**
 * Harga pelanggan (keputusan Ferdy 2026-11-24): di dalam panel, pembayaran pertama setelah masa percobaan dan semua perpanjangan
 * SELALU memakai harga promo (harga normal dicoret), tidak ikut jendela promo global yang di halaman publik. Dipakai di halaman Langganan,
 * Pilih paket, dan Pembayaran supaya harga yang tampil = harga yang ditagih.
 */
export const PROMO_PELANGGAN: KonfigPromo = { awal: "2020-01-01T00:00:00Z", durasiJam: 24 * 365 * 100, jedaJam: null };

export interface FasePromo {
  aktif: boolean;
  /** Bila aktif: kapan promo berakhir. Bila tidak: kapan promo mulai lagi (null = tidak akan mulai lagi). Dalam ms. */
  sampaiMs: number | null;
}

const JAM = 3_600_000;

export function fasePromo(sekarangMs: number, konfig: KonfigPromo | null = PROMO): FasePromo {
  if (!konfig) return { aktif: false, sampaiMs: null };
  const awal = Date.parse(konfig.awal);
  if (!Number.isFinite(awal) || !(konfig.durasiJam > 0)) return { aktif: false, sampaiMs: null };
  const dur = konfig.durasiJam * JAM;
  if (sekarangMs < awal) return { aktif: false, sampaiMs: awal };
  if (konfig.jedaJam === null || !(konfig.jedaJam >= 0)) {
    return sekarangMs < awal + dur ? { aktif: true, sampaiMs: awal + dur } : { aktif: false, sampaiMs: null };
  }
  const periode = dur + konfig.jedaJam * JAM;
  const pos = (sekarangMs - awal) % periode;
  const mulaiSiklus = sekarangMs - pos;
  return pos < dur ? { aktif: true, sampaiMs: mulaiSiklus + dur } : { aktif: false, sampaiMs: mulaiSiklus + periode };
}

export const promoAktif = (sekarangMs: number, konfig: KonfigPromo | null = PROMO): boolean => fasePromo(sekarangMs, konfig).aktif;

export function hargaBerlaku(plan: PlanKey, sekarangMs: number, konfig: KonfigPromo | null = PROMO): number {
  return promoAktif(sekarangMs, konfig) ? PAKET[plan].hargaPromo : PAKET[plan].hargaNormal;
}

/** Total per periode. Tahunan = 10 bulan bayar untuk 12; `normalTotal` = yang dibayar tanpa promo (untuk coret). */
export function hargaPeriode(plan: PlanKey, periode: "bulanan" | "tahunan", sekarangMs: number, konfig: KonfigPromo | null = PROMO) {
  const bulan = periode === "bulanan" ? 1 : TAHUNAN_BULAN;
  const kali = periode === "bulanan" ? 1 : TAHUNAN_BULAN_BAYAR;
  const total = hargaBerlaku(plan, sekarangMs, konfig) * kali;
  const normalTotal = PAKET[plan].hargaNormal * kali;
  return { bulan, total, normalTotal, promo: total < normalTotal };
}

export const persenHemat = (plan: PlanKey) => Math.round((1 - PAKET[plan].hargaPromo / PAKET[plan].hargaNormal) * 100);

export interface SisaWaktu { habis: boolean; jam: number; menit: number; detik: number; totalDetik: number }
/** Sisa waktu menuju `targetMs` (kosong/lewat = habis). */
export function sisaWaktu(sekarangMs: number, targetMs: number | null): SisaWaktu {
  const diff = targetMs !== null && Number.isFinite(targetMs) ? Math.max(0, Math.floor((targetMs - sekarangMs) / 1000)) : 0;
  return { habis: diff <= 0, jam: Math.floor(diff / 3600), menit: Math.floor((diff % 3600) / 60), detik: diff % 60, totalDetik: diff };
}

// ---------- Batas (dicek di server saat tambah data) ----------
export type KunciBatas = "pelatih" | "murid" | "slot" | "paketJual" | "rekening" | "cabang" | "staf";

/** true bila masih boleh menambah satu lagi. `terpakai` = jumlah sekarang. */
export function bolehTambah(plan: PlanKey, kunci: KunciBatas, terpakai: number): boolean {
  return terpakai < PAKET[plan].batas[kunci];
}

export const bolehTimFitur = (plan: PlanKey) => PAKET[plan].jenis === "agensi";

export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
export function singkatRupiah(n: number): string {
  if (n >= 1_000_000) { const j = n / 1_000_000; return `Rp${(Number.isInteger(j) ? String(j) : j.toFixed(2).replace(/0$/, "").replace(".", ",")).replace(/\.$/, "")}jt`; }
  return `Rp${Math.round(n / 1000)}rb`;
}
export const angkaBatas = (n: number) => (n === INF ? "Tak terbatas" : n.toLocaleString("id-ID"));

// ---------- Tabel perbandingan ----------
export type Sel = boolean | string;
export interface BarisBanding { label: string; nilai: [Sel, Sel, Sel]; segera?: boolean }
export interface KelompokBanding { judul: string; baris: BarisBanding[] }

const batasBaris = (jenis: Jenis, label: string, kunci: KunciBatas): BarisBanding => {
  const [a, b, c] = JENIS[jenis].paket.map((p) => angkaBatas(PAKET[p].batas[kunci])) as [string, string, string];
  return { label, nilai: [a, b, c] };
};

export const BANDING: Record<Jenis, KelompokBanding[]> = {
  guru_les: [
    { judul: "Batas", baris: [batasBaris("guru_les", "Murid aktif", "murid"), batasBaris("guru_les", "Slot jadwal aktif", "slot"), batasBaris("guru_les", "Paket yang dijual", "paketJual"), batasBaris("guru_les", "Rekening pembayaran", "rekening"), { label: "Tema tampilan", nilai: ["1", "3", "3 + warna aksen sendiri"] }] },
    { judul: "Fitur", baris: [
      { label: "Promo dan referral", nilai: [false, true, true] },
      { label: "Catatan perkembangan murid", nilai: [false, true, true] },
      { label: "Pemberitahuan ke murid di portal", nilai: [false, true, true] },
      { label: "Template pesan WA bisa diubah", nilai: [false, true, true] },
      { label: "Pengingat WA", nilai: [false, "Tombol manual", "Otomatis"], segera: true },
      { label: "Invoice PDF", nilai: [false, false, true], segera: true },
      { label: "Laporan bulanan", nilai: [false, false, true], segera: true },
      { label: "Sembunyikan \"Dibuat dengan KelolaKelas\"", nilai: [false, false, true], segera: true },
      { label: "Setup dibantu", nilai: [false, false, true] },
      { label: "Dukungan", nilai: ["Panduan", "Chat WA jam kerja", "Prioritas"] },
    ] },
  ],
  agensi: [
    { judul: "Batas", baris: [batasBaris("agensi", "Pelatih", "pelatih"), batasBaris("agensi", "Murid aktif", "murid"), batasBaris("agensi", "Slot jadwal aktif", "slot"), batasBaris("agensi", "Paket yang dijual", "paketJual"), batasBaris("agensi", "Rekening pembayaran", "rekening"), batasBaris("agensi", "Cabang", "cabang"), { label: "Staf admin (hak akses terpisah)", nilai: [false, "1 staf", "10 staf"], segera: true }, { label: "Tema tampilan", nilai: ["3", "3", "3 + warna aksen sendiri"] }] },
    { judul: "Fitur tim", baris: [
      { label: "Undang pelatih + halaman jadwal pelatih", nilai: [true, true, true] },
      { label: "Bagi hasil dan gaji pelatih", nilai: [true, true, true] },
      { label: "Ganti pelatih sekali jadwal", nilai: [true, true, true] },
      { label: "Pemberitahuan per pelatih dan per sesi", nilai: [true, true, true] },
      { label: "Rekap per pelatih", nilai: ["Dasar", true, true] },
      { label: "Ekspor gaji pelatih", nilai: [false, true, true] },
      { label: "Dashboard dan rekap lintas cabang", nilai: [false, false, true], segera: true },
      { label: "Riwayat aktivitas (audit log)", nilai: [false, false, true], segera: true },
      { label: "Link atau domain sendiri", nilai: [false, false, true], segera: true },
    ] },
    { judul: "Fitur umum", baris: [
      { label: "Promo, referral, catatan perkembangan", nilai: [true, true, true] },
      { label: "Pemberitahuan murid dan template WA", nilai: [true, true, true] },
      { label: "Pengingat WA", nilai: ["Tombol manual", "Otomatis, 300 pesan/bulan", "Otomatis, 1.500 pesan/bulan"], segera: true },
      { label: "Invoice PDF dan laporan bulanan", nilai: [false, true, "Ya + laporan per cabang"], segera: true },
      { label: "Impor murid dari Excel/CSV", nilai: [false, false, true], segera: true },
      { label: "Sembunyikan \"Dibuat dengan KelolaKelas\"", nilai: [false, false, true], segera: true },
      { label: "Setup dibantu", nilai: [false, "Jadwal dan paket awal", "Ditambah migrasi data lama"] },
      { label: "Dukungan", nilai: ["Chat WA jam kerja", "Prioritas", "Prioritas + nomor khusus"] },
    ] },
  ],
};

/** Ada di semua paket. */
export const INTI = [
  "Beranda usaha publik dan link pendaftaran", "Slot dan kuota yang dihitung otomatis", "Bayar dan unggah bukti, ACC oleh pemilik",
  "Portal murid tanpa akun", "Sesi, absensi hadir/izin/alpa, sesi pengganti", "Tagihan dan rekap pemasukan", "Aturan sesi dan syarat milik usahamu", "Ekspor CSV kapan saja",
];
