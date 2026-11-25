import { validasiRekening, type Rekening } from "./rekening";

export interface Pengaturan {
  profil: { nama: string; kategori: string; kota: string; deskripsi: string; slug: string; area?: string; noWa?: string };
  tema: "gelap" | "terang";
  istilah: { murid: string; sesi: string; pengajar: string };
  aturan: { batasIzinJam: number; masaBerlakuHari: number; toleransiTelatMenit: number; sesiPengganti: boolean; daftar: string[] };
  rekening: Rekening[];
  templat: { acc: string; tolak: string; pengingat: string };
}

export type Galat = Record<string, string>;

export const KATEGORI = ["Renang", "Yoga", "Pilates", "Gym", "Badminton", "Tenis", "Bela diri", "Musik", "Bimbel", "Tari", "Olahraga", "Lainnya"];

const ISTILAH_KATEGORI: Record<string, Pengaturan["istilah"]> = {
  Renang: { murid: "murid", sesi: "sesi", pengajar: "coach" },
  Yoga: { murid: "peserta", sesi: "kelas", pengajar: "instruktur" },
  Pilates: { murid: "peserta", sesi: "kelas", pengajar: "instruktur" },
  Gym: { murid: "klien", sesi: "sesi", pengajar: "trainer" },
  Badminton: { murid: "murid", sesi: "latihan", pengajar: "pelatih" },
  Tenis: { murid: "murid", sesi: "latihan", pengajar: "pelatih" },
  "Bela diri": { murid: "murid", sesi: "latihan", pengajar: "pelatih" },
  Musik: { murid: "murid", sesi: "les", pengajar: "guru" },
  Bimbel: { murid: "siswa", sesi: "pertemuan", pengajar: "tutor" },
  Tari: { murid: "murid", sesi: "latihan", pengajar: "pelatih" },
};

/** Sebutan bawaan per cabang. Owner tetap bisa mengubahnya satu per satu. */
export function istilahUntuk(kategori: string): Pengaturan["istilah"] {
  return ISTILAH_KATEGORI[kategori] ?? { murid: "murid", sesi: "sesi", pengajar: "pengajar" };
}
export const VARIABEL = ["nama", "usaha", "slot", "total", "tempo"] as const;
const RESERVED = ["app", "u", "api", "admin", "platform", "pengajar", "masuk", "daftar-usaha", "harga", "login", "static"];

export function slugDariNama(nama: string): string {
  return nama
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function validasiSlug(slug: string): string | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return "Hanya huruf kecil, angka, dan tanda hubung.";
  if (slug.length < 3 || slug.length > 40) return "Panjang 3–40 karakter.";
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) return "Tanda hubung tidak boleh di awal, akhir, atau dobel.";
  if (RESERVED.includes(slug)) return "Alamat ini dipakai sistem, pilih yang lain.";
  return null;
}

export function isiTemplate(teks: string, nilai: Record<string, string>): string {
  return teks.replace(/\{(\w+)\}/g, (utuh, k: string) => (k in nilai ? nilai[k]! : utuh));
}

function cekTemplat(teks: string): string | null {
  if (teks.trim().length < 10) return "Terlalu pendek.";
  if (teks.length > 500) return "Maksimal 500 karakter.";
  const semua = teks.match(/\{\w+\}/g) ?? [];
  const asing = semua.map((s) => s.slice(1, -1)).find((k) => !(VARIABEL as readonly string[]).includes(k));
  return asing ? `Variabel {${asing}} tidak dikenal.` : null;
}

export function validasiPengaturan(p: Pengaturan): Galat {
  const g: Galat = {};
  const n = p.profil.nama.trim();
  if (n.length < 3 || n.length > 60) g["profil.nama"] = "Nama 3–60 karakter.";
  if (p.profil.deskripsi.length > 280) g["profil.deskripsi"] = "Maksimal 280 karakter.";
  if (p.profil.kota.length > 40) g["profil.kota"] = "Maksimal 40 karakter.";
  const s = validasiSlug(p.profil.slug);
  if (s) g["profil.slug"] = s;

  for (const k of ["murid", "sesi", "pengajar"] as const) {
    const v = p.istilah[k].trim();
    if (v.length < 2 || v.length > 20) g[`istilah.${k}`] = "2–20 karakter.";
  }

  if (!Number.isInteger(p.aturan.batasIzinJam) || p.aturan.batasIzinJam < 0 || p.aturan.batasIzinJam > 72) g["aturan.batasIzinJam"] = "Isi 0–72 jam.";
  if (!Number.isInteger(p.aturan.masaBerlakuHari) || p.aturan.masaBerlakuHari < 7 || p.aturan.masaBerlakuHari > 120) g["aturan.masaBerlakuHari"] = "Isi 7–120 hari.";
  if (!Number.isInteger(p.aturan.toleransiTelatMenit) || p.aturan.toleransiTelatMenit < 0 || p.aturan.toleransiTelatMenit > 60) g["aturan.toleransiTelatMenit"] = "Isi 0–60 menit.";
  if (p.aturan.daftar.length > 8 || p.aturan.daftar.some((a) => a.length > 120)) g["aturan.daftar"] = "Maksimal 8 aturan, tiap aturan 120 karakter.";

  Object.assign(g, validasiRekening(p.rekening));

  for (const k of ["acc", "tolak", "pengingat"] as const) {
    const e = cekTemplat(p.templat[k]);
    if (e) g[`templat.${k}`] = e;
  }
  return g;
}

