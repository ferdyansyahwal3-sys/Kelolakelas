"use server";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { kodeReferral, validasiPromo, type InputPromo, type PromoOwner } from "@/lib/promo";
import { KOLOM_PROMO, dariBarisPromo, pesanGalatPromo, type BarisPromoDb } from "@/lib/promoDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HasilPromo = { ok: true; promo: PromoOwner } | { ok: false; pesan: string; galat?: Record<string, string> };
export type HasilBiasa = { ok: true } | { ok: false; pesan: string };

async function pemilik() {
  const k = await ambilKonteksOwner();
  if (!k) return { k: null, err: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { k: null, err: TUTUP };
  return { k, err: "" };
}

export async function buatPromo(i: InputPromo): Promise<HasilPromo> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  const k = p.k;
  const masukan: InputPromo = { kode: String(i?.kode ?? "").slice(0, 30), jenis: i?.jenis === "nominal" ? "nominal" : "persen", nilai: Math.trunc(Number(i?.nilai)), kuota: i?.kuota === null ? null : Math.trunc(Number(i?.kuota)), kedaluwarsa: i?.kedaluwarsa ? String(i.kedaluwarsa) : null };
  const { data: ada } = await k.db.from("promo").select("kode").eq("tenant_id", k.tenant.id);
  const galat = validasiPromo(masukan, ((ada ?? []) as { kode: string }[]).map((x) => x.kode), hariIniJakarta());
  if (Object.keys(galat).length > 0) return { ok: false, pesan: "Periksa isian promo.", galat };
  const { data, error } = await k.db.from("promo").insert({ tenant_id: k.tenant.id, kode: masukan.kode.trim().toUpperCase(), jenis: masukan.jenis, nilai: masukan.nilai, kuota: masukan.kuota, kedaluwarsa: masukan.kedaluwarsa }).select(KOLOM_PROMO).single();
  const baris = data ? dariBarisPromo(data as unknown as BarisPromoDb) : null;
  return error || !baris ? { ok: false, pesan: pesanGalatPromo(error) } : { ok: true, promo: baris };
}

export async function buatReferralMurid(muridId: string, potongan: number): Promise<HasilPromo> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  const k = p.k;
  const nilai = Math.trunc(Number(potongan));
  if (!UUID.test(String(muridId))) return { ok: false, pesan: "Pilih murid dulu." };
  if (!(nilai >= 1000 && nilai <= 10_000_000)) return { ok: false, pesan: "Nominal Rp 1.000–10.000.000." };
  const [{ data: m }, { data: ada }] = await Promise.all([
    k.db.from("murid").select("id, nama").eq("id", muridId).eq("tenant_id", k.tenant.id).eq("aktif", true).maybeSingle(),
    k.db.from("promo").select("kode, murid_id").eq("tenant_id", k.tenant.id),
  ]);
  if (!m) return { ok: false, pesan: "Murid tidak ditemukan atau nonaktif." };
  const daftar = (ada ?? []) as { kode: string; murid_id: string | null }[];
  if (daftar.some((x) => x.murid_id === muridId)) return { ok: false, pesan: "Murid ini sudah punya kode referral." };
  const kode = kodeReferral(m.nama as string, daftar.map((x) => x.kode));
  const { data, error } = await k.db.from("promo").insert({ tenant_id: k.tenant.id, kode, jenis: "nominal", nilai, murid_id: muridId }).select(KOLOM_PROMO).single();
  const baris = data ? dariBarisPromo(data as unknown as BarisPromoDb) : null;
  return error || !baris ? { ok: false, pesan: pesanGalatPromo(error) } : { ok: true, promo: baris };
}

export async function ubahAktifPromo(id: string, aktif: boolean): Promise<HasilBiasa> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Kode tidak ditemukan." };
  const { data, error } = await p.k.db.from("promo").update({ aktif: aktif === true }).eq("id", id).eq("tenant_id", p.k.tenant.id).select("id").maybeSingle();
  return error ? { ok: false, pesan: pesanGalatPromo(error) } : data ? { ok: true } : { ok: false, pesan: "Kode tidak ditemukan." };
}

export async function hapusPromo(id: string): Promise<HasilBiasa> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Kode tidak ditemukan." };
  const { error } = await p.k.db.from("promo").delete().eq("id", id).eq("tenant_id", p.k.tenant.id);
  return error ? { ok: false, pesan: pesanGalatPromo(error) } : { ok: true };
}
