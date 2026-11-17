export type Plan = "starter" | "pro";
export type StatusPengajar = "aktif" | "menunggu" | "nonaktif";

export interface PengajarOwner {
  id: string;
  nama: string;
  email: string;
  pemilik: boolean; // owner yang mengajar sendiri (Mode Solo)
  status: StatusPengajar;
}

export const BATAS_PENGAJAR: Record<Plan, number> = { starter: 1, pro: Infinity };

/** Pengajar yang menunggu undangan juga menghabiskan jatah paket, supaya tidak bisa diakali dengan banyak undangan. */
export function jatahTerpakai(daftar: Pick<PengajarOwner, "status">[]): number {
  return daftar.filter((p) => p.status !== "nonaktif").length;
}

export function bisaUndang(daftar: Pick<PengajarOwner, "status">[], plan: Plan): boolean {
  return jatahTerpakai(daftar) < BATAS_PENGAJAR[plan];
}

export interface InputUndangan { nama: string; email: string }

export function validasiUndangan(i: InputUndangan, ada: Pick<PengajarOwner, "email">[]): Record<string, string> {
  const g: Record<string, string> = {};
  const nama = i.nama.trim();
  const email = i.email.trim().toLowerCase();
  if (nama.length < 2 || nama.length > 40) g.nama = "Nama 2–40 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) g.email = "Email belum benar.";
  else if (ada.some((p) => p.email.toLowerCase() === email)) g.email = "Email ini sudah terdaftar.";
  return g;
}

export function kodeUndangan(): string {
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(b, (x) => huruf[x % huruf.length]).join("");
}
