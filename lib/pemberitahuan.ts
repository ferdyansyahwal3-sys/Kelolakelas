export type JenisInfo = "umum" | "tidak_hadir" | "aturan";
export type Peran = "owner" | "pelatih";

export interface Pemberitahuan {
  id: string;
  jenis: JenisInfo;
  judul: string;
  isi: string;
  penulis: string;
  untukPengajarId: string | null; // null = semua murid
  tgl: string; // yyyy-mm-dd
}

export const labelInfo: Record<JenisInfo, string> = { umum: "Info", tidak_hadir: "Pelatih tidak hadir", aturan: "Peraturan baru" };

export function validasiPemberitahuan(i: { jenis: JenisInfo; judul: string; isi: string }): Record<string, string> {
  const g: Record<string, string> = {};
  if (!(i.jenis in labelInfo)) g.jenis = "Pilih jenis pemberitahuan.";
  const j = i.judul.trim().length;
  if (j < 3 || j > 80) g.judul = "Judul 3–80 karakter.";
  const s = i.isi.trim().length;
  if (s < 5 || s > 500) g.isi = "Isi 5–500 karakter.";
  return g;
}

/** Owner boleh menulis untuk semua murid atau satu pelatih. Pelatih hanya untuk muridnya sendiri. */
export function targetDiizinkan(peran: Peran, pelatihId: string | null, target: string | null): boolean {
  if (peran === "owner") return true;
  return pelatihId !== null && target === pelatihId;
}

export function untukMurid(daftar: Pemberitahuan[], pengajarId: string): Pemberitahuan[] {
  return daftar.filter((p) => p.untukPengajarId === null || p.untukPengajarId === pengajarId).sort((a, b) => (a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : 0));
}
