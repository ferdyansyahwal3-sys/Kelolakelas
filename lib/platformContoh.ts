import { HARGA, perpanjangPeriode } from "./langganan";
import { hargaSetelahPromo, type StatusManual, type Audit, type LogPengingat, type MetodeBayar, type Plan, type PromoPlatform, type TagihanPlatform, type Usaha } from "./platform";

// DATA FIKTIF untuk panel pemilik platform. Tidak ada usaha atau orang sungguhan di sini.
export const HARI_PLATFORM = "2026-11-22";

export const promoPlatformContoh: PromoPlatform[] = [
  { id: "pp1", kode: "BARU20", jenis: "persen", nilai: 20, kuota: 20, kedaluwarsa: "2026-12-31", berlakuBulan: 1, aktif: true, dibuat: "2026-09-30" },
  { id: "pp2", kode: "TEMAN15", jenis: "persen", nilai: 15, kuota: null, kedaluwarsa: null, berlakuBulan: 1, aktif: true, dibuat: "2026-05-20" },
  { id: "pp3", kode: "AKHIRTAHUN", jenis: "nominal", nilai: 25000, kuota: 10, kedaluwarsa: "2026-12-31", berlakuBulan: 3, aktif: true, dibuat: "2026-11-15" },
  { id: "pp4", kode: "LAUNCH50", jenis: "persen", nilai: 50, kuota: 5, kedaluwarsa: "2026-10-31", berlakuBulan: 1, aktif: true, dibuat: "2026-05-01" },
  { id: "pp5", kode: "UJICOBA", jenis: "persen", nilai: 100, kuota: 3, kedaluwarsa: null, berlakuBulan: 1, aktif: false, dibuat: "2026-05-02" },
];

interface Bayar { tgl: string; bulan: number; promo?: string; metode?: MetodeBayar; referensi?: string }
interface Rencana {
  id: string; nama: string; slug: string; pemilik: string; kategori: string; kota: string; plan: Plan;
  dibuat: string; trialBerakhir: string; murid: number; muridAktif: number; pengajar: number; sesiBulanIni: number; terakhirAktif: string;
  bayar?: Bayar[];
  manual?: StatusManual;
}

/** `jumlah` pembayaran bulanan; tiap pembayaran berikutnya 3 hari sebelum periode berakhir. */
function rutin(mulai: string, jumlah: number, ekstra: Partial<Bayar> = {}, pertama: Partial<Bayar> = {}): Bayar[] {
  const hasil: Bayar[] = [];
  let akhir: string | null = null;
  for (let i = 0; i < jumlah; i++) {
    const tgl: string = i === 0 ? mulai : new Date(Date.parse(akhir!) - 3 * 86400000).toISOString().slice(0, 10);
    hasil.push({ tgl, bulan: 1, ...ekstra, ...(i === 0 ? pertama : {}) });
    akhir = perpanjangPeriode(akhir, tgl, 1);
  }
  return hasil;
}

