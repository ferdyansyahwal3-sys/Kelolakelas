// Murni (tanpa jaringan/DB): isi pesan WA + email, kunci anti-kirim-ganda, dan pemilihan tagihan untuk pengingat terjadwal.
import { isiTemplate } from "./pengaturan";
import { tglPendek } from "./format";
import { TEMPLAT_BAWAAN } from "./pengaturanDb";
import { adalahPlan, labelPlan } from "./paketLangganan";

export type Templat = { acc: string; tolak: string; pengingat: string };
export type JenisNotif = "pengingat_tagihan" | "konfirmasi_acc" | "undangan_pelatih" | "langganan_pengingat" | "langganan_invoice" | "langganan_lunas";

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

/** Id gambar sebaris untuk logo; kirimEmail melampirkan PNG-nya bila HTML memakai `cid:` ini. */
export const LOGO_CID = "logo-kelolakelas";

export type RincianEmail = [label: string, nilai: string][];

type Lencana = { teks: string; warna: string; latar: string };
const LENCANA = {
  info: { warna: "#1d4ed8", latar: "#dbeafe" },
  ok: { warna: "#047857", latar: "#d1fae5" },
  peringatan: { warna: "#b45309", latar: "#fef3c7" },
  bahaya: { warna: "#b91c1c", latar: "#fee2e2" },
};
const lencana = (teks: string, jenis: keyof typeof LENCANA): Lencana => ({ teks, ...LENCANA[jenis] });
const chipHtml = (l: Lencana, F: string) => `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${l.latar};color:${l.warna};font-size:12px;font-weight:700;letter-spacing:.06em;font-family:${F}">${escHtml(l.teks)}</span>`;
const kepalaHtml = (label: string, F: string) => `<tr><td style="background:#0d1530;padding:22px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody><tr>
<td style="vertical-align:middle"><table role="presentation" cellpadding="0" cellspacing="0"><tbody><tr><td style="vertical-align:middle"><img src="cid:${LOGO_CID}" width="34" height="26" alt="" style="display:block;border:0"></td><td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;color:#ffffff;font-family:${F}">KelolaKelas</td></tr></tbody></table></td>
<td align="right" style="vertical-align:middle;font-size:13px;font-weight:700;letter-spacing:.14em;color:#9db8ff;font-family:${F}">${escHtml(label.toUpperCase())}</td>
</tr></tbody></table></td></tr>`;
const tombolHtml = (t: { label: string; url: string }, F: string) => `<table role="presentation" cellpadding="0" cellspacing="0"><tbody><tr><td style="background:#2f6bff;border-radius:12px"><a href="${escHtml(tautanAman(t.url))}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;font-family:${F}">${escHtml(t.label)}</a></td></tr></tbody></table>`;

function bungkus(usaha: string, judul: string, paragraf: string[], tombol?: { label: string; url: string }, rincian?: RincianEmail, dariPlatform = false, opsi: { label: string; lencana?: Lencana; rincianJudul?: string } = { label: "Pemberitahuan" }): string {
  const F = FONT_INV;
  const p = paragraf.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#1d2433;font-family:${F}">${escHtml(t).replace(/\n/g, "<br>")}</p>`).join("");
  const r = rincian?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;border-collapse:collapse"><tbody><tr><td colspan="2" style="padding:10px 0;border-bottom:2px solid #0d1530;font-size:11px;font-weight:700;letter-spacing:.08em;color:#8b97b1;font-family:${F}">${escHtml((opsi.rincianJudul ?? "Rincian").toUpperCase())}</td></tr>${rincian
        .map(([l, v]) => `<tr><td style="padding:11px 0;border-bottom:1px solid #e6ebf5;font-size:13px;color:#5b6b8c;font-family:${F}">${escHtml(l)}</td><td align="right" style="padding:11px 0;border-bottom:1px solid #e6ebf5;font-size:15px;font-weight:700;color:#0d1530;font-family:${F}">${escHtml(v)}</td></tr>`)
        .join("")}</tbody></table>`
    : "";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#eef2f9;padding:28px 12px;font-family:${F}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tbody>
<tr><td style="background:#ffffff;border:1px solid #dfe5f1;border-radius:18px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${kepalaHtml(opsi.label, F)}
<tr><td style="padding:26px 28px 28px">
${opsi.lencana ? `<p style="margin:0 0 14px">${chipHtml(opsi.lencana, F)}</p>` : ""}
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#8b97b1;font-family:${F}">${escHtml(usaha.toUpperCase())}</p>
<h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;color:#0d1530;font-family:${F}">${escHtml(judul)}</h1>${p}${r}${tombol ? tombolHtml(tombol, F) : ""}
</td></tr></tbody></table></td></tr>
<tr><td style="padding:16px 8px 0;font-size:12px;line-height:1.5;color:#8b97b1;text-align:center;font-family:${F}">${dariPlatform ? `Email ini dikirim otomatis oleh KelolaKelas untuk akun ${escHtml(usaha)}.` : `Email ini dikirim otomatis oleh KelolaKelas atas nama ${escHtml(usaha)}.`}<br>Mohon tidak membalas email ini.</td></tr>
</tbody></table></td></tr></tbody></table></body></html>`;
}

