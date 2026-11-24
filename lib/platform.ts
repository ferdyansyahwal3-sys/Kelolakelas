import { hitungAkses, perpanjangPeriode, selisih, type Akses, type Fase } from "./langganan";
import { HARGA, jenisDariPlan, labelPlan, type Jenis, type PlanKey } from "./paketLangganan";
import { linkWa } from "./beranda";
import { tambahHari } from "./sesi";

// ---------- Model (mengikuti tabel subscriptions, subscription_invoices, platform_promo_codes, reminder_logs) ----------

export type Plan = PlanKey;
export type StatusTagihan = "belum_bayar" | "lunas" | "kedaluwarsa" | "batal";
export type MetodeBayar = "duitku" | "transfer_bank";

/** Status yang diatur admin dengan tangan. Mengalahkan status otomatis sampai `sampai` (atau selamanya bila kosong) atau sampai dikembalikan. */
export interface StatusManual { fase: Fase; alasan: string; sampai: string | null; diubah: string }

export interface Usaha {
  id: string;
  nama: string;
  slug: string;
  pemilik: string;
  email: string;
  noWa: string;
  kategori: string;
  kota: string;
  plan: Plan;
  dibuat: string; // yyyy-mm-dd
  trialBerakhir: string;
  periodeBerakhir: string | null;
  graceSampai: string | null;
  murid: number;
  muridAktif: number;
  pengajar: number;
  sesiBulanIni: number;
  terakhirAktif: string; // yyyy-mm-dd
  statusManual?: StatusManual | null;
}

export interface TagihanPlatform {
  id: string;
  orderId: string;
  usahaId: string;
  plan: Plan;
  bulan: number;
  hargaNormal: number;
  nominal: number; // setelah diskon
  kodePromo: string | null;
  status: StatusTagihan;
  terbit: string;
  tempo: string;
  dibayar: string | null;
  metode: MetodeBayar | null;
  referensi?: string;
}

export interface PromoPlatform {
  id: string;
  kode: string;
  jenis: "persen" | "nominal";
  nilai: number;
  kuota: number | null;
  kedaluwarsa: string | null;
  berlakuBulan: number;
  aktif: boolean;
  dibuat: string;
}

export type AksiAudit = "lihat_usaha" | "ubah_status" | "aktivasi_manual" | "ubah_catatan" | "kirim_pengingat" | "buat_promo" | "ubah_promo" | "hapus_promo";
export interface Audit { id: string; waktu: string; aksi: AksiAudit; usahaId: string | null; ringkas: string; alasan: string | null }
export interface LogPengingat { tagihanId: string; kanal: "wa" | "email"; waktu: string }

const batasTeks = (s: string) => s.replace(/\s+/g, " ").trim();

// ---------- Status usaha (dihitung dari tanggal, bukan disimpan) ----------

export const NAMA_FASE: Record<Fase, string> = { trial: "Trial", aktif: "Aktif", jatuh_tempo: "Jatuh tempo", ditangguhkan: "Ditangguhkan", berhenti: "Berhenti" };
export const URUT_FASE: Fase[] = ["trial", "aktif", "jatuh_tempo", "ditangguhkan", "berhenti"];

type DataFase = Pick<Usaha, "trialBerakhir" | "periodeBerakhir" | "graceSampai">;

/** Status murni dari tanggal (aturan 5 fase). Tidak terpengaruh pengaturan manual. */
export function faseOtomatis(u: DataFase, hari: string): Fase {
  return hitungAkses({ trialBerakhir: u.trialBerakhir, periodeBerakhir: u.periodeBerakhir, graceSampai: u.graceSampai }, hari).fase;
}

/** Pengaturan manual yang masih berlaku hari ini; yang sudah lewat tanggal `sampai` dianggap tidak ada (status kembali otomatis dengan sendirinya). */
export function manualBerlaku(u: Pick<Usaha, "statusManual">, hari: string): StatusManual | null {
  const m = u.statusManual;
  if (!m) return null;
  return m.sampai !== null && m.sampai < hari ? null : m;
}

