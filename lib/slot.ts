export type StatusSlot = "tersedia" | "sisa" | "penuh" | "tutup";

export interface HitungSlot {
  status: StatusSlot;
  sisa: number;
  label: string;
}

/** Status slot dihitung murni dari kuota dan jumlah terisi saat tampil, tidak pernah disimpan. */
export function hitungSlot(kuota: number, terisi: number, ditutup = false): HitungSlot {
  if (ditutup) return { status: "tutup", sisa: 0, label: "Tutup" };
  const sisa = Math.max(0, kuota - terisi);
  if (kuota <= 0 || sisa === 0) return { status: "penuh", sisa: 0, label: "Penuh" };
  if (sisa === kuota) return { status: "tersedia", sisa, label: "Tersedia" };
  return { status: "sisa", sisa, label: `Sisa ${sisa}` };
}

export const kelasStatusSlot: Record<StatusSlot, string> = {
  tersedia: "st st-free",
  sisa: "st st-few",
  penuh: "st st-full",
  tutup: "st st-full",
};
