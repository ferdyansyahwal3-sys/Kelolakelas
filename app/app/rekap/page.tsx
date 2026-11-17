import { PageHeader } from "@/components/PageHeader";
import { RekapOwner } from "@/components/RekapOwner";
import { bagiHasilContoh, bagiNominalContoh, pembayaranContoh, pengajarContoh } from "@/lib/contoh";

export default function Rekap() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Rekap" icon="chart" chip="Pemasukan dan bagi hasil" />
      <RekapOwner pembayaran={pembayaranContoh} pengajar={pengajarContoh} persenAwal={bagiHasilContoh} nominalAwal={bagiNominalContoh} bulanAwal="2026-11" bulanMin="2026-06" />
    </main>
  );
}
