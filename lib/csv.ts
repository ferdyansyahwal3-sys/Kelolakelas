/** Sel yang diawali = + - @ tab atau CR dianggap rumus oleh Excel/Sheets, jadi diberi tanda petik di depan. */
function aman(nilai: unknown): string {
  let s = nilai === null || nilai === undefined ? "" : String(nilai);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv<T>(baris: T[], kolom: { judul: string; ambil: (b: T) => unknown }[]): string {
  const kepala = kolom.map((k) => aman(k.judul)).join(",");
  const isi = baris.map((b) => kolom.map((k) => aman(k.ambil(b))).join(","));
  return [kepala, ...isi].join("\r\n") + "\r\n";
}
