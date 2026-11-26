import type { SupabaseClient } from "@supabase/supabase-js";
import { HARGA } from "../paketLangganan";
import { klienServer } from "./server";
import type { Audit, LogPengingat, PromoPlatform, TagihanPlatform, Usaha } from "../platform";

export interface DataPlatform {
  hari: string;
  usaha: Usaha[];
  tagihan: TagihanPlatform[];
  promo: PromoPlatform[];
  audit: Audit[];
  logPengingat: LogPengingat[];
  catatan: Record<string, string>;
  modeLihat: Record<string, string>;
}

/** Admin yang sedang login (dibaca lewat RLS: baris sendiri di platform_admins). null = bukan admin / belum login. */
export async function adminSaatIni(): Promise<{ db: SupabaseClient; userId: string } | null> {
  try {
    const db = klienServer();
    const { data } = await db.auth.getUser();
    const id = data.user?.id;
    if (!id) return null;
    const { data: ok, error } = await db.rpc("is_platform_admin");
    if (error || ok !== true) return null;
    return { db, userId: id };
  } catch { return null; }
}

const hariJakarta = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
/** Waktu ke teks "yyyy-mm-ddThh:mm:ss+07:00" (jam Jakarta), supaya panel menampilkan jam yang benar. */
const isoJakarta = (iso: string) => {
  const d = new Date(iso);
  const jam = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
  return `${hariJakarta(d)}T${jam}+07:00`;
};

type Mentah = {
  usaha: Usaha[]; tagihan: Omit<TagihanPlatform, "hargaNormal">[]; promo: PromoPlatform[];
  audit: (Omit<Audit, "waktu"> & { waktu: string; berlakuSampai: string | null })[];
  catatan: Record<string, string>; pengingat: { tagihanId: string; kanal: "wa" | "email"; waktu: string }[];
};

export async function muatDataPlatform(db: SupabaseClient): Promise<DataPlatform> {
  const { data, error } = await db.rpc("platform_data");
  if (error || !data) throw new Error("Data panel tidak bisa dibaca.");
  const m = data as Mentah;
  const sekarang = Date.now();
  const modeLihat: Record<string, string> = {};
  for (const a of m.audit) if (a.aksi === "lihat_usaha" && a.usahaId && a.berlakuSampai && Date.parse(a.berlakuSampai) > sekarang && !modeLihat[a.usahaId]) modeLihat[a.usahaId] = a.berlakuSampai;
  return {
    hari: hariJakarta(new Date()),
    usaha: m.usaha,
    tagihan: m.tagihan.map((t) => ({ ...t, hargaNormal: (HARGA[t.plan] ?? t.nominal) * t.bulan })),
    promo: m.promo,
    audit: m.audit.map(({ berlakuSampai: _b, ...a }) => ({ ...a, waktu: isoJakarta(a.waktu) })),
    logPengingat: m.pengingat.map((r) => ({ ...r, waktu: isoJakarta(r.waktu) })),
    catatan: m.catatan,
    modeLihat,
  };
}
