import type { SupabaseClient } from "@supabase/supabase-js";
import { dariBarisJadwal, hitungTerisi, type BarisJadwalDb } from "../berandaDb";
import { tglPendek } from "../format";
import type { SlotJadwal } from "../jadwal";
import { bolehUbahData, hitungAkses } from "../langganan";
import { dataLangganan, hariIniJakarta, tanggalJakarta } from "../langgananData";
import { KOLOM_MURID, dariBarisMurid, type BarisCatatanDb, type BarisMuridDb, type BarisSesiDb } from "../muridDb";
import { dariBarisInfo, KOLOM_INFO, type BarisInfoDb } from "../pemberitahuanDb";
import type { Pemberitahuan } from "../pemberitahuan";
import { geserBulan, type Pembayaran } from "../rekap";
import type { Absensi } from "../sesi";
import { KOLOM_TAGIHAN, bacaBagiHasil, bacaGajiDibayar, pembayaranDariTagihan, type BarisTagihanDb, type PaketMurid } from "../tagihanDb";
import { klienAdmin, klienServer } from "./server";
import { supabaseTersambung } from "./env";

export interface KonteksPelatih { userId: string; tenantId: string; tenantNama: string; istilah: Record<string, string>; pengajarId: string; nama: string; pemilik: boolean; bolehUbah: boolean }

/**
 * Siapa yang membuka halaman pelatih: akun yang punya baris `pengajar` aktif di sebuah usaha (pelatih diundang ATAU pemilik yang mengajar).
 * Dibaca dengan klien pengguna (RLS). Selalu disaring user_id. null = tertutup.
 */
export async function ambilKonteksPelatih(): Promise<KonteksPelatih | null> {
  if (!supabaseTersambung()) return null;
  const db = klienServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const userId = auth.user.id;
  const { data: p } = await db.from("pengajar").select("id, nama, tenant_id, aktif").eq("user_id", userId).eq("aktif", true).limit(1).maybeSingle();
  if (!p) return null;
  const [{ data: anggota }, { data: t }, { data: sub }] = await Promise.all([
    db.from("tenant_members").select("role").eq("user_id", userId).eq("tenant_id", p.tenant_id).maybeSingle(),
    db.from("tenants").select("nama, istilah, trial_ends_at").eq("id", p.tenant_id).maybeSingle(),
    db.from("subscriptions").select("current_period_end, grace_until").eq("tenant_id", p.tenant_id).maybeSingle(),
  ]);
  if (!anggota || !t || !sub) return null;
  const akses = hitungAkses(dataLangganan(t.trial_ends_at as string | null, sub.current_period_end as string | null, sub.grace_until as string | null), hariIniJakarta());
  return {
    userId, tenantId: p.tenant_id as string, tenantNama: t.nama as string, istilah: (t.istilah ?? {}) as Record<string, string>,
    pengajarId: p.id as string, nama: p.nama as string, pemilik: anggota.role === "owner", bolehUbah: bolehUbahData(akses.akses),
  };
}

export interface DataPelatih {
  jadwal: SlotJadwal[];
  pesertaTetap: Record<string, string[]>;
  murid: ReturnType<typeof dariBarisMurid>[];
  catatan: Record<string, { tgl: string; teks: string }[]>;
  absensi: Absensi;
  pengajar: { id: string; nama: string }[];
  pembayaran: Pembayaran[];
  modeBagi: "persen" | "nominal";
  persen: number;
  nominal: number;
  gajiDibayar: Record<string, string>;
  pemberitahuan: Pemberitahuan[];
}

const tanggalMin = (hariIni: string, n: number) => new Date(Date.parse(hariIni) + n * 86400000).toISOString().slice(0, 10);

