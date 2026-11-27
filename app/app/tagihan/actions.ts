"use server";
import { bolehUbahData } from "@/lib/langganan";
import { pesanGalatTagihan } from "@/lib/tagihanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { klienAdmin } from "@/lib/supabase/server";
import { emailPengingat, emailValid, kunciPengingatManual } from "@/lib/notifikasi";
import { muatTemplat } from "@/lib/notifikasiServer";
import { kirimEmail } from "@/lib/kirimEmail";
import { hariIniJakarta } from "@/lib/langgananData";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export type HasilTagihan = { ok: true } | { ok: false; pesan: string };

export async function lunasiTagihan(id: string, metode: string, tanggal: string): Promise<HasilTagihan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id)) || !TANGGAL.test(String(tanggal))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await k.db.rpc("tandai_lunas", { p_tagihan: id, p_metode: String(metode), p_tanggal: tanggal });
  return error ? { ok: false, pesan: pesanGalatTagihan(error) } : { ok: true };
}

export async function tolakBuktiTagihan(id: string): Promise<HasilTagihan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { error } = await k.db.rpc("tolak_bukti", { p_tagihan: id });
  return error ? { ok: false, pesan: pesanGalatTagihan(error) } : { ok: true };
}

/** Tautan sementara (2 menit) ke bukti bayar terbaru sebuah tagihan. Hanya pemilik; baris dibaca atas nama pemilik (RLS) dan disaring tenant. */
export async function urlBuktiTagihan(id: string): Promise<{ ok: true; url: string } | { ok: false; pesan: string }> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { data } = await k.db.from("tagihan_bukti").select("berkas_path").eq("tenant_id", k.tenant.id).eq("tagihan_id", id).order("diunggah_pada", { ascending: false }).limit(1).maybeSingle();
  if (!data || !String(data.berkas_path).startsWith(`${k.tenant.id}/`)) return { ok: false, pesan: "Belum ada berkas bukti untuk tagihan ini." };
  const { data: tanda, error } = await klienAdmin().storage.from("bukti-bayar").createSignedUrl(data.berkas_path as string, 120);
  if (error || !tanda) return { ok: false, pesan: "Bukti belum bisa dibuka. Coba lagi." };
  return { ok: true, url: tanda.signedUrl };
}

/** Kirim email pengingat tagihan ke murid/ortu (template "pengingat" dari Pengaturan). Satu kali per tagihan per hari. */
export async function kirimEmailTagihan(id: string): Promise<{ ok: true; pesan: string } | { ok: false; pesan: string }> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Data tidak valid." };
  const { data } = await k.db.from("tagihan").select("id, nominal, status, jatuh_tempo, murid(nama, nama_ortu, email), paket(nama)").eq("tenant_id", k.tenant.id).eq("id", id).maybeSingle();
  const b = data as unknown as { id: string; nominal: number; status: string; jatuh_tempo: string | null; murid: { nama: string; nama_ortu: string | null; email: string | null } | { nama: string; nama_ortu: string | null; email: string | null }[] | null; paket: { nama: string } | { nama: string }[] | null } | null;
  if (!b) return { ok: false, pesan: "Tagihan tidak ditemukan." };
  if (b.status !== "belum") return { ok: false, pesan: "Pengingat hanya untuk tagihan yang belum dibayar." };
  const m = Array.isArray(b.murid) ? b.murid[0] : b.murid;
  const paket = Array.isArray(b.paket) ? b.paket[0] : b.paket;
  if (!m || !emailValid(m.email)) return { ok: false, pesan: "Murid ini belum punya email. Isi di halaman detail murid, atau pakai tombol WA." };
  if (!b.jatuh_tempo) return { ok: false, pesan: "Tagihan belum punya tanggal jatuh tempo." };
  const templat = await muatTemplat(k.db, k.tenant.id);
  const isi = emailPengingat(k.tenant.nama, { nama: m.nama, namaOrtu: m.nama_ortu ?? undefined, usaha: k.tenant.nama, nominal: b.nominal, tempo: b.jatuh_tempo, paket: paket?.nama }, templat.pengingat);
  const h = await kirimEmail({ tenantId: k.tenant.id, jenis: "pengingat_tagihan", kunci: kunciPengingatManual(b.id, hariIniJakarta()), ke: String(m.email), isi, tagihanId: b.id });
  return h.ok ? { ok: true, pesan: `Email pengingat terkirim ke ${m.email}.` } : { ok: false, pesan: h.status === "duplikat" ? "Pengingat email untuk tagihan ini sudah dikirim hari ini." : h.pesan };
}
