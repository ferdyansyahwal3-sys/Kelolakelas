export interface Pengaturan {
  profil: { nama: string; kategori: string; kota: string; deskripsi: string; slug: string };
  tema: "gelap" | "terang";
  istilah: { murid: string; sesi: string; pengajar: string };
  aturan: { batasIzinJam: number; masaBerlakuHari: number; daftar: string[] };
  rekening: { bank: string; nomor: string; atasNama: string };
  templat: { acc: string; tolak: string; pengingat: string };
}

export type Galat = Record<string, string>;

export const KATEGORI = ["Renang", "Musik", "Bimbel", "Tari", "Olahraga", "Lainnya"];
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
  if (p.aturan.daftar.length > 8 || p.aturan.daftar.some((a) => a.length > 120)) g["aturan.daftar"] = "Maksimal 8 aturan, tiap aturan 120 karakter.";

  const r = p.rekening;
  const terisi = [r.bank, r.nomor, r.atasNama].filter((x) => x.trim() !== "").length;
  if (terisi > 0 && terisi < 3) g["rekening"] = "Isi bank, nomor, dan atas nama sekaligus, atau kosongkan semuanya.";
  else if (terisi === 3 && !/^\d{6,20}$/.test(r.nomor.replace(/[\s-]/g, ""))) g["rekening.nomor"] = "Nomor rekening 6–20 angka.";

  for (const k of ["acc", "tolak", "pengingat"] as const) {
    const e = cekTemplat(p.templat[k]);
    if (e) g[`templat.${k}`] = e;
  }
  return g;
}
