import { bentrok, normalisasiJam, type SlotJadwal } from "./jadwal";
import type { KabarPelatih, Pemberitahuan } from "./pemberitahuan";
import { gantiPelatih, labelTanggal, nomorHari, pelatihSesi, sesiPadaTanggal, tambahHari, type Absensi, type GantiPelatih, type PindahJadwal, type Pengganti } from "./sesi";

export const KUNCI_PINDAH = "kk-pindah-jadwal";

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

export type StatusTukar = "menunggu" | "disetujui" | "ditolak" | "dibatalkan";

export interface PengajuanTukar {
  id: string;
  slotId: string;
  tanggalAsal: string;
  tanggalBaru: string;
  jamBaru: string;
  alasan: string;
  status: StatusTukar;
  /** Pelatih yang mengajukan (pemegang sesi saat itu). Pengajuan lama tanpa ini dianggap dari pemegang sesi pada tanggal asal. */
  pelatihId?: string;
  diputuskan?: string; // yyyy-mm-dd
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

interface KonteksGanti { hariIni: string; jadwal: SlotJadwal[]; ganti: GantiPelatih[]; pelatih: { id: string; nama: string }[]; permintaan: PermintaanGanti[]; /** Sesi yang sudah dipindah owner; sesi seperti itu tidak bisa lagi diminta ganti pelatih. */ pindah?: PindahJadwal[] }

const sudahDipindah = (pindah: PindahJadwal[] | undefined, slotId: string, tanggal: string) => (pindah ?? []).some((x) => x.slotId === slotId && x.tanggalAsal === tanggal);

/** Pelatih hanya bisa meminta untuk sesi yang sedang ia pegang. Aturan bentrok sama dengan saat owner mengganti langsung, jadi usulan yang mustahil ditolak sejak awal. */
export function ajukanGanti(k: KonteksGanti, dariId: string, slotId: string, tanggal: string, keId: string, alasanMentah: string): HasilMinta {
  const slot = k.jadwal.find((s) => s.id === slotId);
  if (!slot || slot.hari !== nomorHari(tanggal)) return { ok: false, galat: { umum: "Slot tidak ada di tanggal itu." } };
  if (pelatihSesi(slot, tanggal, k.ganti) !== dariId) return { ok: false, galat: { umum: "Kamu hanya bisa meminta untuk sesi yang kamu pegang." } };
  if (k.permintaan.some((p) => p.status === "menunggu" && p.slotId === slotId && p.tanggal === tanggal)) return { ok: false, galat: { umum: "Sesi ini sudah punya permintaan yang menunggu persetujuan." } };
  if (sudahDipindah(k.pindah, slotId, tanggal)) return { ok: false, galat: { umum: "Jadwal sesi ini sudah dipindah pemilik, ganti pelatih belum bisa diminta." } };
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
  if (sudahDipindah(k.pindah, p.slotId, p.tanggal)) return { ok: false, galat: "Jadwal sesi ini sudah dipindah, permintaan ganti pelatih tidak bisa dijalankan. Tolak saja." };
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

// ---------- Pemberitahuan saat permintaan ganti pelatih diputuskan ----------

export interface HasilKabarKeputusan {
  /** Kabar untuk pelatih (pemohon, dan pelatih pengganti bila disetujui). */
  kabar: KabarPelatih[];
  /** Info untuk portal murid; hanya dibuat bila disetujui dan sesi itu punya murid tetap. */
  info: Pemberitahuan[];
}

/**
 * Disetujui: pemohon, pelatih pengganti, dan murid tetap sesi itu diberi tahu.
 * Ditolak: hanya pemohon. Murid tidak terdampak (pelatih tetap sama) dan pelatih tujuan belum pernah diberi tahu soal permintaan ini.
 * Alasan dari pelatih tidak pernah ikut ke murid. Id dibuat dari id permintaan, jadi aman dipanggil ulang (digabung lewat `gabungById`).
 */
export function kabarKeputusan(
  p: PermintaanGanti, setuju: boolean,
  k: { hariIni: string; jadwal: SlotJadwal[]; pelatih: { id: string; nama: string }[]; pesertaTetap: Record<string, string[]> },
): HasilKabarKeputusan {
  const slot = k.jadwal.find((s) => s.id === p.slotId);
  if (!slot) return { kabar: [], info: [] };
  const nama = (id: string) => k.pelatih.find((x) => x.id === id)?.nama ?? "pelatih";
  const dari = nama(p.dariId);
  const ke = nama(p.keId);
  const tgl = labelTanggal(p.tanggal);
  const sesi = `${tgl} ${slot.jam}`;
  const nMurid = (k.pesertaTetap[p.slotId] ?? []).length;

  if (!setuju) {
    return {
      kabar: [{
        id: `kb-${p.id}-tolak`, untukPelatihId: p.dariId, jenis: "ganti_ditolak", tgl: k.hariIni, dibaca: false,
        judul: `Ditolak: ${sesi} tetap kamu yang pegang`,
        isi: `Pemilik menolak permintaan menyerahkan ${slot.nama} ${sesi} ke ${ke}. Kamu tetap memegang sesi ini. Hubungi pemilik bila perlu dibicarakan.`,
      }],
      info: [],
    };
  }

  const kabar: KabarPelatih[] = [
    {
      id: `kb-${p.id}-pemohon`, untukPelatihId: p.dariId, jenis: "ganti_disetujui", tgl: k.hariIni, dibaca: false,
      judul: `Disetujui: ${sesi} diserahkan ke ${ke}`,
      isi: `Pemilik menyetujui permintaanmu. ${slot.nama} ${sesi} dipegang ${ke} hanya sekali ini, sesinya sudah hilang dari jadwalmu. Minggu berikutnya kamu mengajar seperti biasa.${nMurid > 0 ? ` ${nMurid} murid di sesi ini sudah diberi tahu.` : ""}`,
    },
    {
      id: `kb-${p.id}-pengganti`, untukPelatihId: p.keId, jenis: "ganti_masuk", tgl: k.hariIni, dibaca: false,
      judul: `Kamu memegang ${sesi}`,
      isi: `Pemilik menugaskanmu menggantikan ${dari} di ${slot.nama} ${sesi}${slot.lokasi ? `, ${slot.lokasi}` : ""}, hanya sekali ini. ${nMurid > 0 ? `${nMurid} murid terdaftar tetap.` : "Belum ada murid tetap."} Sesinya sudah ada di jadwalmu.`,
    },
  ];
  const info: Pemberitahuan[] = nMurid === 0 ? [] : [{
    id: `kb-${p.id}-murid`, jenis: "tidak_hadir", penulis: "Pemilik", untukPengajarId: slot.pengajarId, untukSlotId: p.slotId, sampaiTgl: p.tanggal, tgl: k.hariIni,
    judul: `Sesi ${sesi} dipegang ${ke}`,
    isi: `${dari} tidak bisa mengajar ${slot.nama} ${tgl} pukul ${slot.jam}, jadi sesi itu dipegang ${ke} hanya sekali ini. Jam dan tempat tetap. Minggu berikutnya kembali seperti biasa.`,
  }];
  return { kabar, info };
}

// ---------- Owner memutuskan "ajukan tukar jadwal" dari pelatih ----------

export interface KonteksTukar {
  hariIni: string;
  jadwal: SlotJadwal[];
  pelatih: { id: string; nama: string }[];
  pesertaTetap: Record<string, string[]>;
  ganti: GantiPelatih[];
  pindah: PindahJadwal[];
  pengajuan: PengajuanTukar[];
  /** Permintaan ganti pelatih; yang masih menunggu untuk sesi yang sama menahan persetujuan tukar. */
  permintaan: PermintaanGanti[];
  /** Opsional: dipakai untuk mengecek masa berlaku paket murid di tanggal baru. */
  murid?: Record<string, { nama: string; berlakuSampai: string; aktif: boolean }>;
  /** Opsional (hanya ada di memori halaman Sesi): absen & murid pengganti yang sudah tercatat di sesi asal. */
  absensi?: Absensi;
  pengganti?: Pengganti[];
}

/** Pemohon pengajuan: yang tercatat, atau (pengajuan lama) pemegang sesi pada tanggal asal. */
export function pemohonTukar(p: PengajuanTukar, k: Pick<KonteksTukar, "jadwal" | "ganti">): string {
  if (p.pelatihId) return p.pelatihId;
  const slot = k.jadwal.find((s) => s.id === p.slotId);
  return slot ? pelatihSesi(slot, p.tanggalAsal, k.ganti) : "";
}

export type HasilSetujuiTukar = { ok: true; pengajuan: PengajuanTukar[]; pindah: PindahJadwal[]; pesan: string } | { ok: false; galat: string };

/**
 * Menjalankan ulang aturan saat disetujui: keadaan bisa berubah sejak diajukan (pelatih sudah dapat sesi lain di jam baru,
 * sesi sudah dipegang orang lain, paket murid habis, sesi sudah diabsen). Yang berubah hanya sesi itu, sekali itu.
 */
export function setujuiTukar(k: KonteksTukar, id: string): HasilSetujuiTukar {
  const p = k.pengajuan.find((x) => x.id === id);
  if (!p) return { ok: false, galat: "Pengajuan tidak ditemukan." };
  if (p.status !== "menunggu") return { ok: false, galat: "Pengajuan ini sudah diputuskan." };
  const slot = k.jadwal.find((s) => s.id === p.slotId);
  if (!slot || slot.hari !== nomorHari(p.tanggalAsal)) return { ok: false, galat: "Sesi asal tidak ada lagi di jadwal." };
  const jam = normalisasiJam(p.jamBaru);
  if (!jam) return { ok: false, galat: "Jam baru tidak valid." };
  if (p.tanggalAsal < k.hariIni) return { ok: false, galat: "Sesi asal sudah lewat, tidak bisa dipindah." };
  if (p.tanggalBaru < k.hariIni) return { ok: false, galat: "Tanggal baru sudah lewat." };
  if (p.tanggalBaru > tambahHari(k.hariIni, TUKAR_HARI_MAKS)) return { ok: false, galat: `Tanggal baru lebih dari ${TUKAR_HARI_MAKS} hari ke depan.` };
  if (p.tanggalBaru === p.tanggalAsal && jam === slot.jam) return { ok: false, galat: "Tanggal dan jam baru sama dengan jadwal sekarang." };
  if (k.pindah.some((x) => x.slotId === p.slotId && x.tanggalAsal === p.tanggalAsal)) return { ok: false, galat: "Sesi ini sudah dipindah." };
  if (k.permintaan.some((x) => x.status === "menunggu" && x.slotId === p.slotId && x.tanggal === p.tanggalAsal)) return { ok: false, galat: "Sesi ini juga punya permintaan ganti pelatih yang menunggu. Putuskan yang itu dulu." };

  const nama = (pid: string) => k.pelatih.find((x) => x.id === pid)?.nama ?? "pelatih";
  const pemegang = pelatihSesi(slot, p.tanggalAsal, k.ganti);
  const pemohon = pemohonTukar(p, k);
  if (pemegang !== pemohon) return { ok: false, galat: `Sesi ini sekarang dipegang ${nama(pemegang)}, bukan ${nama(pemohon)} yang mengajukan.` };

  if (k.absensi && Object.keys(k.absensi).some((x) => x.startsWith(`${p.slotId}|${p.tanggalAsal}|`))) return { ok: false, galat: "Sesi asal sudah mulai diabsen, tidak bisa dipindah." };
  if (k.pengganti?.some((x) => x.slotId === p.slotId && x.tanggal === p.tanggalAsal)) return { ok: false, galat: "Ada murid pengganti terjadwal di sesi asal. Batalkan dulu di Sesi dan absensi." };

  // Bentrok di tanggal baru: pelatih pemegang dan murid tetap sesi ini.
  const peserta = k.pesertaTetap[p.slotId] ?? [];
  const baru = { jam, durasi: slot.durasi };
  const lain = sesiPadaTanggal(k.jadwal, k.pesertaTetap, k.pengganti ?? [], p.tanggalBaru, k.ganti, k.pindah).filter((s) => !(s.slot.id === slot.id && p.tanggalBaru === p.tanggalAsal));
  const tabrakPelatih = lain.find((s) => s.pelatihId === pemegang && bentrok(baru, s.slot));
  if (tabrakPelatih) return { ok: false, galat: `${nama(pemegang)} sudah mengajar ${tabrakPelatih.slot.nama} jam ${tabrakPelatih.slot.jam} di ${labelTanggal(p.tanggalBaru)}.` };
  for (const mid of peserta) {
    const tabrakMurid = lain.find((s) => s.peserta.some((x) => x.muridId === mid) && bentrok(baru, s.slot));
    if (tabrakMurid) return { ok: false, galat: `${k.murid?.[mid]?.nama ?? "Seorang murid"} sudah ada di ${tabrakMurid.slot.nama} jam ${tabrakMurid.slot.jam} di ${labelTanggal(p.tanggalBaru)}.` };
  }
  for (const mid of peserta) {
    const m = k.murid?.[mid];
    if (m?.aktif && p.tanggalAsal <= m.berlakuSampai && p.tanggalBaru > m.berlakuSampai) return { ok: false, galat: `Paket ${m.nama} berakhir ${labelTanggal(m.berlakuSampai)}, sebelum tanggal baru.` };
  }

  const pindah: PindahJadwal = { slotId: p.slotId, tanggalAsal: p.tanggalAsal, tanggalBaru: p.tanggalBaru, jamBaru: jam };
  return {
    ok: true,
    pindah: [...k.pindah, pindah],
    pengajuan: k.pengajuan.map((x) => (x.id === id ? { ...x, status: "disetujui" as const, diputuskan: k.hariIni } : x)),
    pesan: `${slot.nama} ${labelTanggal(p.tanggalAsal)} ${slot.jam} pindah ke ${labelTanggal(p.tanggalBaru)} ${jam} (sekali ini saja).`,
  };
}

export function tolakTukar(pengajuan: PengajuanTukar[], id: string, hariIni: string): { ok: true; pengajuan: PengajuanTukar[] } | { ok: false; galat: string } {
  const p = pengajuan.find((x) => x.id === id);
  if (!p) return { ok: false, galat: "Pengajuan tidak ditemukan." };
  if (p.status !== "menunggu") return { ok: false, galat: "Pengajuan ini sudah diputuskan." };
  return { ok: true, pengajuan: pengajuan.map((x) => (x.id === id ? { ...x, status: "ditolak" as const, diputuskan: hariIni } : x)) };
}

/** Sama seperti `kabarKeputusan`, untuk tukar jadwal. Disetujui: pemohon + murid tetap. Ditolak: hanya pemohon. Alasan tidak ikut ke murid. */
export function kabarKeputusanTukar(
  p: PengajuanTukar, setuju: boolean,
  k: { hariIni: string; jadwal: SlotJadwal[]; ganti: GantiPelatih[]; pesertaTetap: Record<string, string[]> },
): HasilKabarKeputusan {
  const slot = k.jadwal.find((s) => s.id === p.slotId);
  if (!slot) return { kabar: [], info: [] };
  const pemohon = pemohonTukar(p, k);
  const asal = `${labelTanggal(p.tanggalAsal)} ${slot.jam}`;
  const baru = `${labelTanggal(p.tanggalBaru)} ${p.jamBaru}`;
  const nMurid = (k.pesertaTetap[p.slotId] ?? []).length;
  if (!setuju) {
    return {
      kabar: [{
        id: `kb-${p.id}-tolak`, untukPelatihId: pemohon, jenis: "tukar_ditolak", tgl: k.hariIni, dibaca: false,
        judul: `Ditolak: ${slot.nama} ${asal} tetap di jadwalnya`,
        isi: `Pemilik menolak pemindahan ${slot.nama} ke ${baru}. Sesi tetap ${asal}. Hubungi pemilik bila perlu dibicarakan.`,
      }],
      info: [],
    };
  }
  const sampai = p.tanggalBaru > p.tanggalAsal ? p.tanggalBaru : p.tanggalAsal;
  return {
    kabar: [{
      id: `kb-${p.id}-pemohon`, untukPelatihId: pemohon, jenis: "tukar_disetujui", tgl: k.hariIni, dibaca: false,
      judul: `Disetujui: ${slot.nama} ${asal} pindah ke ${baru}`,
      isi: `Pemilik menyetujui pemindahan ini hanya untuk sekali ini. Jadwal tetapmu tidak berubah, minggu berikutnya mengajar seperti biasa.${nMurid > 0 ? ` ${nMurid} murid di sesi ini sudah diberi tahu.` : ""}`,
    }],
    info: nMurid === 0 ? [] : [{
      id: `kb-${p.id}-murid`, jenis: "umum", penulis: "Pemilik", untukPengajarId: slot.pengajarId, untukSlotId: p.slotId, sampaiTgl: sampai, tgl: k.hariIni,
      judul: `Sesi ${asal} pindah ke ${baru}`,
      isi: `Sesi ${slot.nama} ${labelTanggal(p.tanggalAsal)} pukul ${slot.jam} dipindah ke ${labelTanggal(p.tanggalBaru)} pukul ${p.jamBaru}, hanya sekali ini.${slot.lokasi ? ` Tempat tetap di ${slot.lokasi}.` : ""} Minggu berikutnya kembali ke jadwal biasa.`,
    }],
  };
}

// ---------- Owner membatalkan pemindahan yang sudah disetujui ----------

export type HasilBatalPindah = { ok: true; pindah: PindahJadwal[]; pengajuan: PengajuanTukar[]; pesan: string; dibatalkan: PindahJadwal } | { ok: false; galat: string };

/** Sesi kembali ke tanggal/jam semula. Tidak bisa bila sesi asalnya sudah lewat atau sesi di tanggal barunya sudah diabsen. */
export function batalkanPindahan(
  k: { hariIni: string; jadwal: SlotJadwal[]; pindah: PindahJadwal[]; pengajuan: PengajuanTukar[]; absensi?: Absensi },
  slotId: string, tanggalAsal: string,
): HasilBatalPindah {
  const p = k.pindah.find((x) => x.slotId === slotId && x.tanggalAsal === tanggalAsal);
  if (!p) return { ok: false, galat: "Pemindahan tidak ditemukan." };
  const slot = k.jadwal.find((s) => s.id === slotId);
  if (!slot) return { ok: false, galat: "Sesi tidak ada lagi di jadwal." };
  if (p.tanggalAsal < k.hariIni) return { ok: false, galat: "Tanggal asal sudah lewat, pemindahan tidak bisa dibatalkan." };
  if (k.absensi && Object.keys(k.absensi).some((x) => x.startsWith(`${slotId}|${p.tanggalBaru}|`))) return { ok: false, galat: "Sesi di tanggal barunya sudah diabsen, tidak bisa dikembalikan." };
  return {
    ok: true, dibatalkan: p,
    pindah: k.pindah.filter((x) => x !== p),
    pengajuan: k.pengajuan.map((x) => (x.slotId === slotId && x.tanggalAsal === tanggalAsal && x.tanggalBaru === p.tanggalBaru && x.status === "disetujui" ? { ...x, status: "dibatalkan" as const, diputuskan: k.hariIni } : x)),
    pesan: `${slot.nama} dikembalikan ke ${labelTanggal(p.tanggalAsal)} ${slot.jam}.`,
  };
}

export function kabarBatalPindah(
  p: PindahJadwal, idDasar: string,
  k: { hariIni: string; jadwal: SlotJadwal[]; ganti: GantiPelatih[]; pesertaTetap: Record<string, string[]> },
): HasilKabarKeputusan {
  const slot = k.jadwal.find((s) => s.id === p.slotId);
  if (!slot) return { kabar: [], info: [] };
  const pemegang = pelatihSesi(slot, p.tanggalAsal, k.ganti);
  const asal = `${labelTanggal(p.tanggalAsal)} ${slot.jam}`;
  const nMurid = (k.pesertaTetap[p.slotId] ?? []).length;
  const sampai = p.tanggalBaru > p.tanggalAsal ? p.tanggalBaru : p.tanggalAsal;
  return {
    kabar: [{
      id: `kb-${idDasar}-batal`, untukPelatihId: pemegang, jenis: "tukar_dibatalkan", tgl: k.hariIni, dibaca: false,
      judul: `Pindah dibatalkan: ${slot.nama} kembali ke ${asal}`,
      isi: `Pemilik membatalkan pemindahan ke ${labelTanggal(p.tanggalBaru)} ${p.jamBaru}. Sesi kembali ke ${asal}.${nMurid > 0 ? ` ${nMurid} murid sudah diberi tahu.` : ""}`,
    }],
    info: nMurid === 0 ? [] : [{
      id: `kb-${idDasar}-batal-murid`, jenis: "umum", penulis: "Pemilik", untukPengajarId: slot.pengajarId, untukSlotId: p.slotId, sampaiTgl: sampai, tgl: k.hariIni,
      judul: `Sesi ${asal} tetap seperti jadwal`,
      isi: `Pemindahan sesi ${slot.nama} ke ${labelTanggal(p.tanggalBaru)} pukul ${p.jamBaru} dibatalkan. Sesi tetap ${asal}.`,
    }],
  };
}

// ---------- Owner mengganti pelatih langsung (tanpa permintaan) ----------

/** `dariId` = pemegang sebelum diganti, `keId` = pemegang sekarang. Kembali ke pelatih tetap juga diberi tahu. `idDasar` harus unik per kejadian. */
export function kabarGantiLangsung(
  dariId: string, keId: string, slotId: string, tanggal: string, idDasar: string,
  k: { hariIni: string; jadwal: SlotJadwal[]; pelatih: { id: string; nama: string }[]; pesertaTetap: Record<string, string[]> },
): HasilKabarKeputusan {
  const slot = k.jadwal.find((s) => s.id === slotId);
  if (!slot || dariId === keId) return { kabar: [], info: [] };
  const nama = (id: string) => k.pelatih.find((x) => x.id === id)?.nama ?? "pelatih";
  const dari = nama(dariId);
  const ke = nama(keId);
  const kembali = keId === slot.pengajarId;
  const tgl = labelTanggal(tanggal);
  const sesi = `${tgl} ${slot.jam}`;
  const nMurid = (k.pesertaTetap[slotId] ?? []).length;
  const kabar: KabarPelatih[] = [
    {
      id: `kb-${idDasar}-dari`, untukPelatihId: dariId, jenis: "ganti_langsung", tgl: k.hariIni, dibaca: false,
      judul: kembali ? `${slot.nama} ${sesi} dilepas dari ${dari}` : `${slot.nama} ${sesi} diserahkan ke ${ke}`,
      isi: kembali
        ? `Pemilik mengembalikan ${slot.nama} ${sesi} ke ${ke}, jadi kamu tidak lagi memegangnya.`
        : `Pemilik mengalihkan ${slot.nama} ${sesi} ke ${ke}, hanya sekali ini. Sesinya hilang dari jadwalmu.`,
    },
    {
      id: `kb-${idDasar}-ke`, untukPelatihId: keId, jenis: "ganti_masuk", tgl: k.hariIni, dibaca: false,
      judul: `Kamu memegang ${sesi}`,
      isi: `Pemilik menugaskanmu memegang ${slot.nama} ${sesi}${slot.lokasi ? `, ${slot.lokasi}` : ""}${kembali ? ` (jadwal tetapmu)` : `, menggantikan ${dari}, hanya sekali ini`}. ${nMurid > 0 ? `${nMurid} murid terdaftar tetap.` : "Belum ada murid tetap."}`,
    },
  ];
  const info: Pemberitahuan[] = nMurid === 0 ? [] : [{
    id: `kb-${idDasar}-murid`, jenis: "tidak_hadir", penulis: "Pemilik", untukPengajarId: slot.pengajarId, untukSlotId: slotId, sampaiTgl: tanggal, tgl: k.hariIni,
    judul: `Sesi ${sesi} dipegang ${ke}`,
    isi: kembali
      ? `Sesi ${slot.nama} ${tgl} pukul ${slot.jam} kembali dipegang ${ke}. Jam dan tempat tetap.`
      : `${dari} tidak bisa mengajar ${slot.nama} ${tgl} pukul ${slot.jam}, jadi sesi itu dipegang ${ke} hanya sekali ini. Jam dan tempat tetap. Minggu berikutnya kembali seperti biasa.`,
  }];
  return { kabar, info };
}

// ---------- Permintaan yang ditutup otomatis karena owner langsung mengubah sesi yang sama ----------

/** Kabar untuk pemohon: permintaan ganti pelatih / tukar jadwal-nya yang masih menunggu ditutup (database menutupnya saat owner mengganti pelatih sesi itu). Id dari id permintaan, aman dipanggil ulang. */
export function kabarPermintaanDitutup(
  p: { id: string; pelatihId: string; slotId: string; tanggal: string; macam: "ganti pelatih" | "tukar jadwal" },
  k: { hariIni: string; jadwal: SlotJadwal[] },
): KabarPelatih | null {
  const slot = k.jadwal.find((s) => s.id === p.slotId);
  if (!slot) return null;
  const sesi = `${labelTanggal(p.tanggal)} ${slot.jam}`;
  return {
    id: `kb-${p.id}-tutup`, untukPelatihId: p.pelatihId, jenis: "ganti_langsung", tgl: k.hariIni, dibaca: false,
    judul: `Permintaanmu untuk ${sesi} ditutup`,
    isi: `Pemilik langsung mengubah pelatih ${slot.nama} ${sesi}, jadi permintaan ${p.macam} yang masih menunggu ikut ditutup. Lihat jadwalmu yang terbaru.`,
  };
}
