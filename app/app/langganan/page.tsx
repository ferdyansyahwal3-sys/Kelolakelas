import { redirect } from "next/navigation";
import { LanggananOwner } from "@/components/LanggananOwner";
import { PageHeader } from "@/components/PageHeader";
import { dataLangganan, hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_INVOICE, dariBarisInvoice, type BarisInvoiceDb } from "@/lib/langgananDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

export default async function Langganan() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/langganan");

  const [{ data: t }, { data: sub }, { data: inv, error }] = await Promise.all([
    k.db.from("tenants").select("trial_ends_at").eq("id", k.tenant.id).maybeSingle(),
    k.db.from("subscriptions").select("current_period_end, grace_until").eq("tenant_id", k.tenant.id).maybeSingle(),
    k.db.from("subscription_invoices").select(KOLOM_INVOICE).eq("tenant_id", k.tenant.id).order("due_at", { ascending: false }).limit(24),
  ]);
  if (error) console.error("[langganan]", error.code, error.message);
  const tagihan = ((inv ?? []) as unknown as BarisInvoiceDb[]).map(dariBarisInvoice).filter((x) => x !== null);

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Langganan" back="/app/lainnya" />
      <LanggananOwner
        data={dataLangganan(t?.trial_ends_at as string | null, sub?.current_period_end as string | null, sub?.grace_until as string | null)}
        plan={k.plan}
        hariIni={hariIniJakarta()}
        tagihan={tagihan}
        sekarangMs={Date.now()}
        pratinjau={false}
      />
    </main>
  );
}
