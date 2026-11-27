// Murni (tanpa jaringan): logika ganti paket / pindah jenis. Batas diambil dari paketLangganan.ts (sama dengan tabel plan_batas di database,
// yang tetap jadi penjaga terakhir: fungsi ganti_paket menolak bila pemakaian melebihi batas paket tujuan).
import { PAKET, adalahPlan, type Jenis, type PlanKey } from "./paketLangganan";

export interface Pemakaian { murid: number; slot: number; paketJual: number; pelatih: number; pelatihLain: number; rekening: number }
export type KunciKelebihan = "murid" | "slot" | "paketJual" | "rekening" | "pelatih" | "pelatihLain";
export interface Kelebihan { kunci: KunciKelebihan; pakai: number; batas: number; lebih: number }

export interface InfoKelebihan { label: string; /** Halaman tempat pemilik mengurangi sendiri. */ href: string; aksi: string; catatan: string }

/** Teks + tautan tiap jenis kelebihan. Tidak ada yang dinonaktifkan atau dihapus otomatis: pemilik memilih sendiri. */
export const INFO_KELEBIHAN: Record<KunciKelebihan, InfoKelebihan> = {
  murid: { label: "Murid aktif", href: "/app/murid", aksi: "Pilih murid", catatan: "Nonaktifkan murid yang tidak dilanjutkan. Datanya tetap tersimpan dan bisa diaktifkan lagi nanti." },
  slot: { label: "Slot jadwal", href: "/app/jadwal", aksi: "Atur jadwal", catatan: "Hapus slot yang tidak dipakai (slot belum punya status nonaktif)." },
  paketJual: { label: "Paket yang dijual", href: "/app/paket", aksi: "Atur paket", catatan: "Nonaktifkan paket yang tidak dijual lagi. Paket tetap tersimpan." },
  rekening: { label: "Rekening pembayaran", href: "/app/pengaturan", aksi: "Atur rekening", catatan: "Hapus rekening yang tidak dipakai." },
  pelatih: { label: "Pelatih aktif", href: "/app/pengajar", aksi: "Atur pelatih", catatan: "Nonaktifkan pelatih yang tidak dilanjutkan. Riwayat dan gajinya tetap tersimpan." },
  pelatihLain: { label: "Pelatih selain kamu", href: "/app/pengajar", aksi: "Atur pelatih", catatan: "Guru Les hanya untuk pengajar tunggal. Nonaktifkan pelatih lain dulu; riwayat dan gajinya tetap tersimpan." },
};

const URUT: KunciKelebihan[] = ["pelatihLain", "pelatih", "murid", "slot", "paketJual", "rekening"];

/** Kelebihan pemakaian terhadap batas paket tujuan. Sama dengan hitungan ganti_paket di database. Urutan tetap. Kosong = muat. */
export function hitungKelebihan(p: Pemakaian, tujuan: PlanKey): Kelebihan[] {
  const b = PAKET[tujuan].batas;
  const cek = (kunci: KunciKelebihan, pakai: number, batas: number): Kelebihan[] => (Number.isFinite(batas) && pakai > batas ? [{ kunci, pakai, batas, lebih: pakai - batas }] : []);
  const hasil: Kelebihan[] = [
    ...(PAKET[tujuan].jenis === "guru_les" ? cek("pelatihLain", p.pelatihLain, 0) : cek("pelatih", p.pelatih, b.pelatih)),
    ...cek("murid", p.murid, b.murid), ...cek("slot", p.slot, b.slot), ...cek("paketJual", p.paketJual, b.paketJual), ...cek("rekening", p.rekening, b.rekening),
  ];
  return hasil.sort((a, c) => URUT.indexOf(a.kunci) - URUT.indexOf(c.kunci));
}

export type Arah = "sama" | "naik" | "turun" | "pindah_naik" | "pindah_turun";

/** Urutan harga normal: dipakai untuk memberi label naik/turun, termasuk lintas jenis. */
export function arahGanti(dari: PlanKey, ke: PlanKey): Arah {
  if (dari === ke) return "sama";
  const naik = PAKET[ke].hargaNormal > PAKET[dari].hargaNormal;
  if (PAKET[dari].jenis === PAKET[ke].jenis) return naik ? "naik" : "turun";
  return naik ? "pindah_naik" : "pindah_turun";
}

export const labelArah: Record<Arah, string> = { sama: "Paket sekarang", naik: "Naik paket", turun: "Turun paket", pindah_naik: "Pindah jenis (naik)", pindah_turun: "Pindah jenis (turun)" };

