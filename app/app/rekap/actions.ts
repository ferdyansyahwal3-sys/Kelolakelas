"use server";
import { bolehUbahData } from "@/lib/langganan";
import { validasiNilai, type ModeBagi } from "@/lib/rekap";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HasilRekap = { ok: true } | { ok: false; pesan: string };

function bersihkan(mode: ModeBagi, x: Record<string, unknown>): Record<string, number> | null {
  const r: Record<string, number> = {};
  for (const [id, v] of Object.entries(x ?? {})) {
    if (!UUID.test(id) || typeof v !== "number" || validasiNilai(v, mode)) return null;
    r[id] = v;
  }
  return r;
}

export async function simpanBagiHasil(v: { mode: ModeBagi; persen: Record<string, number>; nominal: Record<string, number> }): Promise<HasilRekap> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  const persen = bersihkan("persen", v?.persen);
  const nominal = bersihkan("nominal", v?.nominal);
  if (!persen || !nominal || (v.mode !== "persen" && v.mode !== "nominal")) return { ok: false, pesan: "Angka bagi hasil tidak valid." };
  const { error } = await k.db.rpc("set_pengaturan_kunci", { p_kunci: "bagiHasil", p_nilai: { mode: v.mode, persen, nominal } });
  return error ? { ok: false, pesan: "Bagi hasil belum tersimpan. Coba lagi sebentar." } : { ok: true };
}

export async function simpanGajiDibayar(d: Record<string, string>): Promise<HasilRekap> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  const bersih: Record<string, string> = {};
  for (const [kunci, tgl] of Object.entries(d ?? {})) {
    const [id, bulan] = kunci.split("|");
    if (!UUID.test(id ?? "") || !/^\d{4}-\d{2}$/.test(bulan ?? "") || typeof tgl !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return { ok: false, pesan: "Data gaji tidak valid." };
    bersih[kunci] = tgl;
  }
  const { error } = await k.db.rpc("set_pengaturan_kunci", { p_kunci: "gajiDibayar", p_nilai: bersih });
  return error ? { ok: false, pesan: "Status gaji belum tersimpan. Coba lagi sebentar." } : { ok: true };
}
