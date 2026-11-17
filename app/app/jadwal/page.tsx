import { PageHeader } from "@/components/PageHeader";
import { JadwalOwner } from "@/components/JadwalOwner";
import { jadwalContoh, mingguContoh, pengajarContoh } from "@/lib/contoh";

export default function Jadwal() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Jadwal" icon="cal" chip="Sab 7 Nov · hari ini" />
      <JadwalOwner awal={jadwalContoh} pengajar={pengajarContoh} minggu={mingguContoh} hariAwal={6} />
    </main>
  );
}
