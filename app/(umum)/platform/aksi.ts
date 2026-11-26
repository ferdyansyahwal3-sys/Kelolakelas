"use server";
import { redirect } from "next/navigation";
import { klienServer } from "@/lib/supabase/server";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { adminSaatIni, muatDataPlatform, type DataPlatform } from "@/lib/supabase/platformData";
import { ALASAN_LIHAT_MIN, CATATAN_USAHA_MAKS, validasiPromo, type GalatPromo, type InputPromo } from "@/lib/platform";

/** Semua aksi: wajib admin platform (dicek ulang di server DAN di fungsi database). Memakai sesi admin + RLS, bukan service role. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GALAT_UMUM = "Gagal menyimpan. Coba lagi.";

export type HasilMasukAdmin = { ok: true } | { ok: false; pesan: string };

export async function masukAdmin(email: string, sandi: string): Promise<HasilMasukAdmin> {
  const gagal = { ok: false as const, pesan: "Email atau kata sandi salah, atau akun ini bukan admin." };
  if (!(await bolehLanjut("masukAdmin"))) return { ok: false, pesan: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  const alamat = String(email ?? "").trim();
  if (!EMAIL.test(alamat) || alamat.length > 120 || typeof sandi !== "string" || sandi.length < 1 || sandi.length > 72) return gagal;
  const db = klienServer();
  const { error } = await db.auth.signInWithPassword({ email: alamat, password: sandi });
  if (error) return gagal;
  return (await adminSaatIni()) ? { ok: true } : gagal; // pesan sama: tidak membocorkan siapa yang admin
}

export async function keluarAdmin() {
  await klienServer().auth.signOut();
  redirect("/platform/masuk");
}

type Hasil = { ok: true; pesan: string; data: DataPlatform } | { ok: false; galat: string };
async function dalamAdmin<T>(fn: (a: NonNullable<Awaited<ReturnType<typeof adminSaatIni>>>) => Promise<T>): Promise<T | { ok: false; galat: string }> {
  const a = await adminSaatIni();
  if (!a) return { ok: false, galat: "Sesi admin habis. Masuk lagi." };
  try { return await fn(a); } catch { return { ok: false, galat: GALAT_UMUM }; }
}
const pesanDb = (m: string | undefined) => (m && !/^(ditolak|permission|new row|duplicate|violates)/i.test(m) ? m : GALAT_UMUM);

export async function aktivasiAksi(tagihanId: string, input: { tanggal: string; referensi: string; alasan: string }): Promise<{ ok: true; pesan: string; data: DataPlatform } | { ok: false; galat: { umum: string } }> {
  const h = await dalamAdmin(async ({ db }) => {
    const { data: r, error } = await db.rpc("platform_aktivasi", { p_tagihan: tagihanId, p_tanggal: input.tanggal, p_referensi: input.referensi, p_alasan: input.alasan });
    if (error) return { ok: false as const, galat: pesanDb(error.message) };
    const j = r as { periodeBerakhir: string; usaha: string; orderId: string };
    return { ok: true as const, pesan: `${j.orderId} lunas. ${j.usaha} aktif sampai ${j.periodeBerakhir}.`, data: await muatDataPlatform(db) };
  });
  return h.ok ? h : { ok: false, galat: { umum: h.galat } };
}

export async function lihatAksi(usahaId: string, alasan: string): Promise<Hasil> {
  if (alasan.trim().length < ALASAN_LIHAT_MIN) return { ok: false, galat: `Alasan minimal ${ALASAN_LIHAT_MIN} huruf.` };
  return dalamAdmin(async ({ db }) => {
    const { error } = await db.rpc("platform_lihat", { p_tenant: usahaId, p_alasan: alasan });
    if (error) return { ok: false as const, galat: pesanDb(error.message) };
    return { ok: true as const, pesan: "Mode lihat dibuka dan tercatat di audit log.", data: await muatDataPlatform(db) };
  });
}

export async function catatanAksi(usahaId: string, teks: string): Promise<Hasil> {
  if (teks.length > CATATAN_USAHA_MAKS) return { ok: false, galat: `Catatan maksimal ${CATATAN_USAHA_MAKS} karakter.` };
  return dalamAdmin(async ({ db }) => {
    const { error } = await db.rpc("platform_catatan", { p_tenant: usahaId, p_teks: teks });
    if (error) return { ok: false as const, galat: pesanDb(error.message) };
    return { ok: true as const, pesan: "Catatan disimpan.", data: await muatDataPlatform(db) };
  });
}

export async function pengingatAksi(usahaId: string, orderId: string, kanal: "wa" | "email"): Promise<void> {
  const a = await adminSaatIni();
  if (!a) return;
  await a.db.rpc("platform_catat_audit", { p_aksi: "kirim_pengingat", p_tenant: usahaId, p_ringkas: `Pengingat ${kanal === "wa" ? "WA" : "email"} untuk ${orderId}` });
}

export async function buatPromoAksi(i: InputPromo): Promise<{ ok: true; data: DataPlatform } | { ok: false; galat: GalatPromo }> {
  const a = await adminSaatIni();
  if (!a) return { ok: false, galat: { kode: "Sesi admin habis. Masuk lagi." } };
  try {
    const sekarang = await muatDataPlatform(a.db);
    const g = validasiPromo(i, sekarang.promo, sekarang.hari);
    if (Object.keys(g).length > 0) return { ok: false, galat: g };
    const kode = i.kode.trim().toUpperCase();
    const { error } = await a.db.from("platform_promo_codes").insert({ kode, jenis: i.jenis, nilai: i.nilai, kuota: i.kuota, kedaluwarsa: i.kedaluwarsa, berlaku_bulan: i.berlakuBulan });
    if (error) return { ok: false, galat: { kode: error.code === "23505" ? "Kode ini sudah ada." : GALAT_UMUM } };
    await a.db.rpc("platform_catat_audit", { p_aksi: "buat_promo", p_tenant: null, p_ringkas: `Promo ${kode} dibuat` });
    return { ok: true, data: await muatDataPlatform(a.db) };
  } catch { return { ok: false, galat: { kode: GALAT_UMUM } }; }
}

export async function alihPromoAksi(id: string): Promise<Hasil> {
  return dalamAdmin(async ({ db }) => {
    const { data: p } = await db.from("platform_promo_codes").select("kode, aktif").eq("id", id).maybeSingle();
    if (!p) return { ok: false as const, galat: "Promo tidak ditemukan." };
    const { error } = await db.from("platform_promo_codes").update({ aktif: !p.aktif }).eq("id", id);
    if (error) return { ok: false as const, galat: GALAT_UMUM };
    await db.rpc("platform_catat_audit", { p_aksi: "ubah_promo", p_tenant: null, p_ringkas: `Promo ${p.kode} ${p.aktif ? "dinonaktifkan" : "diaktifkan"}` });
    return { ok: true as const, pesan: `${p.kode} ${p.aktif ? "dinonaktifkan" : "diaktifkan"}.`, data: await muatDataPlatform(db) };
  });
}

export async function hapusPromoAksi(id: string): Promise<Hasil> {
  return dalamAdmin(async ({ db }) => {
    const { data: p } = await db.from("platform_promo_codes").select("kode, used_count").eq("id", id).maybeSingle();
    if (!p) return { ok: false as const, galat: "Promo tidak ditemukan." };
    if (p.used_count > 0) return { ok: false as const, galat: "Promo yang sudah dipakai tidak bisa dihapus. Nonaktifkan saja." };
    const { error } = await db.from("platform_promo_codes").delete().eq("id", id);
    if (error) return { ok: false as const, galat: GALAT_UMUM };
    await db.rpc("platform_catat_audit", { p_aksi: "hapus_promo", p_tenant: null, p_ringkas: `Promo ${p.kode} dihapus` });
    return { ok: true as const, pesan: `${p.kode} dihapus.`, data: await muatDataPlatform(db) };
  });
}
