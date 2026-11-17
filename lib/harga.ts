export interface Promo {
  kode: string;
  jenis: "persen" | "nominal";
  nilai: number;
}

export interface Rincian {
  harga: number;
  potongan: number;
  total: number;
}

/** Harga selalu dihitung dari data paket dan promo, tidak pernah dari angka kiriman browser. */
export function hitungTotal(harga: number, promo?: Promo | null): Rincian {
  if (!promo) return { harga, potongan: 0, total: harga };
  const mentah = promo.jenis === "persen" ? Math.round((harga * promo.nilai) / 100) : promo.nilai;
  const potongan = Math.min(Math.max(mentah, 0), harga);
  return { harga, potongan, total: harga - potongan };
}

export function cariPromo(kode: string, daftar: Promo[]): Promo | null {
  const bersih = kode.trim().toUpperCase();
  if (!bersih) return null;
  return daftar.find((p) => p.kode === bersih) ?? null;
}