/** Status yang dipakai di seluruh panel: manual bila ada dan masih berlaku, selain itu otomatis. */
export function faseUsaha(u: DataFase & Pick<Usaha, "statusManual">, hari: string): Fase {
  return manualBerlaku(u, hari)?.fase ?? faseOtomatis(u, hari);
}

export function aksesDariFase(f: Fase): Akses {
  return f === "trial" || f === "aktif" ? "penuh" : f === "jatuh_tempo" ? "penuh_peringatan" : f === "ditangguhkan" ? "hanya_lihat" : "ditutup";
}

export interface RingkasStatus { efektif: Fase; otomatis: Fase; manual: StatusManual | null; manualKedaluwarsa: boolean }
export function ringkasStatus(u: Usaha, hari: string): RingkasStatus {
  const manual = manualBerlaku(u, hari);
  const otomatis = faseOtomatis(u, hari);
  return { efektif: manual?.fase ?? otomatis, otomatis, manual, manualKedaluwarsa: !!u.statusManual && !manual };
}

export type HasilStatus = { ok: true; usaha: Usaha; audit: Omit<Audit, "id" | "waktu"> } | { ok: false; galat: Partial<Record<"fase" | "alasan" | "sampai" | "umum", string>> };

export const STATUS_ALASAN_MIN = 5;
export const STATUS_MANUAL_HARI_MAKS = 365;

/** Mengatur status dengan tangan. Alasan wajib (masuk audit log); `sampai` kosong = berlaku sampai dikembalikan ke otomatis. */
export function aturStatusManual(u: Usaha, input: { fase: Fase; alasan: string; sampai: string | null }, hari: string): HasilStatus {
  const galat: Partial<Record<"fase" | "alasan" | "sampai", string>> = {};
  if (!URUT_FASE.includes(input.fase)) galat.fase = "Pilih status.";
  const alasan = batasTeks(input.alasan);
  if (alasan.length < STATUS_ALASAN_MIN) galat.alasan = "Tulis alasannya, ini tercatat di audit log.";
  else if (alasan.length > 200) galat.alasan = "Alasan maksimal 200 karakter.";
  if (input.sampai !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sampai) || Number.isNaN(Date.parse(input.sampai))) galat.sampai = "Isi tanggal yang benar atau kosongkan.";
    else if (input.sampai <= hari) galat.sampai = "Tanggal berakhir harus setelah hari ini.";
    else if (input.sampai > tambahHari(hari, STATUS_MANUAL_HARI_MAKS)) galat.sampai = `Maksimal ${STATUS_MANUAL_HARI_MAKS} hari ke depan.`;
  }
  if (Object.keys(galat).length > 0) return { ok: false, galat };
  const otomatis = faseOtomatis(u, hari);
  const manual: StatusManual = { fase: input.fase, alasan, sampai: input.sampai, diubah: hari };
  return {
    ok: true,
    usaha: { ...u, statusManual: manual },
    audit: { aksi: "ubah_status", usahaId: u.id, ringkas: `Status ${u.nama}: ${NAMA_FASE[otomatis]} (otomatis) → ${NAMA_FASE[input.fase]} (manual${input.sampai ? ` sampai ${input.sampai}` : ", sampai dikembalikan"})`, alasan },
  };
}

export function kembalikanKeOtomatis(u: Usaha, hari: string): HasilStatus {
  if (!u.statusManual) return { ok: false, galat: { umum: "Status sudah otomatis." } };
  return {
    ok: true,
    usaha: { ...u, statusManual: null },
    audit: { aksi: "ubah_status", usahaId: u.id, ringkas: `Status ${u.nama} dikembalikan ke otomatis (${NAMA_FASE[faseOtomatis(u, hari)]})`, alasan: null },
  };
}

export const TIDAK_AKTIF_HARI = 7;

/** Tidak aktif = belum masuk ≥ 7 hari padahal masih berstatus trial, aktif, atau jatuh tempo (yang sudah berhenti tidak perlu dihubungi lagi). */
export function tidakAktif(u: Usaha, hari: string): boolean {
  const f = faseUsaha(u, hari);
  return (f === "trial" || f === "aktif" || f === "jatuh_tempo") && selisih(u.terakhirAktif, hari) >= TIDAK_AKTIF_HARI;
}

