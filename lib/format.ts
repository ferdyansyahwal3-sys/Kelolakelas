const rupiah = new Intl.NumberFormat("id-ID");

export function pecahRupiah(nilai: number): { depan: string; belakang: string } {
  const teks = rupiah.format(nilai);
  const i = teks.lastIndexOf(".");
  if (nilai < 1000 || i === -1) return { depan: teks, belakang: "" };
  return { depan: teks.slice(0, i), belakang: teks.slice(i) };
}

export function inisial(nama: string): string {
  const kata = nama.split(" ").filter(Boolean);
  if (kata.length === 1) return kata[0]!.slice(0, 2).toUpperCase();
  return kata.slice(0, 2).map((k) => k[0]!.toUpperCase()).join("");
}

export function tglPendek(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function ringkasRupiah(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  if (n >= 1000) return `Rp ${Math.round(n / 1000)}rb`;
  return `Rp ${n}`;
}
