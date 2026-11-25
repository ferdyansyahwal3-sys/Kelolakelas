import { HanyaAsli, Tautan } from "@/components/BasisApp";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { PelatihApp } from "@/components/PelatihApp";
import { TombolKeluar } from "@/components/TombolKeluar";
import { absensiAwalContoh, bagiHasilContoh, bagiNominalContoh, gajiDibayarContoh, HARI_INI, jadwalContoh, muridContoh, pembayaranContoh, pemberitahuanContoh, pengajarContoh, pesertaTetapContoh } from "@/lib/contoh";
import { labelTanggal } from "@/lib/sesi";

const SAYA = { id: "riska", nama: "Coach Riska" };

export default function HalamanPelatih() {
  const murid = muridContoh.map((m) => ({ id: m.id, nama: m.nama, kategori: m.kategori, sisaSesi: m.sisaSesi, totalSesi: m.totalSesi, berlakuSampai: m.berlakuSampai, aktif: m.aktif, bayar: m.bayar }));
  const catatanAwal = Object.fromEntries(muridContoh.filter((m) => m.catatan.length > 0).map((m) => [m.id, m.catatan]));
  return (
    <div className="shell has-nav">
      <Tautan href="/app" className="side-balik" title="Kembali ke panel owner"><Icon name="home" /><span>Panel owner</span></Tautan>
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title="Jadwal saya" back="/app" chip={`${SAYA.nama} · ${labelTanggal(HARI_INI)}`} />
        <PelatihApp saya={SAYA} hariIni={HARI_INI} jadwal={jadwalContoh} pesertaTetap={pesertaTetapContoh} murid={murid} catatanAwal={catatanAwal} absensiAwal={absensiAwalContoh}
          pemberitahuan={pemberitahuanContoh} pengajar={pengajarContoh} pembayaran={pembayaranContoh} persenAwal={bagiHasilContoh[SAYA.id] ?? 0} nominalAwal={bagiNominalContoh[SAYA.id] ?? 0} dibayarAwal={gajiDibayarContoh} />
        <HanyaAsli><TombolKeluar /></HanyaAsli>
      </main>
    </div>
  );
}
