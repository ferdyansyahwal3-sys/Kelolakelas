"use server";
import { pendaftaranContoh } from "@/lib/contoh";
import { bacaPencarian, cariPendaftaran, namaSamar, type StatusDaftar } from "@/lib/status";

export type HasilStatus =
  | { ok: true; nama: string; slot: string; status: StatusDaftar }
  | { ok: false; pesan: string };

// Pencarian dilakukan di server: browser tidak pernah menerima daftar pendaftar, hanya satu hasil dengan nama disamarkan.
// Saat database ada, tambahkan pembatasan jumlah percobaan per alamat IP.
export async function cariStatus(teks: string): Promise<HasilStatus> {
  const q = bacaPencarian(teks);
  if (q.jenis === "salah") return { ok: false, pesan: "Isi kode pendaftaran (6 karakter) atau nomor WhatsApp yang dipakai mendaftar." };
  const d = cariPendaftaran(pendaftaranContoh.map((p) => ({ kode: p.kode, nama: p.nama, noWa: p.noWa, slotLabel: p.slotLabel, status: p.status })), q);
  if (!d) return { ok: false, pesan: "Pendaftaran tidak ditemukan. Cek lagi kode atau nomornya." };
  return { ok: true, nama: namaSamar(d.nama), slot: d.slotLabel, status: d.status };
}
