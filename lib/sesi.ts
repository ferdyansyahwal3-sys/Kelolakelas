import { bentrok, urutkan, type SlotJadwal } from "./jadwal";
import { hitungSlot } from "./slot";

// ---------- Tanggal (semua dihitung di UTC, format ISO "YYYY-MM-DD") ----------

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function parseTgl(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function tambahHari(iso: string, n: number): string {
  const d = parseTgl(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 1 = Senin ... 7 = Minggu (sama dengan `SlotJadwal.hari`). */
export function nomorHari(iso: string): number {
  const g = parseTgl(iso).getUTCDay();
  return g === 0 ? 7 : g;
}

export function awalPekan(iso: string): string {
  return tambahHari(iso, 1 - nomorHari(iso));
}

export interface HariPekan { hari: number; nama: string; tgl: string; angka: number }

export function hariPekan(iso: string): HariPekan[] {
  const awal = awalPekan(iso);
  return Array.from({ length: 7 }, (_, i) => {
    const tgl = tambahHari(awal, i);
    return { hari: i + 1, nama: NAMA_HARI[(i + 1) % 7]!, tgl, angka: parseTgl(tgl).getUTCDate() };
  });
}

export function labelTanggal(iso: string): string {
  const d = parseTgl(iso);
  return `${NAMA_HARI[d.getUTCDay()]} ${d.getUTCDate()} ${NAMA_BULAN[d.getUTCMonth()]}`;
}

export function labelPekan(iso: string): string {
  const a = parseTgl(awalPekan(iso));
  const b = parseTgl(tambahHari(awalPekan(iso), 6));
  const bulanA = NAMA_BULAN[a.getUTCMonth()]!;
  const bulanB = NAMA_BULAN[b.getUTCMonth()]!;
  const tahun = b.getUTCFullYear();
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${b.getUTCDate()} ${bulanB} ${tahun}`;
  return `${a.getUTCDate()} ${bulanA} – ${b.getUTCDate()} ${bulanB} ${tahun}`;
}

// ---------- Model ----------

export type StatusAbsen = "hadir" | "izin" | "alpa";
/** Kunci = `${slotId}|${tanggal}|${muridId}`. Hanya sesi yang sudah ditandai yang ada di sini. */
export type Absensi = Record<string, StatusAbsen>;

export interface Pengganti {
  id: string;
  slotId: string;
  tanggal: string;
  muridId: string;
  /** Kunci sesi izin yang digantikan. */
  dariKunci: string;
}

export interface MuridSesi {
  id: string;
  nama: string;
  kategori: "anak" | "dewasa";
  sisaSesi: number;
  totalSesi: number;
  berlakuSampai: string;
  aktif: boolean;
  bayar: string;
}

export interface Keadaan { absensi: Absensi; pengganti: Pengganti[] }

export interface Konteks {
  hariIni: string;
  /** Aturan usaha: sesi yang izin tidak berkurang dan boleh diganti. */
  aturanPengganti: boolean;
  murid: Record<string, MuridSesi>;
  /** Absen yang sudah terhitung di `sisaSesi` murid sebelum halaman ini dipakai. */
  awal: Absensi;
  /** Sesi yang dipindah sekali ini (disetujui owner); dipakai saat mencari slot untuk sesi pengganti murid. */
  pindah?: PindahJadwal[];
}

export interface PesertaSesi { muridId: string; pengganti: boolean; penggantiId?: string; kunci: string }
export interface SesiHari {
  slot: SlotJadwal;
  tanggal: string;
  peserta: PesertaSesi[];
  /** Pelatih yang memegang sesi ini pada tanggal itu (bisa berbeda dari pemilik slot kalau diganti sekali). */
  pelatihId: string;
  diganti: boolean;
  /** Bila diisi, ini sesi pindahan: tanggal asal slot ini sebelum dipindah (`slot.jam` sudah jam barunya). */
  dipindahDari?: string;
}

/** Satu sesi dipindah ke tanggal/jam lain hanya untuk sekali itu. Minggu berikutnya slot kembali ke jadwal tetapnya. */
export interface PindahJadwal { slotId: string; tanggalAsal: string; tanggalBaru: string; jamBaru: string }

export const kunciSesi = (slotId: string, tanggal: string, muridId: string) => `${slotId}|${tanggal}|${muridId}`;

function bongkarKunci(kunci: string): { slotId: string; tanggal: string; muridId: string } {
  const [slotId, tanggal, muridId] = kunci.split("|");
  return { slotId: slotId!, tanggal: tanggal!, muridId: muridId! };
}

export function kategoriSlot(nama: string): "anak" | "dewasa" | null {
  if (/dewasa/i.test(nama)) return "dewasa";
  if (/anak/i.test(nama)) return "anak";
  return null;
}

export function sesiPadaTanggal(
  jadwal: SlotJadwal[],
  pesertaTetap: Record<string, string[]>,
  pengganti: Pengganti[],
  tanggal: string,
  ganti: GantiPelatih[] = [],
  pindah: PindahJadwal[] = [],
): SesiHari[] {
  const hari = nomorHari(tanggal);
  const pergi = (slotId: string) => pindah.some((p) => p.slotId === slotId && p.tanggalAsal === tanggal);
  const susun = (slot: SlotJadwal, dariTanggal?: string): SesiHari => {
    const pelatihId = pelatihSesi(slot, dariTanggal ?? tanggal, ganti);
    return {
      slot,
      tanggal,
      pelatihId,
      diganti: pelatihId !== slot.pengajarId,
      ...(dariTanggal ? { dipindahDari: dariTanggal } : {}),
      peserta: [
        ...(pesertaTetap[slot.id] ?? []).map((id) => ({ muridId: id, pengganti: false, kunci: kunciSesi(slot.id, tanggal, id) })),
        ...pengganti
          .filter((p) => p.slotId === slot.id && p.tanggal === tanggal)
          .map((p) => ({ muridId: p.muridId, pengganti: true, penggantiId: p.id, kunci: kunciSesi(slot.id, tanggal, p.muridId) })),
      ],
    };
  };
  const tetap = jadwal.filter((s) => s.hari === hari && !pergi(s.id)).map((s) => susun(s));
  const masuk = pindah
    .filter((p) => p.tanggalBaru === tanggal)
    .flatMap((p) => {
      const slot = jadwal.find((s) => s.id === p.slotId);
      return slot ? [susun({ ...slot, hari, jam: p.jamBaru }, p.tanggalAsal)] : [];
    });
  return urutkan([...tetap.map((x) => x.slot), ...masuk.map((x) => x.slot)]).map((sl) => [...tetap, ...masuk].find((x) => x.slot === sl)!);
}

/** Sesi yang pada `tanggal` dipindah ke tempat lain (tidak muncul di `sesiPadaTanggal`, tapi pelatih dan owner perlu tahu ke mana perginya). */
export function sesiDipindahKeluar(jadwal: SlotJadwal[], ganti: GantiPelatih[], pindah: PindahJadwal[], tanggal: string): { slot: SlotJadwal; pelatihId: string; ke: PindahJadwal }[] {
  return pindah
    .filter((p) => p.tanggalAsal === tanggal && p.tanggalBaru !== tanggal)
    .flatMap((p) => {
      const slot = jadwal.find((s) => s.id === p.slotId);
      return slot ? [{ slot, pelatihId: pelatihSesi(slot, tanggal, ganti), ke: p }] : [];
    });
}

// ---------- Ganti pelatih untuk satu jadwal saja ----------

/** Pelatih pengganti hanya berlaku untuk satu slot di satu tanggal. Minggu berikutnya kembali ke pelatih tetap. */
export interface GantiPelatih { slotId: string; tanggal: string; pelatihId: string }

export function pelatihSesi(slot: Pick<SlotJadwal, "id" | "pengajarId">, tanggal: string, ganti: GantiPelatih[]): string {
  return ganti.find((g) => g.slotId === slot.id && g.tanggal === tanggal)?.pelatihId ?? slot.pengajarId;
}

export type HasilGanti = { ok: true; ganti: GantiPelatih[]; pesan: string } | { ok: false; galat: string };

/** `pelatih` = pelatih yang aktif. Pelatih baru tidak boleh punya sesi lain yang bentrok di tanggal itu (sesi yang ia serahkan ke orang lain tidak dihitung). */
export function gantiPelatih(
  jadwal: SlotJadwal[], ganti: GantiPelatih[], pelatih: { id: string; nama: string }[], hariIni: string,
  slotId: string, tanggal: string, pelatihBaruId: string,
): HasilGanti {
  const slot = jadwal.find((s) => s.id === slotId);
  if (!slot || slot.hari !== nomorHari(tanggal)) return { ok: false, galat: "Slot tidak ada di tanggal itu." };
  if (tanggal < hariIni) return { ok: false, galat: "Sesi yang sudah lewat tidak bisa dialihkan." };
  const baru = pelatih.find((p) => p.id === pelatihBaruId);
  if (!baru) return { ok: false, galat: "Pelatih tidak ditemukan atau tidak aktif." };
  if (pelatihSesi(slot, tanggal, ganti) === pelatihBaruId) return { ok: false, galat: `${baru.nama} sudah memegang sesi ini.` };
  const tabrak = jadwal.find((s) => s.id !== slot.id && s.hari === slot.hari && pelatihSesi(s, tanggal, ganti) === pelatihBaruId && bentrok(s, slot));
  if (tabrak) return { ok: false, galat: `${baru.nama} sudah mengajar ${tabrak.nama} jam ${tabrak.jam} di tanggal itu.` };
  const tanpa = ganti.filter((g) => !(g.slotId === slotId && g.tanggal === tanggal));
  // Dikembalikan ke pelatih asli = hapus penggantian, bukan menyimpan baris yang sama dengan aslinya.
  const hasil = pelatihBaruId === slot.pengajarId ? tanpa : [...tanpa, { slotId, tanggal, pelatihId: pelatihBaruId }];
  return { ok: true, ganti: hasil, pesan: pelatihBaruId === slot.pengajarId ? `Sesi ${slot.jam} dikembalikan ke pelatih tetap.` : `Sesi ${slot.jam} ${labelTanggal(tanggal)} dipegang ${baru.nama} (sekali ini saja).` };
}

export function batalkanGanti(ganti: GantiPelatih[], slotId: string, tanggal: string): GantiPelatih[] {
  return ganti.filter((g) => !(g.slotId === slotId && g.tanggal === tanggal));
}

// ---------- Sisa sesi: dihitung dari absen, tidak pernah disimpan sendiri ----------

/** Hadir dan alpa selalu memotong. Izin hanya memotong kalau usaha tidak memberi sesi pengganti, atau kalau itu sendiri sesi pengganti (izin kedua kali = hangus). */
export function memotong(status: StatusAbsen, aturanPengganti: boolean, adalahPengganti: boolean): boolean {
  if (status === "izin") return !aturanPengganti || adalahPengganti;
  return true;
}

interface Rekam { muridId: string; status: StatusAbsen; pengganti: boolean }

function daftarRekam(absensi: Absensi, pengganti: Pengganti[]): Rekam[] {
  const kunciPengganti = new Set(pengganti.map((p) => kunciSesi(p.slotId, p.tanggal, p.muridId)));
  return Object.entries(absensi).map(([kunci, status]) => ({ muridId: bongkarKunci(kunci).muridId, status, pengganti: kunciPengganti.has(kunci) }));
}

export function sisaSesiKini(k: Konteks, kead: Keadaan, muridId: string): number {
  const m = k.murid[muridId];
  if (!m) return 0;
  const potong = (r: Rekam[]) => r.filter((x) => x.muridId === muridId && memotong(x.status, k.aturanPengganti, x.pengganti)).length;
  return m.sisaSesi + potong(daftarRekam(k.awal, [])) - potong(daftarRekam(kead.absensi, kead.pengganti));
}

/** Sesi izin yang belum dijadwalkan penggantinya. */
export function hakPengganti(k: Konteks, kead: Keadaan, muridId: string): number {
  if (!k.aturanPengganti) return 0;
  const izin = daftarRekam(kead.absensi, kead.pengganti).filter((r) => r.muridId === muridId && r.status === "izin" && !r.pengganti).length;
  const dipakai = kead.pengganti.filter((p) => p.muridId === muridId).length;
  return Math.max(0, izin - dipakai);
}

// ---------- Tandai hadir / izin / alpa ----------

export type HasilUbah = { ok: true; keadaan: Keadaan; pesan: string } | { ok: false; galat: string };

const NAMA_STATUS: Record<StatusAbsen, string> = { hadir: "hadir", izin: "izin", alpa: "alpa" };

/** Mengetuk status yang sama sekali lagi membatalkannya. */
export function tandai(k: Konteks, kead: Keadaan, kunci: string, status: StatusAbsen): HasilUbah {
  const { tanggal, muridId } = bongkarKunci(kunci);
  const m = k.murid[muridId];
  if (!m) return { ok: false, galat: "Murid tidak ditemukan." };
  const lama = kead.absensi[kunci];
  const batal = lama === status;
  const adalahPengganti = kead.pengganti.some((p) => kunciSesi(p.slotId, p.tanggal, p.muridId) === kunci);

  if (!batal) {
    if (!m.aktif) return { ok: false, galat: `${m.nama} sudah nonaktif.` };
    if (status !== "izin" && tanggal > k.hariIni) return { ok: false, galat: "Sesi ini belum berlangsung. Hadir dan alpa baru bisa diisi di hari sesinya." };
    if (memotong(status, k.aturanPengganti, adalahPengganti)) {
      if (tanggal > m.berlakuSampai) return { ok: false, galat: `Paket ${m.nama} berakhir ${labelTanggal(m.berlakuSampai)}, sesi ini tidak bisa dipotong. Perpanjang paket dulu.` };
      const lamaMemotong = lama ? memotong(lama, k.aturanPengganti, adalahPengganti) : false;
      if (sisaSesiKini(k, kead, muridId) + (lamaMemotong ? 1 : 0) < 1) return { ok: false, galat: `Sisa sesi ${m.nama} sudah habis. Perpanjang paket dulu.` };
    }
  }

  // Izin dicabut/diganti: sesi pengganti yang terkait ikut dibatalkan, kecuali sudah diabsen.
  let pengganti = kead.pengganti;
  if (lama === "izin" && !adalahPengganti && (batal || status !== "izin")) {
    const terkait = pengganti.filter((p) => p.dariKunci === kunci);
    if (terkait.some((p) => kead.absensi[kunciSesi(p.slotId, p.tanggal, p.muridId)])) {
      return { ok: false, galat: "Sesi pengganti sudah diabsen. Batalkan tandanya dulu." };
    }
    pengganti = pengganti.filter((p) => p.dariKunci !== kunci);
  }

  const absensi = { ...kead.absensi };
  if (batal) delete absensi[kunci];
  else absensi[kunci] = status;
  const baru: Keadaan = { absensi, pengganti };

  const sisa = sisaSesiKini(k, baru, muridId);
  const sisaTeks = `Sisa sesi ${sisa} dari ${m.totalSesi}.`;
  let pesan: string;
  if (batal) pesan = `Tanda ${NAMA_STATUS[status]} untuk ${m.nama} dibatalkan. ${sisaTeks}`;
  else if (status === "izin" && !memotong("izin", k.aturanPengganti, adalahPengganti)) pesan = `${m.nama} izin. Sesi tidak berkurang, dapat 1 sesi pengganti.`;
  else if (status === "izin") pesan = `${m.nama} izin. ${adalahPengganti ? "Ini sudah sesi pengganti, jadi dihitung terpakai." : "Aturan usaha tanpa sesi pengganti, jadi dihitung terpakai."} ${sisaTeks}`;
  else if (status === "alpa") pesan = `${m.nama} alpa, sesi hangus. ${sisaTeks}`;
  else pesan = `${m.nama} hadir. ${sisaTeks}`;
  if (!batal && sisa === 0 && memotong(status, k.aturanPengganti, adalahPengganti)) pesan += " Paket habis, tawarkan perpanjang.";
  return { ok: true, keadaan: baru, pesan };
}

// ---------- Sesi pengganti ----------

export interface OpsiPengganti { slot: SlotJadwal; tanggal: string; sisaTempat: number }

function terisiHariItu(sesi: SesiHari, absensi: Absensi): number {
  return sesi.peserta.filter((p) => absensi[p.kunci] !== "izin").length;
}

function galatPengganti(k: Konteks, kead: Keadaan, sesiTujuan: SesiHari, semuaHariItu: SesiHari[], muridId: string): string | null {
  const m = k.murid[muridId];
  if (!m) return "Murid tidak ditemukan.";
  if (!m.aktif) return `${m.nama} sudah nonaktif.`;
  if (sesiTujuan.tanggal < k.hariIni) return "Tanggal pengganti tidak boleh di masa lalu.";
  if (sesiTujuan.tanggal > m.berlakuSampai) return `Paket ${m.nama} berlaku sampai ${labelTanggal(m.berlakuSampai)}.`;
  const kat = kategoriSlot(sesiTujuan.slot.nama);
  if (kat && kat !== m.kategori) return `Kelas ${sesiTujuan.slot.nama} bukan untuk ${m.kategori}.`;
  if (sesiTujuan.peserta.some((p) => p.muridId === muridId)) return `${m.nama} sudah ada di sesi ini.`;
  const bentur = semuaHariItu.find((s) => s.slot.id !== sesiTujuan.slot.id && s.peserta.some((p) => p.muridId === muridId && kead.absensi[p.kunci] !== "izin") && bentrok(s.slot, sesiTujuan.slot));
  if (bentur) return `Bentrok dengan ${bentur.slot.nama} ${bentur.slot.jam}.`;
  const h = hitungSlot(sesiTujuan.slot.kuota, terisiHariItu(sesiTujuan, kead.absensi));
  if (h.sisa < 1) return "Slot ini sudah penuh di tanggal itu.";
  return null;
}

/** Pilihan jadwal pengganti: dari besok sampai paket berakhir (maks 28 hari), hanya yang muat dan tidak bentrok. */
export function opsiPengganti(
  k: Konteks, kead: Keadaan, jadwal: SlotJadwal[], pesertaTetap: Record<string, string[]>, muridId: string, hariMaks = 28,
): OpsiPengganti[] {
  const m = k.murid[muridId];
  if (!m) return [];
  const hasil: OpsiPengganti[] = [];
  for (let i = 1; i <= hariMaks; i++) {
    const tanggal = tambahHari(k.hariIni, i);
    if (tanggal > m.berlakuSampai) break;
    const sesiHari = sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, tanggal, [], k.pindah);
    for (const s of sesiHari) {
      if (galatPengganti(k, kead, s, sesiHari, muridId)) continue;
      hasil.push({ slot: s.slot, tanggal, sisaTempat: hitungSlot(s.slot.kuota, terisiHariItu(s, kead.absensi)).sisa });
    }
  }
  return hasil;
}

export function jadwalkanPengganti(
  k: Konteks, kead: Keadaan, jadwal: SlotJadwal[], pesertaTetap: Record<string, string[]>,
  dariKunci: string, slotId: string, tanggal: string, idBaru: string,
): HasilUbah {
  const { muridId } = bongkarKunci(dariKunci);
  const m = k.murid[muridId];
  if (!m) return { ok: false, galat: "Murid tidak ditemukan." };
  if (kead.absensi[dariKunci] !== "izin") return { ok: false, galat: "Sesi pengganti hanya untuk sesi yang izin." };
  if (kead.pengganti.some((p) => p.dariKunci === dariKunci)) return { ok: false, galat: "Sesi ini sudah punya pengganti." };
  if (hakPengganti(k, kead, muridId) < 1) return { ok: false, galat: "Tidak ada hak sesi pengganti." };
  const sesiHari = sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, tanggal, [], k.pindah);
  const tujuan = sesiHari.find((s) => s.slot.id === slotId);
  if (!tujuan) return { ok: false, galat: "Slot tidak ada di tanggal itu." };
  const slot = tujuan.slot;
  const galat = galatPengganti(k, kead, tujuan, sesiHari, muridId);
  if (galat) return { ok: false, galat };
  const pengganti = [...kead.pengganti, { id: idBaru, slotId, tanggal, muridId, dariKunci }];
  return {
    ok: true,
    keadaan: { absensi: kead.absensi, pengganti },
    pesan: `Sesi pengganti ${m.nama}: ${labelTanggal(tanggal)} · ${slot.jam}.`,
  };
}

export function batalkanPengganti(kead: Keadaan, id: string): HasilUbah {
  const p = kead.pengganti.find((x) => x.id === id);
  if (!p) return { ok: false, galat: "Sesi pengganti tidak ditemukan." };
  if (kead.absensi[kunciSesi(p.slotId, p.tanggal, p.muridId)]) return { ok: false, galat: "Sesi pengganti sudah diabsen, batalkan tandanya dulu." };
  return { ok: true, keadaan: { absensi: kead.absensi, pengganti: kead.pengganti.filter((x) => x.id !== id) }, pesan: "Sesi pengganti dibatalkan, hak penggantinya kembali." };
}

// ---------- Ringkasan ----------

export interface RingkasHari { sesi: number; peserta: number; hadir: number; izin: number; alpa: number; belum: number }

export function ringkasHari(sesi: SesiHari[], absensi: Absensi): RingkasHari {
  const r: RingkasHari = { sesi: sesi.length, peserta: 0, hadir: 0, izin: 0, alpa: 0, belum: 0 };
  for (const s of sesi) {
    for (const p of s.peserta) {
      r.peserta++;
      const st = absensi[p.kunci];
      if (st) r[st]++;
      else r.belum++;
    }
  }
  return r;
}

// ---------- Hadirkan semua (satu ketukan per sesi, dipakai halaman pelatih) ----------

export interface HasilSemua { keadaan: Keadaan; berhasil: number; dilewati: string[]; pesan: string }

/** Menandai hadir semua murid yang belum ditandai. Yang ditolak aturan (paket habis, nonaktif, dll) dilewati dan disebut di pesan. */
export function tandaiSemuaHadir(k: Konteks, kead: Keadaan, sesi: SesiHari): HasilSemua {
  let cur = kead;
  let berhasil = 0;
  const dilewati: string[] = [];
  for (const p of sesi.peserta) {
    if (cur.absensi[p.kunci]) continue;
    const h = tandai(k, cur, p.kunci, "hadir");
    if (h.ok) { cur = h.keadaan; berhasil++; }
    else dilewati.push(`${k.murid[p.muridId]?.nama ?? p.muridId}: ${h.galat}`);
  }
  let pesan: string;
  if (sesi.peserta.length === 0) pesan = "Belum ada murid di sesi ini.";
  else if (berhasil === 0 && dilewati.length === 0) pesan = "Semua murid sudah ditandai.";
  else if (berhasil === 0) pesan = dilewati[0]!;
  else pesan = `${berhasil} murid ditandai hadir.${dilewati.length > 0 ? ` ${dilewati.length} dilewati: ${dilewati[0]}` : ""}`;
  return { keadaan: cur, berhasil, dilewati, pesan };
}