export interface AturanSesi { batasIzinJam: number; masaBerlakuHari: number; toleransiTelatMenit: number; sesiPengganti: boolean }

const ANGKA_BAWAAN: AturanSesi = { batasIzinJam: 3, masaBerlakuHari: 35, toleransiTelatMenit: 15, sesiPengganti: true };
const ANGKA_KATEGORI: Record<string, AturanSesi> = {
  Renang: { batasIzinJam: 3, masaBerlakuHari: 35, toleransiTelatMenit: 15, sesiPengganti: true },
  Yoga: { batasIzinJam: 6, masaBerlakuHari: 35, toleransiTelatMenit: 10, sesiPengganti: false },
  Pilates: { batasIzinJam: 6, masaBerlakuHari: 35, toleransiTelatMenit: 10, sesiPengganti: false },
  Gym: { batasIzinJam: 12, masaBerlakuHari: 60, toleransiTelatMenit: 15, sesiPengganti: true },
  Badminton: { batasIzinJam: 6, masaBerlakuHari: 35, toleransiTelatMenit: 15, sesiPengganti: true },
  Tenis: { batasIzinJam: 6, masaBerlakuHari: 35, toleransiTelatMenit: 15, sesiPengganti: true },
  "Bela diri": { batasIzinJam: 3, masaBerlakuHari: 35, toleransiTelatMenit: 15, sesiPengganti: true },
  Musik: { batasIzinJam: 12, masaBerlakuHari: 35, toleransiTelatMenit: 15, sesiPengganti: true },
  Bimbel: { batasIzinJam: 6, masaBerlakuHari: 35, toleransiTelatMenit: 10, sesiPengganti: true },
  Tari: { batasIzinJam: 6, masaBerlakuHari: 35, toleransiTelatMenit: 10, sesiPengganti: true },
};
const SYARAT_KATEGORI: Record<string, string[]> = {
  Renang: ["Wajib membawa topi renang, kacamata, dan handuk sendiri.", "Anak di bawah 7 tahun ditemani orang tua di area kolam."],
  Yoga: ["Bawa matras dan botol minum sendiri.", "Beri tahu instruktur bila sedang cedera atau hamil."],
  Pilates: ["Bawa matras dan botol minum sendiri.", "Beri tahu instruktur bila sedang cedera atau hamil."],
  Gym: ["Pakai sepatu olahraga tertutup dan bawa handuk kecil.", "Beri tahu trainer bila punya riwayat cedera atau kondisi kesehatan khusus."],
  Badminton: ["Bawa raket dan sepatu lapangan sendiri.", "Lakukan pemanasan 10 menit di awal sesi."],
  Tenis: ["Bawa raket dan sepatu lapangan sendiri.", "Lakukan pemanasan 10 menit di awal sesi."],
  "Bela diri": ["Pakai seragam sesuai aturan perguruan.", "Ikuti instruksi pelatih selama latihan demi keselamatan bersama."],
  Musik: ["Bawa alat musik dan buku latihan sendiri.", "Latihan di rumah sesuai tugas dari guru."],
  Bimbel: ["Bawa buku dan alat tulis sendiri.", "Kerjakan tugas dari tutor sebelum pertemuan berikutnya."],
  Tari: ["Pakai pakaian yang nyaman untuk bergerak.", "Bawa botol minum sendiri."],
};

/** Angka aturan bawaan per cabang. Owner tetap bisa mengubahnya. */
export function aturanUntuk(kategori: string): AturanSesi {
  return ANGKA_KATEGORI[kategori] ?? ANGKA_BAWAAN;
}

/** Syarat dan ketentuan disusun dari angka aturan dan sebutan "sesi" milik usaha, jadi tidak pernah bertentangan dengan angkanya. */
export function syaratUntuk(kategori: string, a: AturanSesi, sebutanSesi: string): string[] {
  const s = sebutanSesi.trim() || "sesi";
  const izin = a.batasIzinJam > 0 ? `Izin paling lambat ${a.batasIzinJam} jam sebelum ${s} dimulai, lewat itu ${s} dianggap hadir.` : `Izin bisa diajukan sampai ${s} dimulai.`;
  const telat = a.toleransiTelatMenit > 0 ? `Terlambat lebih dari ${a.toleransiTelatMenit} menit, ${s} tetap berjalan sesuai waktu yang tersisa.` : `Mohon datang tepat waktu, ${s} tidak diperpanjang.`;
  const ganti = a.sesiPengganti ? `${s[0]!.toUpperCase()}${s.slice(1)} yang izin tepat waktu bisa diganti di jadwal lain selama paket masih berlaku.` : `${s[0]!.toUpperCase()}${s.slice(1)} yang izin tidak diganti.`;
  return [...(SYARAT_KATEGORI[kategori] ?? []), izin, telat, ganti, `Sisa ${s} hangus setelah masa berlaku ${a.masaBerlakuHari} hari habis.`, "Pembayaran dilakukan sebelum pendaftaran disetujui: transfer ke rekening usaha lalu kirim bukti bayar."];
}
