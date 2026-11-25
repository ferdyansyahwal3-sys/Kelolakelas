import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { HasilBayarLangganan } from "@/components/HasilBayarLangganan";
import { PageHeader } from "@/components/PageHeader";
import { FORMAT_ORDER } from "@/lib/bayarLangganan";
import { hariIniJakarta, tanggalJakarta } from "@/lib/langgananData";
import { KOLOM_INVOICE, dariBarisInvoiceLangganan, type BarisInvoiceDb } from "@/lib/langgananDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

export const metadata: Metadata = { title: "Hasil pembayaran · KelolaKelas", robots: { index: false, follow: false } };

export default async function HasilBayar({ params }: { params: { tagihan: string } }) {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/langganan");
  // Nominal, paket, dan periode dibaca dari tagihan di database (milik usaha ini), tidak dari alamat atau browser.
  if (!FORMAT_ORDER.test(params.tagihan)) notFound();
  const [{ data: inv }, { data: sub }] = await Promise.all([
    k.db.from("subscription_invoices").select(KOLOM_INVOICE).eq("tenant_id", k.tenant.id).eq("order_id", params.tagihan).maybeSingle(),
    k.db.from("subscriptions").select("current_period_end").eq("tenant_id", k.tenant.id).maybeSingle(),
  ]);
  if (!inv) notFound();
  const akhir = sub?.current_period_end ? tanggalJakarta(sub.current_period_end as string) : null;
  const t = dariBarisInvoiceLangganan(inv as unknown as BarisInvoiceDb, akhir);
  if (!t) notFound();
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Hasil pembayaran" back="/app/langganan" chip={t.orderId} />
      <HasilBayarLangganan tagihan={t} hariIni={hariIniJakarta()} />
    </main>
  );
}
