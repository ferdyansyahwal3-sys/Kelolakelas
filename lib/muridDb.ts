// Murni: pemetaan baris database murid -> bentuk yang dipakai komponen, hitungan sisa sesi, validasi tambah murid.
import type { MuridContoh, StatusBayar } from "./contoh";
import { tglPendek } from "./format";
import { tanggalJakarta } from "./langgananData";

type Satu<T> = T | T[] | null;
const satu = <T,>(x: Satu<T> | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

export interface BarisMuridDb {
  id: string; nama: string; kategori: string; usia: number | null; nama_ortu: string | null; no_wa: string | null; email?: string | null; aktif: boolean;
  murid_paket: { id: string; paket_id: string; jumlah_sesi: number; mulai: string; berlaku_sampai: string; pengajar: Satu<{ nama: string }> }[] | null;
  tagihan: { id: string; nominal: number; status: string; jatuh_tempo: string | null; dibuat_pada: string }[] | null;
}
export interface BarisSesiDb { murid_id: string; tanggal: string; status: string }
export interface BarisCatatanDb { id: string; teks: string; dibuat_pada: string }

export const KOLOM_MURID = "id, nama, kategori, usia, nama_ortu, no_wa, email, aktif, murid_paket(id, paket_id, jumlah_sesi, mulai, berlaku_sampai, pengajar(nama)), tagihan(id, nominal, status, jatuh_tempo, dibuat_pada)";

/** Paket murid yang sedang berjalan = yang masa berlakunya paling akhir. */
export function paketTerkini<T extends { berlaku_sampai: string; mulai: string }>(daftar: T[] | null | undefined): T | null {
  if (!daftar || daftar.length === 0) return null;
  return [...daftar].sort((a, b) => b.berlaku_sampai.localeCompare(a.berlaku_sampai) || b.mulai.localeCompare(a.mulai))[0]!;
}

/**
 * Sisa sesi DIHITUNG, tidak disimpan: jumlah sesi paket dikurangi sesi hadir dan alpa di dalam masa berlaku paket.
 * Izin tidak memotong (aturan "izin tetap memotong bila sesi pengganti mati" ikut Pengaturan dan belum tersambung).
 */
export function hitungSisa(jumlahSesi: number, mulai: string, sampai: string, sesi: { tanggal: string; status: string }[]): number {
  const terpakai = sesi.filter((s) => (s.status === "hadir" || s.status === "alpa") && s.tanggal >= mulai && s.tanggal <= sampai).length;
  return Math.max(0, jumlahSesi - terpakai);
}

const statusBayar = (t: { status: string }[]): StatusBayar =>
  t.some((x) => x.status === "belum") ? "belum" : t.some((x) => x.status === "menunggu_verifikasi") ? "menunggu_verifikasi" : "lunas";

export function dariBarisMurid(b: BarisMuridDb, sesi: BarisSesiDb[], catatan: BarisCatatanDb[] = []): MuridContoh {
  const mp = paketTerkini(b.murid_paket);
  const sesiMurid = sesi.filter((s) => s.murid_id === b.id);
  const tagihan = (b.tagihan ?? []).filter((t) => t.status !== "batal").sort((a, c) => c.dibuat_pada.localeCompare(a.dibuat_pada));
  const riwayat = sesiMurid
    .filter((s) => s.status === "hadir" || s.status === "izin" || s.status === "alpa")
    .sort((a, c) => c.tanggal.localeCompare(a.tanggal)).slice(0, 12)
    .map((s) => ({ tgl: tglPendek(s.tanggal), status: s.status as "hadir" | "izin" | "alpa" }));
  return {
    id: b.id, nama: b.nama, kategori: b.kategori === "dewasa" ? "dewasa" : "anak",
    usia: b.usia ?? undefined, namaOrtu: b.nama_ortu ?? undefined, noWa: b.no_wa ?? "", email: b.email ?? undefined,
    pengajar: satu(mp?.pengajar)?.nama ?? "–",
    paketId: mp?.paket_id ?? "", totalSesi: mp?.jumlah_sesi ?? 0,
    sisaSesi: mp ? hitungSisa(mp.jumlah_sesi, mp.mulai, mp.berlaku_sampai, sesiMurid) : 0,
    berlakuSampai: mp?.berlaku_sampai ?? "",
    bayar: statusBayar(tagihan), aktif: b.aktif, riwayat,
    tagihan: tagihan.map((t) => ({ id: t.id, nominal: t.nominal, status: (t.status === "lunas" || t.status === "menunggu_verifikasi" ? t.status : "belum") as StatusBayar, tempo: t.jatuh_tempo ?? "" })),
    catatan: catatan.map((c) => ({ tgl: tglPendek(tanggalJakarta(c.dibuat_pada)), teks: c.teks })),
  };
}

// ===== Tambah murid =====
export interface InputMurid { email?: string; nama: string; kategori: "anak" | "dewasa"; usia: number | null; namaOrtu: string; noWa: string; paketId: string; mulai: string; pengajarId: string | null }
export type GalatMurid = Record<string, string>;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Email opsional: kosong boleh, isi harus berbentuk email. */
export const galatEmail = (e: string | undefined): string | null => { const t = (e ?? "").trim(); return t === "" || (t.length <= 130 && EMAIL_OK.test(t)) ? null : "Email belum benar."; };

/** Hanya angka dan awalan +; spasi, strip, dan kurung dibuang. */
export const normalisasiWa = (s: string) => s.replace(/[\s\-().]/g, "");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TGL = /^\d{4}-\d{2}-\d{2}$/;
const hariKe = (iso: string) => Math.round(Date.parse(iso + "T00:00:00Z") / 86_400_000);

export function validasiMurid(i: InputMurid, hariIni: string): GalatMurid {
  const g: GalatMurid = {};
  const nama = i.nama.trim();
  if (nama.length < 2 || nama.length > 60) g.nama = "Nama 2–60 karakter.";
  if (i.kategori !== "anak" && i.kategori !== "dewasa") g.kategori = "Pilih Anak atau Dewasa.";
  if (i.kategori === "anak") {
    if (i.usia === null || !Number.isInteger(i.usia) || i.usia < 1 || i.usia > 17) g.usia = "Usia anak 1–17 tahun.";
    const ortu = i.namaOrtu.trim();
    if (ortu.length < 2 || ortu.length > 60) g.namaOrtu = "Nama orang tua 2–60 karakter.";
  }
  if (!/^\+?[0-9]{8,15}$/.test(normalisasiWa(i.noWa))) g.noWa = "Nomor WhatsApp 8–15 angka.";
  const ge = galatEmail(i.email); if (ge) g.email = ge;
  if (!UUID.test(i.paketId)) g.paketId = "Pilih paket.";
  if (!TGL.test(i.mulai) || Number.isNaN(hariKe(i.mulai))) g.mulai = "Tanggal mulai belum benar.";
  else if (hariKe(i.mulai) < hariKe(hariIni) - 60 || hariKe(i.mulai) > hariKe(hariIni) + 180) g.mulai = "Tanggal mulai maksimal 60 hari lalu atau 180 hari ke depan.";
  if (i.pengajarId !== null && !UUID.test(i.pengajarId)) g.pengajarId = "Pengajar tidak valid.";
  return g;
}

export interface InputEditMurid { email?: string; nama: string; noWa: string; namaOrtu: string; usia: number | null }

/** Edit data murid. Kategori tidak bisa diubah (paketnya terkait kategori); anak wajib usia dan orang tua. */
export function validasiEditMurid(i: InputEditMurid, kategori: "anak" | "dewasa"): GalatMurid {
  const g: GalatMurid = {};
  const nama = i.nama.trim();
  if (nama.length < 2 || nama.length > 60) g.nama = "Nama 2–60 karakter.";
  if (!/^\+?[0-9]{8,15}$/.test(normalisasiWa(i.noWa))) g.noWa = "Nomor WhatsApp 8–15 angka.";
  const ge = galatEmail(i.email); if (ge) g.email = ge;
  if (kategori === "anak") {
    if (i.usia === null || !Number.isInteger(i.usia) || i.usia < 1 || i.usia > 17) g.usia = "Usia anak 1–17 tahun.";
    const ortu = i.namaOrtu.trim();
    if (ortu.length < 2 || ortu.length > 60) g.namaOrtu = "Nama orang tua 2–60 karakter.";
  }
  return g;
}

export function pesanGalatMurid(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("batas_murid")) return "Batas murid aktif di langgananmu sudah penuh. Nonaktifkan murid yang sudah selesai atau naikkan paket langgananmu.";
  if (m.includes("paket_nonaktif")) return "Paket itu sedang nonaktif. Pilih paket lain.";
  if (m.includes("kategori_tidak_cocok")) return "Paket tidak cocok dengan kategori murid (Anak/Dewasa).";
  if (m.includes("pengajar_tidak_valid")) return "Pengajar tidak ditemukan atau nonaktif.";
  if (m.includes("tanggal_mulai_tidak_valid")) return "Tanggal mulai di luar rentang yang boleh.";
  if (m.includes("usia_tidak_valid")) return "Usia anak 1–17 tahun.";
  if (m.includes("murid_nonaktif")) return "Murid nonaktif. Aktifkan dulu sebelum memperpanjang.";
  if (m.includes("sudah_diperpanjang")) return "Paket murid ini baru saja diperpanjang. Tunggu sebentar atau muat ulang halaman.";
  if (m.includes("murid_tidak_ditemukan")) return "Murid tidak ditemukan.";
  if (m.includes("bukan_pemilik") || m.includes("paket_tidak_ditemukan")) return "Paket tidak ditemukan di usahamu.";
  if (m.includes("data_murid_tidak_valid") || e?.code === "23514") return "Isi data murid belum sesuai batas. Periksa lagi.";
  return "Belum bisa menyimpan. Coba lagi sebentar.";
}
