import { GantiPaket } from "@/components/GantiPaket";
import { PageHeader } from "@/components/PageHeader";
import { jadwalContoh, muridContoh } from "@/lib/contoh";
import { labelPlan } from "@/lib/paketLangganan";

/** Ganti paket versi demo: pemakaian dari data contoh, pergantian hanya hidup di halaman (tanpa database). */
export default function GantiPaketDemo() {
  const pemakaian = { murid: muridContoh.filter((m) => m.aktif).length, slot: jadwalContoh.length, paketJual: 4, pelatih: 3, pelatihLain: 2, rekening: 1 };
  return (
    <main className="scroll lebar" style={{ paddingTop: 20 }}>
      <PageHeader title="Ganti paket" back="/app/lainnya" chip={`Sekarang: ${labelPlan("agensi_klub")}`} />
      <GantiPaket planAwal="agensi_klub" pemakaian={pemakaian} sekarangMs={Date.UTC(2026, 10, 27)} />
    </main>
  );
}
