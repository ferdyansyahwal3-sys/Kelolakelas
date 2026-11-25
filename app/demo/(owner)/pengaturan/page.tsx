import { PageHeader } from "@/components/PageHeader";
import { PengaturanForm } from "@/components/PengaturanForm";
import { muridContoh, tagihanContoh, tenantContoh } from "@/lib/contoh";
import { aturanUntuk, syaratUntuk, type Pengaturan } from "@/lib/pengaturan";
import { TEMPLAT_BAWAAN } from "@/lib/pengaturanDb";

const awal: Pengaturan = {
  profil: { nama: tenantContoh.nama, kategori: "Renang", kota: tenantContoh.kota, deskripsi: "Les renang privat untuk anak dan dewasa. Coach berpengalaman, kolam bersih, jadwal fleksibel.", slug: tenantContoh.slug },
  tema: "gelap",
  istilah: { murid: tenantContoh.istilah.murid, sesi: tenantContoh.istilah.sesi, pengajar: tenantContoh.istilah.pengajar },
  aturan: { ...aturanUntuk("Renang"), daftar: syaratUntuk("Renang", aturanUntuk("Renang"), "sesi") },
  rekening: [],
  templat: TEMPLAT_BAWAAN,
};

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/pengaturan`, itu membaca DB). */
export default function PengaturanDemo() {
  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Pengaturan" back="/app/lainnya" />
      <PengaturanForm awal={awal} murid={muridContoh} tagihan={tagihanContoh} />
    </main>
  );
}
