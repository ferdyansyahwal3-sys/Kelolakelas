// Server saja: kirim email lewat Resend + catat di notifikasi_log (kunci unik = tak kirim ganda). Jangan diimpor dari komponen client.
import { headers } from "next/headers";
import { klienAdmin } from "./supabase/server";
import { emailValid, type IsiEmail, type JenisNotif } from "./notifikasi";

export type HasilEmail =
  | { ok: true; status: "terkirim" }
  | { ok: false; status: "tanpa_kunci" | "duplikat" | "dilewati" | "gagal"; pesan: string };

const PESAN_TANPA_KUNCI = "Pengiriman email belum aktif: kunci Resend belum diisi di .env.local. Pakai tombol WA dulu.";

/** Alamat situs untuk tautan di email (NEXT_PUBLIC_SITE_URL, cadangan header host). */
export function asalSitus(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
    return `${host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https"}://${host}`;
  } catch {
    return "http://localhost:3100";
  }
}

const dariAlamat = () => process.env.EMAIL_DARI?.trim() || "KelolaKelas <onboarding@resend.dev>";
const modeUji = () => /@resend\.dev>?$/i.test(dariAlamat());

export const emailAktif = () => Boolean(process.env.RESEND_API_KEY?.trim());

interface Param { tenantId: string; jenis: JenisNotif; kunci: string; ke: string; isi: IsiEmail; tagihanId?: string; pendaftaranId?: string }

export async function kirimEmail(p: Param): Promise<HasilEmail> {
  const kunciApi = process.env.RESEND_API_KEY?.trim();
  if (!kunciApi) return { ok: false, status: "tanpa_kunci", pesan: PESAN_TANPA_KUNCI };
  const ke = p.ke.trim().toLowerCase();
  if (!emailValid(ke)) return { ok: false, status: "dilewati", pesan: "Alamat email belum benar." };
  const db = klienAdmin();

  // Klaim kunci. Sudah terkirim / sedang dikirim (<2 menit) = duplikat.
  const { error: eIns } = await db.from("notifikasi_log").insert({ tenant_id: p.tenantId, jenis: p.jenis, kunci: p.kunci, tujuan: ke, status: "mengirim", tagihan_id: p.tagihanId ?? null, pendaftaran_id: p.pendaftaranId ?? null });
  if (eIns) {
    if (eIns.code !== "23505") { console.error("[kirimEmail:klaim]", eIns.code, eIns.message); return { ok: false, status: "gagal", pesan: "Log notifikasi belum bisa ditulis. Coba lagi." }; }
    const { data: ada } = await db.from("notifikasi_log").select("id, status, dibuat_pada").eq("tenant_id", p.tenantId).eq("kunci", p.kunci).maybeSingle();
    const baru = ada && Date.now() - new Date(String(ada.dibuat_pada)).getTime() < 120_000;
    if (!ada || ada.status === "terkirim" || (ada.status === "mengirim" && baru)) return { ok: false, status: "duplikat", pesan: "Email ini sudah dikirim." };
    await db.from("notifikasi_log").update({ status: "mengirim", tujuan: ke, galat: null, dibuat_pada: new Date().toISOString() }).eq("tenant_id", p.tenantId).eq("id", ada.id as string);
  }

  const selesai = async (status: "terkirim" | "gagal" | "dilewati", galat?: string) => {
    await db.from("notifikasi_log").update({ status, galat: galat ?? null }).eq("tenant_id", p.tenantId).eq("kunci", p.kunci);
  };

  // Mode uji (pengirim onboarding@resend.dev): hanya boleh ke alamat uji milik Ferdy, jangan pernah ke murid/orang lain.
  if (modeUji()) {
    const uji = process.env.EMAIL_UJI_KE?.trim().toLowerCase();
    if (!uji || uji !== ke) {
      await selesai("dilewati", "mode_uji_bukan_alamat_uji");
      return { ok: false, status: "dilewati", pesan: "Mode uji (belum ada domain pengirim): email hanya dikirim ke alamat uji di EMAIL_UJI_KE. Pakai tombol WA." };
    }
  }

  try {
    const r = await fetch(process.env.RESEND_API_URL?.trim() || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${kunciApi}`, "Content-Type": "application/json", "Idempotency-Key": `${p.tenantId}:${p.kunci}`.slice(0, 250) },
      body: JSON.stringify({ from: dariAlamat(), to: [ke], subject: p.isi.subjek, html: p.isi.html, text: p.isi.teks }),
    });
    if (!r.ok) {
      const t = (await r.text()).slice(0, 300);
      console.error("[kirimEmail]", r.status, t);
      await selesai("gagal", `resend_${r.status}`);
      return { ok: false, status: "gagal", pesan: r.status === 401 || r.status === 403 ? "Kunci Resend ditolak atau alamat pengirim belum terverifikasi." : "Email belum terkirim. Coba lagi sebentar." };
    }
    await selesai("terkirim");
    return { ok: true, status: "terkirim" };
  } catch (e) {
    console.error("[kirimEmail]", e);
    await selesai("gagal", "jaringan");
    return { ok: false, status: "gagal", pesan: "Email belum terkirim (jaringan). Coba lagi sebentar." };
  }
}
