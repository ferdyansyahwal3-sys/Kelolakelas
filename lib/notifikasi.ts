// Murni (tanpa jaringan/DB): isi pesan WA + email, kunci anti-kirim-ganda, dan pemilihan tagihan untuk pengingat terjadwal.
import { isiTemplate } from "./pengaturan";
import { tglPendek } from "./format";
import { TEMPLAT_BAWAAN } from "./pengaturanDb";

export type Templat = { acc: string; tolak: string; pengingat: string };
export type JenisNotif = "pengingat_tagihan" | "konfirmasi_acc" | "undangan_pelatih";

const rp = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailValid = (s: string | null | undefined): boolean => typeof s === "string" && s.length <= 130 && EMAIL.test(s.trim());
export const bersihEmail = (s: string | null | undefined): string | null => {
  const t = String(s ?? "").trim().toLowerCase();
  return t === "" ? null : t;
};

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Pastikan tautan yang masuk email hanya http(s). */
export const tautanAman = (u: string): string => (/^https?:\/\//i.test(u) ? u : "#");

// ---------- WA (template Pengaturan dipakai tombol WA) ----------

export function templatAman(t?: Partial<Templat> | null): Templat {
  return { acc: t?.acc || TEMPLAT_BAWAAN.acc, tolak: t?.tolak || TEMPLAT_BAWAAN.tolak, pengingat: t?.pengingat || TEMPLAT_BAWAAN.pengingat };
}

export interface DataTagihanPesan { nama: string; namaOrtu?: string; usaha: string; nominal: number; tempo: string; paket?: string }

/** Teks pengingat tagihan dari template (WA dan isi email sama). Ditambah keterangan telat bila lewat jatuh tempo. */
export function pesanPengingat(templat: string, d: DataTagihanPesan): string {
  return isiTemplate(templat, { nama: d.namaOrtu ?? d.nama, usaha: d.usaha, slot: d.paket ?? "", total: rp(d.nominal), tempo: tglPendek(d.tempo) });
}

export function pesanKeputusan(jenis: "acc" | "tolak", templat: Templat, d: { nama: string; usaha: string; slot: string; total: number; tempo?: string }): string {
  return isiTemplate(jenis === "acc" ? templat.acc : templat.tolak, { nama: d.nama, usaha: d.usaha, slot: d.slot, total: rp(d.total), tempo: d.tempo ? tglPendek(d.tempo) : "" });
}

// ---------- Tahap pengingat & kunci idempotensi ----------

export type TahapPengingat = "h3" | "tempo" | "telat3";

export function selisihHari(dari: string, ke: string): number {
  const a = Date.UTC(+dari.slice(0, 4), +dari.slice(5, 7) - 1, +dari.slice(8, 10));
  const b = Date.UTC(+ke.slice(0, 4), +ke.slice(5, 7) - 1, +ke.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Hari ini vs jatuh tempo: 3 hari sebelum, hari-H, atau 3 hari setelahnya. Selain itu tidak ada pengingat otomatis. */
export function tahapPengingat(tempo: string, hariIni: string): TahapPengingat | null {
  const sisa = selisihHari(hariIni, tempo);
  if (sisa === 3) return "h3";
  if (sisa === 0) return "tempo";
  if (sisa === -3) return "telat3";
  return null;
}

export const kunciPengingatOtomatis = (tagihanId: string, tahap: TahapPengingat) => `pengingat:${tagihanId}:${tahap}`;
export const kunciPengingatManual = (tagihanId: string, hariIni: string) => `pengingat-manual:${tagihanId}:${hariIni}`;
export const kunciAcc = (pendaftaranId: string) => `acc:${pendaftaranId}`;
export const kunciUndangan = (pengajarId: string, hashKode: string) => `undangan:${pengajarId}:${hashKode.slice(0, 12)}`;

export interface TagihanCron { id: string; tenant_id: string; status: string; jatuh_tempo: string | null; email: string | null }

/** Tagihan 'belum' dengan email valid yang jatuh pada salah satu tahap hari ini. */
export function pilihUntukCron(baris: TagihanCron[], hariIni: string): { baris: TagihanCron; tahap: TahapPengingat }[] {
  const hasil: { baris: TagihanCron; tahap: TahapPengingat }[] = [];
  for (const b of baris) {
    if (b.status !== "belum" || !b.jatuh_tempo || !emailValid(b.email)) continue;
    const tahap = tahapPengingat(b.jatuh_tempo, hariIni);
    if (tahap) hasil.push({ baris: b, tahap });
  }
  return hasil;
}

// ---------- Email ----------

export interface IsiEmail { subjek: string; html: string; teks: string }

function bungkus(usaha: string, judul: string, paragraf: string[], tombol?: { label: string; url: string }): string {
  const p = paragraf.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1d2433">${escHtml(t).replace(/\n/g, "<br>")}</p>`).join("");
  const b = tombol ? `<p style="margin:22px 0 6px"><a href="${escHtml(tautanAman(tombol.url))}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">${escHtml(tombol.label)}</a></p>` : "";
  return `<!doctype html><html lang="id"><body style="margin:0;background:#eef2f9;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px 26px;border:1px solid #dfe5f1">
<p style="margin:0 0 18px;font-size:13px;font-weight:600;letter-spacing:.04em;color:#5b6b8c;text-transform:uppercase">${escHtml(usaha)}</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0d1530">${escHtml(judul)}</h1>${p}${b}
<p style="margin:26px 0 0;font-size:12px;color:#8b97b1">Email ini dikirim otomatis oleh KelolaKelas atas nama ${escHtml(usaha)}. Mohon tidak membalas email ini.</p>
</div></body></html>`;
}

export function emailPengingat(usaha: string, d: DataTagihanPesan, templat: string, linkPortal?: string): IsiEmail {
  const isi = pesanPengingat(templat, d);
  return {
    subjek: `Pengingat tagihan dari ${usaha}`,
    html: bungkus(usaha, "Pengingat tagihan", [isi, `Tagihan: ${rp(d.nominal)}${d.paket ? ` (${d.paket})` : ""}\nJatuh tempo: ${tglPendek(d.tempo)}`], linkPortal ? { label: "Buka halaman murid", url: linkPortal } : undefined),
    teks: `${isi}\n\nTagihan: ${rp(d.nominal)}\nJatuh tempo: ${tglPendek(d.tempo)}${linkPortal ? `\n${linkPortal}` : ""}`,
  };
}

export function emailAcc(usaha: string, templat: Templat, d: { nama: string; slot: string; total: number }): IsiEmail {
  const isi = pesanKeputusan("acc", templat, { nama: d.nama, usaha, slot: d.slot, total: d.total });
  return { subjek: `Pendaftaranmu di ${usaha} sudah disetujui`, html: bungkus(usaha, "Pendaftaran disetujui", [isi]), teks: isi };
}

export function emailUndangan(usaha: string, d: { namaPelatih: string; kode: string; link: string; berlakuHari: number }): IsiEmail {
  const baris = [
    `Halo ${d.namaPelatih}, kamu diundang bergabung sebagai pelatih di ${usaha} lewat KelolaKelas.`,
    `Klik tombol di bawah, masuk atau buat akun dengan email ini, lalu undangan diterima otomatis. Kode undangan: ${d.kode}`,
    `Undangan berlaku ${d.berlakuHari} hari.`,
  ];
  return { subjek: `Undangan jadi pelatih di ${usaha}`, html: bungkus(usaha, "Undangan pelatih", baris, { label: "Terima undangan", url: d.link }), teks: `${baris.join("\n\n")}\n\n${d.link}` };
}
