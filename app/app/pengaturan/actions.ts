"use server";
import { normalisasiWa } from "@/lib/beranda";
import { bolehUbahData } from "@/lib/langganan";
import { validasiPengaturan, type Galat, type Pengaturan } from "@/lib/pengaturan";
import { pesanGalatPengaturan } from "@/lib/pengaturanDb";
import { validasiRekening } from "@/lib/rekening";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

const TUTUP = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";
const TAK_MASUK = "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";

export type HasilPengaturan = { ok: true } | { ok: false; pesan: string; galat?: Galat };

export async function simpanPengaturan(p: Pengaturan): Promise<HasilPengaturan> {
  const k = await ambilKonteksOwner();
  if (!k) return { ok: false, pesan: TAK_MASUK };
  if (!bolehUbahData(k.akses.akses)) return { ok: false, pesan: TUTUP };

  const galat: Galat = { ...validasiPengaturan(p), ...validasiRekening(p?.rekening ?? []) };
  const wa = (p?.profil?.noWa ?? "").trim();
  if (wa && !normalisasiWa(wa)) galat["profil.noWa"] = "Nomor WhatsApp belum benar.";
  if ((p?.profil?.area ?? "").length > 80) galat["profil.area"] = "Maksimal 80 karakter.";
  if (Object.keys(galat).length > 0) return { ok: false, pesan: "Ada isian yang perlu dibenahi.", galat };

  const { error } = await k.db.rpc("simpan_pengaturan", {
    p_data: {
      nama: p.profil.nama.trim(), slug: p.profil.slug, kategori: p.profil.kategori, tema: p.tema, istilah: p.istilah,
      profil: { kota: p.profil.kota.trim(), deskripsi: p.profil.deskripsi.trim(), area: (p.profil.area ?? "").trim(), noWa: wa ? normalisasiWa(wa) : "" },
      aturan: p.aturan, templat: p.templat,
      rekening: p.rekening.map((r) => ({ id: r.id, bank: r.bank, nomor: r.nomor, atasNama: r.atasNama })),
    },
  });
  return error ? { ok: false, pesan: pesanGalatPengaturan(error) } : { ok: true };
}