export function terakhirAktifLabel(terakhir: string, hari: string): string {
  const n = selisih(terakhir, hari);
  if (n <= 0) return "Hari ini";
  if (n === 1) return "Kemarin";
  return `${n} hari lalu`;
}

// ---------- Daftar usaha: cari, saring, urutkan ----------

export type FilterUsaha = "semua" | Fase | "tidak_aktif" | "manual";
export type UrutUsaha = "terbaru" | "terakhir_aktif" | "murid" | "nama";

export function saringUsaha(daftar: Usaha[], q: string, filter: FilterUsaha, urut: UrutUsaha, hari: string): Usaha[] {
  const kata = q.trim().toLowerCase();
  const hasil = daftar.filter((u) => {
    if (kata && !`${u.nama} ${u.pemilik} ${u.email} ${u.slug}`.toLowerCase().includes(kata)) return false;
    if (filter === "semua") return true;
    if (filter === "tidak_aktif") return tidakAktif(u, hari);
    if (filter === "manual") return manualBerlaku(u, hari) !== null;
    return faseUsaha(u, hari) === filter;
  });
  const banding: Record<UrutUsaha, (a: Usaha, b: Usaha) => number> = {
    terbaru: (a, b) => b.dibuat.localeCompare(a.dibuat),
    terakhir_aktif: (a, b) => a.terakhirAktif.localeCompare(b.terakhirAktif),
    murid: (a, b) => b.muridAktif - a.muridAktif,
    nama: (a, b) => a.nama.localeCompare(b.nama, "id"),
  };
  return hasil.sort(banding[urut]);
}

export function hitungPerFase(daftar: Usaha[], hari: string): Record<Fase, number> & { tidak_aktif: number; manual: number } {
  const h = { trial: 0, aktif: 0, jatuh_tempo: 0, ditangguhkan: 0, berhenti: 0, tidak_aktif: 0, manual: 0 };
  for (const u of daftar) { h[faseUsaha(u, hari)]++; if (tidakAktif(u, hari)) h.tidak_aktif++; if (manualBerlaku(u, hari)) h.manual++; }
  return h;
}

// ---------- Uang ----------

