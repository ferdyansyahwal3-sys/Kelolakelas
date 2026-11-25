"use server";
import { hashKode } from "@/lib/hashKode";
import { buatTokenPortal } from "@/lib/portal";
import { klienAdmin } from "@/lib/supabase/server";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta, tanggalJakarta } from "@/lib/langgananData";
import { bolehTambah } from "@/lib/paketLangganan";
import { normalisasiWa, pesanGalatMurid, validasiEditMurid, validasiMurid, type GalatMurid, type InputEditMurid, type InputMurid } from "@/lib/muridDb";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HasilTambah = { ok: true; id: string } | { ok: false; galat: GalatMurid; pesan?: string };
export type HasilUbah = { ok: true; aktif: boolean } | { ok: false; pesan: string };
export type HasilCatatan = { ok: true; tgl: string; teks: string } | { ok: false; pesan: string };

async function muridAktif(db: NonNullable<Awaited<ReturnType<typeof ambilKonteksOwner>>>["db"], tenantId: string, kecuali?: string) {
  let q = db.from("murid").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("aktif", true);
  if (kecuali) q = q.neq("id", kecuali);
  const { count } = await q;
  return count ?? 0;
}

/** Murid baru + paketnya + tagihan pertama dalam satu fungsi database (atomik). Masukan dari browser divalidasi ulang. */
export async function tambahMurid(masukan: InputMurid): Promise<HasilTambah> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, galat: {}, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, galat: {}, pesan: TUTUP };
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : null);
  const i: InputMurid = {
    nama: String(masukan?.nama ?? "").slice(0, 100), kategori: masukan?.kategori === "dewasa" ? "dewasa" : "anak", usia: n(masukan?.usia),
    namaOrtu: String(masukan?.namaOrtu ?? "").slice(0, 100), noWa: normalisasiWa(String(masukan?.noWa ?? "")).slice(0, 30),
    paketId: String(masukan?.paketId ?? ""), mulai: String(masukan?.mulai ?? ""), pengajarId: masukan?.pengajarId ? String(masukan.pengajarId) : null,
  };
  const galat = validasiMurid(i, hariIniJakarta());
  if (Object.keys(galat).length > 0) return { ok: false, galat };
  if (!bolehTambah(k.plan, "murid", await muridAktif(k.db, k.tenant.id))) return { ok: false, galat: {}, pesan: pesanGalatMurid({ message: "batas_murid" }) };

  const { data, error } = await k.db.rpc("tambah_murid", {
    p_nama: i.nama.trim(), p_kategori: i.kategori, p_usia: i.kategori === "anak" ? i.usia : null,
    p_nama_ortu: i.kategori === "anak" ? i.namaOrtu.trim() : null, p_no_wa: i.noWa, p_paket_id: i.paketId, p_mulai: i.mulai, p_pengajar_id: i.pengajarId,
  });
  if (error) return { ok: false, galat: {}, pesan: pesanGalatMurid(error) };
  return { ok: true, id: String(data) };
}

export async function ubahAktifMurid(id: string, aktif: boolean): Promise<HasilUbah> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Murid tidak ditemukan." };
  if (aktif === true && !bolehTambah(k.plan, "murid", await muridAktif(k.db, k.tenant.id, id))) return { ok: false, pesan: pesanGalatMurid({ message: "batas_murid" }) };
  const { data, error } = await k.db.from("murid").update({ aktif: aktif === true }).eq("id", id).eq("tenant_id", k.tenant.id).select("aktif").maybeSingle();
  if (error) return { ok: false, pesan: pesanGalatMurid(error) };
  return data ? { ok: true, aktif: data.aktif as boolean } : { ok: false, pesan: "Murid tidak ditemukan." };
}

