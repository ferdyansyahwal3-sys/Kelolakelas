export interface Pembayaran {
  id: string;
  tgl: string; // yyyy-mm-dd
  nama: string;
  paket: string;
  nominal: number;
  pengajarId: string;
}

export type ModeBagi = "persen" | "nominal";
export interface PengajarBagi { id: string; nama: string; nilai: number }

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function namaBulan(bulan: string): string {
  const [y, m] = bulan.split("-");
  return `${NAMA_BULAN[Number(m) - 1]} ${y}`;
}

export function geserBulan(bulan: string, n: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const idx = y! * 12 + (m! - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

const dalamBulan = (daftar: Pembayaran[], bulan: string) => daftar.filter((p) => p.tgl.startsWith(bulan));

export function ringkasBulan(daftar: Pembayaran[], bulan: string) {
  const d = dalamBulan(daftar, bulan);
  const total = d.reduce((n, p) => n + p.nominal, 0);
  return { total, jumlah: d.length, rata: d.length === 0 ? 0 : Math.round(total / d.length) };
}

/** 6 bulan berakhir di `akhir`; bulan tanpa pembayaran tetap muncul dengan total 0. */
export function tren6(daftar: Pembayaran[], akhir: string): { bulan: string; total: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const bulan = geserBulan(akhir, i - 5);
    return { bulan, total: ringkasBulan(daftar, bulan).total };
  });
}

export function perubahan(sekarang: number, lalu: number): number | null {
  if (lalu === 0) return null;
  return Math.round(((sekarang - lalu) / lalu) * 100);
}

export function perPaket(daftar: Pembayaran[], bulan: string): { paket: string; total: number; jumlah: number }[] {
  const peta = new Map<string, { paket: string; total: number; jumlah: number }>();
  for (const p of dalamBulan(daftar, bulan)) {
    const s = peta.get(p.paket) ?? { paket: p.paket, total: 0, jumlah: 0 };
    s.total += p.nominal;
    s.jumlah += 1;
    peta.set(p.paket, s);
  }
  return Array.from(peta.values()).sort((a, b) => b.total - a.total);
}

export type BarisBagiHasil = { id: string; nama: string; nilai: number; omzet: number; bagianPengajar: number; bagianOwner: number; melebihi: boolean };

/**
 * Mode "persen": bagian pengajar = omzet x persen, dibulatkan ke bawah.
 * Mode "nominal": bagian pengajar = angka tetap per bulan, tidak pernah melebihi omzetnya.
 * Sisanya milik owner, jadi jumlahnya selalu pas dengan omzet.
 */
export function bagiHasil(daftar: Pembayaran[], bulan: string, pengajar: PengajarBagi[], mode: ModeBagi = "persen"): { baris: BarisBagiHasil[]; ownerTotal: number; pengajarTotal: number } {
  const d = dalamBulan(daftar, bulan);
  const baris = pengajar.map((g) => {
    const omzet = d.filter((p) => p.pengajarId === g.id).reduce((n, p) => n + p.nominal, 0);
    const mentah = mode === "persen" ? Math.floor((omzet * g.nilai) / 100) : g.nilai;
    const bagianPengajar = Math.min(mentah, omzet);
    return { id: g.id, nama: g.nama, nilai: g.nilai, omzet, bagianPengajar, bagianOwner: omzet - bagianPengajar, melebihi: mode === "nominal" && g.nilai > omzet };
  });
  return { baris, ownerTotal: baris.reduce((n, b) => n + b.bagianOwner, 0), pengajarTotal: baris.reduce((n, b) => n + b.bagianPengajar, 0) };
}

export const NOMINAL_MAKS = 100_000_000;

export function validasiNilai(nilai: number, mode: ModeBagi): string | null {
  if (!Number.isInteger(nilai) || nilai < 0) return "Isi angka 0 atau lebih.";
  if (mode === "persen" && nilai > 100) return "Isi 0–100.";
  if (mode === "nominal" && nilai > NOMINAL_MAKS) return "Maksimal Rp 100.000.000.";
  return null;
}
