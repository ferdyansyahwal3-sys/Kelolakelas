// Murni: baris database permintaan ganti / tukar jadwal / pindahan / sesi pengganti -> bentuk layar (lib/pelatih.ts, lib/sesi.ts), dan pesan galat.
import { tanggalJakarta } from "./langgananData";
import type { PengajuanTukar, PermintaanGanti } from "./pelatih";
import type { JenisKabar, KabarPelatih, Pemberitahuan } from "./pemberitahuan";
import { aturanUntuk } from "./pengaturan";
import { kunciSesi, type Pengganti, type PindahJadwal } from "./sesi";

export interface BarisMintaDb { id: string; jadwal_id: string; tanggal: string; dari_id: string; ke_id: string; alasan: string; status: string; dibuat: string; diputuskan: string | null }
export interface BarisTukarDb { id: string; jadwal_id: string; tanggal_asal: string; tanggal_baru: string; jam_baru: string; alasan: string; pelatih_id: string; status: string; diputuskan: string | null }
export interface BarisPindahDb { jadwal_id: string; tanggal_asal: string; tanggal_baru: string; jam_baru: string }
export interface BarisPenggantiDb { id: string; jadwal_id: string; tanggal: string; murid_id: string; dari_jadwal_id: string; dari_tanggal: string }

export const KOLOM_MINTA = "id, jadwal_id, tanggal, dari_id, ke_id, alasan, status, dibuat, diputuskan";
export const KOLOM_TUKAR = "id, jadwal_id, tanggal_asal, tanggal_baru, jam_baru, alasan, pelatih_id, status, diputuskan";
export const KOLOM_PINDAH = "jadwal_id, tanggal_asal, tanggal_baru, jam_baru";
export const KOLOM_PENGGANTI = "id, jadwal_id, tanggal, murid_id, dari_jadwal_id, dari_tanggal";

/** "10:00:00" -> "10.00" (format jam di seluruh layar). */
export const jamLayar = (j: string) => j.slice(0, 5).replace(":", ".");
/** "16.00" / "16:00" -> "16:00" untuk kolom time. */
export const jamDb = (j: string) => j.trim().replace(".", ":");

/** Permintaan yang ditutup otomatis oleh owner ('dibatalkan') tidak ditampilkan sebagai permintaan. */
export function dariBarisMinta(b: BarisMintaDb): PermintaanGanti | null {
  if (b.status !== "menunggu" && b.status !== "disetujui" && b.status !== "ditolak") return null;
  return { id: b.id, slotId: b.jadwal_id, tanggal: b.tanggal, dariId: b.dari_id, keId: b.ke_id, alasan: b.alasan, status: b.status, dibuat: b.dibuat, ...(b.diputuskan ? { diputuskan: b.diputuskan } : {}) };
}

export function dariBarisTukar(b: BarisTukarDb): PengajuanTukar | null {
  if (b.status !== "menunggu" && b.status !== "disetujui" && b.status !== "ditolak" && b.status !== "dibatalkan") return null;
  return { id: b.id, slotId: b.jadwal_id, tanggalAsal: b.tanggal_asal, tanggalBaru: b.tanggal_baru, jamBaru: jamLayar(b.jam_baru), alasan: b.alasan, status: b.status, pelatihId: b.pelatih_id, ...(b.diputuskan ? { diputuskan: b.diputuskan } : {}) };
}

export const dariBarisPindah = (b: BarisPindahDb): PindahJadwal => ({ slotId: b.jadwal_id, tanggalAsal: b.tanggal_asal, tanggalBaru: b.tanggal_baru, jamBaru: jamLayar(b.jam_baru) });

export const dariBarisPengganti = (b: BarisPenggantiDb): Pengganti => ({ id: b.id, slotId: b.jadwal_id, tanggal: b.tanggal, muridId: b.murid_id, dariKunci: kunciSesi(b.dari_jadwal_id, b.dari_tanggal, b.murid_id) });

