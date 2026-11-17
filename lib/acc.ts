import { hitungTotal, type Promo } from "./harga";
import { normalisasiWa } from "./pendaftaran";

export interface DataAcc {
  nama: string;
  kategori: "anak" | "dewasa";
  namaOrtu?: string;
  noWa: string;
}

export interface PaketAcc {
  id: string;
  harga: number;
  jumlahSesi: number;
}

export interface HasilAcc {
  murid: { nama: string; kategori: "anak" | "dewasa"; noWa: string; namaOrtu?: string };
  tagihan: { paketId: string; nominal: number; status: "belum"; jatuhTempo: string };
  sisaSesi: number;
}

/** Satu klik ACC = murid baru + satu tagihan. Nominal dihitung dari paket dan promo, jatuh tempo 7 hari. */
export function buatMuridDanTagihan(p: DataAcc, paket: PaketAcc, promo: Promo | null, sekarang: Date): HasilAcc {
  const tempo = new Date(sekarang.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    murid: { nama: p.nama, kategori: p.kategori, noWa: normalisasiWa(p.noWa), namaOrtu: p.namaOrtu },
    tagihan: { paketId: paket.id, nominal: hitungTotal(paket.harga, promo).total, status: "belum", jatuhTempo: tempo.toISOString().slice(0, 10) },
    sisaSesi: paket.jumlahSesi,
  };
}

const rupiah = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;

export function pesanWa(jenis: "acc" | "tolak", d: { nama: string; usaha: string; slot: string; total: number }): string {
  if (jenis === "tolak") {
    return `Halo ${d.nama}, terima kasih sudah mendaftar di ${d.usaha}. Mohon maaf, pendaftaran untuk ${d.slot} belum bisa kami terima. Silakan pilih slot lain di link pendaftaran ya.`;
  }
  return `Halo ${d.nama}, pendaftaran kamu di ${d.usaha} untuk ${d.slot} sudah disetujui dan pembayaran ${rupiah(d.total)} sudah kami terima. Sampai jumpa di sesi pertama!`;
}

export function linkWa(noWa: string, pesan: string): string {
  return `https://wa.me/${normalisasiWa(noWa)}?text=${encodeURIComponent(pesan)}`;
}
