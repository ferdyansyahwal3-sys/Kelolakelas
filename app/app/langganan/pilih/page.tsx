import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { HargaPaket } from "@/components/situs/HargaPaket";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { JENIS, PROMO_PELANGGAN, labelPlan } from "@/lib/paketLangganan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pilih paket · KelolaKelas", robots: { index: false } };

/**
 * Pilih (atau ganti) paket dari dalam panel. Dituju dari kartu kunci setelah masa percobaan habis, dan dari tombol "Ubah paket".
 * Jenis usaha tetap (naik jenis lewat jalur terpisah); memilih paket meneruskan ke halaman pembayaran.
 */
export default async function PilihPaket() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/langganan/pilih");
  const awalMs = Date.now();
  const { data: sub } = await k.db.from("subscriptions").select("current_period_end").eq("tenant_id", k.tenant.id).maybeSingle();
  const pernahBayar = Boolean(sub?.current_period_end);
  const jenis = k.tenant.jenis === "agensi" ? "agensi" : "guru_les";
  return (
    <main className="scroll lebar" style={{ paddingTop: 20 }}>
      <PageHeader title="Pilih paket" back="/app/langganan" chip={pernahBayar ? `${JENIS[jenis].nama} · paket terakhir: ${labelPlan(k.plan)}` : `${JENIS[jenis].nama} · masa percobaan`} />
      <p className="sub" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Pilih paket dan periode bayar. Kamu bisa naik atau turun paket kapan saja, datamu ikut.</p>
      <HargaPaket konfig={PROMO_PELANGGAN} awalMs={awalMs} jenisAwal={jenis} kunciJenis tanpaBanding hrefCta="/app/langganan/checkout?paket={paket}&periode={periode}" labelCta="Pilih paket ini" tandai={pernahBayar ? k.plan : undefined} />
    </main>
  );
}
