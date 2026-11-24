"use server";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { bolehUbahData } from "@/lib/langganan";
import { bolehTambah } from "@/lib/paketLangganan";
import { validasiPaket, type InputPaket, type PaketOwner } from "@/lib/paket";
import { KOLOM_PAKET, dariBaris, keBaris, pesanGalatPaket, type BarisPaket } from "@/lib/paketDb";

export type HasilPaket = { ok: true; paket: PaketOwner } | { ok: false; galat: Record<string, string>; pesan?: string };
export type HasilHapus = { ok: true } | { ok: false; pesan: string };

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";

/** Masukan dari browser tidak dipercaya: angka dipaksa, teks dipotong. Validasi lengkap ada di validasiPaket + CHECK database. */
function bersihkan(i: InputPaket): InputPaket {
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : NaN);
  return {
    nama: String(i?.nama ?? "").slice(0, 80), kategori: i?.kategori === "dewasa" ? "dewasa" : "anak",
    jenis: i?.jenis === "grup" || i?.jenis === "keluarga" ? i.jenis : "privat",
    jumlahSesi: n(i?.jumlahSesi), masaBerlakuHari: n(i?.masaBerlakuHari), harga: n(i?.harga), anggota: i?.anggota == null ? null : n(i.anggota),
  };
}

async function jumlahAktif(db: NonNullable<Awaited<ReturnType<typeof ambilKonteksOwner>>>["db"], tenantId: string, kecuali?: string) {
  let q = db.from("paket").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("aktif", true);
  if (kecuali) q = q.neq("id", kecuali);
  const { count } = await q;
  return count ?? 0;
}

export async function simpanPaket(id: string | null, masukan: InputPaket): Promise<HasilPaket> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, galat: {}, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, galat: {}, pesan: TUTUP };
  const i = bersihkan(masukan);

  const { data: lain } = await k.db.from("paket").select("id, nama, kategori").eq("tenant_id", k.tenant.id);
  const galat = validasiPaket(i, (lain ?? []).filter((p: { id: string }) => p.id !== id) as { nama: string; kategori: "anak" | "dewasa" }[]);
  if (Object.keys(galat).length > 0) return { ok: false, galat };

  if (!id && !bolehTambah(k.plan, "paketJual", await jumlahAktif(k.db, k.tenant.id))) return { ok: false, galat: {}, pesan: pesanGalatPaket({ message: "batas_paket_jual" }) };

  const q = id
    ? k.db.from("paket").update(keBaris(i)).eq("id", id).eq("tenant_id", k.tenant.id).select(KOLOM_PAKET).maybeSingle()
    : k.db.from("paket").insert({ ...keBaris(i), tenant_id: k.tenant.id }).select(KOLOM_PAKET).single();
  const { data, error } = await q;
  if (error) return { ok: false, galat: {}, pesan: pesanGalatPaket(error) };
  const paket = data ? dariBaris(data as BarisPaket) : null;
  if (!paket) return { ok: false, galat: {}, pesan: "Paket tidak ditemukan." };
  return { ok: true, paket };
}

export async function ubahAktifPaket(id: string, aktif: boolean): Promise<HasilPaket> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, galat: {}, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, galat: {}, pesan: TUTUP };
  if (aktif && !bolehTambah(k.plan, "paketJual", await jumlahAktif(k.db, k.tenant.id, id))) return { ok: false, galat: {}, pesan: pesanGalatPaket({ message: "batas_paket_jual" }) };
  const { data, error } = await k.db.from("paket").update({ aktif: aktif === true }).eq("id", id).eq("tenant_id", k.tenant.id).select(KOLOM_PAKET).maybeSingle();
  if (error) return { ok: false, galat: {}, pesan: pesanGalatPaket(error) };
  const paket = data ? dariBaris(data as BarisPaket) : null;
  return paket ? { ok: true, paket } : { ok: false, galat: {}, pesan: "Paket tidak ditemukan." };
}

export async function hapusPaket(id: string): Promise<HasilHapus> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  const { error, count } = await k.db.from("paket").delete({ count: "exact" }).eq("id", id).eq("tenant_id", k.tenant.id);
  if (error) return { ok: false, pesan: pesanGalatPaket(error) };
  return count === 0 ? { ok: false, pesan: "Paket tidak ditemukan." } : { ok: true };
}
