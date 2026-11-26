"use server";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";
import { cariPromo, hitungTotal, type Promo } from "@/lib/harga";
import { slotPadaTanggal } from "@/lib/berandaDb";
import { buatKode, normalisasiWa, validasiPendaftaran, type Galat, type InputPendaftaran } from "@/lib/pendaftaran";
import { kategoriSlot, nomorHari, tambahHari } from "@/lib/sesi";
import { klienAdmin } from "@/lib/supabase/server";
import { muatUsahaPublik } from "@/lib/supabase/publikData";

export type HasilKirim = { ok: true; kode: string; total: number } | { ok: false; galat: Galat; pesan?: string };
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const MAKS_MENUNGGU_PER_WA = 3;

/** Promo dibaca di server (kode tidak pernah dikirim ke browser). Hanya yang belum kedaluwarsa dan masih ada kuota. */
async function promoSah(tenantId: string, kode: string | undefined, hariIni: string): Promise<Promo | null> {
  const bersih = (kode ?? "").trim().toUpperCase().slice(0, 30);
  if (!bersih) return null;
  const { data } = await klienAdmin().from("promo").select("kode, jenis, nilai, kuota, terpakai, kedaluwarsa, aktif").eq("tenant_id", tenantId).eq("kode", bersih).maybeSingle();
  if (!data || data.aktif === false) return null;
  if (data.kedaluwarsa && String(data.kedaluwarsa) < hariIni) return null;
  if (data.kuota !== null && (data.terpakai ?? 0) >= data.kuota) return null;
  if (data.jenis !== "persen" && data.jenis !== "nominal") return null;
  return cariPromo(bersih, [{ kode: data.kode as string, jenis: data.jenis, nilai: data.nilai as number }]);
}

export async function cekKodePromo(slug: string, kode: string): Promise<Promo | null> {
  if (!(await bolehLanjut("promo"))) return null;
  const u = await muatUsahaPublik(String(slug), 0);
  return u ? promoSah(u.id, String(kode), u.hariIni) : null;
}

export async function kirimPendaftaran(slug: string, input: InputPendaftaran): Promise<HasilKirim> {
  if (!(await bolehLanjut("daftar"))) return { ok: false, galat: {}, pesan: PESAN_TERLALU_SERING };
  const galat = validasiPendaftaran(input);
  if (Object.keys(galat).length > 0) return { ok: false, galat };

  const u = await muatUsahaPublik(String(slug));
  if (!u) return { ok: false, galat: {}, pesan: "Usaha tidak ditemukan." };
  if (!u.bolehDaftar) return { ok: false, galat: {}, pesan: "Pendaftaran baru sedang ditutup sementara. Hubungi usahanya lewat WhatsApp." };

  const tanggal = String(input.tanggal ?? "");
  const slot = u.jadwal.find((s) => s.id === input.slotId);
  const penuh = { ok: false as const, galat: { slotId: "Slot ini sudah penuh atau tidak tersedia." }, pesan: "Slot ini sudah penuh atau tidak tersedia, pilih slot lain." };
  if (!slot || !TANGGAL.test(tanggal) || tanggal < u.hariIni || tanggal > tambahHari(u.hariIni, 28) || nomorHari(tanggal) !== slot.hari) return penuh;
  const tersedia = slotPadaTanggal(u.jadwal, u.terisi, u.tutup, tanggal, tanggal === u.hariIni ? u.jamSekarang : undefined).find((s) => s.slot.id === slot.id);
  if (!tersedia || tersedia.sisa <= 0) return penuh;
  const kelas = kategoriSlot(slot.nama);
  if (kelas && kelas !== input.kategori) return { ok: false, galat: { kategori: "Kelas ini untuk " + (kelas === "anak" ? "anak" : "dewasa") + "." }, pesan: "Kelas ini tidak untuk kategori yang kamu pilih." };

  const paket = u.paket.find((p) => p.id === input.paketId && p.kategori === input.kategori);
  if (!paket) return { ok: false, galat: { paketId: "Paket tidak tersedia." } };

  const promo = await promoSah(u.id, input.kodePromo, u.hariIni);
  const { total } = hitungTotal(paket.harga, promo);
  const wa = normalisasiWa(input.noWa);

  const db = klienAdmin();
  const { count } = await db.from("pendaftaran").select("id", { count: "exact", head: true }).eq("tenant_id", u.id).eq("no_wa", wa).eq("status", "menunggu");
  if ((count ?? 0) >= MAKS_MENUNGGU_PER_WA) return { ok: false, galat: {}, pesan: "Sudah ada beberapa pendaftaran dari nomor ini yang menunggu persetujuan. Tunggu dulu atau hubungi usahanya." };

  for (let i = 0; i < 3; i++) {
    const kode = buatKode();
    const { error } = await db.from("pendaftaran").insert({
      tenant_id: u.id, kode, nama: input.nama.trim(), kategori: input.kategori,
      usia: input.kategori === "anak" ? input.usia : null, nama_ortu: input.kategori === "anak" ? (input.namaOrtu ?? "").trim() : null,
      no_wa: wa, paket_id: paket.id, jadwal_id: slot.id, tanggal_mulai: tanggal, kode_promo: promo?.kode ?? null,
      total, pengajar_id: slot.pengajarId,
    });
    if (!error) return { ok: true, kode, total };
    if (error.code !== "23505") { console.error("[kirimPendaftaran]", error.code, error.message); break; }
  }
  return { ok: false, galat: {}, pesan: "Pendaftaran belum tersimpan. Coba lagi sebentar." };
}