const rencana: Rencana[] = [
  { id: "u1", nama: "Privat Renang Ilham", slug: "renang-ilham", pemilik: "Ilham Pratama", kategori: "Renang", kota: "Bekasi", plan: "agensi_klub", dibuat: "2026-06-10", trialBerakhir: "2026-06-24", murid: 23, muridAktif: 21, pengajar: 2, sesiBulanIni: 64, terakhirAktif: "2026-11-22", bayar: rutin("2026-06-20", 6, {}, { promo: "LAUNCH50" }) },
  { id: "u2", nama: "Sari Yoga Studio", slug: "sari-yoga", pemilik: "Sari Wulandari", kategori: "Yoga", kota: "Bandung", plan: "guru_tumbuh", dibuat: "2026-08-03", trialBerakhir: "2026-08-17", murid: 18, muridAktif: 18, pengajar: 1, sesiBulanIni: 41, terakhirAktif: "2026-11-21", bayar: rutin("2026-08-26", 3, {}, { promo: "LAUNCH50" }) },
  { id: "u3", nama: "Les Piano Bu Lina", slug: "piano-bu-lina", pemilik: "Lina Marlina", kategori: "Musik", kota: "Depok", plan: "guru_tumbuh", dibuat: "2026-09-15", trialBerakhir: "2026-09-29", murid: 9, muridAktif: 8, pengajar: 1, sesiBulanIni: 17, terakhirAktif: "2026-11-14", bayar: rutin("2026-10-18", 1) },
  { id: "u4", nama: "Bimbel Matematika Pak Dedi", slug: "bimbel-pak-dedi", pemilik: "Dedi Kurniawan", kategori: "Bimbel", kota: "Jakarta", plan: "agensi_klub", dibuat: "2026-07-01", trialBerakhir: "2026-07-15", murid: 34, muridAktif: 30, pengajar: 3, sesiBulanIni: 6, terakhirAktif: "2026-11-02", bayar: rutin("2026-07-30", 3), manual: { fase: "jatuh_tempo", alasan: "Owner minta waktu, janji bayar 30 Nov", sampai: "2026-11-30", diubah: "2026-11-20" } },
  { id: "u5", nama: "Smash Badminton Club", slug: "smash-club", pemilik: "Rudi Hartono", kategori: "Badminton", kota: "Surabaya", plan: "guru_tumbuh", dibuat: "2026-05-12", trialBerakhir: "2026-05-26", murid: 14, muridAktif: 0, pengajar: 1, sesiBulanIni: 0, terakhirAktif: "2026-09-20", bayar: rutin("2026-05-20", 4) },
  { id: "u6", nama: "Studio Tari Nusantara", slug: "tari-nusantara", pemilik: "Ayu Lestari", kategori: "Tari", kota: "Yogyakarta", plan: "agensi_klub", dibuat: "2026-10-01", trialBerakhir: "2026-10-15", murid: 27, muridAktif: 27, pengajar: 3, sesiBulanIni: 52, terakhirAktif: "2026-11-22", bayar: rutin("2026-10-14", 2, {}, { promo: "BARU20" }) },
  { id: "u7", nama: "Gym PT Rafi", slug: "gym-rafi", pemilik: "Rafi Alamsyah", kategori: "Gym", kota: "Medan", plan: "guru_tumbuh", dibuat: "2026-11-10", trialBerakhir: "2026-11-24", murid: 6, muridAktif: 6, pengajar: 1, sesiBulanIni: 12, terakhirAktif: "2026-11-21" },
  { id: "u8", nama: "Tenis Coach Anton", slug: "tenis-anton", pemilik: "Anton Wijaya", kategori: "Tenis", kota: "Denpasar", plan: "agensi_klub", dibuat: "2026-11-17", trialBerakhir: "2026-12-01", murid: 3, muridAktif: 3, pengajar: 1, sesiBulanIni: 4, terakhirAktif: "2026-11-22" },
  { id: "u9", nama: "Renang Aqua Kids", slug: "aqua-kids", pemilik: "Maya Sari", kategori: "Renang", kota: "Tangerang", plan: "agensi_klub", dibuat: "2026-04-20", trialBerakhir: "2026-05-04", murid: 41, muridAktif: 38, pengajar: 4, sesiBulanIni: 77, terakhirAktif: "2026-11-12", bayar: [{ tgl: "2026-04-22", bulan: 12 }] },
  { id: "u10", nama: "Pilates Core Studio", slug: "pilates-core", pemilik: "Dina Prameswari", kategori: "Pilates", kota: "Jakarta", plan: "guru_tumbuh", dibuat: "2026-10-20", trialBerakhir: "2026-11-03", murid: 5, muridAktif: 5, pengajar: 1, sesiBulanIni: 3, terakhirAktif: "2026-11-05" },
  { id: "u11", nama: "Garuda Bela Diri", slug: "garuda-beladiri", pemilik: "Bagas Saputra", kategori: "Bela diri", kota: "Semarang", plan: "guru_tumbuh", dibuat: "2026-02-14", trialBerakhir: "2026-02-28", murid: 31, muridAktif: 29, pengajar: 2, sesiBulanIni: 58, terakhirAktif: "2026-11-22", bayar: rutin("2026-05-30", 6, {}, { promo: "TEMAN15" }) },
  { id: "u12", nama: "Musik Nada Ceria", slug: "nada-ceria", pemilik: "Tika Anggraini", kategori: "Musik", kota: "Bandung", plan: "agensi_klub", dibuat: "2026-03-05", trialBerakhir: "2026-03-19", murid: 36, muridAktif: 33, pengajar: 4, sesiBulanIni: 70, terakhirAktif: "2026-11-15", bayar: rutin("2026-03-18", 9) },
  { id: "u13", nama: "Berenang Hebat Bekasi", slug: "berenang-hebat", pemilik: "Hendra Gunawan", kategori: "Renang", kota: "Bekasi", plan: "guru_tumbuh", dibuat: "2026-11-01", trialBerakhir: "2026-11-15", murid: 4, muridAktif: 4, pengajar: 1, sesiBulanIni: 9, terakhirAktif: "2026-11-20" },
  { id: "u14", nama: "Bimbel Cerdas Kita", slug: "cerdas-kita", pemilik: "Wulan Dewi", kategori: "Bimbel", kota: "Malang", plan: "guru_tumbuh", dibuat: "2026-08-18", trialBerakhir: "2026-09-01", murid: 22, muridAktif: 21, pengajar: 2, sesiBulanIni: 35, terakhirAktif: "2026-11-21", bayar: rutin("2026-09-10", 3, { metode: "transfer_bank", referensi: "BCA a.n. Wulan Dewi" }) },
  { id: "u15", nama: "Yoga Flow Bali", slug: "yoga-flow-bali", pemilik: "Komang Ari", kategori: "Yoga", kota: "Ubud", plan: "agensi_klub", dibuat: "2026-11-19", trialBerakhir: "2026-12-03", murid: 2, muridAktif: 2, pengajar: 1, sesiBulanIni: 2, terakhirAktif: "2026-11-22" },
  { id: "u16", nama: "Renang Mini Splash", slug: "mini-splash", pemilik: "Yuni Astuti", kategori: "Renang", kota: "Solo", plan: "guru_tumbuh", dibuat: "2026-09-01", trialBerakhir: "2026-09-15", murid: 1, muridAktif: 0, pengajar: 1, sesiBulanIni: 0, terakhirAktif: "2026-09-10" },
  { id: "u17", nama: "Les Gitar Bang Oji", slug: "gitar-bang-oji", pemilik: "Oji Maulana", kategori: "Musik", kota: "Bogor", plan: "guru_tumbuh", dibuat: "2026-10-05", trialBerakhir: "2026-10-19", murid: 4, muridAktif: 4, pengajar: 1, sesiBulanIni: 0, terakhirAktif: "2026-10-19" },
];

