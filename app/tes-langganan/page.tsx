import { LanggananOwner } from "@/components/LanggananOwner";
import { PageHeader } from "@/components/PageHeader";
import { SidebarOwner } from "@/components/SidebarOwner";
import { TabBar } from "@/components/TabBar";
import { KunciLangganan } from "@/components/KunciLangganan";
import { dataLangganan } from "@/lib/langgananData";

/** Halaman uji sementara: panel Langganan dengan pilihan "pratinjau status" aktif. Hapus setelah dilihat. */
export default function T({ searchParams }: { searchParams: { lama?: string } }) {
  return (
    <div className="shell has-nav owner">
      <SidebarOwner />
      <KunciLangganan terkunci nama="Privat Renang Ilham" pernahBayar={searchParams.lama === "1"} planLabel="Guru Les Tumbuh" hrefBayar="/app/langganan/checkout?paket=guru_tumbuh&periode=bulanan" keluar={<button type="button" className="btn btn-2" style={{ width: "100%" }}>Keluar</button>}>
      <main className="scroll kolom2" style={{ paddingTop: 20 }}>
        <PageHeader title="Langganan" back="/app/lainnya" />
        <LanggananOwner data={dataLangganan("2026-12-01", null, null)} plan="guru_mulai" hariIni="2026-11-24" tagihan={[]} sekarangMs={Date.parse("2026-11-24")} pratinjau />
      </main>
      </KunciLangganan>
      <TabBar />
    </div>
  );
}
