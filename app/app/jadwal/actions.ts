"use server";
import { dariBarisJadwal, type BarisJadwalDb } from "@/lib/berandaDb";
import { ubahKuota, validasiSlotBaru, type GalatSlot, type InputSlot } from "@/lib/jadwal";
import { pesanGalatJadwal } from "@/lib/jadwalDb";
import { bolehUbahData } from "@/lib/langganan";
import { bolehTambah } from "@/lib/paketLangganan";
import { nomorHari } from "@/lib/sesi";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const KOLOM = "id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi";

export type HasilSlot = { ok: true; id: string; jam: string } | { ok: false; pesan: string; galat?: GalatSlot };
export type HasilBiasa = { ok: true } | { ok: false; pesan: string };

async function pemilik() {
  const k = await ambilKonteksOwner();
  if (!k) return { k: null, err: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { k: null, err: TUTUP };
  return { k, err: "" };
}

export async function tambahSlot(i: { pengajarId: string; hari: number; jam: string; nama: string; kuota: number; durasi: number; lokasi: string }): Promise<HasilSlot> {
  const p = await pemilik();
  const k = p.k;
  if (!k) return { ok: false, pesan: p.err };
  const hari = Number(i.hari);
  if (!UUID.test(String(i.pengajarId)) || !Number.isInteger(hari) || hari < 1 || hari > 7) return { ok: false, pesan: "Data slot tidak valid." };

  const [{ data: pengajar }, { data: ada }, { count }] = await Promise.all([
    k.db.from("pengajar").select("id").eq("id", i.pengajarId).eq("tenant_id", k.tenant.id).eq("aktif", true).maybeSingle(),
    k.db.from("jadwal_template").select(KOLOM).eq("tenant_id", k.tenant.id).eq("pengajar_id", i.pengajarId).eq("hari", hari - 1),
    k.db.from("jadwal_template").select("id", { count: "exact", head: true }).eq("tenant_id", k.tenant.id),
  ]);
  if (!pengajar) return { ok: false, pesan: "Pelatih tidak ditemukan." };

  const input: InputSlot = { jam: String(i.jam ?? "").slice(0, 8), nama: String(i.nama ?? "").slice(0, 80), kuota: Math.trunc(Number(i.kuota)), durasi: Math.trunc(Number(i.durasi)) };
  const h = validasiSlotBaru(input, ((ada ?? []) as unknown as BarisJadwalDb[]).map(dariBarisJadwal));
  if (!h.ok) return { ok: false, pesan: "Periksa isian slot.", galat: h.galat };
  if (!bolehTambah(k.plan, "slot", count ?? 0)) return { ok: false, pesan: pesanGalatJadwal({ message: "batas_slot" }) };

  const { data, error } = await k.db.from("jadwal_template").insert({
    tenant_id: k.tenant.id, pengajar_id: i.pengajarId, hari: hari - 1, jam_mulai: h.jam.replace(".", ":"), durasi_menit: input.durasi,
    nama: input.nama.trim(), kuota: input.kuota, lokasi: String(i.lokasi ?? "").trim().slice(0, 60) || null,
  }).select("id").single();
  if (error || !data) return { ok: false, pesan: pesanGalatJadwal(error) };
  return { ok: true, id: data.id as string, jam: h.jam };
}

export async function ubahKuotaSlot(id: string, kuota: number): Promise<HasilBiasa> {
  const p = await pemilik();
  const k = p.k;
  if (!k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Slot tidak ditemukan." };
  const { count } = await k.db.from("peserta_tetap").select("id", { count: "exact", head: true }).eq("tenant_id", k.tenant.id).eq("jadwal_id", id);
  const h = ubahKuota({ terisi: count ?? 0 }, Math.trunc(Number(kuota)));
  if (!h.ok) return { ok: false, pesan: h.galat };
  const { data, error } = await k.db.from("jadwal_template").update({ kuota: Math.trunc(Number(kuota)) }).eq("id", id).eq("tenant_id", k.tenant.id).select("id").maybeSingle();
  if (error) return { ok: false, pesan: pesanGalatJadwal(error) };
  return data ? { ok: true } : { ok: false, pesan: "Slot tidak ditemukan." };
}

export async function hapusSlot(id: string): Promise<HasilBiasa> {
  const p = await pemilik();
  const k = p.k;
  if (!k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Slot tidak ditemukan." };
  const { error } = await k.db.from("jadwal_template").delete().eq("id", id).eq("tenant_id", k.tenant.id);
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

/** Tutup/buka satu slot pada satu TANGGAL (slot_tutup). Tanggal harus jatuh di hari slot. */
export async function tutupSlot(id: string, tanggal: string, tutup: boolean): Promise<HasilBiasa> {
  const p = await pemilik();
  const k = p.k;
  if (!k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  const { data: slot } = await k.db.from("jadwal_template").select("id, hari").eq("id", id).eq("tenant_id", k.tenant.id).maybeSingle();
  if (!slot) return { ok: false, pesan: "Slot tidak ditemukan." };
  if (nomorHari(tanggal) - 1 !== slot.hari) return { ok: false, pesan: "Tanggal tidak sesuai hari slot." };
  if (tutup) {
    const { error } = await k.db.from("slot_tutup").upsert({ tenant_id: k.tenant.id, jadwal_id: id, tanggal }, { onConflict: "jadwal_id,tanggal", ignoreDuplicates: true });
    return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
  }
  const { error } = await k.db.from("slot_tutup").delete().eq("tenant_id", k.tenant.id).eq("jadwal_id", id).eq("tanggal", tanggal);
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}
