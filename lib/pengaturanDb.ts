// Murni: bentuk `Pengaturan` (layar) dari baris database, dan pesan galat.
import { aturanUntuk, istilahUntuk, syaratUntuk, type Pengaturan } from "./pengaturan";
import type { Rekening } from "./rekening";

export const TEMPLAT_BAWAAN: Pengaturan["templat"] = {
  acc: "Halo {nama}, pendaftaran kamu di {usaha} untuk {slot} sudah disetujui. Pembayaran {total} sudah kami terima. Terima kasih!",
  tolak: "Halo {nama}, terima kasih sudah mendaftar di {usaha}. Mohon maaf, pendaftaran untuk {slot} belum bisa kami terima. Silakan pilih slot lain di link pendaftaran ya.",
  pengingat: "Halo {nama}, pengingat dari {usaha}: tagihan {total} jatuh tempo {tempo}. Terima kasih!",
};

export interface BarisTenant { nama: string; slug: string; kategori: string; tema: string; istilah: unknown; pengaturan: unknown }
const teks = (v: unknown, maks: number) => (typeof v === "string" ? v.slice(0, maks) : "");
const angka = (v: unknown, def: number, min: number, maks: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= maks ? v : def);

export function dariTenant(t: BarisTenant, rekening: Rekening[]): Pengaturan {
  const p = (t.pengaturan && typeof t.pengaturan === "object" ? t.pengaturan : {}) as { profil?: Record<string, unknown>; aturan?: Record<string, unknown>; templat?: Record<string, unknown> };
  const profil = p.profil ?? {};
  const ist = (t.istilah && typeof t.istilah === "object" ? t.istilah : {}) as Record<string, unknown>;
  const bawaanIst = istilahUntuk(t.kategori);
  const istilah = { murid: teks(ist.murid, 20) || bawaanIst.murid, sesi: teks(ist.sesi, 20) || bawaanIst.sesi, pengajar: teks(ist.pengajar, 20) || bawaanIst.pengajar };
  const a0 = aturanUntuk(t.kategori);
  const a = p.aturan ?? {};
  const aturan = {
    batasIzinJam: angka(a.batasIzinJam, a0.batasIzinJam, 0, 72),
    masaBerlakuHari: angka(a.masaBerlakuHari, a0.masaBerlakuHari, 7, 365),
    toleransiTelatMenit: angka(a.toleransiTelatMenit, a0.toleransiTelatMenit, 0, 60),
    sesiPengganti: typeof a.sesiPengganti === "boolean" ? a.sesiPengganti : a0.sesiPengganti,
    daftar: Array.isArray(a.daftar) && a.daftar.length > 0 && a.daftar.length <= 12 && a.daftar.every((x) => typeof x === "string" && x.length <= 200) ? (a.daftar as string[]) : syaratUntuk(t.kategori, a0, istilah.sesi),
  };
  const tp = p.templat ?? {};
  return {
    profil: { nama: t.nama, kategori: t.kategori, kota: teks(profil.kota, 60), deskripsi: teks(profil.deskripsi, 280), slug: t.slug, area: teks(profil.area, 80), noWa: teks(profil.noWa, 20) },
    tema: t.tema === "terang" ? "terang" : "gelap",
    istilah,
    aturan,
    rekening,
    templat: { acc: teks(tp.acc, 500) || TEMPLAT_BAWAAN.acc, tolak: teks(tp.tolak, 500) || TEMPLAT_BAWAAN.tolak, pengingat: teks(tp.pengingat, 500) || TEMPLAT_BAWAAN.pengingat },
  };
}

export function pesanGalatPengaturan(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("alamat_tidak_tersedia")) return "Alamat link ini sudah dipakai atau tidak tersedia. Pilih yang lain.";
  if (m.includes("batas_rekening")) return "Jumlah rekening melebihi batas paketmu. Naikkan paket di halaman Langganan.";
  if (m.includes("data_tidak_valid")) return "Ada isian yang belum sah. Periksa lagi.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa mengubah pengaturan.";
  return "Pengaturan belum tersimpan. Coba lagi sebentar.";
}
