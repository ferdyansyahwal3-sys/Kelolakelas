import { PageHeader } from "@/components/PageHeader";
import { PengajarOwnerList } from "@/components/PengajarOwner";
import { jadwalContoh, muridContoh, PLAN_CONTOH, pengajarOwnerContoh } from "@/lib/contoh";

export default function Pengajar() {
  const ringkas = Object.fromEntries(pengajarOwnerContoh.map((p) => [p.id, {
    murid: muridContoh.filter((m) => m.aktif && m.pengajar === p.nama).length,
    slot: jadwalContoh.filter((s) => s.pengajarId === p.id).length,
  }]));
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Pengajar" icon="coach" chip="Undang dan atur pelatih" />
      <PengajarOwnerList awal={pengajarOwnerContoh} plan={PLAN_CONTOH} ringkas={ringkas} />
    </main>
  );
}
