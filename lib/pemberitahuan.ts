export type JenisInfo = "umum" | "tidak_hadir" | "aturan";
export type Peran = "owner" | "pelatih";

export interface Pemberitahuan {
  id: string;
  jenis: JenisInfo;
  judul: string;
  isi: string;
  penulis: string;
  untukPengajarId: string | null; // null = semua murid
  /** Bila diisi, hanya murid yang terdaftar di slot ini yang melihatnya (mengalahkan untukPengajarId). */
  untukSlotId?: string | null;
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

/** Pelatih hanya boleh menulis untuk sesi miliknya. */
export function slotDiizinkan(peran: Peran, pelatihId: string | null, pemilikSlotId: string): boolean {
  if (peran === "owner") return true;
  return pelatihId !== null && pemilikSlotId === pelatihId;
}

/** `slotIds` = slot tempat murid ini terdaftar. Info khusus sesi hanya tampil bagi murid di sesi itu. */
export function untukMurid(daftar: Pemberitahuan[], pengajarId: string, slotIds: string[] = []): Pemberitahuan[] {
  return daftar.filter((p) => (p.untukSlotId ? slotIds.includes(p.untukSlotId) : p.untukPengajarId === null || p.untukPengajarId === pengajarId)).sort((a, b) => (a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : 0));
}