/** Data halaman pelatih lewat service role, TAPI hanya milik pelatih ini: slotnya, peserta tetap slot itu, murid-murid itu, dan pembayaran murid-muridnya. */
export async function muatDataPelatih(k: KonteksPelatih, hariIni = hariIniJakarta()): Promise<DataPelatih> {
  const db: SupabaseClient = klienAdmin();
  const bulanMin = geserBulan(hariIni.slice(0, 7), -6);
  const [{ data: jad }, { data: pengajar }, { data: t }] = await Promise.all([
    db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", k.tenantId),
    db.from("pengajar").select("id, nama").eq("tenant_id", k.tenantId).eq("aktif", true).order("nama"),
    db.from("tenants").select("pengaturan").eq("id", k.tenantId).maybeSingle(),
  ]);
  const semua = (jad ?? []) as unknown as BarisJadwalDb[];
  const milik = semua.filter((j) => j.pengajar_id === k.pengajarId);
  const idSlot = milik.map((j) => j.id);
  const idSlotSemua = semua.map((j) => j.id);

  const [{ data: peserta }, { data: paketSaya }] = await Promise.all([
    db.from("peserta_tetap").select("jadwal_id, murid_id").eq("tenant_id", k.tenantId).in("jadwal_id", idSlotSemua.length ? idSlotSemua : ["00000000-0000-0000-0000-000000000000"]),
    db.from("murid_paket").select("murid_id, paket_id, pengajar_id, dibuat_pada").eq("tenant_id", k.tenantId).eq("pengajar_id", k.pengajarId),
  ]);
  const semuaPeserta = (peserta ?? []) as { jadwal_id: string; murid_id: string }[];
  const terisi = hitungTerisi(semuaPeserta);
  const jadwal = milik.map(dariBarisJadwal).map((s) => ({ ...s, terisi: terisi.get(s.id) ?? 0 }));
  const pesertaTetap: Record<string, string[]> = {};
  for (const id of idSlot) pesertaTetap[id] = [];
  for (const p of semuaPeserta) if (pesertaTetap[p.jadwal_id]) pesertaTetap[p.jadwal_id]!.push(p.murid_id);

  const idMurid = Array.from(new Set([...Object.values(pesertaTetap).flat(), ...((paketSaya ?? []) as { murid_id: string }[]).map((x) => x.murid_id)]));
  const kosong = idMurid.length === 0;
  const dummy = ["00000000-0000-0000-0000-000000000000"];
  const [{ data: m }, { data: sesi }, { data: cat }, { data: tagihan }, { data: info }] = await Promise.all([
    db.from("murid").select(KOLOM_MURID).eq("tenant_id", k.tenantId).in("id", kosong ? dummy : idMurid),
    db.from("sesi").select("murid_id, jadwal_id, tanggal, status").eq("tenant_id", k.tenantId).in("murid_id", kosong ? dummy : idMurid),
    db.from("catatan_murid").select("id, murid_id, teks, dibuat_pada").eq("tenant_id", k.tenantId).in("murid_id", kosong ? dummy : idMurid).order("dibuat_pada", { ascending: false }),
    db.from("tagihan").select(KOLOM_TAGIHAN).eq("tenant_id", k.tenantId).eq("status", "lunas").in("murid_id", kosong ? dummy : idMurid).gte("dibayar_pada", `${bulanMin}-01T00:00:00+07:00`),
    db.from("pemberitahuan").select(KOLOM_INFO).eq("tenant_id", k.tenantId).order("dibuat_pada", { ascending: false }).limit(100),
  ]);
  const sesiRows = (sesi ?? []) as (BarisSesiDb & { jadwal_id: string | null })[];
  const murid = ((m ?? []) as unknown as BarisMuridDb[]).map((b) => dariBarisMurid(b, sesiRows));

  const catatan: Record<string, { tgl: string; teks: string }[]> = {};
  for (const c of (cat ?? []) as (BarisCatatanDb & { murid_id: string })[]) (catatan[c.murid_id] ??= []).push({ tgl: tglPendek(tanggalJakarta(c.dibuat_pada)), teks: c.teks });

  const absensi: Absensi = {};
  const awal = tanggalMin(hariIni, -60), akhir = tanggalMin(hariIni, 60);
  for (const s of sesiRows) if (s.jadwal_id && idSlot.includes(s.jadwal_id) && s.tanggal >= awal && s.tanggal <= akhir && ["hadir", "izin", "alpa"].includes(s.status)) absensi[`${s.jadwal_id}|${s.tanggal}|${s.murid_id}`] = s.status as "hadir" | "izin" | "alpa";

  const bagi = bacaBagiHasil(((t?.pengaturan ?? {}) as { bagiHasil?: unknown }).bagiHasil);
  const peng = (t?.pengaturan ?? {}) as { gajiDibayar?: unknown };
  const pembayaran = pembayaranDariTagihan((tagihan ?? []) as unknown as BarisTagihanDb[], (paketSaya ?? []) as PaketMurid[], "").filter((p) => p.pengajarId === k.pengajarId);
  const pemberitahuan = ((info ?? []) as unknown as BarisInfoDb[]).map(dariBarisInfo).filter((x): x is Pemberitahuan => x !== null);

  return { jadwal, pesertaTetap, murid, catatan, absensi, pengajar: (pengajar ?? []) as { id: string; nama: string }[], pembayaran, modeBagi: bagi.mode, persen: bagi.persen[k.pengajarId] ?? 0, nominal: bagi.nominal[k.pengajarId] ?? 0, gajiDibayar: bacaGajiDibayar(peng.gajiDibayar), pemberitahuan };
}
