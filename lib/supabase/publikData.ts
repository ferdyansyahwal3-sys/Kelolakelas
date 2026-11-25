import { klienAdmin } from "./server";
import { dariBarisJadwal, hitungTerisi, setTutup, type BarisJadwalDb, type BarisTutup } from "../berandaDb";
import type { SlotJadwal } from "../jadwal";
import { KOLOM_PAKET, daftarPaket, type BarisPaket } from "../paketDb";
import type { PaketOwner } from "../paket";
import { tambahHari } from "../sesi";
import { bolehTerimaPendaftaran, hitungAkses } from "../langganan";
import { dataLangganan, tanggalJakarta } from "../langgananData";
import type { StatusDaftar } from "../status";
import { labelSlot } from "../pendaftaranDb";
import type { Rekening } from "../rekening";

export interface UsahaPublik {
  id: string;
  nama: string;
  slug: string;
  kategori: string;
  kota: string;
  deskripsi: string;
  area: string;
  noWa: string;
  istilah: Record<string, string>;
  pengajar: { id: string; nama: string }[];
  jadwal: SlotJadwal[];
  paket: PaketOwner[];
  terisi: Map<string, number>;
  tutup: Set<string>;
  hariIni: string;
  jamSekarang: string;
  /** false bila langganan usaha ditangguhkan/berhenti: pendaftaran baru ditutup (aturan paket). */
  bolehDaftar: boolean;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const teks = (v: unknown, maks: number) => (typeof v === "string" ? v.trim().slice(0, maks) : "");

/**
 * Data PUBLIK satu usaha untuk halaman murid (tanpa login). Memakai service role, jadi HANYA kolom yang aman ditampilkan yang dipilih:
 * tanpa email/WA pelatih, tanpa data murid, tanpa rekening. Selalu disaring dengan tenant_id dari slug. null = tidak ada.
 */
export async function muatUsahaPublik(slug: string, hariKeDepan = 28): Promise<UsahaPublik | null> {
  if (!SLUG.test(slug) || slug.length > 40) return null;
  const db = klienAdmin();
  const { data: t, error } = await db.from("tenants").select("id, nama, slug, kategori, istilah, pengaturan, trial_ends_at").eq("slug", slug).maybeSingle();
  if (error) console.error("[muatUsahaPublik]", error.code, error.message);
  if (!t) return null;

  const sekarang = new Date();
  const hariIni = tanggalJakarta(sekarang);
  const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(sekarang).replace(":", ".");
  const sampai = tambahHari(hariIni, hariKeDepan);

  const [pengajar, jadwal, paket, sesi, tutup, sub] = await Promise.all([
    db.from("pengajar").select("id, nama").eq("tenant_id", t.id).eq("aktif", true).order("nama"),
    db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", t.id),
    db.from("paket").select(KOLOM_PAKET).eq("tenant_id", t.id).eq("aktif", true),
    db.from("peserta_tetap").select("jadwal_id").eq("tenant_id", t.id),
    db.from("slot_tutup").select("jadwal_id, tanggal").eq("tenant_id", t.id).gte("tanggal", hariIni).lte("tanggal", sampai),
    db.from("subscriptions").select("current_period_end, grace_until").eq("tenant_id", t.id).maybeSingle(),
  ]);
  for (const r of [pengajar, jadwal, paket, sesi, tutup]) if (r.error) console.error("[muatUsahaPublik]", r.error.code, r.error.message);

  const profil = ((t.pengaturan ?? {}) as { profil?: Record<string, unknown> }).profil ?? {};
  const baris = (jadwal.data ?? []) as unknown as BarisJadwalDb[];
  const lokasi = Array.from(new Set(baris.map((b) => b.lokasi).filter((x): x is string => !!x)));
  const kota = teks(profil.kota, 60);
  return {
    id: t.id as string,
    nama: t.nama as string,
    slug: t.slug as string,
    kategori: t.kategori as string,
    kota,
    deskripsi: teks(profil.deskripsi, 280),
    area: teks(profil.area, 80) || [lokasi.join(", "), kota].filter(Boolean).join(", "),
    noWa: teks(profil.noWa, 20),
    istilah: (t.istilah ?? {}) as Record<string, string>,
    pengajar: (pengajar.data ?? []) as { id: string; nama: string }[],
    jadwal: baris.map(dariBarisJadwal),
    paket: daftarPaket((paket.data ?? []) as unknown as BarisPaket[]),
    terisi: hitungTerisi((sesi.data ?? []) as { jadwal_id: string }[]),
    tutup: setTutup((tutup.data ?? []) as BarisTutup[]),
    hariIni,
    jamSekarang: jam,
    // Tanpa data langganan = tertutup (aman), bukan terbuka.
    bolehDaftar: sub.data ? bolehTerimaPendaftaran(hitungAkses(dataLangganan(t.trial_ends_at as string | null, sub.data.current_period_end as string | null, sub.data.grace_until as string | null), hariIni).akses) : false,
  };
}

// ---------- Bayar & cek status (murid tanpa login; kunci akses = kode 6 karakter atau nomor WA) ----------


export interface PendaftaranPublik {
  id: string;
  tenantId: string;
  kode: string;
  nama: string;
  noWa: string;
  slotLabel: string;
  total: number;
  status: StatusDaftar;
  jumlahBukti: number;
}

const KOLOM_PUBLIK = "id, tenant_id, kode, nama, no_wa, tanggal_mulai, total, status, paket_id, jadwal_template(hari, jam_mulai), pendaftaran_bukti(id)";
type BarisPublik = { id: string; tenant_id: string; kode: string; nama: string; no_wa: string; tanggal_mulai: string | null; total: number | null; status: string; paket_id: string | null; jadwal_template: { hari: number; jam_mulai: string } | { hari: number; jam_mulai: string }[] | null; pendaftaran_bukti: { id: string }[] | null };

async function paketHarga(tenantId: string, paketId: string | null): Promise<number> {
  if (!paketId) return 0;
  const { data } = await klienAdmin().from("paket").select("harga").eq("tenant_id", tenantId).eq("id", paketId).maybeSingle();
  return (data?.harga as number | undefined) ?? 0;
}

async function dariBaris(b: BarisPublik): Promise<PendaftaranPublik> {
  const jad = Array.isArray(b.jadwal_template) ? b.jadwal_template[0] ?? null : b.jadwal_template;
  return {
    id: b.id, tenantId: b.tenant_id, kode: b.kode, nama: b.nama, noWa: b.no_wa,
    slotLabel: labelSlot(b.tanggal_mulai, jad),
    total: b.total ?? (await paketHarga(b.tenant_id, b.paket_id)),
    status: b.status === "disetujui" || b.status === "ditolak" ? b.status : "menunggu",
    jumlahBukti: (b.pendaftaran_bukti ?? []).length,
  };
}

/** Pendaftaran milik usaha `slug` berdasarkan kode ATAU nomor WA (yang terbaru). Selalu disaring tenant dari slug. */
export async function cariPendaftaranPublik(slug: string, q: { jenis: "kode" | "wa"; nilai: string }): Promise<PendaftaranPublik | null> {
  if (!SLUG.test(slug) || slug.length > 40) return null;
  const db = klienAdmin();
  const { data: t } = await db.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (!t) return null;
  const kolom = q.jenis === "kode" ? "kode" : "no_wa";
  const { data, error } = await db.from("pendaftaran").select(KOLOM_PUBLIK).eq("tenant_id", t.id).eq(kolom, q.nilai).order("dibuat_pada", { ascending: false }).limit(1);
  if (error) console.error("[cariPendaftaranPublik]", error.code, error.message);
  const baris = ((data ?? []) as unknown as BarisPublik[])[0];
  return baris ? dariBaris(baris) : null;
}

/** Rekening tujuan transfer: memang untuk dilihat calon murid (sama dengan fungsi `rekening_publik`). */
export async function rekeningPublik(tenantId: string): Promise<Rekening[]> {
  const { data, error } = await klienAdmin().from("rekening_usaha").select("id, bank, nomor, atas_nama").eq("tenant_id", tenantId).order("bank");
  if (error) console.error("[rekeningPublik]", error.code, error.message);
  return ((data ?? []) as { id: string; bank: string; nomor: string; atas_nama: string }[]).map((r) => ({ id: r.id, bank: r.bank, nomor: r.nomor, atasNama: r.atas_nama }));
}
