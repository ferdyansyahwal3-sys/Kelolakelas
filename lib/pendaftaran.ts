export interface InputPendaftaran {
  slotId: string;
  tanggal?: string;
  paketId: string;
  kategori: "anak" | "dewasa";
  nama: string;
  usia?: number;
  namaOrtu?: string;
  noWa: string;
  email?: string;
  kodePromo?: string;
  setuju: boolean;
}

export type Galat = Partial<Record<keyof InputPendaftaran, string>>;

export function normalisasiWa(nomor: string): string {
  const angka = nomor.replace(/\D/g, "");
  if (angka.startsWith("62")) return angka;
  if (angka.startsWith("0")) return "62" + angka.slice(1);
  return angka;
}

export function validasiPendaftaran(i: InputPendaftaran): Galat {
  const g: Galat = {};
  if (!i.slotId) g.slotId = "Pilih slot dulu.";
  if (!i.paketId) g.paketId = "Pilih paket.";
  if (i.nama.trim().length < 2) g.nama = "Isi nama.";
  const wa = normalisasiWa(i.noWa);
  if (!/^62\d{8,13}$/.test(wa)) g.noWa = "Nomor WhatsApp belum benar.";
  if (i.kategori === "anak") {
    if (!i.usia || i.usia < 2 || i.usia > 17) g.usia = "Isi usia anak (2–17).";
    if ((i.namaOrtu ?? "").trim().length < 2) g.namaOrtu = "Isi nama orang tua.";
  }
  const em = (i.email ?? "").trim();
  if (em !== "" && (em.length > 130 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))) g.email = "Email belum benar.";
  if (!i.setuju) g.setuju = "Centang persetujuan aturan.";
  return g;
}

const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function buatKode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => HURUF[b % HURUF.length]).join("");
}
