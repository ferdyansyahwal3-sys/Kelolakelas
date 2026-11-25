import type { SupabaseClient } from "@supabase/supabase-js";
import { dariBarisJadwal, type BarisJadwalDb } from "../berandaDb";
import { hashKode } from "../hashKode";
import { hariIniJakarta } from "../langgananData";
import { KOLOM_MURID, dariBarisMurid, paketTerkini, type BarisMuridDb, type BarisSesiDb } from "../muridDb";
import { aturanUntuk } from "../pengaturan";
import { dariBarisInfo, KOLOM_INFO, type BarisInfoDb } from "../pemberitahuanDb";
import { untukMurid, type Pemberitahuan } from "../pemberitahuan";
import { sesiBerikutnya, type SesiBerikutnya } from "../portalDb";
import { tokenValid } from "../portal";
import { tambahHari } from "../sesi";
import { klienAdmin } from "./server";

export interface DataPortal {
  tenantId: string; muridId: string; usaha: string;
  data: { nama: string; pengajar: string; paket: string; sisa: number; total: number; berlakuSampai: string; aktif: boolean; riwayat: { tgl: string; status: "hadir" | "izin" | "alpa" }[]; tagihan: { id: string; nominal: number; status: "lunas" | "belum" | "menunggu_verifikasi"; tempo: string }[]; catatan: { tgl: string; teks: string }[]; berikutnya: SesiBerikutnya | null };
  pengajarId: string; slotIds: string[]; info: Pemberitahuan[]; batasIzinJam: number; sekarang: string;
}

/** Token → (tenant, murid). Token tidak valid, tak dikenal, dicabut, atau milik usaha lain = null (404 yang sama; tidak ada petunjuk). */
export async function cariPortal(db: SupabaseClient, slug: string, token: string): Promise<{ tenantId: string; muridId: string; kategori: string; usaha: string; pengaturan: unknown } | null> {
  if (!tokenValid(token) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 40) return null;
  const { data: tk } = await db.from("portal_token").select("tenant_id, murid_id, dicabut_pada").eq("token_hash", hashKode(token)).maybeSingle();
  if (!tk || tk.dicabut_pada) return null;
  const { data: t } = await db.from("tenants").select("id, nama, slug, kategori, pengaturan").eq("id", tk.tenant_id).maybeSingle();
  if (!t || t.slug !== slug) return null;
  return { tenantId: t.id as string, muridId: tk.murid_id as string, kategori: t.kategori as string, usaha: t.nama as string, pengaturan: t.pengaturan };
}

/** Data portal satu murid. Hanya nama depan dan data murid itu sendiri; tanpa nomor WA atau data murid lain. */
export async function muatPortal(slug: string, token: string): Promise<DataPortal | null> {
  const db = klienAdmin();
  const c = await cariPortal(db, slug, token);
  if (!c) return null;
  const hariIni = hariIniJakarta();
  const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()).replace(":", ".");

  const [{ data: m }, { data: sesi }, { data: cat }, { data: peserta }, { data: info }, { data: pengajar }] = await Promise.all([
    db.from("murid").select(KOLOM_MURID).eq("tenant_id", c.tenantId).eq("id", c.muridId).maybeSingle(),
    db.from("sesi").select("murid_id, jadwal_id, tanggal, status").eq("tenant_id", c.tenantId).eq("murid_id", c.muridId),
    db.from("catatan_murid").select("id, teks, dibuat_pada").eq("tenant_id", c.tenantId).eq("murid_id", c.muridId).order("dibuat_pada", { ascending: false }).limit(20),
    db.from("peserta_tetap").select("jadwal_id").eq("tenant_id", c.tenantId).eq("murid_id", c.muridId),
    db.from("pemberitahuan").select(KOLOM_INFO).eq("tenant_id", c.tenantId).order("dibuat_pada", { ascending: false }).limit(50),
    db.from("pengajar").select("id, nama").eq("tenant_id", c.tenantId),
  ]);
  if (!m) return null;
  const slotIds = ((peserta ?? []) as { jadwal_id: string }[]).map((p) => p.jadwal_id);
  const [{ data: jad }, { data: tutupRows }] = await Promise.all([
    slotIds.length ? db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", c.tenantId).in("id", slotIds) : Promise.resolve({ data: [] }),
    slotIds.length ? db.from("slot_tutup").select("jadwal_id, tanggal").eq("tenant_id", c.tenantId).in("jadwal_id", slotIds).gte("tanggal", hariIni).lte("tanggal", tambahHari(hariIni, 28)) : Promise.resolve({ data: [] }),
  ]);
  const baris = m as unknown as BarisMuridDb;
  const sesiRows = (sesi ?? []) as (BarisSesiDb & { jadwal_id: string | null })[];
  const murid = dariBarisMurid(baris, sesiRows, (cat ?? []) as { id: string; teks: string; dibuat_pada: string }[]);
  const mp = paketTerkini(baris.murid_paket);
  const { data: pk } = mp ? await db.from("paket").select("nama").eq("tenant_id", c.tenantId).eq("id", mp.paket_id).maybeSingle() : { data: null };
  const { data: mpRow } = mp ? await db.from("murid_paket").select("pengajar_id").eq("id", mp.id).maybeSingle() : { data: null };
  const pengajarId = (mpRow?.pengajar_id as string | null) ?? "";
  const nama = (id: string) => ((pengajar ?? []) as { id: string; nama: string }[]).find((p) => p.id === id)?.nama ?? "";

  const slots = ((jad ?? []) as unknown as BarisJadwalDb[]).map(dariBarisJadwal);
  const tutup = new Set(((tutupRows ?? []) as { jadwal_id: string; tanggal: string }[]).map((x) => `${x.jadwal_id}|${x.tanggal}`));
  const izin = new Set(sesiRows.filter((s) => s.status === "izin" && s.jadwal_id).map((s) => `${s.jadwal_id}|${s.tanggal}`));
  const semuaInfo = ((info ?? []) as unknown as BarisInfoDb[]).map(dariBarisInfo).filter((x): x is Pemberitahuan => x !== null);
  const aturan = ((c.pengaturan ?? {}) as { aturan?: { batasIzinJam?: unknown } }).aturan;
  const batas = typeof aturan?.batasIzinJam === "number" && aturan.batasIzinJam >= 0 && aturan.batasIzinJam <= 72 ? aturan.batasIzinJam : aturanUntuk(c.kategori).batasIzinJam;

  return {
    tenantId: c.tenantId, muridId: c.muridId, usaha: c.usaha,
    data: { nama: murid.nama.split(" ")[0] ?? murid.nama, pengajar: murid.pengajar, paket: pk?.nama ?? "-", sisa: murid.sisaSesi, total: murid.totalSesi, berlakuSampai: murid.berlakuSampai, aktif: murid.aktif, riwayat: murid.riwayat, tagihan: murid.tagihan, catatan: murid.catatan, berikutnya: sesiBerikutnya(slots, hariIni, jam, tutup, izin, nama) },
    pengajarId, slotIds, info: untukMurid(semuaInfo, pengajarId, slotIds, hariIni), batasIzinJam: batas, sekarang: new Date().toISOString(),
  };
}
