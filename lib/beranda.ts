import type { SlotJadwal } from "./jadwal";
import { menit } from "./jadwal";
import { hargaPerSesi, labelJenis, type KategoriPaket, type PaketOwner } from "./paket";
import type { AturanSesi } from "./pengaturan";
import { nomorHari, tambahHari } from "./sesi";
import { hitungSlot } from "./slot";

// ---------- WhatsApp ----------

/** Nomor Indonesia ke format internasional tanpa plus: 0812… / +62812… / 62812… → 62812… Mengembalikan null bila bukan nomor yang masuk akal. */
export function normalisasiWa(nomor: string): string | null {
  const angka = nomor.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(angka)) return null;
  let n = angka.replace(/^\+/, "");
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  else if (n.startsWith("8")) n = `62${n}`;
  if (!/^62\d{8,13}$/.test(n)) return null;
  return n;
}

export function linkWa(nomor: string, pesan?: string): string | null {
  const n = normalisasiWa(nomor);
  if (!n) return null;
  return `https://wa.me/${n}${pesan ? `?text=${encodeURIComponent(pesan)}` : ""}`;
}

// ---------- Paket untuk halaman publik ----------

export interface PaketPublik extends PaketOwner { perSesi: number; label: string }
export interface KelompokPaket { kategori: KategoriPaket; judul: string; paket: PaketPublik[] }

/** Hanya paket aktif, per kategori, dari yang paling murah. Kategori tanpa paket aktif tidak ditampilkan. */
export function kelompokPaket(paket: PaketOwner[]): KelompokPaket[] {
  const judul: Record<KategoriPaket, string> = { anak: "Anak", dewasa: "Dewasa" };
  return (["anak", "dewasa"] as const)
    .map((kategori) => ({
      kategori,
      judul: judul[kategori],
      paket: paket
        .filter((p) => p.aktif && p.kategori === kategori)
        .sort((a, b) => a.harga - b.harga || a.jumlahSesi - b.jumlahSesi)
        .map((p) => ({ ...p, perSesi: hargaPerSesi(p), label: `${labelJenis[p.jenis]} · ${p.jumlahSesi} sesi · berlaku ${p.masaBerlakuHari} hari${p.anggota ? ` · ${p.anggota} anggota` : ""}` })),
    }))
    .filter((k) => k.paket.length > 0);
}

// ---------- Aturan singkat ----------

export function ringkasAturan(a: AturanSesi, sebutSesi: string): string[] {
  const s = sebutSesi.trim() || "sesi";
  const daftar = [
    a.batasIzinJam > 0 ? `Izin paling lambat ${a.batasIzinJam} jam sebelum ${s} dimulai.` : `Izin bisa diajukan sampai ${s} dimulai.`,
    a.sesiPengganti ? `${s[0]!.toUpperCase()}${s.slice(1)} yang izin tepat waktu bisa diganti.` : `${s[0]!.toUpperCase()}${s.slice(1)} yang izin tidak diganti.`,
    `Paket berlaku ${a.masaBerlakuHari} hari, sisa ${s} hangus setelahnya.`,
  ];
  if (a.toleransiTelatMenit > 0) daftar.push(`Toleransi terlambat ${a.toleransiTelatMenit} menit.`);
  return daftar;
}

// ---------- Slot terdekat ----------

export interface SlotDekat { tanggal: string; slot: SlotJadwal; sisa: number }

/** Slot yang masih punya tempat, dari sekarang ke depan. `jamSekarang` format "HH.MM": slot hari ini yang jamnya sudah lewat tidak ditampilkan. */
export function slotTerdekat(jadwal: SlotJadwal[], hariIni: string, jamSekarang: string, banyak = 3, hariMaks = 14): SlotDekat[] {
  const hasil: SlotDekat[] = [];
  for (let i = 0; i <= hariMaks && hasil.length < banyak; i++) {
    const tanggal = tambahHari(hariIni, i);
    const harian = jadwal
      .filter((s) => s.hari === nomorHari(tanggal))
      .filter((s) => i > 0 || menit(s.jam) > menit(jamSekarang))
      .sort((a, b) => menit(a.jam) - menit(b.jam));
    for (const slot of harian) {
      const h = hitungSlot(slot.kuota, slot.terisi);
      if (h.sisa > 0 && hasil.length < banyak) hasil.push({ tanggal, slot, sisa: h.sisa });
    }
  }
  return hasil;
}