export function emailPengingat(usaha: string, d: DataTagihanPesan, templat: string, linkPortal?: string): IsiEmail {
  const isi = pesanPengingat(templat, d);
  const nama = d.paket ? `Tagihan — ${d.paket}` : "Tagihan les";
  const meta: RincianEmail = [["Dari", usaha], ["Jatuh tempo", tglPendek(d.tempo)]];
  return {
    subjek: `Pengingat tagihan dari ${usaha}`,
    html: bungkusFaktur({ usaha, kepada: d.namaOrtu ?? d.nama, dariPlatform: false, isi: [isi], judul: "Tagihan", lencana: lencana("BELUM DIBAYAR", "peringatan"), meta, item: { nama, ket: `Murid: ${d.nama}`, jumlah: rp(d.nominal) }, totalLabel: "Total tagihan", total: rp(d.nominal), catatan: ["Abaikan email ini bila kamu sudah membayar."], tombol: linkPortal ? { label: "Buka halaman murid", url: linkPortal } : undefined }),
    teks: `${isi}\n\nTagihan: ${rp(d.nominal)}\nJatuh tempo: ${tglPendek(d.tempo)}${linkPortal ? `\n${linkPortal}` : ""}`,
  };
}

export function emailAcc(usaha: string, templat: Templat, d: { nama: string; slot: string; total: number }): IsiEmail {
  const isi = pesanKeputusan("acc", templat, { nama: d.nama, usaha, slot: d.slot, total: d.total });
  return {
    subjek: `Pendaftaranmu di ${usaha} sudah disetujui`,
    html: bungkus(usaha, "Pendaftaran disetujui", [isi], undefined, [["Murid", d.nama], ...(d.slot ? ([["Jadwal", d.slot]] as RincianEmail) : []), ["Total", rp(d.total)]], false, { label: "Pendaftaran", lencana: lencana("DISETUJUI", "ok"), rincianJudul: "Rincian pendaftaran" }),
    teks: isi,
  };
}

export function emailUndangan(usaha: string, d: { namaPelatih: string; kode: string; link: string; berlakuHari: number }): IsiEmail {
  const baris = [
    `Halo ${d.namaPelatih}, kamu diundang bergabung sebagai pelatih di ${usaha} lewat KelolaKelas.`,
    `Klik tombol di bawah, masuk atau buat akun dengan email ini, lalu undangan diterima otomatis.`,
  ];
  const teks = `${baris.join("\n\n")}\nKode undangan: ${d.kode}\nUndangan berlaku ${d.berlakuHari} hari.\n\n${d.link}`;
  return { subjek: `Undangan jadi pelatih di ${usaha}`, html: bungkus(usaha, "Undangan jadi pelatih", baris, { label: "Terima undangan", url: d.link }, [["Usaha", usaha], ["Peran", "Pelatih"], ["Kode undangan", d.kode], ["Berlaku", `${d.berlakuHari} hari`]], false, { label: "Undangan", lencana: lencana("UNDANGAN BARU", "info"), rincianJudul: "Detail undangan" }), teks };
}

// ---------- Langganan KelolaKelas (email ke pemilik usaha) ----------

export type TahapLangganan = "h7" | "h3" | "tempo" | "telat3";