/** Pecah kunci "slot|tanggal|murid" jadi bagian-bagiannya (kunci sesi izin yang digantikan). */
export function bongkarKunciSesi(kunci: string): { slotId: string; tanggal: string; muridId: string } | null {
  const [slotId, tanggal, muridId] = kunci.split("|");
  return slotId && tanggal && muridId ? { slotId, tanggal, muridId } : null;
}

/** Aturan "sesi pengganti" usaha: nilai yang disimpan owner di pengaturan, selain itu bawaan cabangnya. Cermin fungsi `pengganti_set`. */
export function aturanPenggantiUsaha(kategori: string, pengaturan: unknown): boolean {
  const a = (pengaturan && typeof pengaturan === "object" ? (pengaturan as { aturan?: { sesiPengganti?: unknown } }).aturan : undefined) ?? {};
  return typeof a.sesiPengganti === "boolean" ? a.sesiPengganti : aturanUntuk(kategori).sesiPengganti;
}

const PESAN: Record<string, string> = {
  slot_tidak_ditemukan: "Slot tidak ditemukan.",
  tanggal_tidak_sesuai: "Slot tidak ada di tanggal itu.",
  sesi_lewat: "Sesi yang sudah lewat tidak bisa diubah.",
  sesi_dipindah: "Sesi ini sudah dipindah pemilik, jadi tidak bisa diganti pelatih atau diajukan lagi.",
  bukan_pemilik: "Hanya pemilik usaha yang bisa melakukan ini.",
  bukan_pelatih: "Akunmu bukan pelatih aktif di usaha ini.",
  bukan_pemegang: "Kamu hanya bisa mengajukan untuk sesi yang kamu pegang.",
  bukan_pemohon: "Hanya pemohon yang bisa menarik pengajuan ini.",
  sudah_ada_permintaan: "Sesi ini sudah punya permintaan yang menunggu persetujuan.",
  sudah_ada_pengajuan: "Sesi ini sudah punya pengajuan yang menunggu persetujuan.",
  sudah_diputuskan: "Sudah diputuskan, muat ulang halaman.",
  tidak_ditemukan: "Data tidak ditemukan, muat ulang halaman.",
  alasan_pendek: "Tulis alasannya singkat (minimal 5 karakter).",
  alasan_panjang: "Alasan maksimal 200 karakter.",
  pelatih_belum_dipilih: "Pilih pelatih pengganti.",
  pelatih_sama: "Pilih pelatih lain.",
  pelatih_tidak_ditemukan: "Pelatih tidak ditemukan atau tidak aktif.",
  pelatih_bentrok: "Pelatih itu sudah mengajar sesi lain di jam yang bentrok pada tanggal itu.",
  sudah_memegang: "Pelatih itu sudah memegang sesi ini.",
  jam_tidak_valid: "Isi jam seperti 16.00.",
  tanggal_baru_lewat: "Tanggal baru tidak boleh di masa lalu.",
  tanggal_baru_jauh: "Tanggal baru maksimal 60 hari ke depan.",
  sama_dengan_jadwal: "Tanggal dan jam baru sama dengan jadwal sekarang.",
  hari_slot_sama: "Tanggal baru jatuh di hari slot yang sama, sudah ada sesinya di tanggal itu. Pilih hari lain atau ubah jamnya saja di tanggal yang sama.",
  bentrok_pengajuan: "Bentrok dengan pengajuan lain yang masih menunggu.",
  sesi_asal_hilang: "Sesi asal tidak ada lagi di jadwal.",
  sudah_dipindah: "Sesi ini atau tanggal barunya sudah terpakai pemindahan lain.",
  ada_permintaan_menunggu: "Sesi ini juga punya permintaan ganti pelatih yang menunggu. Putuskan yang itu dulu.",
  pemegang_berubah: "Pemegang sesi ini sudah berubah sejak diajukan.",
  sudah_diabsen: "Sesi sudah mulai diabsen, tandai dulu pembatalannya.",
  pengganti_sudah_diabsen: "Sesi pengganti sudah diabsen. Batalkan tandanya dulu.",
  ada_pengganti: "Ada murid pengganti terjadwal di sesi itu. Batalkan dulu di Sesi dan absensi.",
  murid_bentrok: "Salah satu murid tetap sudah punya sesi lain di jam itu pada tanggal baru.",
  paket_berakhir: "Paket seorang murid berakhir sebelum tanggal itu.",
  tanggal_asal_lewat: "Tanggal asal sudah lewat, pemindahan tidak bisa dibatalkan.",
  pengganti_nonaktif: "Aturan usaha ini tanpa sesi pengganti.",
  murid_tidak_ditemukan: "Murid tidak ditemukan.",
  murid_nonaktif: "Murid ini sudah nonaktif.",
  bukan_izin: "Sesi pengganti hanya untuk sesi yang izin.",
  sudah_ada_pengganti: "Sesi izin ini sudah punya pengganti.",
  sudah_pengganti: "Ini sesi pengganti, izin di sini tidak diganti lagi.",
  slot_tidak_di_tanggal: "Slot itu tidak ada di tanggal tersebut.",
  tanggal_lewat: "Tanggal pengganti tidak boleh di masa lalu.",
  kategori_beda: "Kelas itu bukan untuk kategori murid ini.",
  sudah_di_sesi: "Murid sudah ada di sesi itu.",
  slot_penuh: "Slot itu sudah penuh di tanggal tersebut.",
  bukan_peserta: "Murid ini bukan peserta sesi itu.",
  status_tidak_valid: "Status tidak valid.",
};

