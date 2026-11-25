import { TabBar } from "@/components/TabBar";
import { SidebarOwner } from "@/components/SidebarOwner";
import { KunciLangganan } from "@/components/KunciLangganan";
import { TombolKeluar } from "@/components/TombolKeluar";
import { ringkasanContoh } from "@/lib/contoh";
import { labelPlan } from "@/lib/paketLangganan";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const k = await ambilKonteksOwner();
  const terkunci = k?.akses.akses === "ditutup";
  // Sudah pernah bayar: kartu kunci langsung ke pembayaran paket sebelumnya (ada tombol ubah paket). Belum pernah (trial habis): ke pilihan paket.
  let pernahBayar = false;
  if (k && terkunci) {
    const { data: sub } = await k.db.from("subscriptions").select("current_period_end").eq("tenant_id", k.tenant.id).maybeSingle();
    pernahBayar = Boolean(sub?.current_period_end);
  }
  return (
    <div className="shell has-nav owner">
      <SidebarOwner pendaftaran={ringkasanContoh.pendaftaranMenunggu.length} />
      <KunciLangganan terkunci={terkunci} nama={k?.tenant.nama ?? "usahamu"} pernahBayar={pernahBayar} planLabel={k ? labelPlan(k.plan) : ""} hrefBayar={k ? `/app/langganan/checkout?paket=${k.plan}&periode=bulanan` : "/app/langganan/pilih"} keluar={<TombolKeluar />}>
        {children}
      </KunciLangganan>
      <TabBar />
    </div>
  );
}
