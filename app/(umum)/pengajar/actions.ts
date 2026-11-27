"use server";
import { normalisasiJam } from "@/lib/jadwal";
import { validasiCatatan } from "@/lib/pelatih";
import { validasiPemberitahuan, type JenisInfo, type Pemberitahuan } from "@/lib/pemberitahuan";
import { KOLOM_INFO, dariBarisInfo, type BarisInfoDb } from "@/lib/pemberitahuanDb";
import { jamDb, pesanGalatJadwal } from "@/lib/permintaanDb";
import { ambilKonteksPelatih } from "@/lib/supabase/pelatihData";
import { klienAdmin, klienServer } from "@/lib/supabase/server";

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

/** Slot HARUS milik pelatih ini dan murid HARUS peserta tetap slot itu; kunci tenant selalu ikut disaring. Bila `tanggal` diberikan, penggantian sekali ikut dihitung: yang memegang sesi itu hari itu adalah pelatih pengganti. */
async function slotMilikku(tenantId: string, pengajarId: string, jadwalId: string, tanggal?: string) {
  const db = klienAdmin();
  const { data } = await db.from("jadwal_template").select("id, hari, jam_mulai, pengajar_id").eq("id", jadwalId).eq("tenant_id", tenantId).maybeSingle();
  const slot = data as { id: string; hari: number; jam_mulai: string; pengajar_id: string } | null;
  if (!slot) return null;
  if (!tanggal) return slot.pengajar_id === pengajarId ? slot : null;
  const { data: g } = await db.from("ganti_pelatih").select("pengajar_id").eq("tenant_id", tenantId).eq("jadwal_id", jadwalId).eq("tanggal", tanggal).maybeSingle();
  const pemegang = (g as { pengajar_id: string } | null)?.pengajar_id ?? slot.pengajar_id;
  return pemegang === pengajarId ? slot : null;
}
/** Absen lewat fungsi database `absen` (atas nama sesi pelatih): ia hanya lolos bila pelatih ini PEMEGANG sesi pada tanggal itu (pengganti sekali, sesi pindahan, murid pengganti ikut dihitung di database). */
export async function absenPelatih(jadwalId: string, tanggal: string, muridId: string, status: "hadir" | "izin" | "alpa" | null): Promise<HasilPelatih> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (!UUID.test(String(jadwalId)) || !UUID.test(String(muridId)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  if (status !== null && !["hadir", "izin", "alpa"].includes(String(status))) return { ok: false, pesan: "Status tidak valid." };
  const { error } = await klienServer().rpc("absen", { p_jadwal: jadwalId, p_tanggal: tanggal, p_murid: muridId, p_status: status });
  if (!error) return { ok: true };
  if ((error.message ?? "").includes("bukan_pemilik")) return { ok: false, pesan: "Sesi ini bukan milikmu pada tanggal itu." };
  return { ok: false, pesan: pesanGalatJadwal(error, "Absen belum tersimpan. Coba lagi sebentar.") };
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

export type HasilJadwal = { ok: true; id?: string } | { ok: false; pesan: string };

/** Minta ganti pelatih untuk satu sesi yang kupegang. Aturan lengkap diulang di fungsi database. */
export async function ajukanMintaGanti(jadwalId: string, tanggal: string, keId: string, alasan: string): Promise<HasilJadwal> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (!UUID.test(String(jadwalId)) || !TANGGAL.test(String(tanggal)) || !UUID.test(String(keId))) return { ok: false, pesan: "Data tidak valid." };
  const { data, error } = await klienServer().rpc("minta_ganti_ajukan", { p_jadwal: jadwalId, p_tanggal: tanggal, p_ke: keId, p_alasan: String(alasan ?? "") });
  return error || typeof data !== "string" ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true, id: data };
}

export async function tarikMintaGanti(id: string): Promise<HasilJadwal> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await klienServer().rpc("minta_ganti_batal", { p_id: id });
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

/** Ajukan tukar jadwal (pindah sekali) untuk sesi yang kupegang. */
export async function ajukanTukarJadwal(jadwalId: string, tanggalAsal: string, tanggalBaru: string, jamBaru: string, alasan: string): Promise<HasilJadwal> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (!UUID.test(String(jadwalId)) || !TANGGAL.test(String(tanggalAsal)) || !TANGGAL.test(String(tanggalBaru))) return { ok: false, pesan: "Data tidak valid." };
  const jam = normalisasiJam(String(jamBaru ?? ""));
  if (!jam) return { ok: false, pesan: "Isi jam seperti 16.00." };
  const { data, error } = await klienServer().rpc("tukar_ajukan", { p_jadwal: jadwalId, p_tanggal_asal: tanggalAsal, p_tanggal_baru: tanggalBaru, p_jam_baru: jamDb(jam), p_alasan: String(alasan ?? "") });
  return error || typeof data !== "string" ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true, id: data };
}

export async function batalkanTukarJadwal(id: string): Promise<HasilJadwal> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await klienServer().rpc("tukar_batal", { p_id: id });
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

/** Tandai kabar milikku sudah dibaca (id null = semua). Disaring usaha + pelatih ini, jadi tidak bisa menyentuh kabar orang lain. */
export async function tandaiKabarDibaca(id: string | null): Promise<HasilPelatih> {
  const c = await konteks();
  if (!c.k) return { ok: false, pesan: c.err };
  if (id !== null && !UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  let q = klienAdmin().from("kabar_pelatih").update({ dibaca: true }).eq("tenant_id", c.k.tenantId).eq("untuk_pengajar_id", c.k.pengajarId).eq("dibaca", false);
  if (id !== null) q = q.eq("id", id);
  const { error } = await q;
  return error ? { ok: false, pesan: "Belum tersimpan. Coba lagi sebentar." } : { ok: true };
}