const belumBayar: { usahaId: string; plan: Plan; bulan: number; terbit: string; tempo: string; promo?: string; status?: "belum_bayar" | "kedaluwarsa" }[] = [
  { usahaId: "u2", plan: "guru_tumbuh", bulan: 1, terbit: "2026-11-19", tempo: "2026-11-26" },
  { usahaId: "u3", plan: "guru_tumbuh", bulan: 1, terbit: "2026-11-11", tempo: "2026-11-18" },
  { usahaId: "u4", plan: "agensi_klub", bulan: 1, terbit: "2026-10-23", tempo: "2026-10-30" },
  { usahaId: "u5", plan: "guru_tumbuh", bulan: 1, terbit: "2026-09-13", tempo: "2026-09-20", status: "kedaluwarsa" },
  { usahaId: "u7", plan: "guru_tumbuh", bulan: 1, terbit: "2026-11-20", tempo: "2026-11-24" },
  { usahaId: "u10", plan: "guru_tumbuh", bulan: 1, terbit: "2026-10-27", tempo: "2026-11-03", promo: "BARU20" },
  { usahaId: "u11", plan: "guru_tumbuh", bulan: 1, terbit: "2026-11-20", tempo: "2026-11-30" },
];

let urut = 0;
const nomorOrder = (tgl: string) => `KK-${tgl.slice(0, 4)}${tgl.slice(5, 7)}-${String(++urut).padStart(4, "0")}`;
const cariPromo = (kode?: string) => promoPlatformContoh.find((p) => p.kode === kode) ?? null;