const bulanDari = (iso: string) => iso.slice(0, 7);
export const geserBulan = (bln: string, n: number): string => {
  const [y, m] = bln.split("-").map(Number);
  const idx = y! * 12 + (m! - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
};

export function pendapatanBulan(tagihan: TagihanPlatform[], bulan: string): { total: number; jumlah: number } {
  const t = tagihan.filter((x) => x.status === "lunas" && x.dibayar && bulanDari(x.dibayar) === bulan);
  return { total: t.reduce((n, x) => n + x.nominal, 0), jumlah: t.length };
}

/** MRR = tagihan lunas terakhir tiap usaha dibagi jumlah bulannya (tahunan dibagi 12). `berisiko` = usaha yang sudah lewat tanggal tapi masih masa tenggang. */
export function hitungMrr(usaha: Usaha[], tagihan: TagihanPlatform[], hari: string): { aktif: number; berisiko: number } {
  const hasil = { aktif: 0, berisiko: 0 };
  for (const u of usaha) {
    // MRR hanya dari langganan yang benar-benar berbayar menurut tanggal; status manual (mis. gratis/ditangguhkan) tidak mengubah uang.
    const fase = faseOtomatis(u, hari);
    if (fase !== "aktif" && fase !== "jatuh_tempo") continue;
    const terakhir = tagihan.filter((t) => t.usahaId === u.id && t.status === "lunas" && t.dibayar).sort((a, b) => b.dibayar!.localeCompare(a.dibayar!))[0];
    if (!terakhir) continue;
    hasil[fase === "aktif" ? "aktif" : "berisiko"] += Math.round(terakhir.nominal / terakhir.bulan);
  }
  return hasil;
}

/** Dari usaha yang masa trial-nya sudah selesai, berapa yang pernah membayar. */
export function konversiTrial(usaha: Usaha[], tagihan: TagihanPlatform[], hari: string): { selesai: number; bayar: number; persen: number | null } {
  const selesai = usaha.filter((u) => u.trialBerakhir < hari);
  const bayar = selesai.filter((u) => tagihan.some((t) => t.usahaId === u.id && t.status === "lunas")).length;
  return { selesai: selesai.length, bayar, persen: selesai.length === 0 ? null : Math.round((bayar / selesai.length) * 100) };
}

export interface TitikTren { bulan: string; pendapatan: number; usahaBaru: number }
export function tren(usaha: Usaha[], tagihan: TagihanPlatform[], bulanIni: string, n = 6): TitikTren[] {
  return Array.from({ length: n }, (_, i) => {
    const bulan = geserBulan(bulanIni, i - (n - 1));
    return { bulan, pendapatan: pendapatanBulan(tagihan, bulan).total, usahaBaru: usaha.filter((u) => bulanDari(u.dibuat) === bulan).length };
  });
}

// ---------- Antrean perlu perhatian ----------

export type JenisPerhatian = "telat_bayar" | "tagihan_minggu_ini" | "trial_habis" | "tidak_aktif";
export interface Perhatian { jenis: JenisPerhatian; usahaId: string; tagihanId?: string; judul: string; ket: string; prioritas: number }

const PRIORITAS: Record<JenisPerhatian, number> = { telat_bayar: 1, tagihan_minggu_ini: 2, trial_habis: 3, tidak_aktif: 4 };

export function perluPerhatian(usaha: Usaha[], tagihan: TagihanPlatform[], hari: string): Perhatian[] {
  const hasil: Perhatian[] = [];
  const batas = tambahHari(hari, 7);
  for (const u of usaha) {
    const fase = faseUsaha(u, hari);
    const belum = tagihan.filter((t) => t.usahaId === u.id && t.status === "belum_bayar");
    if (fase === "jatuh_tempo") {
      const akhir = u.periodeBerakhir ?? u.trialBerakhir;
      const m = manualBerlaku(u, hari);
      hasil.push({ jenis: "telat_bayar", usahaId: u.id, tagihanId: belum[0]?.id, judul: `${u.nama} telat bayar`, ket: m ? `Diatur manual: ${m.alasan}${m.sampai ? ` (sampai ${m.sampai})` : ""}` : `Lewat ${selisih(akhir, hari)} hari dari jatuh tempo, masa tenggang hampir habis`, prioritas: PRIORITAS.telat_bayar });
    }
    for (const t of belum) {
      if (t.tempo >= hari && t.tempo <= batas && fase === "aktif") {
        hasil.push({ jenis: "tagihan_minggu_ini", usahaId: u.id, tagihanId: t.id, judul: `${u.nama}: tagihan jatuh tempo`, ket: `${selisih(hari, t.tempo) === 0 ? "Hari ini" : `${selisih(hari, t.tempo)} hari lagi`} · ${t.orderId}`, prioritas: PRIORITAS.tagihan_minggu_ini });
      }
    }
    if (fase === "trial" && selisih(hari, u.trialBerakhir) <= 3 && !tagihan.some((t) => t.usahaId === u.id && t.status === "lunas")) {
      const s = selisih(hari, u.trialBerakhir);
      hasil.push({ jenis: "trial_habis", usahaId: u.id, judul: `${u.nama}: trial hampir habis`, ket: s === 0 ? "Berakhir hari ini" : `Berakhir ${s} hari lagi, belum membayar`, prioritas: PRIORITAS.trial_habis });
    }
    if (tidakAktif(u, hari)) {
      hasil.push({ jenis: "tidak_aktif", usahaId: u.id, judul: `${u.nama} tidak aktif`, ket: `Terakhir masuk ${selisih(u.terakhirAktif, hari)} hari lalu`, prioritas: PRIORITAS.tidak_aktif });
    }
  }
  return hasil.sort((a, b) => a.prioritas - b.prioritas || a.judul.localeCompare(b.judul, "id"));
}

// ---------- Tagihan ----------

export type FilterTagihan = "semua" | "belum_bayar" | "telat" | "lunas" | "kedaluwarsa" | "batal";

export const telat = (t: TagihanPlatform, hari: string) => t.status === "belum_bayar" && t.tempo < hari;

export function saringTagihan(daftar: TagihanPlatform[], usaha: Usaha[], q: string, filter: FilterTagihan, hari: string): TagihanPlatform[] {
  const kata = q.trim().toLowerCase();
  return daftar
    .filter((t) => {
      if (kata) {
        const u = usaha.find((x) => x.id === t.usahaId);
        if (!`${t.orderId} ${u?.nama ?? ""} ${t.kodePromo ?? ""}`.toLowerCase().includes(kata)) return false;
      }
      if (filter === "semua") return true;
      if (filter === "telat") return telat(t, hari);
      return t.status === filter;
    })
    .sort((a, b) => b.terbit.localeCompare(a.terbit) || b.orderId.localeCompare(a.orderId));
}

export function jatuhTempoMinggu(tagihan: TagihanPlatform[], hari: string): TagihanPlatform[] {
  const batas = tambahHari(hari, 7);
  return tagihan.filter((t) => t.status === "belum_bayar" && t.tempo >= hari && t.tempo <= batas).sort((a, b) => a.tempo.localeCompare(b.tempo));
}

export type HasilAktivasi = { ok: true; tagihan: TagihanPlatform; usaha: Usaha; audit: Omit<Audit, "id" | "waktu"> } | { ok: false; galat: Partial<Record<"tanggal" | "referensi" | "alasan" | "umum", string>> };

/**
 * Aktivasi manual untuk bayar transfer bank. Aman dipanggil berulang: tagihan yang sudah lunas ditolak, jadi periode tidak bertambah dua kali.
 * Periode usaha dihitung dengan aturan yang sama seperti pembayaran gateway (mulai dari yang lebih akhir antara tanggal bayar dan akhir periode lama).
 */
export function aktivasiManual(t: TagihanPlatform, u: Usaha, input: { tanggal: string; referensi: string; alasan: string }, hari: string): HasilAktivasi {
  if (t.usahaId !== u.id) return { ok: false, galat: { umum: "Tagihan bukan milik usaha ini." } };
  if (t.status === "lunas") return { ok: false, galat: { umum: "Tagihan ini sudah lunas." } };
  if (t.status === "batal") return { ok: false, galat: { umum: "Tagihan yang dibatalkan tidak bisa diaktifkan. Terbitkan tagihan baru." } };
  const galat: Partial<Record<"tanggal" | "referensi" | "alasan", string>> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal) || Number.isNaN(Date.parse(input.tanggal))) galat.tanggal = "Isi tanggal terima dana.";
  else if (input.tanggal > hari) galat.tanggal = "Tanggal terima dana tidak boleh di masa depan.";
  else if (input.tanggal < t.terbit) galat.tanggal = "Tanggal terima dana tidak boleh sebelum tagihan terbit.";
  const referensi = batasTeks(input.referensi);
  if (referensi.length < 3) galat.referensi = "Isi bank pengirim atau nomor referensi transfer.";
  const alasan = batasTeks(input.alasan);
  if (alasan.length < 5) galat.alasan = "Tulis alasannya, ini tercatat di audit log.";
  if (Object.keys(galat).length > 0) return { ok: false, galat };

  const periodeBerakhir = perpanjangPeriode(u.periodeBerakhir, input.tanggal, t.bulan);
  return {
    ok: true,
    tagihan: { ...t, status: "lunas", dibayar: input.tanggal, metode: "transfer_bank", referensi },
    usaha: { ...u, plan: t.plan, periodeBerakhir, graceSampai: null },
    audit: { aksi: "aktivasi_manual", usahaId: u.id, ringkas: `${t.orderId} dilunasi manual (transfer ${referensi}), aktif sampai ${periodeBerakhir}`, alasan },
  };
}