/** Catatan yang wajib dibaca sebelum konfirmasi. */
export function catatanGanti(dari: PlanKey, ke: PlanKey): string[] {
  const a = PAKET[dari].jenis, b = PAKET[ke].jenis;
  const c: string[] = [];
  if (a !== b) c.push(b === "guru_les"
    ? "Pindah ke Guru Les: menu Pengajar, gaji, ganti pelatih, dan halaman /pengajar disembunyikan. Data pelatih tetap tersimpan, dan kamu bisa pindah ke Agensi kapan saja."
    : "Pindah ke Agensi: fitur tim terbuka (undang pelatih, bagi hasil/gaji, ganti pelatih). Data yang ada ikut.");
  c.push("Berlaku langsung. Selisih harga belum ditagih; pembayaran online menyusul, jadi tidak ada dana yang dipotong sekarang.");
  return c;
}

export type HasilGanti =
  | { ok: true; plan: PlanKey; jenis: Jenis; berubahJenis: boolean }
  | { ok: false; galat: "melebihi_batas"; kelebihan: Kelebihan[] }
  | { ok: false; galat: "lain"; pesan: string };

const KUNCI: KunciKelebihan[] = ["murid", "slot", "paketJual", "rekening", "pelatih", "pelatihLain"];
const angka = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : null);

/** Membaca jsonb dari fungsi database. Bentuk tak dikenal ditolak (jadi galat), tidak pernah dianggap berhasil. */
export function bacaHasilGanti(x: unknown): HasilGanti {
  const o = (x && typeof x === "object" ? x : null) as Record<string, unknown> | null;
  if (!o) return { ok: false, galat: "lain", pesan: "Jawaban server tidak dikenal." };
  if (o.ok === true && adalahPlan(o.plan) && (o.jenis === "guru_les" || o.jenis === "agensi")) return { ok: true, plan: o.plan, jenis: o.jenis, berubahJenis: o.berubahJenis === true };
  if (o.ok === false && o.galat === "melebihi_batas" && Array.isArray(o.kelebihan)) {
    const kelebihan = o.kelebihan.flatMap((k) => {
      const r = k as Record<string, unknown>;
      const pakai = angka(r.pakai), batas = angka(r.batas), lebih = angka(r.lebih);
      return KUNCI.includes(r.kunci as KunciKelebihan) && pakai !== null && batas !== null && lebih !== null ? [{ kunci: r.kunci as KunciKelebihan, pakai, batas, lebih }] : [];
    });
    return { ok: false, galat: "melebihi_batas", kelebihan };
  }
  return { ok: false, galat: "lain", pesan: "Jawaban server tidak dikenal." };
}

export function bacaPemakaian(x: unknown): Pemakaian | null {
  const o = (x && typeof x === "object" ? x : null) as Record<string, unknown> | null;
  if (!o) return null;
  const v = (["murid", "slot", "paketJual", "pelatih", "pelatihLain", "rekening"] as const).map((k) => angka(o[k]));
  if (v.some((n) => n === null || n < 0)) return null;
  const [murid, slot, paketJual, pelatih, pelatihLain, rekening] = v as number[];
  return { murid: murid!, slot: slot!, paketJual: paketJual!, pelatih: pelatih!, pelatihLain: pelatihLain!, rekening: rekening! };
}

/** Pesan galat database (errcode P0001) ke kalimat untuk pemilik. */
export function pesanGalatGanti(message: string | undefined): string {
  const m = (message ?? "").trim();
  if (m === "paket_sama") return "Itu sudah paketmu sekarang.";
  if (m === "paket_tidak_dikenal") return "Paket tidak dikenal.";
  if (m === "tidak_masuk" || m === "bukan_pemilik") return "Sesi habis atau akunmu bukan pemilik usaha. Masuk lagi.";
  if (m === "langganan_tidak_ditemukan") return "Data langganan usahamu tidak ditemukan.";
  return "Paket belum bisa diganti. Coba lagi sebentar.";
}

/** Kalimat ringkas satu kelebihan, mis. "Murid aktif 15 dari batas 10: kurangi 5". */
export function kalimatKelebihan(k: Kelebihan): string {
  const i = INFO_KELEBIHAN[k.kunci];
  return k.kunci === "pelatihLain" ? `${i.label}: ${k.pakai} masih aktif, nonaktifkan ${k.lebih}` : `${i.label} ${k.pakai} dari batas ${k.batas}: kurangi ${k.lebih}`;
}
