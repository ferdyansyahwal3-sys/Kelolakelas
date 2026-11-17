export interface PromoOwner {
  id: string;
  kode: string;
  jenis: "persen" | "nominal";
  nilai: number;
  kuota: number | null;
  terpakai: number;
  kedaluwarsa: string | null; // yyyy-mm-dd
  aktif: boolean;
  pemilik?: string; // nama murid untuk kode referral
}

export type StatusPromo = "aktif" | "nonaktif" | "kedaluwarsa" | "habis";

/** Urutan prioritas: dimatikan owner > lewat tanggal > kuota habis > aktif. Kedaluwarsa sampai akhir hari tanggalnya. */
export function statusPromo(p: Pick<PromoOwner, "aktif" | "kedaluwarsa" | "kuota" | "terpakai">, hariIni: string): StatusPromo {
  if (!p.aktif) return "nonaktif";
  if (p.kedaluwarsa && p.kedaluwarsa < hariIni) return "kedaluwarsa";
  if (p.kuota !== null && p.terpakai >= p.kuota) return "habis";
  return "aktif";
}

export function ringkasNilai(p: Pick<PromoOwner, "jenis" | "nilai">): string {
  return p.jenis === "persen" ? `${p.nilai}%` : `Rp ${new Intl.NumberFormat("id-ID").format(p.nilai)}`;
}

export interface InputPromo { kode: string; jenis: "persen" | "nominal"; nilai: number; kuota: number | null; kedaluwarsa: string | null }

export function validasiPromo(i: InputPromo, kodeAda: string[], hariIni: string): Record<string, string> {
  const g: Record<string, string> = {};
  const kode = i.kode.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,16}$/.test(kode)) g.kode = "Kode 3–16 huruf atau angka, tanpa spasi.";
  else if (kodeAda.map((k) => k.toUpperCase()).includes(kode)) g.kode = "Kode ini sudah ada.";
  if (!Number.isInteger(i.nilai) || i.nilai < 1) g.nilai = "Isi nilai potongan.";
  else if (i.jenis === "persen" && i.nilai > 100) g.nilai = "Persen maksimal 100.";
  else if (i.jenis === "nominal" && (i.nilai < 1000 || i.nilai > 10_000_000)) g.nilai = "Nominal Rp 1.000–10.000.000.";
  if (i.kuota !== null && (!Number.isInteger(i.kuota) || i.kuota < 1 || i.kuota > 10_000)) g.kuota = "Batas pakai 1–10.000, atau kosongkan.";
  if (i.kedaluwarsa !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(i.kedaluwarsa) || i.kedaluwarsa < hariIni)) g.kedaluwarsa = "Tanggal tidak boleh sebelum hari ini.";
  return g;
}

/** Nama depan (maks 6 huruf) + 2 angka, dicari yang belum dipakai. */
export function kodeReferral(nama: string, kodeAda: string[]): string {
  const depan = (nama.trim().split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
  const dasar = depan.length >= 3 ? depan : (depan + "KLS").slice(0, 3);
  const pakai = new Set(kodeAda.map((k) => k.toUpperCase()));
  for (let n = 10; n <= 99; n++) if (!pakai.has(`${dasar}${n}`)) return `${dasar}${n}`;
  return `${dasar}${Date.now() % 1000}`;
}
