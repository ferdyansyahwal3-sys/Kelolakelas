"use server";
import { bolehUbahData } from "@/lib/langganan";
import { validasiPemberitahuan, type JenisInfo, type Pemberitahuan } from "@/lib/pemberitahuan";
import { KOLOM_INFO, dariBarisInfo, type BarisInfoDb } from "@/lib/pemberitahuanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HasilKirimInfo = { ok: true; info: Pemberitahuan } | { ok: false; pesan: string; galat?: Record<string, string> };

/** Owner menulis pemberitahuan untuk semua murid, murid satu pelatih, atau murid satu sesi (slot). */
export async function kirimInfo(i: { jenis: JenisInfo; judul: string; isi: string; target: string; slotId: string }): Promise<HasilKirimInfo> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  const galat = validasiPemberitahuan({ jenis: i?.jenis, judul: String(i?.judul ?? ""), isi: String(i?.isi ?? "") });

  let pengajarId: string | null = null;
  let slotId: string | null = null;
  if (i?.target === "sesi") {
    if (!UUID.test(String(i.slotId))) galat.target = "Pilih sesinya.";
    else {
      const { data } = await k.db.from("jadwal_template").select("id").eq("id", i.slotId).eq("tenant_id", k.tenant.id).maybeSingle();
      if (!data) galat.target = "Sesi tidak ditemukan."; else slotId = i.slotId;
    }
  } else if (i?.target !== "semua") {
    if (!UUID.test(String(i?.target))) galat.target = "Pilih tujuan.";
    else {
      const { data } = await k.db.from("pengajar").select("id").eq("id", i.target).eq("tenant_id", k.tenant.id).maybeSingle();
      if (!data) galat.target = "Pelatih tidak ditemukan."; else pengajarId = i.target;
    }
  }
  if (Object.keys(galat).length > 0) return { ok: false, pesan: "Periksa isian pemberitahuan.", galat };

  const { data, error } = await k.db.from("pemberitahuan").insert({
    tenant_id: k.tenant.id, jenis: i.jenis, judul: i.judul.trim(), isi: i.isi.trim(), penulis_user_id: k.userId, penulis_nama: k.namaPengguna || "Pemilik",
    untuk_pengajar_id: pengajarId, untuk_slot_id: slotId,
  }).select(KOLOM_INFO).single();
  const baris = data ? dariBarisInfo(data as unknown as BarisInfoDb) : null;
  return error || !baris ? { ok: false, pesan: "Pemberitahuan belum terkirim. Coba lagi sebentar." } : { ok: true, info: baris };
}

export async function hapusInfo(id: string): Promise<{ ok: true } | { ok: false; pesan: string }> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pemberitahuan tidak ditemukan." };
  const { error } = await k.db.from("pemberitahuan").delete().eq("id", id).eq("tenant_id", k.tenant.id);
  return error ? { ok: false, pesan: "Belum terhapus. Coba lagi sebentar." } : { ok: true };
}
