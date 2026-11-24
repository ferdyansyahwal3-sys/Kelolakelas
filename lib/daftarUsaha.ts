// Logika murni untuk /daftar-usaha dan /masuk: validasi, pencarian kota, payload ke database, tujuan setelah masuk.
// Tidak menyentuh jaringan. Validasi di sini dicek ULANG oleh fungsi database `daftar_usaha` (jangan percaya browser).
import { KATEGORI, validasiSlug, slugDariNama, istilahUntuk } from "./pengaturan";

export { KATEGORI, slugDariNama };

export const SANDI_MIN = 8;
export const SANDI_MAKS = 72; // batas aman bcrypt di Supabase Auth

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Alamat yang dipakai sistem selain yang ada di lib/pengaturan.ts. Daftar yang sama dijaga di SQL (0006). */
const RESERVED_TAMBAHAN = ["daftar", "syarat", "privasi", "undang", "support", "bantuan", "kelolakelas", "www", "auth", "_next"];

export function validasiAlamat(slug: string): string | null {
  const dasar = validasiSlug(slug);
  if (dasar) return dasar;
  if (RESERVED_TAMBAHAN.includes(slug)) return "Alamat ini dipakai sistem, pilih yang lain.";
  return null;
}

export interface AkunMasukan { nama: string; email: string; sandi: string }
export type Galat = Record<string, string>;

export function validasiAkun(a: AkunMasukan): Galat {
  const g: Galat = {};
  const nama = a.nama.trim();
  if (nama.length < 2 || nama.length > 60) g.nama = "Nama 2–60 karakter.";
  const email = a.email.trim();
  if (!EMAIL.test(email) || email.length > 120) g.email = "Email belum benar.";
  if (a.sandi.length < SANDI_MIN) g.sandi = `Kata sandi minimal ${SANDI_MIN} karakter.`;
  else if (a.sandi.length > SANDI_MAKS) g.sandi = `Kata sandi maksimal ${SANDI_MAKS} karakter.`;
  else if (/^(.)\1+$/.test(a.sandi)) g.sandi = "Kata sandi terlalu mudah ditebak.";
  else if (email && a.sandi.toLowerCase() === email.toLowerCase()) g.sandi = "Kata sandi tidak boleh sama dengan email.";
  return g;
}

export interface UsahaMasukan { nama: string; kategori: string; /** nama bebas, hanya dipakai bila kategori = "Lainnya" */ kategoriLain: string; kota: string; slug: string }

