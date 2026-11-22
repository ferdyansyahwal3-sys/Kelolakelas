import { bentrok, normalisasiJam, type SlotJadwal } from "./jadwal";
import { gantiPelatih, nomorHari, pelatihSesi, tambahHari, type GantiPelatih } from "./sesi";

// ---------- Catatan perkembangan singkat ----------

export const CATATAN_MIN = 3;
export const CATATAN_MAKS = 200;

export type HasilCatatan = { ok: true; teks: string } | { ok: false; galat: string };

export function validasiCatatan(teks: string): HasilCatatan {
  const rapi = teks.replace(/\s+/g, " ").trim();
  if (rapi.length < CATATAN_MIN) return { ok: false, galat: "Tulis minimal beberapa kata." };
  if (rapi.length > CATATAN_MAKS) return { ok: false, galat: `Maksimal ${CATATAN_MAKS} karakter, ringkas saja.` };
  return { ok: true, teks: rapi };
}

// ---------- Ajukan tukar jadwal ----------

export type StatusTukar = "menunggu" | "disetujui" | "ditolak";

export interface PengajuanTukar {
  id: string;
  slotId: string;
  tanggalAsal: string;
  tanggalBaru: string;
  jamBaru: string;
  alasan: string;
  status: StatusTukar;
}

export interface InputTukar { slotId: string; tanggalAsal: string; tanggalBaru: string; jamBaru: string; alasan: string }
export type GalatTukar = Partial<Record<"tanggalBaru" | "jamBaru" | "alasan" | "umum", string>>;
export type HasilTukar = { ok: true; pengajuan: Omit<PengajuanTukar, "id" | "status"> } | { ok: false; galat: GalatTukar };

export const TUKAR_HARI_MAKS = 60;
export const ALASAN_MIN = 5;
export const ALASAN_MAKS = 200;

/** `jadwalSaya` = semua slot milik pelatih yang mengajukan. Tukar yang masih menunggu ikut menutup jam itu supaya tidak dobel. */
export function validasiTukar(input: InputTukar, hariIni: string, jadwalSaya: SlotJadwal[], pengajuan: PengajuanTukar[]): HasilTukar {
  const galat: GalatTukar = {};
  const slot = jadwalSaya.find((s) => s.id === input.slotId);
  if (!slot) return { ok: false, galat: { umum: "Slot tidak ditemukan." } };
  if (nomorHari(input.tanggalAsal) !== slot.hari) return { ok: false, galat: { umum: "Tanggal asal tidak cocok dengan hari slot." } };
  if (input.tanggalAsal < hariIni) return { ok: false, galat: { umum: "Sesi yang sudah lewat tidak bisa ditukar." } };
  if (pengajuan.some((p) => p.status === "menunggu" && p.slotId === input.slotId && p.tanggalAsal === input.tanggalAsal)) {
    return { ok: false, galat: { umum: "Sesi ini sudah punya pengajuan yang menunggu persetujuan." } };
  }

  const jam = normalisasiJam(input.jamBaru);
  if (!jam) galat.jamBaru = "Isi jam seperti 16.00.";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggalBaru) || Number.isNaN(Date.parse(input.tanggalBaru))) galat.tanggalBaru = "Pilih tanggal baru.";
  else if (input.tanggalBaru < hariIni) galat.tanggalBaru = "Tanggal baru tidak boleh di masa lalu.";
  else if (input.tanggalBaru > tambahHari(hariIni, TUKAR_HARI_MAKS)) galat.tanggalBaru = `Maksimal ${TUKAR_HARI_MAKS} hari ke depan.`;

  const alasan = input.alasan.replace(/\s+/g, " ").trim();
  if (alasan.length < ALASAN_MIN) galat.alasan = "Tulis alasannya singkat, supaya pemilik dan murid paham.";
  else if (alasan.length > ALASAN_MAKS) galat.alasan = `Maksimal ${ALASAN_MAKS} karakter.`;

  if (!galat.jamBaru && !galat.tanggalBaru && jam) {
    if (input.tanggalBaru === input.tanggalAsal && jam === slot.jam) galat.jamBaru = "Sama dengan jadwal sekarang.";
    else {
      const tujuan = { jam, durasi: slot.durasi };
      const hariBaru = nomorHari(input.tanggalBaru);
      const tabrak = jadwalSaya.find((s) => s.hari === hariBaru && !(s.id === slot.id && input.tanggalBaru === input.tanggalAsal) && bentrok(tujuan, s));
      const tabrakPengajuan = pengajuan.find((p) => p.status === "menunggu" && p.tanggalBaru === input.tanggalBaru && p.slotId !== slot.id && bentrok(tujuan, { jam: p.jamBaru, durasi: jadwalSaya.find((s) => s.id === p.slotId)?.durasi ?? 60 }));
      if (tabrak) galat.jamBaru = `Bentrok dengan ${tabrak.nama} ${tabrak.jam}.`;
      else if (tabrakPengajuan) galat.jamBaru = `Bentrok dengan pengajuan lain jam ${tabrakPengajuan.jamBaru}.`;
    }
  }

  if (Object.keys(galat).length > 0) return { ok: false, galat };
  return { ok: true, pengajuan: { slotId: input.slotId, tanggalAsal: input.tanggalAsal, tanggalBaru: input.tanggalBaru, jamBaru: jam!, alasan } };
}

