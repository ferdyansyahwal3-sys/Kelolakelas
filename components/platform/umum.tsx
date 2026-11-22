"use client";
import { pecahRupiah, tglPendek } from "@/lib/format";
import type { Fase } from "@/lib/langganan";
import type { StatusTagihan, StatusPromoPlatform } from "@/lib/platform";
import { usePlatform } from "./PlatformProvider";

export const labelFase: Record<Fase, string> = { trial: "Trial", aktif: "Aktif", jatuh_tempo: "Jatuh tempo", ditangguhkan: "Ditangguhkan", berhenti: "Berhenti" };
export const kelasFase: Record<Fase, string> = { trial: "st st-few", aktif: "st st-ok", jatuh_tempo: "st st-free", ditangguhkan: "st st-full", berhenti: "st st-full" };
export const labelTagihan: Record<StatusTagihan, string> = { belum_bayar: "Belum bayar", lunas: "Lunas", kedaluwarsa: "Kedaluwarsa", batal: "Batal" };
export const kelasTagihan: Record<StatusTagihan, string> = { belum_bayar: "st st-free", lunas: "st st-ok", kedaluwarsa: "st st-full", batal: "st st-full" };
export const labelPromo: Record<StatusPromoPlatform, string> = { aktif: "Aktif", nonaktif: "Nonaktif", kedaluwarsa: "Kedaluwarsa", habis: "Habis" };
export const kelasPromo: Record<StatusPromoPlatform, string> = { aktif: "st st-ok", nonaktif: "st st-full", kedaluwarsa: "st st-full", habis: "st st-full" };

/** Format rupiah yang ikut tombol "sembunyikan nominal". */
export function useRp() {
  const { sembunyi } = usePlatform();
  return (n: number) => (sembunyi ? "Rp ••••••" : `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`);
}

export const tgl = (iso: string | null) => (iso ? `${tglPendek(iso)} ${iso.slice(0, 4)}` : "—");
export const waktuAudit = (iso: string) => `${tglPendek(iso.slice(0, 10))} ${iso.slice(11, 16)}`;

export function unduhCsv(nama: string, isi: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = nama; a.click();
  URL.revokeObjectURL(url);
}
