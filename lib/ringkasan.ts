import { menit } from "./jadwal";
import type { SesiHari } from "./sesi";
import { hitungSlot } from "./slot";

export type Periode = "pagi" | "siang" | "sore";
export const LABEL_PERIODE: Record<Periode, string> = { pagi: "PAGI", siang: "SIANG", sore: "SORE" };

/** Pagi sebelum 11.00, siang 11.00–14.59, sore mulai 15.00. */
export function periodeJam(jam: string): Periode {
  const m = menit(jam);
  return m < 11 * 60 ? "pagi" : m < 15 * 60 ? "siang" : "sore";
}

export interface KartuPeriode { id: Periode; label: string; sesi: number; murid: number; hampirPenuh: number; rentang: string }
export interface KonteksPagi { pendaftaranMenunggu: number; buktiPerluDicek: number; tagihanTelat: number }
export interface IstilahRingkas { sesi: string; murid: string }

function gabung(daftar: string[]): string {
  if (daftar.length <= 1) return daftar[0] ?? "";
  return `${daftar.slice(0, -1).join(", ")} dan ${daftar[daftar.length - 1]}`;
}

/** "Hampir penuh" = kelas berkuota lebih dari 1 yang tinggal satu tempat. Sesi tanpa murid tidak dihitung sebagai sesi hari ini. */
export interface ItemPerhatian { id: string; teks: string; href: string }

export function ringkasanPagi(sesi: SesiHari[], k: KonteksPagi, istilah: IstilahRingkas): { judul: string; ringkas: string; perhatian: ItemPerhatian[]; kartu: KartuPeriode[]; totalSesi: number; totalMurid: number; hampirPenuh: number } {
  const aktif = sesi.filter((s) => s.peserta.length > 0);
  const kartu: KartuPeriode[] = (["pagi", "siang", "sore"] as const).map((id) => {
    const d = aktif.filter((s) => periodeJam(s.slot.jam) === id).sort((a, b) => menit(a.slot.jam) - menit(b.slot.jam));
    return {
      id, label: LABEL_PERIODE[id], sesi: d.length, murid: d.reduce((n, s) => n + s.peserta.length, 0),
      hampirPenuh: d.filter((s) => s.slot.kuota > 1 && hitungSlot(s.slot.kuota, s.peserta.length).sisa === 1).length,
      rentang: d.length === 0 ? "" : d.length === 1 ? d[0]!.slot.jam : `${d[0]!.slot.jam} – ${d[d.length - 1]!.slot.jam}`,
    };
  });
  const totalSesi = kartu.reduce((n, p) => n + p.sesi, 0);
  const totalMurid = kartu.reduce((n, p) => n + p.murid, 0);
  const hampirPenuh = kartu.reduce((n, p) => n + p.hampirPenuh, 0);

  const dasar = totalSesi === 0 ? `Hari ini tidak ada ${istilah.sesi}.` : `Hari ini ${totalSesi} ${istilah.sesi} dengan ${totalMurid} ${istilah.murid}.`;
  const perhatian: string[] = [];
  if (k.pendaftaranMenunggu > 0) perhatian.push(`${k.pendaftaranMenunggu} pendaftaran menunggu ACC`);
  if (k.buktiPerluDicek > 0) perhatian.push(`${k.buktiPerluDicek} bukti bayar perlu dicek`);
  if (k.tagihanTelat > 0) perhatian.push(`${k.tagihanTelat} tagihan telat`);
  if (hampirPenuh > 0) perhatian.push(`${hampirPenuh} ${istilah.sesi} hampir penuh`);
  // Versi singkat untuk layar: satu baris angka + chip pendek yang bisa diketuk (tiap chip ke halaman yang menyelesaikannya).
  const chip: ItemPerhatian[] = [];
  if (k.pendaftaranMenunggu > 0) chip.push({ id: "acc", teks: `${k.pendaftaranMenunggu} menunggu ACC`, href: "/app/pendaftaran" });
  if (k.buktiPerluDicek > 0) chip.push({ id: "bukti", teks: `${k.buktiPerluDicek} bukti bayar`, href: "/app/tagihan" });
  if (k.tagihanTelat > 0) chip.push({ id: "telat", teks: `${k.tagihanTelat} tagihan telat`, href: "/app/tagihan" });
  if (hampirPenuh > 0) chip.push({ id: "penuh", teks: `${hampirPenuh} hampir penuh`, href: "/app/sesi" });
  const ringkas = totalSesi === 0 ? `Tidak ada ${istilah.sesi} hari ini` : `${totalSesi} ${istilah.sesi} · ${totalMurid} ${istilah.murid} hari ini`;
  return { judul: perhatian.length === 0 ? `${dasar} Semuanya beres.` : `${dasar} Perlu perhatian: ${gabung(perhatian)}.`, ringkas, perhatian: chip, kartu, totalSesi, totalMurid, hampirPenuh };
}
