import { PageHeader } from "@/components/PageHeader";
import { PemberitahuanPanel } from "@/components/PemberitahuanPanel";
import { HARI_INI, jadwalContoh, pemberitahuanContoh, pengajarContoh } from "@/lib/contoh";

export default function Pemberitahuan() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Pemberitahuan" back="/app/lainnya" chip="Tampil di portal murid" />
      <PemberitahuanPanel awal={pemberitahuanContoh} pengajar={pengajarContoh} peran="owner" saya={{ id: null, nama: "Pemilik" }} hariIni={HARI_INI} jadwal={jadwalContoh} />
    </main>
  );
}
