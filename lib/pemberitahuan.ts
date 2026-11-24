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
  /** Bila diisi, info hilang dari portal murid setelah tanggal ini (mis. info ganti pelatih sekali ini, berlaku sampai hari sesinya). */
  sampaiTgl?: string;
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

/** `slotIds` = slot tempat murid ini terdaftar. Info khusus sesi hanya tampil bagi murid di sesi itu. `hariIni` (opsional) menyembunyikan info yang `sampaiTgl`-nya sudah lewat. */
export function untukMurid(daftar: Pemberitahuan[], pengajarId: string, slotIds: string[] = [], hariIni?: string): Pemberitahuan[] {
  return daftar
    .filter((p) => !(hariIni && p.sampaiTgl && p.sampaiTgl < hariIni))
    .filter((p) => (p.untukSlotId ? slotIds.includes(p.untukSlotId) : p.untukPengajarId === null || p.untukPengajarId === pengajarId))
    .sort((a, b) => (a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : 0));
}

// ---------- Kabar untuk pelatih (bukan untuk murid): hasil keputusan pemilik atas permintaan ganti pelatih ----------

export type JenisKabar = "ganti_disetujui" | "ganti_masuk" | "ganti_ditolak" | "tukar_disetujui" | "tukar_ditolak" | "tukar_dibatalkan" | "ganti_langsung";

export interface KabarPelatih {
  id: string;
  untukPelatihId: string;
  jenis: JenisKabar;
  judul: string;
  isi: string;
  tgl: string; // yyyy-mm-dd
  dibaca: boolean;
}

export const labelKabar: Record<JenisKabar, string> = { ganti_disetujui: "Disetujui", ganti_masuk: "Sesi tambahan", ganti_ditolak: "Ditolak", tukar_disetujui: "Jadwal dipindah", tukar_ditolak: "Ditolak", tukar_dibatalkan: "Pindah dibatalkan", ganti_langsung: "Diganti pemilik" };

/** Menambah item baru di depan; id yang sudah ada dilewati, jadi memproses keputusan yang sama dua kali tidak menggandakan pemberitahuan. */
export function gabungById<T extends { id: string }>(lama: T[], baru: T[]): T[] {
  const ada = new Set(lama.map((x) => x.id));
  const tambah: T[] = [];
  for (const b of baru) {
    if (ada.has(b.id)) continue;
    ada.add(b.id);
    tambah.push(b);
  }
  return [...tambah, ...lama];
}

/** Kabar milik satu pelatih, terbaru di atas. */
export function kabarUntuk(daftar: KabarPelatih[], pelatihId: string): KabarPelatih[] {
  return daftar.filter((k) => k.untukPelatihId === pelatihId).sort((a, b) => (a.tgl === b.tgl ? 0 : a.tgl < b.tgl ? 1 : -1));
}

export const belumDibaca = (daftar: KabarPelatih[], pelatihId: string) => daftar.filter((k) => k.untukPelatihId === pelatihId && !k.dibaca).length;

/** Pelatih hanya bisa menandai kabar miliknya sendiri. */
export function tandaiDibaca(daftar: KabarPelatih[], id: string, pelatihId: string): KabarPelatih[] {
  return daftar.map((k) => (k.id === id && k.untukPelatihId === pelatihId ? { ...k, dibaca: true } : k));
}

export function tandaiSemuaDibaca(daftar: KabarPelatih[], pelatihId: string): KabarPelatih[] {
  return daftar.map((k) => (k.untukPelatihId === pelatihId ? { ...k, dibaca: true } : k));
}