/** Pesan galat ramah dari kode `raise exception` fungsi database (P0001). Kode tak dikenal = pesan umum, bukan teks mentah. */
export function pesanGalatJadwal(e: { message?: string } | null | undefined, cadangan = "Belum tersimpan. Coba lagi sebentar."): string {
  const m = e?.message ?? "";
  if (PESAN[m]) return PESAN[m]!;
  // Pesan Postgres bisa membungkus kodenya; ambil kode terpanjang yang cocok (mis. "sudah_ada_pengganti" mengalahkan "ada_pengganti").
  const kode = Object.keys(PESAN).filter((k) => m.includes(k)).sort((a, b) => b.length - a.length)[0];
  return kode ? PESAN[kode]! : cadangan;
}

// ---------- Kabar untuk pelatih + info murid (B3c) ----------

export interface BarisKabarDb { id: string; untuk_pengajar_id: string; jenis: string; judul: string; isi: string; dibaca: boolean; dibuat_pada: string }
export const KOLOM_KABAR = "id, untuk_pengajar_id, jenis, judul, isi, dibaca, dibuat_pada";
const JENIS_KABAR: JenisKabar[] = ["ganti_disetujui", "ganti_masuk", "ganti_ditolak", "tukar_disetujui", "tukar_ditolak", "tukar_dibatalkan", "ganti_langsung"];

export function dariBarisKabar(b: BarisKabarDb): KabarPelatih | null {
  if (!JENIS_KABAR.includes(b.jenis as JenisKabar)) return null;
  return { id: b.id, untukPelatihId: b.untuk_pengajar_id, jenis: b.jenis as JenisKabar, judul: b.judul, isi: b.isi, tgl: tanggalJakarta(b.dibuat_pada), dibaca: b.dibaca };
}

export interface MuatanKabar {
  kabar: { kunci: string; untukPelatihId: string; jenis: JenisKabar; judul: string; isi: string }[];
  info: { kunci: string; judul: string; isi: string; untukSlotId: string; sampaiTgl: string | null }[];
}

/** Dari hasil `kabarKeputusan*` (id dibuat dari id kejadian) ke muatan yang dikirim ke server. Id menjadi `kunci` (idempotensi di database). */
export function muatanKabar(h: { kabar: KabarPelatih[]; info: Pemberitahuan[] }): MuatanKabar {
  return {
    kabar: h.kabar.map((x) => ({ kunci: x.id, untukPelatihId: x.untukPelatihId, jenis: x.jenis, judul: x.judul, isi: x.isi })),
    info: h.info.filter((x) => !!x.untukSlotId).map((x) => ({ kunci: x.id, judul: x.judul, isi: x.isi, untukSlotId: x.untukSlotId!, sampaiTgl: x.sampaiTgl ?? null })),
  };
}