const NAMA_BEBAS = /^[A-Za-z0-9\u00C0-\u024F &'.,()\/\-]+$/;
export const KATEGORI_LAIN_MIN = 3;
export const KATEGORI_LAIN_MAKS = 30;

export function validasiUsaha(u: UsahaMasukan): Galat {
  const g: Galat = {};
  const nama = u.nama.trim();
  if (nama.length < 3 || nama.length > 60) g.nama = "Nama usaha 3–60 karakter.";
  if (!KATEGORI.includes(u.kategori)) g.kategori = "Pilih salah satu jenis kelas.";
  else if (u.kategori === "Lainnya") {
    const lain = u.kategoriLain.trim();
    if (lain.length < KATEGORI_LAIN_MIN || lain.length > KATEGORI_LAIN_MAKS) g.kategoriLain = `Tulis jenis kelasmu (${KATEGORI_LAIN_MIN}–${KATEGORI_LAIN_MAKS} karakter).`;
    else if (!NAMA_BEBAS.test(lain)) g.kategoriLain = "Pakai huruf, angka, dan tanda baca biasa saja.";
  }
  const kota = u.kota.trim();
  if (kota && (kota.length < 2 || kota.length > 60 || !NAMA_BEBAS.test(kota))) g.kota = "Pilih kota dari daftar, atau tulis namanya (2–60 karakter).";
  const s = validasiAlamat(u.slug);
  if (s) g.slug = s;
  return g;
}

// ===== Pencarian kota (514 kabupaten/kota, lib/kotaIndonesia.ts) =====
import { DAFTAR_KOTA } from "./kotaIndonesia";

export interface HasilKota { nama: string; provinsi: string }

/** Huruf kecil, tanpa aksen, selain huruf/angka jadi spasi, spasi ganda dirapatkan. */
export const normalKata = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tanpaAwalan = (n: string) => n.replace(/^(kabupaten|kota administrasi|kota) /, "");

const INDEKS = DAFTAR_KOTA.map(([nama, provinsi]) => ({ nama, provinsi, n: normalKata(nama), inti: tanpaAwalan(normalKata(nama)), prov: normalKata(provinsi), kota: normalKata(nama).startsWith("kota ") }));

/** Kota yang paling sering dipakai, ditampilkan sebelum pengguna mengetik. Hanya yang ada di daftar resmi. */
const POPULER = ["Kota Administrasi Jakarta Selatan", "Kota Bandung", "Kota Surabaya", "Kota Medan", "Kota Bekasi", "Kota Tangerang", "Kota Depok", "Kota Semarang", "Kota Makassar", "Kota Palembang", "Kota Denpasar", "Kota Yogyakarta"];
export const kotaPopuler = (): HasilKota[] => POPULER.map((n) => INDEKS.find((k) => k.nama === n)).filter((k): k is NonNullable<typeof k> => !!k).map(({ nama, provinsi }) => ({ nama, provinsi }));

/**
 * Setiap kata yang diketik harus menjadi awalan salah satu kata di nama atau provinsi.
 * Urutan: inti nama diawali kueri → kata di nama → hanya cocok di provinsi; lalu "Kota" sebelum "Kabupaten", lalu abjad.
 */
export function cariKota(kueri: string, batas = 8): HasilKota[] {
  const q = normalKata(kueri);
  if (!q) return [];
  const kata = q.split(" ");
  const hasil: { skor: number; k: (typeof INDEKS)[number] }[] = [];
  for (const k of INDEKS) {
    const katNama = k.n.split(" ");
    const katProv = k.prov.split(" ");
    let dalamNama = 0, dalamProv = 0, ok = true;
    for (const t of kata) {
      if (katNama.some((w) => w.startsWith(t))) dalamNama++;
      else if (katProv.some((w) => w.startsWith(t))) dalamProv++;
      else { ok = false; break; }
    }
    if (!ok) continue;
    const skor = k.inti.startsWith(q) ? 0 : dalamProv === 0 ? 1 : 2;
    hasil.push({ skor, k });
  }
  hasil.sort((a, b) => a.skor - b.skor || Number(b.k.kota) - Number(a.k.kota) || a.k.nama.localeCompare(b.k.nama, "id"));
  return hasil.slice(0, batas).map(({ k }) => ({ nama: k.nama, provinsi: k.provinsi }));
}

export const kotaResmi = (nama: string) => DAFTAR_KOTA.some(([n]) => n === nama);

// ===== Jenis usaha (keputusan Ferdy 2026-11-23). Sumber angka: lib/paketLangganan.ts (milik sesi Harga/Landing). =====
import { JENIS as INFO_JENIS, adalahJenis, adalahPlan, jenisDariPlan, planAwal, type Jenis, type PlanKey } from "./paketLangganan";
export { adalahJenis, INFO_JENIS, type Jenis };
export const DAFTAR_JENIS: Jenis[] = ["guru_les", "agensi"];
/** Trial 7 hari mulai di paket terendah jenisnya. Fungsi SQL daftar_usaha (0007/0008) memakai angka yang sama; diuji. */
export const PLAN_AWAL: Record<Jenis, string> = { guru_les: planAwal("guru_les"), agensi: planAwal("agensi") };

// ===== Jalur B: dari /checkout (bayar sekarang) =====
export type Periode = "bulanan" | "tahunan";
export const adalahPeriode = (x: unknown): x is Periode => x === "bulanan" || x === "tahunan";
export interface JalurBayar { jenis: Jenis; plan: PlanKey; periode: Periode }

/**
 * Jalur B = ?bayar=1 dengan paket yang valid. Paket menentukan jenis (jenis di query yang beda diabaikan);
 * periode tak valid = bulanan. Apa pun yang kurang/tak valid = null = jalur A (trial, tanpa bayar), tidak pernah galat.
 */
export function bacaJalurBayar(q: { bayar?: unknown; paket?: unknown; periode?: unknown }): JalurBayar | null {
  if (q.bayar !== "1" || !adalahPlan(q.paket)) return null;
  return { jenis: jenisDariPlan(q.paket), plan: q.paket, periode: adalahPeriode(q.periode) ? q.periode : "bulanan" };
}

/** Halaman bayar setelah usaha dibuat. Parameter dibaca ulang dan divalidasi di sana. */
export const tujuanBayar = (j: { plan: PlanKey; periode: Periode }) => `/app/langganan/checkout?paket=${j.plan}&periode=${j.periode}`;

/** Payload JSON untuk fungsi database `daftar_usaha`. Paket dan jadwal TIDAK dibuat saat daftar: pemilik membuatnya sendiri dari dashboard. */
export function bangunPayload(akun: Pick<AkunMasukan, "nama">, u: UsahaMasukan, jenis: Jenis, tema: "gelap" | "terang") {
  return {
    p_nama: u.nama.trim(),
    p_jenis: jenis,
    p_slug: u.slug,
    p_kategori: u.kategori,
    p_kategori_lain: u.kategori === "Lainnya" ? u.kategoriLain.trim() : null,
    p_kota: u.kota.trim(),
    p_tema: tema,
    p_nama_pemilik: akun.nama.trim(),
    p_istilah: istilahUntuk(u.kategori),
  };
}

// ===== Setelah masuk =====
export type PeranPengguna = "owner" | "pengajar";

const AWALAN_PERAN: Record<PeranPengguna, string[]> = { owner: ["/app"], pengajar: ["/pengajar"] };

/** Hanya jalur dalam situs. Menolak //host, /\host, skema, karakter kontrol: cegah open redirect lewat ?lanjut=. */
export function lanjutAman(lanjut: string | null | undefined): string | null {
  if (!lanjut || lanjut.length > 200) return null;
  if (!lanjut.startsWith("/") || lanjut.startsWith("//") || lanjut.includes("\\") || /[\u0000-\u001f\u007f]/.test(lanjut)) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(lanjut)) return null;
  return lanjut;
}

