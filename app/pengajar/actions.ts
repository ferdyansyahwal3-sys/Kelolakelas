"use server";
import { validasiCatatan } from "@/lib/pelatih";
import { validasiPemberitahuan, type JenisInfo, type Pemberitahuan } from "@/lib/pemberitahuan";
import { KOLOM_INFO, dariBarisInfo, type BarisInfoDb } from "@/lib/pemberitahuanDb";
import { nomorHari } from "@/lib/sesi";
import { ambilKonteksPelatih } from "@/lib/supabase/pelatihData";
import { klienAdmin } from "@/lib/supabase/server";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Hubungi pemilik usaha.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pelatih. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export type HasilPelatih = { ok: true } | { ok: false; pesan: string };

async function konteks() {
  const k = await ambilKonteksPelatih();
  if (!k) return { k: null, err: TAK_MASUK } as const;
  if (!k.bolehUbah) return { k: null, err: TUTUP } as const;
  return { k, err: "" } as const;
}

/** Slot HARUS milik pelatih ini dan murid HARUS peserta tetap slot itu; kunci tenant selalu ikut disaring. */
async function slotMilikku(tenantId: string, pengajarId: string, jadwalId: string) {
  const { data } = await klienAdmin().from("jadwal_template").select("id, hari, jam_mulai, pengajar_id").eq("id", jadwalId).eq("tenant_id", tenantId).eq("pengajar_id", pengajarId).maybeSingle();
  return data as { id: string; hari: number; jam_mulai: string; pengajar_id: string } | null;
}
async function pesertaSlot(tenantId: string, jadwalId: string, muridId: string) {
  const { data } = await klienAdmin().from("peserta_tetap").select("id").eq("tenant_id", tenantId).eq("jadwal_id", jadwalId).eq("murid_id", muridId).maybeSingle();
  return !!data;
}

export async function absenPelatih(jadwalId: string, tanggal: string, muridId: string, status: "hadir" | "izin" | "alpa" | null): Promise<HasilPelatih> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  const k = c.k;
  if (!UUID.test(String(jadwalId)) || !UUID.test(String(muridId)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  if (status !== null && !["hadir", "izin", "alpa"].includes(String(status))) return { ok: false, pesan: "Status tidak valid." };
  const slot = await slotMilikku(k.tenantId, k.pengajarId, jadwalId);
  if (!slot) return { ok: false, pesan: "Slot ini bukan milikmu." };
  if (nomorHari(tanggal) - 1 !== slot.hari) return { ok: false, pesan: "Tanggal tidak sesuai hari slot." };
  if (!(await pesertaSlot(k.tenantId, jadwalId, muridId))) return { ok: false, pesan: "Murid ini bukan peserta tetap slotmu." };
  const db = klienAdmin();
  if (status === null) {
    const { error } = await db.from("sesi").delete().eq("tenant_id", k.tenantId).eq("jadwal_id", jadwalId).eq("tanggal", tanggal).eq("murid_id", muridId);
    return error ? { ok: false, pesan: "Absen belum tersimpan. Coba lagi sebentar." } : { ok: true };
  }
  const { error } = await db.from("sesi").upsert({ tenant_id: k.tenantId, murid_id: muridId, jadwal_id: jadwalId, pengajar_id: k.pengajarId, tanggal, jam_mulai: slot.jam_mulai, status }, { onConflict: "jadwal_id,tanggal,murid_id" });
  return error ? { ok: false, pesan: "Absen belum tersimpan. Coba lagi sebentar." } : { ok: true };
}

export async function catatanPelatih(muridId: string, teks: string): Promise<HasilPelatih> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  const k = c.k;
  if (!UUID.test(String(muridId))) return { ok: false, pesan: "Murid tidak ditemukan." };
  const h = validasiCatatan(String(teks ?? ""));
  if (!h.ok) return { ok: false, pesan: h.galat };
  const db = klienAdmin();
  const { data: slotKu } = await db.from("jadwal_template").select("id").eq("tenant_id", k.tenantId).eq("pengajar_id", k.pengajarId);
  const ids = ((slotKu ?? []) as { id: string }[]).map((s) => s.id);
  const { data: peserta } = ids.length ? await db.from("peserta_tetap").select("id").eq("tenant_id", k.tenantId).eq("murid_id", muridId).in("jadwal_id", ids).limit(1) : { data: [] };
  if (!peserta || peserta.length === 0) return { ok: false, pesan: "Murid ini bukan muridmu." };
  const { error } = await db.from("catatan_murid").insert({ tenant_id: k.tenantId, murid_id: muridId, teks: h.teks, penulis_user_id: k.userId, penulis_nama: k.nama });
  return error ? { ok: false, pesan: "Catatan belum tersimpan. Coba lagi sebentar." } : { ok: true };
}

export type HasilKirimInfo = { ok: true; info: Pemberitahuan } | { ok: false; pesan: string; galat?: Record<string, string> };

/** Pelatih menulis hanya untuk muridnya sendiri (target = dirinya) atau untuk sesi miliknya. */
export async function kirimInfoPelatih(i: { jenis: JenisInfo; judul: string; isi: string; target: string; slotId: string }): Promise<HasilKirimInfo> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  const k = c.k;
  const galat = validasiPemberitahuan({ jenis: i?.jenis, judul: String(i?.judul ?? ""), isi: String(i?.isi ?? "") });
  let slotId: string | null = null;
  let pengajarId: string | null = null;
  if (i?.target === "sesi") {
    if (!UUID.test(String(i.slotId)) || !(await slotMilikku(k.tenantId, k.pengajarId, i.slotId))) galat.target = "Pilih sesi milikmu sendiri."; else slotId = i.slotId;
  } else if (i?.target === k.pengajarId) pengajarId = k.pengajarId;
  else galat.target = "Kamu hanya bisa menulis untuk muridmu sendiri.";
  if (Object.keys(galat).length > 0) return { ok: false, pesan: "Periksa isian pemberitahuan.", galat };
  const { data, error } = await klienAdmin().from("pemberitahuan").insert({ tenant_id: k.tenantId, jenis: i.jenis, judul: i.judul.trim(), isi: i.isi.trim(), penulis_user_id: k.userId, penulis_nama: k.nama, untuk_pengajar_id: pengajarId, untuk_slot_id: slotId }).select(KOLOM_INFO).single();
  const baris = data ? dariBarisInfo(data as unknown as BarisInfoDb) : null;
  return error || !baris ? { ok: false, pesan: "Pemberitahuan belum terkirim. Coba lagi sebentar." } : { ok: true, info: baris };
}

/** Pelatih hanya bisa menghapus pemberitahuan yang ia tulis sendiri. */
export async function hapusInfoPelatih(id: string): Promise<HasilPelatih> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pemberitahuan tidak ditemukan." };
  const { data, error } = await klienAdmin().from("pemberitahuan").delete().eq("id", id).eq("tenant_id", c.k.tenantId).eq("penulis_user_id", c.k.userId).select("id");
  return error ? { ok: false, pesan: "Belum terhapus. Coba lagi sebentar." } : data && data.length > 0 ? { ok: true } : { ok: false, pesan: "Kamu hanya bisa menghapus pemberitahuan yang kamu tulis." };
}