// ---------- Minta ganti pelatih untuk satu jadwal (pelatih mengajukan, owner menyetujui) ----------

export type StatusMinta = "menunggu" | "disetujui" | "ditolak";

export interface PermintaanGanti {
  id: string;
  slotId: string;
  tanggal: string;
  dariId: string; // pelatih yang memegang sesi dan meminta
  keId: string; // pelatih pengganti yang diusulkan
  alasan: string;
  status: StatusMinta;
  dibuat: string; // yyyy-mm-dd
  diputuskan?: string; // yyyy-mm-dd
}

export type GalatMinta = Partial<Record<"keId" | "alasan" | "umum", string>>;
export type HasilMinta = { ok: true; permintaan: Omit<PermintaanGanti, "id"> } | { ok: false; galat: GalatMinta };

interface KonteksGanti { hariIni: string; jadwal: SlotJadwal[]; ganti: GantiPelatih[]; pelatih: { id: string; nama: string }[]; permintaan: PermintaanGanti[] }

/** Pelatih hanya bisa meminta untuk sesi yang sedang ia pegang. Aturan bentrok sama dengan saat owner mengganti langsung, jadi usulan yang mustahil ditolak sejak awal. */
export function ajukanGanti(k: KonteksGanti, dariId: string, slotId: string, tanggal: string, keId: string, alasanMentah: string): HasilMinta {
  const slot = k.jadwal.find((s) => s.id === slotId);
  if (!slot || slot.hari !== nomorHari(tanggal)) return { ok: false, galat: { umum: "Slot tidak ada di tanggal itu." } };
  if (pelatihSesi(slot, tanggal, k.ganti) !== dariId) return { ok: false, galat: { umum: "Kamu hanya bisa meminta untuk sesi yang kamu pegang." } };
  if (k.permintaan.some((p) => p.status === "menunggu" && p.slotId === slotId && p.tanggal === tanggal)) return { ok: false, galat: { umum: "Sesi ini sudah punya permintaan yang menunggu persetujuan." } };
  const galat: GalatMinta = {};
  const alasan = alasanMentah.replace(/\s+/g, " ").trim();
  if (alasan.length < ALASAN_MIN) galat.alasan = "Tulis alasannya singkat, supaya pemilik paham.";
  else if (alasan.length > ALASAN_MAKS) galat.alasan = `Maksimal ${ALASAN_MAKS} karakter.`;
  if (!keId) galat.keId = "Pilih pelatih pengganti.";
  else if (keId === dariId) galat.keId = "Pilih pelatih lain.";
  else {
    const coba = gantiPelatih(k.jadwal, k.ganti, k.pelatih, k.hariIni, slotId, tanggal, keId);
    if (!coba.ok) galat.keId = coba.galat;
  }
  if (Object.keys(galat).length > 0) return { ok: false, galat };
  return { ok: true, permintaan: { slotId, tanggal, dariId, keId, alasan, status: "menunggu", dibuat: k.hariIni } };
}

export type HasilKeputusan = { ok: true; permintaan: PermintaanGanti[]; ganti: GantiPelatih[]; pesan: string } | { ok: false; galat: string };

/** Keadaan bisa berubah sejak diajukan (mis. pelatih pengganti sudah dapat sesi lain), jadi aturan dijalankan lagi saat disetujui. */
export function setujuiMinta(k: KonteksGanti, id: string): HasilKeputusan {
  const p = k.permintaan.find((x) => x.id === id);
  if (!p) return { ok: false, galat: "Permintaan tidak ditemukan." };
  if (p.status !== "menunggu") return { ok: false, galat: "Permintaan ini sudah diputuskan." };
  const h = gantiPelatih(k.jadwal, k.ganti, k.pelatih, k.hariIni, p.slotId, p.tanggal, p.keId);
  if (!h.ok) return { ok: false, galat: h.galat };
  return { ok: true, ganti: h.ganti, pesan: h.pesan, permintaan: k.permintaan.map((x) => (x.id === id ? { ...x, status: "disetujui" as const, diputuskan: k.hariIni } : x)) };
}

export function tolakMinta(permintaan: PermintaanGanti[], id: string, hariIni: string): { ok: true; permintaan: PermintaanGanti[] } | { ok: false; galat: string } {
  const p = permintaan.find((x) => x.id === id);
  if (!p) return { ok: false, galat: "Permintaan tidak ditemukan." };
  if (p.status !== "menunggu") return { ok: false, galat: "Permintaan ini sudah diputuskan." };
  return { ok: true, permintaan: permintaan.map((x) => (x.id === id ? { ...x, status: "ditolak" as const, diputuskan: hariIni } : x)) };
}

/** Pemohon boleh menarik permintaannya selama masih menunggu. */
export function batalkanMinta(permintaan: PermintaanGanti[], id: string, pemohonId: string): { ok: true; permintaan: PermintaanGanti[] } | { ok: false; galat: string } {
  const p = permintaan.find((x) => x.id === id);
  if (!p || p.dariId !== pemohonId) return { ok: false, galat: "Permintaan tidak ditemukan." };
  if (p.status !== "menunggu") return { ok: false, galat: "Permintaan ini sudah diputuskan." };
  return { ok: true, permintaan: permintaan.filter((x) => x.id !== id) };
}
