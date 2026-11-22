import { PageHeader } from "@/components/PageHeader";
import { SesiOwner } from "@/components/SesiOwner";
import { absensiAwalContoh, HARI_INI, jadwalContoh, muridContoh, pengajarContoh, pesertaTetapContoh, tenantContoh } from "@/lib/contoh";
import { getIstilah } from "@/lib/istilah";
import { labelTanggal } from "@/lib/sesi";

export default function Sesi() {
  const istilah = getIstilah(tenantContoh.istilah);
  const murid = muridContoh.map((m) => ({ id: m.id, nama: m.nama, kategori: m.kategori, sisaSesi: m.sisaSesi, totalSesi: m.totalSesi, berlakuSampai: m.berlakuSampai, aktif: m.aktif, bayar: m.bayar }));
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Sesi dan absensi" icon="check" chip={`${labelTanggal(HARI_INI)} · hari ini`} />
      <SesiOwner jadwal={jadwalContoh} pesertaTetap={pesertaTetapContoh} murid={murid} pengajar={pengajarContoh} hariIni={HARI_INI} absensiAwal={absensiAwalContoh} istilah={{ murid: istilah.murid, sesi: istilah.sesi }} />
    </main>
  );
}