// ---------- Pengingat ----------

export const JEDA_PENGINGAT_JAM = 24;

export function bisaKirimPengingat(logs: LogPengingat[], tagihanId: string, kanal: "wa" | "email", sekarang: string): { ok: true } | { ok: false; alasan: string } {
  const terakhir = logs.filter((l) => l.tagihanId === tagihanId && l.kanal === kanal).sort((a, b) => b.waktu.localeCompare(a.waktu))[0];
  if (!terakhir) return { ok: true };
  const jam = (Date.parse(sekarang) - Date.parse(terakhir.waktu)) / 3_600_000;
  if (jam < JEDA_PENGINGAT_JAM) return { ok: false, alasan: `Pengingat ${kanal === "wa" ? "WA" : "email"} sudah dikirim ${Math.max(0, Math.floor(jam))} jam lalu. Tunggu ${JEDA_PENGINGAT_JAM} jam supaya tidak terasa spam.` };
  return { ok: true };
}

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const tglPanjang = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function pesanPengingat(u: Usaha, t: TagihanPlatform, hari: string): string {
  const sisa = selisih(hari, t.tempo);
  const waktu = sisa > 0 ? `jatuh tempo ${sisa} hari lagi (${tglPanjang(t.tempo)})` : sisa === 0 ? "jatuh tempo hari ini" : `sudah lewat jatuh tempo ${-sisa} hari (${tglPanjang(t.tempo)})`;
  return `Halo ${u.pemilik}, ini dari KelolaKelas. Tagihan langganan ${labelPlan(u.plan)} ${t.bulan === 12 ? "1 tahun" : `${t.bulan} bulan`} untuk ${u.nama} sebesar ${rp(t.nominal)} ${waktu}. Pembayaran bisa dilakukan dari menu Langganan di aplikasi. Kalau butuh bantuan atau mau bayar lewat transfer, balas pesan ini ya.`;
}

