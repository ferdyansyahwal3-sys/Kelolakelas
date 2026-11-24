import { LanggananOwner } from "@/components/LanggananOwner";
import { PageHeader } from "@/components/PageHeader";
import { HARI_INI, PLAN_CONTOH } from "@/lib/contoh";

const tagihan = [
  { id: "s3", periode: "Des 2026", nominal: 99000, status: "belum_bayar" as const, tempo: "2026-12-05" },
  { id: "s2", periode: "Nov 2026", nominal: 99000, status: "lunas" as const, tempo: "2026-11-05" },
  { id: "s1", periode: "Okt 2026", nominal: 99000, status: "lunas" as const, tempo: "2026-10-05" },
];

export default function Langganan() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Langganan" back="/app/lainnya" />
      <LanggananOwner data={{ trialBerakhir: null, periodeBerakhir: "2026-12-05", graceSampai: null }} plan={PLAN_CONTOH} hariIni={HARI_INI} tagihan={tagihan} sekarangMs={Date.now()} />
    </main>
  );
}
