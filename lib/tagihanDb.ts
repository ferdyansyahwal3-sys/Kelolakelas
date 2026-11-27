// Murni: pemetaan baris tabel `tagihan` ke tipe tampilan + data Rekap, dan pesan galat database.
import { tanggalJakarta } from "./langgananData";
import type { Pembayaran } from "./rekap";
import type { Metode, StatusTagihan, TagihanOwner } from "./tagihan";

type Satu<T> = T | T[] | null;
export interface BarisTagihanDb {
  id: string;
  nominal: number;
  status: string;
  jatuh_tempo: string | null;
  metode: string | null;
  catatan: string | null;
  bukti_url: string | null;
  dibayar_pada: string | null;
  dibuat_pada: string;
  murid_id: string;
  paket_id: string | null;
  murid: Satu<{ nama: string; nama_ortu: string | null; no_wa: string | null; email?: string | null }>;
  paket: Satu<{ nama: string }>;
}

export const KOLOM_TAGIHAN = "id, nominal, status, jatuh_tempo, metode, catatan, bukti_url, dibayar_pada, dibuat_pada, murid_id, paket_id, murid(nama, nama_ortu, no_wa, email), paket(nama)";
const satu = <T,>(x: Satu<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const METODE: Metode[] = ["tunai", "transfer", "qris"];
const STATUS: StatusTagihan[] = ["belum", "menunggu_verifikasi", "lunas"];

/** Baris berstatus lain (mis. 'batal') dan baris tanpa murid dibuang (null). */
export function dariBarisTagihan(b: BarisTagihanDb): TagihanOwner | null {
  if (!STATUS.includes(b.status as StatusTagihan)) return null;
  const m = satu(b.murid);
  if (!m) return null;
  const status = b.status as StatusTagihan;
  const metode = METODE.includes(b.metode as Metode) ? (b.metode as Metode) : "tunai";
  return {
    id: b.id,
    nama: m.nama,
    namaOrtu: m.nama_ortu ?? undefined,
    noWa: m.no_wa ?? "",
    email: m.email ?? undefined,
    paket: satu(b.paket)?.nama ?? "Paket dihapus",
    nominal: b.nominal,
    tempo: b.jatuh_tempo ?? tanggalJakarta(b.dibuat_pada),
    status,
    dibayar: status === "lunas" && b.dibayar_pada ? { tanggal: tanggalJakarta(b.dibayar_pada), metode } : undefined,
    catatan: status === "belum" && b.catatan ? b.catatan : undefined,
    bukti: status === "menunggu_verifikasi" && b.bukti_url ? { metode: METODE.includes(b.metode as Metode) ? (b.metode as Metode) : "transfer", diunggah: tanggalJakarta(b.dibuat_pada), berkas: b.bukti_url.split("/").pop() ?? "bukti" } : undefined,
  };
}

export interface PaketMurid { murid_id: string; paket_id: string; pengajar_id: string | null; dibuat_pada: string }

/** Pembayaran (tagihan LUNAS) untuk Rekap. Pelatih = pelatih paket murid itu saat tagihan dibuat; tanpa itu jatuh ke `pelatihCadangan`. */
export function pembayaranDariTagihan(baris: BarisTagihanDb[], paketMurid: PaketMurid[], pelatihCadangan: string): Pembayaran[] {
  const hasil: Pembayaran[] = [];
  for (const b of baris) {
    if (b.status !== "lunas" || !b.dibayar_pada) continue;
    const m = satu(b.murid);
    if (!m) continue;
    const cocok = paketMurid
      .filter((x) => x.murid_id === b.murid_id && x.paket_id === b.paket_id && x.dibuat_pada <= b.dibuat_pada)
      .sort((x, y) => y.dibuat_pada.localeCompare(x.dibuat_pada))[0];
    hasil.push({ id: b.id, tgl: tanggalJakarta(b.dibayar_pada), nama: m.nama, paket: satu(b.paket)?.nama ?? "Paket dihapus", nominal: b.nominal, pengajarId: cocok?.pengajar_id ?? pelatihCadangan });
  }
  return hasil.sort((x, y) => y.tgl.localeCompare(x.tgl));
}

export function pesanGalatTagihan(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("sudah_selesai")) return "Tagihan ini sudah selesai diproses. Muat ulang halaman.";
  if (m.includes("tanggal_tidak_valid")) return "Tanggal bayar tidak valid (tidak boleh di masa depan atau terlalu lampau).";
  if (m.includes("metode_tidak_valid")) return "Pilih cara bayar: tunai, transfer, atau QRIS.";
  if (m.includes("tagihan_tidak_ditemukan")) return "Tagihan tidak ditemukan.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa mengubah tagihan.";
  return "Gagal menyimpan. Coba lagi sebentar.";
}

/** Pengaturan bagi hasil & gaji yang tersimpan di `tenants.pengaturan`; bentuk yang rusak dibuang, bukan ditebak. */
export function bacaBagiHasil(p: unknown): { mode: "persen" | "nominal"; persen: Record<string, number>; nominal: Record<string, number> } {
  const o = (p && typeof p === "object" ? p : {}) as { mode?: unknown; persen?: unknown; nominal?: unknown };
  const angka = (x: unknown): Record<string, number> => {
    const r: Record<string, number> = {};
    if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, v] of Object.entries(x as Record<string, unknown>)) if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100_000_000) r[k] = v;
    return r;
  };
  return { mode: o.mode === "nominal" ? "nominal" : "persen", persen: angka(o.persen), nominal: angka(o.nominal) };
}

export function bacaGajiDibayar(p: unknown): Record<string, string> {
  const r: Record<string, string> = {};
  if (p && typeof p === "object" && !Array.isArray(p)) for (const [k, v] of Object.entries(p as Record<string, unknown>)) if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) r[k] = v;
  return r;
}
