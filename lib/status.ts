import { normalisasiWa } from "./pendaftaran";

export type StatusDaftar = "menunggu" | "disetujui" | "ditolak";
export interface CatatanDaftar { kode: string; nama: string; noWa: string; slotLabel: string; status: StatusDaftar }

/** Hanya nama depan + inisial, supaya orang yang menebak nomor WA tidak melihat data lengkap pendaftar lain. */
export function namaSamar(nama: string): string {
  const [depan, ...sisa] = nama.trim().split(/\s+/);
  if (!depan) return "";
  return sisa.length > 0 ? `${depan} ${sisa[0]![0]!.toUpperCase()}.` : depan;
}

export type Pencarian = { jenis: "kode"; nilai: string } | { jenis: "wa"; nilai: string } | { jenis: "salah" };

export function bacaPencarian(teks: string): Pencarian {
  const t = teks.trim();
  if (/^[A-Za-z0-9]{6}$/.test(t) && /[A-Za-z]/.test(t)) return { jenis: "kode", nilai: t.toUpperCase() };
  const wa = normalisasiWa(t);
  if (/^62\d{8,13}$/.test(wa)) return { jenis: "wa", nilai: wa };
  return { jenis: "salah" };
}

export function cariPendaftaran(daftar: CatatanDaftar[], q: Pencarian): CatatanDaftar | null {
  if (q.jenis === "salah") return null;
  if (q.jenis === "kode") return daftar.find((d) => d.kode.toUpperCase() === q.nilai) ?? null;
  const cocok = daftar.filter((d) => normalisasiWa(d.noWa) === q.nilai);
  return cocok.length > 0 ? cocok[cocok.length - 1]! : null; // pendaftaran terbaru bila nomor sama
}

export const infoStatus: Record<StatusDaftar, { judul: string; pesan: string }> = {
  menunggu: { judul: "Menunggu ACC", pesan: "Pemilik akan memeriksa pendaftaran dan bukti bayarmu, lalu menghubungi lewat WhatsApp." },
  disetujui: { judul: "Disetujui", pesan: "Pendaftaranmu diterima dan pembayaran sudah dikonfirmasi. Link pribadi dikirim lewat WhatsApp." },
  ditolak: { judul: "Belum bisa diterima", pesan: "Slot yang kamu pilih belum bisa diterima. Silakan pilih slot lain lewat halaman slot." },
};