export const linkPengingatWa = (u: Usaha, t: TagihanPlatform, hari: string) => linkWa(u.noWa, pesanPengingat(u, t, hari));

// ---------- Promo platform ----------

export const PROMO_BULAN_MAKS = 12;

export function pemakaianPromo(kode: string, tagihan: TagihanPlatform[]): { terpakai: number; totalPotongan: number } {
  const lunas = tagihan.filter((t) => t.status === "lunas" && t.kodePromo === kode);
  return { terpakai: lunas.length, totalPotongan: lunas.reduce((n, t) => n + (t.hargaNormal - t.nominal), 0) };
}

export type StatusPromoPlatform = "aktif" | "nonaktif" | "kedaluwarsa" | "habis";
export function statusPromo(p: PromoPlatform, terpakai: number, hari: string): StatusPromoPlatform {
  if (!p.aktif) return "nonaktif";
  if (p.kedaluwarsa && p.kedaluwarsa < hari) return "kedaluwarsa";
  if (p.kuota !== null && terpakai >= p.kuota) return "habis";
  return "aktif";
}

export interface InputPromo { kode: string; jenis: "persen" | "nominal"; nilai: number; kuota: number | null; kedaluwarsa: string | null; berlakuBulan: number }
export type GalatPromo = Partial<Record<keyof InputPromo, string>>;

export function validasiPromo(i: InputPromo, ada: Pick<PromoPlatform, "kode">[], hari: string): GalatPromo {
  const g: GalatPromo = {};
  const kode = i.kode.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,16}$/.test(kode)) g.kode = "Kode 3–16 huruf atau angka, tanpa spasi.";
  else if (ada.some((p) => p.kode === kode)) g.kode = "Kode ini sudah ada.";
  if (i.jenis === "persen" && (!Number.isInteger(i.nilai) || i.nilai < 1 || i.nilai > 100)) g.nilai = "Persen 1–100.";
  if (i.jenis === "nominal" && (!Number.isInteger(i.nilai) || i.nilai < 1000 || i.nilai > HARGA.agensi_jaringan * PROMO_BULAN_MAKS)) g.nilai = `Nominal Rp1.000–${rp(HARGA.agensi_jaringan * PROMO_BULAN_MAKS)}.`;
  if (i.kuota !== null && (!Number.isInteger(i.kuota) || i.kuota < 1 || i.kuota > 100000)) g.kuota = "Kuota 1–100.000 atau kosongkan.";
  if (i.kedaluwarsa !== null && (Number.isNaN(Date.parse(i.kedaluwarsa)) || i.kedaluwarsa < hari)) g.kedaluwarsa = "Tanggal tidak boleh di masa lalu.";
  if (!Number.isInteger(i.berlakuBulan) || i.berlakuBulan < 1 || i.berlakuBulan > PROMO_BULAN_MAKS) g.berlakuBulan = `Berlaku 1–${PROMO_BULAN_MAKS} bulan.`;
  return g;
}

