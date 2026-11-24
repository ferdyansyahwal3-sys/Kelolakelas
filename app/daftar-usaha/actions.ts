"use server";
import { klienServer } from "@/lib/supabase/server";
import { ambilPeran } from "@/lib/supabase/peran";
import { supabaseTersambung } from "@/lib/supabase/env";
import { adalahJenis, adalahPeriode, bacaJalurBayar, bangunPayload, tujuanBayar, pesanGalatAuth, tujuanSetelahMasuk, validasiAkun, validasiAlamat, validasiUsaha, type Galat } from "@/lib/daftarUsaha";

export type HasilAkun = { ok: true } | { ok: false; galat: Galat; pesan?: string };

/** Langkah 1: buat akun (Supabase Auth). Validasi diulang di server. */
export async function buatAkun(nama: string, email: string, sandi: string): Promise<HasilAkun> {
  if (!supabaseTersambung()) return { ok: false, galat: {}, pesan: "Layanan belum dikonfigurasi." };
  const masukan = { nama: String(nama ?? ""), email: String(email ?? ""), sandi: String(sandi ?? "") };
  const galat = validasiAkun(masukan);
  if (Object.keys(galat).length > 0) return { ok: false, galat };
  const db = klienServer();
  const { data, error } = await db.auth.signUp({ email: masukan.email.trim(), password: masukan.sandi, options: { data: { nama: masukan.nama.trim() } } });
  if (error) return { ok: false, galat: {}, pesan: pesanGalatAuth(error.code, error.status) };
  // Tanpa sesi = verifikasi email masih menyala di Supabase (kita minta dimatikan sampai Resend siap).
  if (!data.session) return { ok: false, galat: {}, pesan: "Akun dibuat, tapi email harus diverifikasi dulu. Cek kotak masuk lalu masuk lewat halaman Masuk." };
  return { ok: true };
}

/** Pemeriksaan alamat link secara langsung saat mengetik. Hanya untuk pengguna yang sudah masuk. */
export async function cekAlamat(slug: string): Promise<{ ok: boolean; pesan: string }> {
  const s = String(slug ?? "").trim().toLowerCase();
  const lokal = validasiAlamat(s);
  if (lokal) return { ok: false, pesan: lokal };
  if (!supabaseTersambung()) return { ok: false, pesan: "Layanan belum dikonfigurasi." };
  const { data, error } = await klienServer().rpc("alamat_tersedia", { p_slug: s });
  if (error) return { ok: false, pesan: "Belum bisa memeriksa alamat. Coba lagi." };
  return data ? { ok: true, pesan: "Alamat tersedia." } : { ok: false, pesan: "Alamat ini sudah dipakai, pilih yang lain." };
}

export interface MasukanUsaha {
  jenis: string;
  nama: string; kategori: string; kategoriLain: string; kota: string; slug: string;
  tema: string;
  /** Jalur B (/checkout): paket + periode yang dipilih. Divalidasi ulang di sini. */
  bayar?: { paket: string; periode: string };
}
export type HasilUsaha = { ok: true; ke: string } | { ok: false; galat: Galat; pesan?: string };

const PESAN_DB: Record<string, string> = {
  jenis_tidak_valid: "Pilih jenis usaha: Guru Les atau Agensi.",
  alamat_tidak_tersedia: "Alamat ini sudah dipakai atau tidak boleh dipakai, pilih yang lain.",
  nama_usaha_tidak_valid: "Nama usaha 3–60 karakter.",
  kategori_tidak_valid: "Pilih salah satu jenis kelas.",
  kategori_lain_tidak_valid: "Tulis jenis kelasmu (3–30 karakter).",
};

/** Langkah terakhir: buat usaha lewat fungsi database `daftar_usaha`. Paket dan jadwal dibuat pemilik sendiri nanti. */
export async function buatUsaha(m: MasukanUsaha): Promise<HasilUsaha> {
  if (!supabaseTersambung()) return { ok: false, galat: {}, pesan: "Layanan belum dikonfigurasi." };
  const db = klienServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false, galat: {}, pesan: "Sesi habis. Masuk lagi lalu lanjutkan pendaftaran." };

  if (!adalahJenis(m.jenis)) return { ok: false, galat: {}, pesan: PESAN_DB.jenis_tidak_valid };
  const jenis = m.jenis;
  const usaha = { nama: String(m.nama ?? ""), kategori: String(m.kategori ?? ""), kategoriLain: String(m.kategoriLain ?? ""), kota: String(m.kota ?? ""), slug: String(m.slug ?? "").trim().toLowerCase() };
  const galat = validasiUsaha(usaha);
  if (Object.keys(galat).length > 0) return { ok: false, galat };
  const tema = m.tema === "terang" ? "terang" : "gelap";

  const peranAwal = await ambilPeran(db, auth.user.id);
  if (peranAwal.includes("owner")) return { ok: true, ke: tujuanSetelahMasuk(peranAwal) };

  const namaPemilik = String(auth.user.user_metadata?.nama ?? "").trim() || "Pemilik";
  const { error } = await db.rpc("daftar_usaha", bangunPayload({ nama: namaPemilik }, usaha, jenis, tema));
  if (error) {
    if (error.message.includes("akun_sudah_punya_usaha")) return { ok: true, ke: "/app" };
    const kunci = Object.keys(PESAN_DB).find((k) => error.message.includes(k));
    return { ok: false, galat: kunci === "alamat_tidak_tersedia" ? { slug: PESAN_DB[kunci]! } : {}, pesan: kunci ? PESAN_DB[kunci] : "Usaha belum bisa dibuat. Coba lagi sebentar." };
  }
  // Jalur B: ke halaman bayar bila paket+periode valid DAN cocok dengan jenis usaha yang dipilih. Selain itu ke panel seperti biasa.
  const jalur = m.bayar ? bacaJalurBayar({ bayar: "1", paket: m.bayar.paket, periode: adalahPeriode(m.bayar.periode) ? m.bayar.periode : undefined }) : null;
  return { ok: true, ke: jalur && jalur.jenis === jenis ? tujuanBayar(jalur) : "/app" };
}
