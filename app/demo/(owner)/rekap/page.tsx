import { PageHeader } from "@/components/PageHeader";
import { RekapOwner } from "@/components/RekapOwner";
import { bagiHasilContoh, bagiNominalContoh, gajiDibayarContoh, HARI_INI, pembayaranContoh, pengajarContoh } from "@/lib/contoh";

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/rekap`, itu membaca DB). */
export default function RekapDemo() {
  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Rekap" icon="chart" chip="Pemasukan dan bagi hasil" />
      <RekapOwner hariIni={HARI_INI} dibayarAwal={gajiDibayarContoh} pembayaran={pembayaranContoh} pengajar={pengajarContoh} persenAwal={bagiHasilContoh} nominalAwal={bagiNominalContoh} bulanAwal="2026-11" bulanMin="2026-06" />
    </main>
  );
}