export async function tambahCatatan(muridId: string, teks: string): Promise<HasilCatatan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  const isi = String(teks ?? "").trim();
  if (isi.length < 1 || isi.length > 500) return { ok: false, pesan: "Catatan 1–500 karakter." };
  if (!UUID.test(String(muridId))) return { ok: false, pesan: "Murid tidak ditemukan." };
  const { data, error } = await k.db.from("catatan_murid").insert({ tenant_id: k.tenant.id, murid_id: muridId, teks: isi, penulis_user_id: k.userId, penulis_nama: k.namaPengguna }).select("teks, dibuat_pada").single();
  if (error || !data) return { ok: false, pesan: "Belum bisa menyimpan catatan. Pastikan murid ada di usahamu." };
  return { ok: true, tgl: tanggalJakarta(String(data.dibuat_pada)), teks: String(data.teks) };
}

export type HasilEdit = { ok: true } | { ok: false; galat: GalatMurid; pesan?: string };

/** Ubah nama, WA, orang tua, dan usia. Kategori tidak bisa diubah. Validasi ulang di server; CHECK database sebagai cadangan. */
export async function ubahDataMurid(id: string, masukan: InputEditMurid): Promise<HasilEdit> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, galat: {}, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, galat: {}, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, galat: {}, pesan: "Murid tidak ditemukan." };
  const { data: m } = await k.db.from("murid").select("kategori").eq("id", id).eq("tenant_id", k.tenant.id).maybeSingle();
  if (!m) return { ok: false, galat: {}, pesan: "Murid tidak ditemukan." };
  const kategori = m.kategori === "dewasa" ? "dewasa" : "anak";
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : null);
  const i: InputEditMurid = { nama: String(masukan?.nama ?? "").slice(0, 100), noWa: normalisasiWa(String(masukan?.noWa ?? "")).slice(0, 30), namaOrtu: String(masukan?.namaOrtu ?? "").slice(0, 100), usia: n(masukan?.usia) };
  const galat = validasiEditMurid(i, kategori);
  if (Object.keys(galat).length > 0) return { ok: false, galat };
  const { error } = await k.db.from("murid").update({
    nama: i.nama.trim(), no_wa: i.noWa, nama_ortu: kategori === "anak" ? i.namaOrtu.trim() : null, usia: kategori === "anak" ? i.usia : null,
  }).eq("id", id).eq("tenant_id", k.tenant.id);
  if (error) return { ok: false, galat: {}, pesan: pesanGalatMurid(error) };
  return { ok: true };
}

export type HasilPerpanjang = { ok: true } | { ok: false; pesan: string };

/** Paket baru + tagihan perpanjangan dalam satu fungsi database (atomik, tahan klik ganda). */
export async function perpanjangMurid(id: string, paketId: string): Promise<HasilPerpanjang> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id)) || !UUID.test(String(paketId))) return { ok: false, pesan: "Pilih paket." };
  const { error } = await k.db.rpc("perpanjang_murid", { p_murid_id: id, p_paket_id: paketId });
  return error ? { ok: false, pesan: pesanGalatMurid(error) } : { ok: true };
}

/**
 * Link portal pribadi murid. Token dibuat di server dan HANYA hash-nya yang disimpan; token asli dikembalikan sekali ke pemilik.
 * Membuat link baru mencabut link lama murid itu (satu link aktif per murid).
 */
export async function buatLinkPortal(muridId: string): Promise<{ ok: true; token: string } | { ok: false; pesan: string }> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(muridId))) return { ok: false, pesan: "Murid tidak ditemukan." };
  const { data: m } = await k.db.from("murid").select("id").eq("id", muridId).eq("tenant_id", k.tenant.id).maybeSingle();
  if (!m) return { ok: false, pesan: "Murid tidak ditemukan." };
  const token = buatTokenPortal();
  const admin = klienAdmin();
  const { error: eCabut } = await admin.from("portal_token").update({ dicabut_pada: new Date().toISOString() }).eq("tenant_id", k.tenant.id).eq("murid_id", muridId).is("dicabut_pada", null);
  if (eCabut) return { ok: false, pesan: "Link belum dibuat. Coba lagi sebentar." };
  const { error } = await admin.from("portal_token").insert({ tenant_id: k.tenant.id, murid_id: muridId, token_hash: hashKode(token) });
  return error ? { ok: false, pesan: "Link belum dibuat. Coba lagi sebentar." } : { ok: true, token };
}