/** Potongan per bulan, tidak pernah melebihi harga. */
export function hargaSetelahPromo(plan: Plan, p: Pick<PromoPlatform, "jenis" | "nilai"> | null): { normal: number; potongan: number; bayar: number } {
  const normal = HARGA[plan];
  if (!p) return { normal, potongan: 0, bayar: normal };
  const mentah = p.jenis === "persen" ? Math.round((normal * p.nilai) / 100) : p.nilai;
  const potongan = Math.min(Math.max(mentah, 0), normal);
  return { normal, potongan, bayar: normal - potongan };
}

// ---------- Mode lihat (tercatat dan terbatas waktu) ----------

export const MODE_LIHAT_MENIT = 30;
export const ALASAN_LIHAT_MIN = 8;

export type HasilModeLihat = { ok: true; audit: Omit<Audit, "id" | "waktu">; berakhir: string } | { ok: false; galat: string };

export function mulaiModeLihat(u: Usaha, alasan: string, sekarang: string): HasilModeLihat {
  const a = batasTeks(alasan);
  if (a.length < ALASAN_LIHAT_MIN) return { ok: false, galat: `Tulis alasan minimal ${ALASAN_LIHAT_MIN} huruf, misalnya "bantu setup jadwal, diminta owner lewat WA".` };
  if (a.length > 300) return { ok: false, galat: "Alasan maksimal 300 karakter." };
  return {
    ok: true,
    audit: { aksi: "lihat_usaha", usahaId: u.id, ringkas: `Mode lihat ${u.nama} dibuka (${MODE_LIHAT_MENIT} menit)`, alasan: a },
    berakhir: new Date(Date.parse(sekarang) + MODE_LIHAT_MENIT * 60_000).toISOString(),
  };
}

export const modeLihatAktif = (berakhir: string | null, sekarang: string) => berakhir !== null && Date.parse(sekarang) < Date.parse(berakhir);

export const CATATAN_USAHA_MAKS = 1000;

// ---------- Komposisi paket (untuk diagram dashboard) ----------

export interface KomposisiPaket { jenis: Jenis; usaha: number; mrr: number; persenMrr: number }

/** Usaha berbayar yang sehat (status otomatis aktif) per paket, beserta bagian MRR-nya. Jumlahnya selalu = MRR aktif di dashboard. */
export function komposisiPaket(usaha: Usaha[], tagihan: TagihanPlatform[], hari: string): { paket: KomposisiPaket[]; totalMrr: number; trial: number } {
  const per: Record<Jenis, { usaha: number; mrr: number }> = { agensi: { usaha: 0, mrr: 0 }, guru_les: { usaha: 0, mrr: 0 } };
  for (const u of usaha) {
    if (faseOtomatis(u, hari) !== "aktif") continue;
    const t = tagihan.filter((x) => x.usahaId === u.id && x.status === "lunas" && x.dibayar).sort((a, b) => b.dibayar!.localeCompare(a.dibayar!))[0];
    if (!t) continue;
    per[jenisDariPlan(u.plan)].usaha++;
    per[jenisDariPlan(u.plan)].mrr += Math.round(t.nominal / t.bulan);
  }
  const totalMrr = per.agensi.mrr + per.guru_les.mrr;
  const paket = (["agensi", "guru_les"] as const).map((jenis) => ({ jenis, usaha: per[jenis].usaha, mrr: per[jenis].mrr, persenMrr: totalMrr === 0 ? 0 : Math.round((per[jenis].mrr / totalMrr) * 100) }));
  return { paket, totalMrr, trial: usaha.filter((u) => faseOtomatis(u, hari) === "trial").length };
}
