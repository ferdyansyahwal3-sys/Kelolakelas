// Murni: pemetaan baris `pengajar` ke tipe tampilan + pesan galat undangan.
import type { PengajarOwner } from "./pengajar";

export interface BarisPengajarDb { id: string; nama: string; email: string | null; user_id: string | null; aktif: boolean }
export const KOLOM_PENGAJAR = "id, nama, email, user_id, aktif";

/** aktif = sudah punya akun; menunggu = diundang, belum diterima; nonaktif = dimatikan. Pemilik = akun yang sedang login. */
export function dariBarisPengajar(b: BarisPengajarDb, userIdSaya: string, emailSaya = ""): PengajarOwner {
  const pemilik = b.user_id !== null && b.user_id === userIdSaya;
  return { id: b.id, nama: b.nama, email: pemilik ? emailSaya || b.email || "—" : b.email ?? "—", pemilik, status: !b.aktif ? "nonaktif" : b.user_id === null ? "menunggu" : "aktif" };
}

export function pesanGalatPengajar(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("batas_pelatih")) return "Jumlah pelatih sudah mencapai batas paketmu. Naikkan paket di halaman Langganan.";
  if (m.includes("email_sudah_ada")) return "Email ini sudah terdaftar sebagai pelatih.";
  if (m.includes("pemilik_tidak_bisa_nonaktif")) return "Pemilik tidak bisa dinonaktifkan.";
  if (m.includes("sudah_diterima")) return "Undangan ini sudah diterima, jadi tidak bisa dibatalkan. Nonaktifkan saja pelatihnya.";
  if (m.includes("data_tidak_valid")) return "Nama atau email belum sah.";
  if (m.includes("bukan_pemilik")) return "Hanya pemilik usaha yang bisa mengatur pelatih.";
  return "Gagal menyimpan. Coba lagi sebentar.";
}

export function pesanGalatTerima(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("undangan_tidak_berlaku")) return "Undangan ini tidak berlaku lagi (sudah dipakai atau kedaluwarsa). Minta undangan baru ke pemilik.";
  if (m.includes("email_tidak_cocok")) return "Undangan ini untuk email lain. Masuk dengan email yang diundang.";
  if (m.includes("akun_pemilik")) return "Akun ini sudah menjadi pemilik usaha, jadi tidak bisa menjadi pelatih di usaha lain. Pakai akun lain.";
  return "Undangan belum bisa diterima. Coba lagi sebentar.";
}
