import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { klienAdmin } from "@/lib/supabase/server";
import { hariIniJakarta } from "@/lib/langgananData";
import { emailPengingat, kunciPengingatOtomatis, pilihUntukCron, templatAman, type TagihanCron } from "@/lib/notifikasi";
import { kirimEmail } from "@/lib/kirimEmail";

export const dynamic = "force-dynamic";

function sama(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Pengingat tagihan terjadwal (H-3, hari-H, H+3). Dipanggil penjadwal (mis. Vercel Cron) dengan header
 * `Authorization: Bearer <CRON_SECRET>`. Tanpa CRON_SECRET rute ini menolak semuanya. Kirim ganda dicegah oleh kunci di notifikasi_log.
 */
export async function GET(req: Request) {
  const rahasia = process.env.CRON_SECRET?.trim();
  if (!rahasia) return NextResponse.json({ ok: false, pesan: "CRON_SECRET belum diisi." }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !sama(auth.slice(7), rahasia)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!process.env.RESEND_API_KEY?.trim()) return NextResponse.json({ ok: false, pesan: "RESEND_API_KEY belum diisi." }, { status: 503 });

  const hariIni = hariIniJakarta();
  const db = klienAdmin();
  const dari = new Date(Date.parse(hariIni + "T00:00:00Z") - 3 * 86_400_000).toISOString().slice(0, 10);
  const sampai = new Date(Date.parse(hariIni + "T00:00:00Z") + 3 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from("tagihan").select("id, tenant_id, status, nominal, jatuh_tempo, murid(nama, nama_ortu, email, aktif), paket(nama)").eq("status", "belum").gte("jatuh_tempo", dari).lte("jatuh_tempo", sampai).limit(2000);
  if (error) { console.error("[cron pengingat]", error.message); return NextResponse.json({ ok: false }, { status: 500 }); }

  type Satu<T> = T | T[] | null;
  const pertama = <T,>(x: Satu<T>): T | null => (Array.isArray(x) ? x[0] ?? null : x);
  const baris = (data ?? []) as unknown as { id: string; tenant_id: string; status: string; nominal: number; jatuh_tempo: string | null; murid: Satu<{ nama: string; nama_ortu: string | null; email: string | null; aktif: boolean }>; paket: Satu<{ nama: string }> }[];
  const kandidat: TagihanCron[] = baris.filter((b) => pertama(b.murid)?.aktif !== false).map((b) => ({ id: b.id, tenant_id: b.tenant_id, status: b.status, jatuh_tempo: b.jatuh_tempo, email: pertama(b.murid)?.email ?? null }));
  const terpilih = pilihUntukCron(kandidat, hariIni);

  const idTenant = Array.from(new Set(terpilih.map((t) => t.baris.tenant_id)));
  const { data: tenants } = idTenant.length ? await db.from("tenants").select("id, nama, pengaturan").in("id", idTenant) : { data: [] };
  const petaTenant = new Map(((tenants ?? []) as { id: string; nama: string; pengaturan: { templat?: { pengingat?: unknown } } | null }[]).map((t) => [t.id, t]));

  const hitung = { terkirim: 0, duplikat: 0, gagal: 0, dilewati: 0 };
  for (const { baris: kb, tahap } of terpilih) {
    const asal = baris.find((x) => x.id === kb.id)!;
    const t = petaTenant.get(kb.tenant_id);
    const m = pertama(asal.murid);
    if (!t || !m || !kb.jatuh_tempo) { hitung.dilewati++; continue; }
    const tp = typeof t.pengaturan?.templat?.pengingat === "string" ? t.pengaturan.templat.pengingat.slice(0, 500) : "";
    const isi = emailPengingat(t.nama, { nama: m.nama, namaOrtu: m.nama_ortu ?? undefined, usaha: t.nama, nominal: asal.nominal, tempo: kb.jatuh_tempo, paket: pertama(asal.paket)?.nama }, templatAman({ pengingat: tp }).pengingat);
    const h = await kirimEmail({ tenantId: kb.tenant_id, jenis: "pengingat_tagihan", kunci: kunciPengingatOtomatis(kb.id, tahap), ke: String(kb.email), isi, tagihanId: kb.id });
    if (h.ok) hitung.terkirim++; else if (h.status === "duplikat") hitung.duplikat++; else if (h.status === "gagal") hitung.gagal++; else hitung.dilewati++;
  }
  return NextResponse.json({ ok: true, hariIni, kandidat: terpilih.length, ...hitung });
}
