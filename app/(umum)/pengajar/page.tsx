import { redirect } from "next/navigation";
import { Tautan } from "@/components/BasisApp";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { PelatihApp } from "@/components/PelatihApp";
import { TombolKeluar } from "@/components/TombolKeluar";
import { hariIniJakarta } from "@/lib/langgananData";
import { labelTanggal } from "@/lib/sesi";
import { ambilKonteksPelatih, muatDataPelatih } from "@/lib/supabase/pelatihData";
import { absenPelatih, catatanPelatih, hapusInfoPelatih, kirimInfoPelatih } from "./actions";

export default async function HalamanPelatih() {
  const k = await ambilKonteksPelatih();
  if (!k) redirect("/masuk?lanjut=/pengajar");
  const hariIni = hariIniJakarta();
  const d = await muatDataPelatih(k, hariIni);
  const murid = d.murid.map((m) => ({ id: m.id, nama: m.nama, kategori: m.kategori, sisaSesi: m.sisaSesi, totalSesi: m.totalSesi, berlakuSampai: m.berlakuSampai, aktif: m.aktif, bayar: m.bayar }));

  return (
    <div className="shell has-nav">
      {k.pemilik && <Tautan href="/app" className="side-balik" title="Kembali ke panel owner"><Icon name="home" /><span>Panel owner</span></Tautan>}
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title="Jadwal saya" back={k.pemilik ? "/app" : undefined} chip={`${k.nama} · ${labelTanggal(hariIni)}`} />
        <PelatihApp saya={{ id: k.pengajarId, nama: k.nama }} hariIni={hariIni} jadwal={d.jadwal} pesertaTetap={d.pesertaTetap} murid={murid} catatanAwal={d.catatan} absensiAwal={d.absensi} gantiAwal={d.ganti}
          pemberitahuan={d.pemberitahuan} pengajar={d.pengajar} pembayaran={d.pembayaran} persenAwal={d.persen} nominalAwal={d.nominal} dibayarAwal={d.gajiDibayar} modeBagi={d.modeBagi}
          aksi={k.bolehUbah ? { absen: absenPelatih, catatan: catatanPelatih, kirimInfo: kirimInfoPelatih, hapusInfo: hapusInfoPelatih } : undefined} />
        <TombolKeluar />
      </main>
    </div>
  );
}