/** Tanggal panjang dengan tahun, mis. "28 Des 2026" (tanggal WIB yyyy-mm-dd). */
export const tglPanjang = (iso: string): string => new Date(iso.slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const namaPlan = (p: string): string => (adalahPlan(p) ? labelPlan(p) : p);

/** Akhir periode (tanggal WIB) vs hari ini: 7 atau 3 hari sebelum, hari-H, atau 3 hari sesudahnya. Selain itu tidak ada pengingat. */
export function tahapLangganan(akhir: string, hariIni: string): TahapLangganan | null {
  const sisa = selisihHari(hariIni, akhir);
  if (sisa === 7) return "h7";
  if (sisa === 3) return "h3";
  if (sisa === 0) return "tempo";
  if (sisa === -3) return "telat3";
  return null;
}

/** Satu kunci per periode + tahap: periode baru (akhir berubah setelah bayar) otomatis boleh dikirimi lagi. */
export const kunciLangganan = (akhir: string, tahap: TahapLangganan) => `langganan:${akhir}:${tahap}`;
export const kunciInvoiceTerbit = (invoiceId: string) => `langganan-invoice:${invoiceId}`;
export const kunciStrukLangganan = (invoiceId: string) => `langganan-struk:${invoiceId}`;

const JUDUL_LANGGANAN: Record<TahapLangganan, { judul: string; kalimat: (akhir: string) => string }> = {
  h7: { judul: "Langgananmu berakhir 7 hari lagi", kalimat: (a) => `Langganan KelolaKelas akunmu berakhir pada ${tglPanjang(a)}. Perpanjang sekarang supaya jadwal, murid, dan tagihan tetap berjalan tanpa jeda.` },
  h3: { judul: "Langgananmu berakhir 3 hari lagi", kalimat: (a) => `Langganan KelolaKelas akunmu berakhir pada ${tglPanjang(a)}. Perpanjang sebelum tanggal itu agar pengelolaan kelas tidak terganggu.` },
  tempo: { judul: "Langgananmu berakhir hari ini", kalimat: (a) => `Langganan KelolaKelas akunmu berakhir hari ini, ${tglPanjang(a)}. Perpanjang sekarang agar murid, pelatih, dan jadwalmu tetap bisa dipakai.` },
  telat3: { judul: "Langgananmu sudah berakhir", kalimat: (a) => `Langganan KelolaKelas akunmu berakhir pada ${tglPanjang(a)} dan belum diperpanjang. Perpanjang sekarang supaya jadwal, murid, dan tagihan bisa dipakai lagi seperti biasa.` },
};

export interface DataPengingatLangganan { tahap: TahapLangganan; akhir: string; plan: string; tagihan?: { nominal: number; tempo: string } }

export function emailPengingatLangganan(usaha: string, d: DataPengingatLangganan, link: string): IsiEmail {
  const j = JUDUL_LANGGANAN[d.tahap];
  const isi = j.kalimat(d.akhir);
  const lc = d.tahap === "telat3" ? lencana("SUDAH BERAKHIR", "bahaya") : d.tahap === "tempo" ? lencana("BERAKHIR HARI INI", "bahaya") : lencana(d.tahap === "h3" ? "BERAKHIR 3 HARI LAGI" : "BERAKHIR 7 HARI LAGI", "peringatan");
  const rincian: RincianEmail = [["Paket", namaPlan(d.plan)], ["Berakhir pada", tglPanjang(d.akhir)], ...(d.tagihan ? ([["Tagihan perpanjangan", rp(d.tagihan.nominal)]] as RincianEmail) : [])];
  return {
    subjek: d.tahap === "telat3" ? `Langganan KelolaKelas ${usaha} sudah berakhir` : `${j.judul} — ${usaha}`,
    html: bungkus(usaha, j.judul, [isi], { label: "Perpanjang langganan", url: link }, rincian, true, { label: "Pengingat", lencana: lc, rincianJudul: "Langganan" }),
    teks: `${isi}\n\n${rincian.map(([l, v]) => `${l}: ${v}`).join("\n")}\n\nPerpanjang: ${link}`,
  };
}

export interface DataInvoiceLangganan { plan: string; bulan: number; nominal: number; tempo: string; orderId?: string; terbit?: string; email?: string; promo?: string | null }

const FONT_INV = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Tampilan faktur: kepala + lencana status, info nomor/tanggal, "ditagihkan kepada", tabel item, total, tombol. */
function bungkusFaktur(o: { usaha: string; kepada?: string; dariPlatform?: boolean; isi?: string[]; judul: string; lencana: { teks: string; warna: string; latar: string }; meta: RincianEmail; email?: string; item: { nama: string; ket: string; jumlah: string }; promo?: string | null; totalLabel: string; total: string; catatan: string[]; tombol?: { label: string; url: string }; info?: RincianEmail }): string {
  const F = FONT_INV;
  const meta = o.meta.map(([l, v]) => `<tr><td style="padding:3px 0;font-size:12px;color:#8b97b1;font-family:${F}">${escHtml(l)}</td><td align="right" style="padding:3px 0 3px 16px;font-size:13px;font-weight:600;color:#0d1530;font-family:${F}">${escHtml(v)}</td></tr>`).join("");
  const info = (o.info ?? []).map(([l, v]) => `<tr><td style="padding:4px 0;font-size:13px;color:#5b6b8c;font-family:${F}">${escHtml(l)}</td><td align="right" style="padding:4px 0;font-size:13px;font-weight:600;color:#0d1530;font-family:${F}">${escHtml(v)}</td></tr>`).join("");
  const catatan = o.catatan.map((t) => `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5b6b8c;font-family:${F}">${escHtml(t)}</p>`).join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#eef2f9;padding:28px 12px;font-family:${F}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tbody>
<tr><td style="background:#ffffff;border:1px solid #dfe5f1;border-radius:18px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>
<tr><td style="background:#0d1530;padding:22px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody><tr>
<td style="vertical-align:middle"><table role="presentation" cellpadding="0" cellspacing="0"><tbody><tr><td style="vertical-align:middle"><img src="cid:${LOGO_CID}" width="34" height="26" alt="" style="display:block;border:0"></td><td style="vertical-align:middle;padding-left:10px;font-size:17px;font-weight:700;color:#ffffff;font-family:${F}">KelolaKelas</td></tr></tbody></table></td>
<td align="right" style="vertical-align:middle;font-size:13px;font-weight:700;letter-spacing:.14em;color:#9db8ff;font-family:${F}">${escHtml(o.judul.toUpperCase())}</td>
</tr></tbody></table></td></tr>
<tr><td style="padding:26px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody><tr>
<td style="vertical-align:top"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${o.lencana.latar};color:${o.lencana.warna};font-size:12px;font-weight:700;letter-spacing:.06em;font-family:${F}">${escHtml(o.lencana.teks)}</span></td>
<td align="right" style="vertical-align:top"><table role="presentation" cellpadding="0" cellspacing="0"><tbody>${meta}</tbody></table></td>
</tr></tbody></table></td></tr>
<tr><td style="padding:22px 28px 0"><p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#8b97b1;font-family:${F}">DITAGIHKAN KEPADA</p>
<p style="margin:0;font-size:16px;font-weight:700;color:#0d1530;font-family:${F}">${escHtml(o.kepada ?? o.usaha)}</p>${o.email ? `<p style="margin:2px 0 0;font-size:13px;color:#5b6b8c;font-family:${F}">${escHtml(o.email)}</p>` : ""}</td></tr>
${o.isi?.length ? `<tr><td style="padding:20px 28px 0">${o.isi.map((t) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#1d2433;font-family:${F}">${escHtml(t).replace(/\n/g, "<br>")}</p>`).join("")}</td></tr>` : ""}
<tr><td style="padding:22px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tbody>
<tr><td style="padding:10px 0;border-bottom:2px solid #0d1530;font-size:11px;font-weight:700;letter-spacing:.08em;color:#8b97b1;font-family:${F}">DESKRIPSI</td><td align="right" style="padding:10px 0;border-bottom:2px solid #0d1530;font-size:11px;font-weight:700;letter-spacing:.08em;color:#8b97b1;font-family:${F}">JUMLAH</td></tr>
<tr><td style="padding:14px 0;border-bottom:1px solid #e6ebf5;font-family:${F}"><span style="display:block;font-size:15px;font-weight:600;color:#0d1530">${escHtml(o.item.nama)}</span><span style="display:block;margin-top:3px;font-size:12px;color:#8b97b1">${escHtml(o.item.ket)}</span></td><td align="right" style="padding:14px 0;border-bottom:1px solid #e6ebf5;font-size:15px;font-weight:600;color:#0d1530;font-family:${F};white-space:nowrap">${escHtml(o.item.jumlah)}</td></tr>
${o.promo ? `<tr><td colspan="2" style="padding:10px 0;border-bottom:1px solid #e6ebf5;font-size:13px;color:#5b6b8c;font-family:${F}">Kode promo <strong style="color:#0d1530">${escHtml(o.promo)}</strong> sudah diperhitungkan</td></tr>` : ""}
<tr><td style="padding:16px 0 6px;font-size:14px;font-weight:700;color:#0d1530;font-family:${F}">${escHtml(o.totalLabel)}</td><td align="right" style="padding:16px 0 6px;font-size:22px;font-weight:800;color:#2f6bff;font-family:${F};white-space:nowrap">${escHtml(o.total)}</td></tr>
</tbody></table></td></tr>
${info ? `<tr><td style="padding:10px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f7ff;border:1px solid #dbe6ff;border-radius:12px"><tbody><tr><td style="padding:10px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${info}</tbody></table></td></tr></tbody></table></td></tr>` : ""}
${o.tombol ? `<tr><td style="padding:22px 28px 6px">${tombolHtml(o.tombol, F)}</td></tr>` : ""}
<tr><td style="padding:14px 28px 26px">${catatan}</td></tr>
</tbody></table></td></tr>
<tr><td style="padding:16px 8px 0;font-size:12px;line-height:1.5;color:#8b97b1;text-align:center;font-family:${F}">${o.dariPlatform === false ? `Email ini dikirim otomatis oleh KelolaKelas atas nama ${escHtml(o.usaha)}.` : `Email ini dikirim otomatis oleh KelolaKelas untuk akun ${escHtml(o.usaha)}.`}<br>Mohon tidak membalas email ini.</td></tr>
</tbody></table></td></tr></tbody></table></body></html>`;
}

export function emailInvoiceLangganan(usaha: string, d: DataInvoiceLangganan, link: string): IsiEmail {
  const nama = `Langganan KelolaKelas — ${namaPlan(d.plan)}`;
  const ket = `${d.bulan} bulan`;
  const meta: RincianEmail = [...(d.orderId ? ([["No. invoice", d.orderId]] as RincianEmail) : []), ...(d.terbit ? ([["Tanggal terbit", tglPanjang(d.terbit)]] as RincianEmail) : []), ["Jatuh tempo", tglPanjang(d.tempo)]];
  const catatan = ["Selesaikan pembayaran sebelum jatuh tempo agar langgananmu tetap aktif tanpa jeda.", "Setelah pembayaran diterima, kami kirim struk ke email ini."];
  return {
    subjek: `Invoice langganan KelolaKelas${d.orderId ? ` ${d.orderId}` : ""} — ${usaha}`,
    html: bungkusFaktur({ usaha, judul: "Invoice", lencana: { teks: "BELUM DIBAYAR", warna: "#b45309", latar: "#fef3c7" }, meta, email: d.email, item: { nama, ket, jumlah: rp(d.nominal) }, promo: d.promo, totalLabel: "Total tagihan", total: rp(d.nominal), catatan, tombol: { label: "Bayar sekarang", url: link } }),
    teks: `INVOICE LANGGANAN KELOLAKELAS\n${meta.map(([l, v]) => `${l}: ${v}`).join("\n")}\nDitagihkan kepada: ${usaha}\n\n${nama} (${ket}): ${rp(d.nominal)}${d.promo ? `\nPromo: ${d.promo}` : ""}\nTotal tagihan: ${rp(d.nominal)}\n\n${catatan.join(" ")}\n\nBayar: ${link}`,
  };
}

export interface DataStrukLangganan { plan: string; bulan: number; nominal: number; akhirBaru: string | null; referensi?: string | null; orderId?: string; dibayar?: string | null; metode?: string | null; email?: string; promo?: string | null }

export function emailStrukLangganan(usaha: string, d: DataStrukLangganan, link: string): IsiEmail {
  const nama = `Langganan KelolaKelas — ${namaPlan(d.plan)}`;
  const ket = `${d.bulan} bulan`;
  const meta: RincianEmail = [...(d.orderId ? ([["No. invoice", d.orderId]] as RincianEmail) : []), ...(d.dibayar ? ([["Tanggal bayar", tglPanjang(d.dibayar)]] as RincianEmail) : [])];
  const info: RincianEmail = [...(d.akhirBaru ? ([["Aktif sampai", tglPanjang(d.akhirBaru)]] as RincianEmail) : []), ...(d.metode ? ([["Metode", d.metode === "transfer_bank" ? "Transfer bank" : d.metode === "duitku" ? "DuitKu" : d.metode]] as RincianEmail) : []), ...(d.referensi ? ([["Referensi", d.referensi]] as RincianEmail) : [])];
  const catatan = ["Terima kasih, pembayaranmu sudah kami terima dan langgananmu aktif. Simpan email ini sebagai bukti pembayaran."];
  return {
    subjek: `Struk pembayaran langganan${d.orderId ? ` ${d.orderId}` : ""} — ${usaha}`,
    html: bungkusFaktur({ usaha, judul: "Struk", lencana: { teks: "LUNAS", warna: "#047857", latar: "#d1fae5" }, meta, email: d.email, item: { nama, ket, jumlah: rp(d.nominal) }, promo: d.promo, totalLabel: "Total dibayar", total: rp(d.nominal), catatan, tombol: { label: "Buka KelolaKelas", url: link }, info }),
    teks: `STRUK PEMBAYARAN LANGGANAN KELOLAKELAS — LUNAS\n${[...meta, ...info].map(([l, v]) => `${l}: ${v}`).join("\n")}\nDitagihkan kepada: ${usaha}\n\n${nama} (${ket}): ${rp(d.nominal)}\nTotal dibayar: ${rp(d.nominal)}\n\n${catatan.join(" ")}\n\n${link}`,
  };
}