/** Owner → /app, pelatih → /pengajar, tanpa peran → /daftar-usaha. Tautan ?lanjut hanya dipakai bila sesuai peran. */
export function tujuanSetelahMasuk(peran: PeranPengguna[], lanjut?: string | null): string {
  const aman = lanjutAman(lanjut);
  if (aman) {
    const path = aman.split(/[?#]/)[0]!;
    for (const r of peran) if (AWALAN_PERAN[r].some((a) => path === a || path.startsWith(a + "/"))) return aman;
  }
  if (peran.includes("owner")) return "/app";
  if (peran.includes("pengajar")) return "/pengajar";
  return "/daftar-usaha";
}

/** Pesan galat umum untuk login: sama untuk email tak dikenal dan sandi salah (cegah menebak akun). */
export const PESAN_MASUK_GAGAL = "Email atau kata sandi salah.";

export function pesanGalatAuth(kode: string | undefined, status?: number): string {
  if (status === 429 || kode === "over_request_rate_limit" || kode === "over_email_send_rate_limit") return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (kode === "user_already_exists" || kode === "email_exists") return "Email ini sudah terdaftar. Coba masuk, atau pakai email lain.";
  if (kode === "email_provider_disabled" || kode === "signup_disabled") return "Pendaftaran belum dibuka. Coba lagi nanti.";
  if (kode === "email_address_invalid") return "Alamat email ini tidak diterima. Pakai email aktif milikmu.";
  if (kode === "weak_password") return "Kata sandi terlalu lemah. Pakai kombinasi yang lebih panjang.";
  if (kode === "email_not_confirmed") return "Email belum diverifikasi. Cek kotak masuk kamu.";
  if (kode === "invalid_credentials") return PESAN_MASUK_GAGAL;
  return "Terjadi gangguan. Coba lagi sebentar.";
}
