"use server";
import { paketContoh, promoContoh, slotContoh } from "@/lib/contoh";
import { cariPromo, hitungTotal } from "@/lib/harga";
import { buatKode, validasiPendaftaran, type Galat, type InputPendaftaran } from "@/lib/pendaftaran";
import { hitungSlot } from "@/lib/slot";

export type HasilKirim = { ok: true; kode: string; total: number } | { ok: false; galat: Galat; pesan?: string };

export async function kirimPendaftaran(input: InputPendaftaran): Promise<HasilKirim> {
  const galat = validasiPendaftaran(input);
  if (Object.keys(galat).length > 0) return { ok: false, galat };

  const slot = slotContoh.find((s) => s.id === input.slotId);
  if (!slot || hitungSlot(slot.kuota, slot.terisi).status === "penuh") {
    return { ok: false, galat: { slotId: "Slot ini sudah penuh." }, pesan: "Slot ini sudah penuh, pilih slot lain." };
  }
  const paket = paketContoh.find((p) => p.id === input.paketId && p.kategori === input.kategori);
  if (!paket) return { ok: false, galat: { paketId: "Paket tidak tersedia." } };

  const promo = cariPromo(input.kodePromo ?? "", promoContoh);
  const { total } = hitungTotal(paket.harga, promo);

  // Belum ada database: pendaftaran belum disimpan. Dengan Supabase di sini insert ke tabel pendaftaran
  // (status 'menunggu'); kuota promo baru dihitung saat tagihan lunas.
  return { ok: true, kode: buatKode(), total };
}
