// Murni (tanpa jaringan): mengubah kolom database langganan menjadi masukan untuk hitungAkses.
import type { DataLangganan } from "./langganan";

/** yyyy-mm-dd menurut waktu Jakarta (WIB). Akses dihitung per hari kalender WIB. */
export function tanggalJakarta(waktu: string | Date): string {
  return new Date(waktu).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export const hariIniJakarta = () => tanggalJakarta(new Date());

const tgl = (x: string | null | undefined) => (x ? tanggalJakarta(x) : null);

/** trial = tenants.trial_ends_at; berbayar = subscriptions.current_period_end; grace = subscriptions.grace_until. */
export function dataLangganan(trialEndsAt: string | null | undefined, periodEnd: string | null | undefined, graceUntil: string | null | undefined): DataLangganan {
  return { trialBerakhir: tgl(trialEndsAt), periodeBerakhir: tgl(periodEnd), graceSampai: tgl(graceUntil) };
}
