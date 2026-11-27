"use server";
import { hashKode } from "@/lib/hashKode";
import { bolehUbahData } from "@/lib/langganan";
import { kodeUndangan, validasiUndangan } from "@/lib/pengajar";
import { pesanGalatPengajar } from "@/lib/pengajarDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { emailUndangan, kunciUndangan } from "@/lib/notifikasi";
import { asalSitus, kirimEmail } from "@/lib/kirimEmail";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HasilUndang = { ok: true; id: string; kode: string; email?: string } | { ok: false; pesan: string; galat?: Record<string, string> };
export type HasilBiasa = { ok: true } | { ok: false; pesan: string };

async function pemilik() {
  const k = await ambilKonteksOwner();
  if (!k) return { k: null, err: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { k: null, err: TUTUP };
  return { k, err: "" };
}

/** Kode undangan dibuat di server dan HANYA hash-nya yang disimpan; kode asli ditampilkan sekali kepada pemilik. */
export async function undangPengajar(i: { nama: string; email: string }): Promise<HasilUndang> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  const k = p.k;
  const masukan = { nama: String(i?.nama ?? "").slice(0, 60), email: String(i?.email ?? "").slice(0, 130) };
  const { data: ada } = await k.db.from("pengajar").select("email").eq("tenant_id", k.tenant.id).eq("aktif", true);
  const galat = validasiUndangan(masukan, ((ada ?? []) as { email: string | null }[]).map((x) => ({ email: x.email ?? "" })));
  if (Object.keys(galat).length > 0) return { ok: false, pesan: "Periksa isian undangan.", galat };
  const kode = kodeUndangan();
  const { data, error } = await k.db.rpc("buat_undangan", { p_nama: masukan.nama.trim(), p_email: masukan.email.trim().toLowerCase(), p_hash: hashKode(kode) });
  if (error) return { ok: false, pesan: pesanGalatPengajar(error) };
  // Best effort: undangan sudah tersimpan; kode tetap ditampilkan ke pemilik apa pun hasil email.
  const hash = hashKode(kode);
  const h = await kirimEmail({ tenantId: k.tenant.id, jenis: "undangan_pelatih", kunci: kunciUndangan(String(data), hash), ke: masukan.email, isi: emailUndangan(k.tenant.nama, { namaPelatih: masukan.nama.trim(), kode, link: `${asalSitus()}/undang/${kode}`, berlakuHari: 14 }) });
  const email = h.ok ? `Email undangan terkirim ke ${masukan.email.trim().toLowerCase()}.` : h.status === "tanpa_kunci" ? undefined : `Email undangan belum terkirim: ${h.pesan}`;
  return { ok: true, id: String(data), kode, email };
}

export async function batalkanUndangan(id: string): Promise<HasilBiasa> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pelatih tidak ditemukan." };
  const { error } = await p.k.db.rpc("batalkan_undangan", { p_pengajar: id });
  return error ? { ok: false, pesan: pesanGalatPengajar(error) } : { ok: true };
}

export async function ubahAktifPengajar(id: string, aktif: boolean): Promise<HasilBiasa> {
  const p = await pemilik();
  if (!p.k) return { ok: false, pesan: p.err };
  if (!UUID.test(String(id))) return { ok: false, pesan: "Pelatih tidak ditemukan." };
  const { error } = await p.k.db.rpc("ubah_aktif_pengajar", { p_pengajar: id, p_aktif: aktif === true });
  return error ? { ok: false, pesan: pesanGalatPengajar(error) } : { ok: true };
}
