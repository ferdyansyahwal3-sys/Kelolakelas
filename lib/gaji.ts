import { bagiHasil, geserBulan, type ModeBagi, type Pembayaran } from "./rekap";

export type StatusGaji = "berjalan" | "sudah_masuk" | "belum_masuk" | "kosong";

export interface RincianGaji {
  bulan: string;
  omzet: number;
  bagian: number;
  status: StatusGaji;
  dibayarTgl: string | null;
  pembayaran: Pembayaran[];
}

export const kunciGaji = (pengajarId: string, bulan: string) => `${pengajarId}|${bulan}`;
export type GajiDibayar = Record<string, string>; // kunci -> tanggal uang masuk (yyyy-mm-dd)

/**
 * Gaji pelatih = bagian dari omzet murid-nya di bulan itu (aturan bagi hasil milik owner).
 * Bulan berjalan hanya perkiraan; bulan lewat "sudah masuk" kalau owner sudah menandai dibayar, selain itu "belum masuk".
 */
export function gajiBulan(pembayaran: Pembayaran[], pengajarId: string, bulan: string, bulanBerjalan: string, nilai: number, mode: ModeBagi, dibayar: GajiDibayar): RincianGaji {
  const { baris } = bagiHasil(pembayaran, bulan, [{ id: pengajarId, nama: "", nilai }], mode);
  const b = baris[0]!;
  const tgl = dibayar[kunciGaji(pengajarId, bulan)] ?? null;
  const status: StatusGaji = bulan >= bulanBerjalan ? "berjalan" : b.bagianPengajar === 0 ? "kosong" : tgl ? "sudah_masuk" : "belum_masuk";
  return { bulan, omzet: b.omzet, bagian: b.bagianPengajar, status, dibayarTgl: status === "sudah_masuk" ? tgl : null, pembayaran: pembayaran.filter((p) => p.pengajarId === pengajarId && p.tgl.startsWith(bulan)).sort((x, y) => y.tgl.localeCompare(x.tgl)) };
}

export function riwayatGaji(pembayaran: Pembayaran[], pengajarId: string, bulanBerjalan: string, nilai: number, mode: ModeBagi, dibayar: GajiDibayar, n = 6): RincianGaji[] {
  return Array.from({ length: n }, (_, i) => gajiBulan(pembayaran, pengajarId, geserBulan(bulanBerjalan, -i), bulanBerjalan, nilai, mode, dibayar));
}

export type HasilTandaiGaji = { ok: true; dibayar: GajiDibayar } | { ok: false; galat: string };

/** Owner menandai gaji sebuah bulan sudah ditransfer. Tidak untuk bulan berjalan, tidak untuk tanggal masa depan atau sebelum bulan itu dimulai. */
export function tandaiGajiDibayar(dibayar: GajiDibayar, pengajarId: string, bulan: string, tanggal: string, hariIni: string, bulanBerjalan: string): HasilTandaiGaji {
  if (bulan >= bulanBerjalan) return { ok: false, galat: "Gaji bulan berjalan baru bisa dibayar setelah bulannya selesai." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(tanggal))) return { ok: false, galat: "Isi tanggal uang masuk." };
  if (tanggal > hariIni) return { ok: false, galat: "Tanggal tidak boleh di masa depan." };
  if (tanggal < `${bulan}-01`) return { ok: false, galat: "Tanggal tidak boleh sebelum bulan gajinya mulai." };
  return { ok: true, dibayar: { ...dibayar, [kunciGaji(pengajarId, bulan)]: tanggal } };
}

export function batalkanGajiDibayar(dibayar: GajiDibayar, pengajarId: string, bulan: string): GajiDibayar {
  const n = { ...dibayar };
  delete n[kunciGaji(pengajarId, bulan)];
  return n;
}

export const labelGaji: Record<StatusGaji, string> = { berjalan: "Berjalan", sudah_masuk: "Sudah masuk", belum_masuk: "Belum masuk", kosong: "Tidak ada" };
