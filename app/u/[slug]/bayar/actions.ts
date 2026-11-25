"use server";
import { randomUUID } from "node:crypto";
import { BUKTI_MAKS_PER_PENDAFTARAN, pathBukti, periksaBukti } from "@/lib/buktiDb";
import { bacaPencarian } from "@/lib/status";
import { klienAdmin } from "@/lib/supabase/server";
import { cariPendaftaranPublik, rekeningPublik } from "@/lib/supabase/publikData";

export type HasilBukti = { ok: true } | { ok: false; pesan: string };

/**
 * Simpan bukti bayar murid (tanpa login) ke bucket PRIVAT `bukti-bayar` + baris `pendaftaran_bukti` lewat service role.
 * Jenis berkas dibaca dari isinya; pendaftaran harus milik usaha `slug` dan masih menunggu; rekening harus milik usaha itu.
 */
export async function kirimBukti(form: FormData): Promise<HasilBukti> {
  const q = bacaPencarian(String(form.get("kode") ?? ""));
  if (q.jenis !== "kode") return { ok: false, pesan: "Kode pendaftaran tidak valid." };
  const berkas = form.get("berkas");
  if (!(berkas instanceof File)) return { ok: false, pesan: "Pilih foto atau PDF bukti transfer." };

  const p = await cariPendaftaranPublik(String(form.get("slug") ?? ""), q);
  if (!p) return { ok: false, pesan: "Pendaftaran tidak ditemukan." };
  if (p.status !== "menunggu") return { ok: false, pesan: "Pendaftaran ini sudah diputuskan, bukti tidak diterima lagi." };
  if (p.jumlahBukti >= BUKTI_MAKS_PER_PENDAFTARAN) return { ok: false, pesan: "Bukti sudah terkirim. Tunggu pemilik memeriksanya." };

  const rekeningId = String(form.get("rekeningId") ?? "");
  if (!(await rekeningPublik(p.tenantId)).some((r) => r.id === rekeningId)) return { ok: false, pesan: "Pilih rekening tujuan transfer." };

  const isi = new Uint8Array(await berkas.arrayBuffer());
  const cek = periksaBukti(berkas.size, isi);
  if (!cek.ok) return { ok: false, pesan: cek.pesan };

  const db = klienAdmin();
  const path = pathBukti(p.tenantId, p.id, randomUUID(), cek.jenis.ext);
  const { error: eUnggah } = await db.storage.from("bukti-bayar").upload(path, isi, { contentType: cek.jenis.mime, upsert: false });
  if (eUnggah) { console.error("[kirimBukti:unggah]", eUnggah.message); return { ok: false, pesan: "Berkas belum tersimpan. Coba lagi sebentar." }; }
  const { error: eCatat } = await db.from("pendaftaran_bukti").insert({ tenant_id: p.tenantId, pendaftaran_id: p.id, rekening_id: rekeningId, berkas_path: path, mime: cek.jenis.mime, ukuran: isi.length });
  if (eCatat) {
    console.error("[kirimBukti:catat]", eCatat.code, eCatat.message);
    await db.storage.from("bukti-bayar").remove([path]);
    return { ok: false, pesan: "Bukti belum tersimpan. Coba lagi sebentar." };
  }
  return { ok: true };
}
