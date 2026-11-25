import { PageHeader } from "@/components/PageHeader";
import { PemberitahuanPanel } from "@/components/PemberitahuanPanel";
import { HARI_INI, jadwalContoh, pemberitahuanContoh, pengajarContoh } from "@/lib/contoh";

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/pemberitahuan`, itu membaca DB). */
export default function PemberitahuanDemo() {
  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Pemberitahuan" back="/app/lainnya" chip="Tampil di portal murid" />
      <PemberitahuanPanel awal={pemberitahuanContoh} pengajar={pengajarContoh} peran="owner" saya={{ id: null, nama: "Pemilik" }} hariIni={HARI_INI} jadwal={jadwalContoh} />
    </main>
  );
}