function hitungTagihan(plan: Plan, bulan: number, kode?: string): { hargaNormal: number; nominal: number } {
  if (bulan === 12) { const h = HARGA[plan] * 10; return { hargaNormal: h, nominal: h }; }
  const h = hargaSetelahPromo(plan, cariPromo(kode));
  return { hargaNormal: h.normal * bulan, nominal: h.bayar * bulan };
}

const tagihanLunas: TagihanPlatform[] = rencana.flatMap((r) => (r.bayar ?? []).map((b) => {
  const { hargaNormal, nominal } = hitungTagihan(r.plan, b.bulan, b.promo);
  const metode = b.metode ?? "duitku";
  return { id: `t${urut + 1}`, orderId: nomorOrder(b.tgl), usahaId: r.id, plan: r.plan, bulan: b.bulan, hargaNormal, nominal, kodePromo: b.promo ?? null, status: "lunas" as const, terbit: new Date(Date.parse(b.tgl) - 5 * 86400000).toISOString().slice(0, 10), tempo: b.tgl, dibayar: b.tgl, metode, referensi: b.referensi };
}));

const tagihanBelum: TagihanPlatform[] = belumBayar.map((b) => {
  const { hargaNormal, nominal } = hitungTagihan(b.plan, b.bulan, b.promo);
  return { id: `t${urut + 1}`, orderId: nomorOrder(b.terbit), usahaId: b.usahaId, plan: b.plan, bulan: b.bulan, hargaNormal, nominal, kodePromo: b.promo ?? null, status: b.status ?? "belum_bayar", terbit: b.terbit, tempo: b.tempo, dibayar: null, metode: null };
});

export const tagihanPlatformContoh: TagihanPlatform[] = [...tagihanLunas, ...tagihanBelum];

export const usahaContoh: Usaha[] = rencana.map((r) => {
  let periode: string | null = null;
  for (const b of r.bayar ?? []) periode = perpanjangPeriode(periode, b.tgl, b.bulan);
  return {
    id: r.id, nama: r.nama, slug: r.slug, pemilik: r.pemilik, email: `${r.slug.split("-")[0]}@contoh.id`, noWa: `0812000${r.id.slice(1).padStart(4, "0")}`,
    kategori: r.kategori, kota: r.kota, plan: r.plan, dibuat: r.dibuat, trialBerakhir: r.trialBerakhir, periodeBerakhir: periode, graceSampai: null,
    murid: r.murid, muridAktif: r.muridAktif, pengajar: r.pengajar, sesiBulanIni: r.sesiBulanIni, terakhirAktif: r.terakhirAktif, statusManual: r.manual ?? null,
  };
});

export const auditContoh: Audit[] = [
  { id: "a3", waktu: "2026-11-20T11:20:00+07:00", aksi: "ubah_status", usahaId: "u4", ringkas: "Status Bimbel Matematika Pak Dedi: Ditangguhkan (otomatis) → Jatuh tempo (manual sampai 2026-11-30)", alasan: "Owner minta waktu, janji bayar 30 Nov" },
  { id: "a2", waktu: "2026-11-10T14:05:00+07:00", aksi: "aktivasi_manual", usahaId: "u14", ringkas: "KK-202611-0014 dilunasi manual (transfer BCA a.n. Wulan Dewi)", alasan: "Owner kirim bukti transfer lewat WA" },
  { id: "a1", waktu: "2026-11-03T09:30:00+07:00", aksi: "lihat_usaha", usahaId: "u6", ringkas: "Mode lihat Studio Tari Nusantara dibuka (30 menit)", alasan: "Bantu atur jadwal tetap, diminta owner" },
];

export const logPengingatContoh: LogPengingat[] = [
  { tagihanId: tagihanBelum.find((t) => t.usahaId === "u4")!.id, kanal: "wa", waktu: "2026-11-05T10:00:00+07:00" },
];
