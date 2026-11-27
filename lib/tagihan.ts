export type StatusTagihan = "belum" | "menunggu_verifikasi" | "lunas";
export type Metode = "tunai" | "transfer" | "qris";

export interface TagihanOwner {
  id: string;
  nama: string;
  namaOrtu?: string;
  noWa: string;
  email?: string;
  paket: string;
  nominal: number;
  tempo: string; // yyyy-mm-dd
  status: StatusTagihan;
  bukti?: { metode: Metode; diunggah: string; berkas: string };
  dibayar?: { tanggal: string; metode: Metode };
  catatan?: string;
}

export const labelMetode: Record<Metode, string> = { tunai: "Tunai", transfer: "Transfer", qris: "QRIS" };

const HARI = 24 * 60 * 60 * 1000;

export function selisihHari(dari: string, ke: string): number {
  return Math.round((Date.parse(ke) - Date.parse(dari)) / HARI);
}

export function terlambatHari(t: Pick<TagihanOwner, "tempo" | "status">, hariIni: string): number {
  if (t.status === "lunas") return 0;
  return Math.max(0, selisihHari(t.tempo, hariIni));
}

export function ringkasan(daftar: TagihanOwner[], hariIni: string) {
  const belum = daftar.filter((t) => t.status !== "lunas");
  return {
    belumLunasJumlah: belum.length,
    belumLunasNominal: belum.reduce((n, t) => n + t.nominal, 0),
    perluDicek: daftar.filter((t) => t.status === "menunggu_verifikasi").length,
    terlambat: belum.filter((t) => terlambatHari(t, hariIni) > 0).length,
  };
}

export type HasilLunas = { ok: true; tagihan: TagihanOwner } | { ok: false; galat: string };

/** Tagihan hanya bisa dilunasi sekali, dan tanggal bayar tidak boleh di masa depan. */
export function tandaiLunas(t: TagihanOwner, metode: Metode, tanggal: string, hariIni: string): HasilLunas {
  if (t.status === "lunas") return { ok: false, galat: "Tagihan ini sudah lunas." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(tanggal))) return { ok: false, galat: "Isi tanggal bayar." };
  if (tanggal > hariIni) return { ok: false, galat: "Tanggal bayar tidak boleh di masa depan." };
  return { ok: true, tagihan: { ...t, status: "lunas", dibayar: { tanggal, metode }, bukti: undefined, catatan: undefined } };
}

export function tolakBukti(t: TagihanOwner): TagihanOwner {
  if (t.status !== "menunggu_verifikasi") return t;
  return { ...t, status: "belum", bukti: undefined, catatan: "Bukti bayar ditolak, minta kirim ulang." };
}
