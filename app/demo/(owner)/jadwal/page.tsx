import { JadwalOwner } from "@/components/JadwalOwner";
import { PageHeader } from "@/components/PageHeader";
import { jadwalContoh, mingguContoh, pengajarContoh } from "@/lib/contoh";

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/jadwal`, itu membaca DB). */
export default function JadwalDemo() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Jadwal" icon="cal" chip="Sab 7 Nov · hari ini" />
      <JadwalOwner awal={jadwalContoh} pengajar={pengajarContoh} minggu={mingguContoh} hariAwal={6} />
    </main>
  );
}
