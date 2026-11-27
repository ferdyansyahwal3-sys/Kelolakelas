"use server";
import { bolehUbahData } from "@/lib/langganan";
import { pesanGalatJadwal, type MuatanKabar } from "@/lib/permintaanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export type HasilAbsen = { ok: true } | { ok: false; pesan: string };

/** Simpan satu absen (status null = batalkan). Aturan sisa sesi/masa berlaku diperiksa di layar; server memastikan slot, tanggal, dan kepesertaan. */
export async function absenSesi(jadwalId: string, tanggal: string, muridId: string, status: "hadir" | "izin" | "alpa" | null): Promise<HasilAbsen> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(jadwalId)) || !UUID.test(String(muridId)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  if (status !== null && !["hadir", "izin", "alpa"].includes(String(status))) return { ok: false, pesan: "Status tidak valid." };
  const { error } = await k.db.rpc("absen", { p_jadwal: jadwalId, p_tanggal: tanggal, p_murid: muridId, p_status: status });
  return error ? { ok: false, pesan: pesanGalatJadwal(error, "Absen belum tersimpan. Coba lagi sebentar.") } : { ok: true };
}

export type HasilGanti = { ok: true; ditutup: { minta: string[]; tukar: string[] } } | { ok: false; pesan: string };

/** Ganti pelatih sekali untuk satu sesi (slot + tanggal). pengajarId null = kembalikan ke pelatih tetap. Aturan diulang di fungsi database.
 *  Permintaan/pengajuan yang menunggu untuk sesi yang sama ditutup database; id-nya dikembalikan (untuk kabar ke pemohon). */
export async function gantiPelatihSekali(jadwalId: string, tanggal: string, pengajarId: string | null): Promise<HasilGanti> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(jadwalId)) || !TANGGAL.test(String(tanggal)) || (pengajarId !== null && !UUID.test(String(pengajarId)))) return { ok: false, pesan: "Data tidak valid." };
  const { data, error } = await k.db.rpc("ganti_pelatih_set", { p_jadwal: jadwalId, p_tanggal: tanggal, p_pengajar: pengajarId });
  if (error) return { ok: false, pesan: pesanGalatJadwal(error) };
  const d = (data ?? {}) as { minta?: unknown; tukar?: unknown };
  const daftar = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return { ok: true, ditutup: { minta: daftar(d.minta), tukar: daftar(d.tukar) } };
}

export type HasilAksi = { ok: true; id?: string; ditutup?: string[] } | { ok: false; pesan: string };

async function pemilik() {
  const k = await ambilKonteksOwner();
  if (!k) return { k: null, pesan: TAK_MASUK } as const;
  if (!bolehUbahData(k.akses.akses)) return { k: null, pesan: TUTUP } as const;
  return { k, pesan: "" } as const;
}

