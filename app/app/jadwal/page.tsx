import { JadwalOwner } from "@/components/JadwalOwner";
import { jadwalContoh, mingguContoh, pengajarContoh } from "@/lib/contoh";

export default function Jadwal() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <h1 className="title">Jadwal</h1>
      <JadwalOwner awal={jadwalContoh} pengajar={pengajarContoh} minggu={mingguContoh} hariAwal={6} />
    </main>
  );
}
