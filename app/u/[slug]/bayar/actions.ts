"use server";
import { pendaftaranContoh, rekeningContoh } from "@/lib/contoh";
import { validasiBerkas } from "@/lib/rekening";
import { bacaPencarian } from "@/lib/status";

export type HasilBukti = { ok: true } | { ok: false; pesan: string };

// Hanya metadata berkas yang diperiksa di sini. Penyimpanan berkas (Supabase Storage) belum tersambung,
// jadi berkas belum benar-benar tersimpan. Saat database ada: simpan berkas privat, tautkan ke pendaftaran, ubah status jadi "sudah bayar".
export async function kirimBukti(input: { kode: string; rekeningId: string; berkas: { nama: string; tipe: string; ukuran: number } }): Promise<HasilBukti> {
  const q = bacaPencarian(input.kode);
  if (q.jenis !== "kode") return { ok: false, pesan: "Kode pendaftaran tidak valid." };
  const salah = validasiBerkas(input.berkas);
  if (salah) return { ok: false, pesan: salah };
  if (input.berkas.nama.length > 120) return { ok: false, pesan: "Nama berkas terlalu panjang." };
  if (!rekeningContoh.some((r) => r.id === input.rekeningId)) return { ok: false, pesan: "Pilih rekening tujuan transfer." };
  void pendaftaranContoh;
  return { ok: true };
}