/** Setujui/tolak permintaan ganti pelatih. Setujui menjalankan ulang aturan di database lalu menulis `ganti_pelatih`. */
export async function putuskanMinta(id: string, setuju: boolean): Promise<HasilAksi> {
  const c = await pemilik();
  if (!c.k) return { ok: false, pesan: c.pesan };
  if (!UUID.test(String(id)) || typeof setuju !== "boolean") return { ok: false, pesan: "Data tidak valid." };
  const { error } = await c.k.db.rpc("minta_ganti_putuskan", { p_id: id, p_setuju: setuju });
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

/** Setujui/tolak pengajuan tukar jadwal. Setujui = sesi pindah hanya sekali itu (baris `pindah_jadwal`). */
export async function putuskanTukar(id: string, setuju: boolean): Promise<HasilAksi> {
  const c = await pemilik();
  if (!c.k) return { ok: false, pesan: c.pesan };
  if (!UUID.test(String(id)) || typeof setuju !== "boolean") return { ok: false, pesan: "Data tidak valid." };
  const { error } = await c.k.db.rpc("tukar_putuskan", { p_id: id, p_setuju: setuju });
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

/** Kembalikan sesi yang sudah dipindah ke tanggal/jam semula. */
export async function batalkanPindah(jadwalId: string, tanggalAsal: string): Promise<HasilAksi> {
  const c = await pemilik();
  if (!c.k) return { ok: false, pesan: c.pesan };
  if (!UUID.test(String(jadwalId)) || !TANGGAL.test(String(tanggalAsal))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await c.k.db.rpc("pindah_batalkan", { p_jadwal: jadwalId, p_tanggal_asal: tanggalAsal });
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

/** Jadwalkan murid yang izin ke sesi lain (pengganti). Mengembalikan id baris `sesi_pengganti`. */
export async function jadwalkanPenggantiDb(dariJadwalId: string, dariTanggal: string, muridId: string, keJadwalId: string, keTanggal: string): Promise<HasilAksi> {
  const c = await pemilik();
  if (!c.k) return { ok: false, pesan: c.pesan };
  if (![dariJadwalId, muridId, keJadwalId].every((x) => UUID.test(String(x))) || !TANGGAL.test(String(dariTanggal)) || !TANGGAL.test(String(keTanggal))) return { ok: false, pesan: "Data tidak valid." };
  const { data, error } = await c.k.db.rpc("pengganti_set", { p_dari_jadwal: dariJadwalId, p_dari_tanggal: dariTanggal, p_murid: muridId, p_ke_jadwal: keJadwalId, p_ke_tanggal: keTanggal });
  return error || typeof data !== "string" ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true, id: data };
}

export async function batalkanPenggantiDb(id: string): Promise<HasilAksi> {
  const c = await pemilik();
  if (!c.k) return { ok: false, pesan: c.pesan };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await c.k.db.rpc("pengganti_batal", { p_id: id });
  return error ? { ok: false, pesan: pesanGalatJadwal(error) } : { ok: true };
}

const JENIS_KABAR = ["ganti_disetujui", "ganti_masuk", "ganti_ditolak", "tukar_disetujui", "tukar_ditolak", "tukar_dibatalkan", "ganti_langsung"];
const KUNCI = /^[A-Za-z0-9_.:-]{3,120}$/;

/** Kabar hasil keputusan: ke pelatih (`kabar_pelatih`) dan ke murid tetap sesi itu (`pemberitahuan` untuk slot, hilang setelah tanggal sesinya).
 *  Kunci = id kejadian, jadi mengirim keputusan yang sama dua kali tidak menggandakan (abaikan duplikat). Pelatih/slot HARUS milik usaha ini (kunci asing gabungan di database). */
export async function kirimKabarKeputusan(m: MuatanKabar): Promise<HasilAksi> {
  const c = await pemilik();
  if (!c.k) return { ok: false, pesan: c.pesan };
  const kabar = Array.isArray(m?.kabar) ? m.kabar : [];
  const info = Array.isArray(m?.info) ? m.info : [];
  if (kabar.length > 6 || info.length > 3) return { ok: false, pesan: "Data tidak valid." };
  const teks = (v: unknown, maks: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, maks);
  for (const x of kabar) if (!KUNCI.test(String(x?.kunci)) || !UUID.test(String(x?.untukPelatihId)) || !JENIS_KABAR.includes(String(x?.jenis))) return { ok: false, pesan: "Data tidak valid." };
  for (const x of info) if (!KUNCI.test(String(x?.kunci)) || !UUID.test(String(x?.untukSlotId)) || (x.sampaiTgl !== null && !TANGGAL.test(String(x.sampaiTgl)))) return { ok: false, pesan: "Data tidak valid." };
  const tid = c.k.tenant.id;
  const dibatasi = { onConflict: "tenant_id,kunci", ignoreDuplicates: true } as const;
  if (kabar.length > 0) {
    const { error } = await c.k.db.from("kabar_pelatih").upsert(kabar.map((x) => ({ tenant_id: tid, untuk_pengajar_id: x.untukPelatihId, kunci: x.kunci, jenis: x.jenis, judul: teks(x.judul, 120), isi: teks(x.isi, 600) })), dibatasi);
    if (error) { console.error("[kabar_pelatih]", error.code, error.message); return { ok: false, pesan: "Kabar untuk pelatih belum terkirim." }; }
  }
  if (info.length > 0) {
    const { error } = await c.k.db.from("pemberitahuan").upsert(info.map((x) => ({
      tenant_id: tid, kunci: x.kunci, jenis: "tidak_hadir", judul: teks(x.judul, 80), isi: teks(x.isi, 500), penulis_user_id: c.k.userId, penulis_nama: "Pemilik",
      untuk_pengajar_id: null, untuk_slot_id: x.untukSlotId, sampai_tgl: x.sampaiTgl,
    })), dibatasi);
    if (error) { console.error("[pemberitahuan keputusan]", error.code, error.message); return { ok: false, pesan: "Info untuk murid belum terkirim." }; }
  }
  return { ok: true };
}
