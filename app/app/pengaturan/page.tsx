import { PageHeader } from "@/components/PageHeader";
import { PengaturanForm } from "@/components/PengaturanForm";
import { aturanContoh, muridContoh, tagihanContoh, tenantContoh } from "@/lib/contoh";
import type { Pengaturan } from "@/lib/pengaturan";

const awal: Pengaturan = {
  profil: { nama: tenantContoh.nama, kategori: "Renang", kota: tenantContoh.kota, deskripsi: "Les renang privat untuk anak dan dewasa. Coach berpengalaman, kolam bersih, jadwal fleksibel.", slug: tenantContoh.slug },
  tema: "gelap",
  istilah: { murid: tenantContoh.istilah.murid, sesi: tenantContoh.istilah.sesi, pengajar: tenantContoh.istilah.pengajar },
  aturan: { batasIzinJam: 2, masaBerlakuHari: 35, daftar: aturanContoh },
  rekening: { bank: "", nomor: "", atasNama: "" },
  templat: {
    acc: "Halo {nama}, pendaftaran kamu di {usaha} untuk {slot} sudah disetujui. Total {total}, mohon dibayar sebelum sesi pertama. Terima kasih!",
    tolak: "Halo {nama}, terima kasih sudah mendaftar di {usaha}. Mohon maaf, pendaftaran untuk {slot} belum bisa kami terima. Silakan pilih slot lain di link pendaftaran ya.",
    pengingat: "Halo {nama}, pengingat dari {usaha}: tagihan {total} jatuh tempo {tempo}. Terima kasih!",
  },
};

export default function PengaturanUsaha() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Pengaturan" back="/app/lainnya" />
      <PengaturanForm awal={awal} murid={muridContoh} tagihan={tagihanContoh} />
    </main>
  );
}
