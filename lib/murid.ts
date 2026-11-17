import type { MuridContoh, StatusBayar } from "./contoh";

export type FilterMurid = "semua" | "anak" | "dewasa" | "belum_lunas" | "sisa_sedikit" | "nonaktif";

export const SISA_SEDIKIT = 2;

export const labelFilter: Record<FilterMurid, string> = {
  semua: "Semua",
  anak: "Anak",
  dewasa: "Dewasa",
  belum_lunas: "Belum lunas",
  sisa_sedikit: "Sisa sedikit",
  nonaktif: "Nonaktif",
};

export function saring(daftar: MuridContoh[], q: string, filter: FilterMurid): MuridContoh[] {
  const kata = q.trim().toLowerCase();
  return daftar.filter((m) => {
    if (kata && !`${m.nama} ${m.namaOrtu ?? ""}`.toLowerCase().includes(kata)) return false;
    switch (filter) {
      case "anak": return m.aktif && m.kategori === "anak";
      case "dewasa": return m.aktif && m.kategori === "dewasa";
      case "belum_lunas": return m.aktif && m.bayar !== "lunas";
      case "sisa_sedikit": return m.aktif && m.sisaSesi <= SISA_SEDIKIT;
      case "nonaktif": return !m.aktif;
      default: return m.aktif;
    }
  });
}

export function labelBayar(s: StatusBayar): { teks: string; pendek: string; kelas: string } {
  if (s === "lunas") return { teks: "Lunas", pendek: "Lunas", kelas: "st st-ok" };
  if (s === "menunggu_verifikasi") return { teks: "Menunggu verifikasi", pendek: "Verifikasi", kelas: "st st-few" };
  return { teks: "Belum bayar", pendek: "Belum bayar", kelas: "st st-free" };
}
