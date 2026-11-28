import { NextResponse } from "next/server";
import { bacaCallback, orderDariMerchant, petaCallback, tandaTanganCallbackValid } from "@/lib/duitku";
import { konfigDuitku, verifikasiDanAktifkan } from "@/lib/duitkuServer";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { klienAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const balas = (status: number, pesan: string) => new NextResponse(pesan, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * Webhook DuitKu (POST form-urlencoded). Urutan wajib:
 *  1. batas laju -> 2. bentuk isian -> 3. kode merchant + TANDA TANGAN (HMAC-SHA256) SEBELUM menyentuh database
 *  -> 4. catat kejadian (kunci unik, duplikat aman) -> 5. resultCode 00: cek status SERVER-KE-SERVER lalu aktivasi atomik.
 * Nominal dari callback TIDAK dipercaya: yang dipakai nominal dari cek status DuitKu, dicocokkan dengan invoice di database.
 * Kode balasan: 200 = selesai/aman dihentikan (DuitKu berhenti mengulang), 4xx = ditolak, 5xx/503 = ulangi nanti.
 */
export async function POST(req: Request) {
  if (!(await bolehLanjut("duitkuCallback"))) return balas(429, "terlalu sering");
  const cfg = konfigDuitku();
  if (!cfg.ok) return balas(503, "belum dikonfigurasi");
  const { kode, kunci } = cfg.konfig;

  let mentah: Record<string, string> = {};
  try {
    const tipe = req.headers.get("content-type") ?? "";
    if (tipe.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      for (const [a, b] of Object.entries(j)) if (typeof b === "string" || typeof b === "number") mentah[a] = String(b);
    } else {
      const f = await req.formData();
      f.forEach((b, a) => { if (typeof b === "string") mentah[a] = b; });
    }
  } catch { mentah = {}; }

  const baca = bacaCallback(mentah);
  if (!baca.ok) return balas(400, "isian tidak valid");
  const c = baca.data;
  if (!tandaTanganCallbackValid(c, kode, kunci)) {
    console.warn("[duitku] callback ditolak: tanda tangan/kode merchant tidak cocok");
    return balas(400, "tanda tangan tidak valid");
  }
  const pecah = orderDariMerchant(c.merchantOrderId);
  if (!pecah) return balas(400, "order tidak dikenal");

  const db = klienAdmin();
  const { data: perc } = await db.from("duitku_percobaan").select("id, tenant_id, invoice_id, status").eq("merchant_order_id", c.merchantOrderId).maybeSingle();
  if (!perc) return balas(404, "order tidak dikenal");
  const tenantId = perc.tenant_id as string;

  const catat = async (hasil: string) => {
    // Kunci unik per (order, kode hasil, referensi): kiriman ulang DuitKu tidak menambah baris.
    const kejadian = { order_id: pecah.order, tenant_id: tenantId, kunci: `${c.merchantOrderId}:${c.resultCode}:${c.reference}`.slice(0, 200), hasil, payload: { merchantOrderId: c.merchantOrderId, amount: c.amountMentah, resultCode: c.resultCode, reference: c.reference } };
    // Kiriman ulang ("sudah") tidak menimpa catatan pertama ("aktif"); hasil lain memperbarui catatan percobaan sebelumnya.
    const { error } = await db.from("payment_events").upsert(kejadian, { onConflict: "kunci", ignoreDuplicates: hasil === "sudah" });
    if (error) console.error("[duitku] catat kejadian gagal", error.code);
  };

  const hasilCallback = petaCallback(c.resultCode);
  if (hasilCallback === "gagal") {
    await db.from("duitku_percobaan").update({ status: "gagal" }).eq("id", perc.id as string).eq("tenant_id", tenantId).eq("status", "menunggu");
    await catat("gagal");
    return balas(200, "OK");
  }
  if (hasilCallback !== "berhasil") { await catat("diabaikan"); return balas(200, "OK"); }

  const v = await verifikasiDanAktifkan(db, cfg.konfig, c.merchantOrderId);
  switch (v.jenis) {
    case "aktivasi": {
      await catat(v.hasil.status);
      if (v.hasil.status === "tidak_dikenal") return balas(404, "order tidak dikenal");
      return balas(200, "OK");
    }
    case "menunggu":
    case "gagal":
      // Callback bilang sukses tetapi DuitKu belum/tidak membenarkan: jangan aktifkan, minta diulang.
      await catat(`status_${v.jenis}`);
      return balas(503, "status belum terkonfirmasi");
    case "galat_duitku":
      await catat("galat_cek_status");
      return balas(502, "cek status gagal");
    default:
      await catat("galat_db");
      return balas(500, "galat");
  }
}

export function GET() { return balas(405, "gunakan POST"); }
