import { notFound, redirect } from "next/navigation";
import { DaftarWizard } from "@/components/DaftarWizard";
import { slotPadaTanggal } from "@/lib/berandaDb";
import { getIstilah } from "@/lib/istilah";
import { labelJenis } from "@/lib/paket";
import { aturanUntuk, syaratUntuk } from "@/lib/pengaturan";
import { labelTanggal, tambahHari } from "@/lib/sesi";
import { muatUsahaPublik } from "@/lib/supabase/publikData";

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export default async function Daftar({ params, searchParams }: { params: { slug: string }; searchParams: { slot?: string; pengajar?: string; hari?: string } }) {
  const u = await muatUsahaPublik(params.slug);
  if (!u) notFound();
  const kembali = `/u/${params.slug}/slot`;
  if (!u.bolehDaftar) redirect(kembali);

  const tanggal = searchParams.hari ?? "";
  if (!TANGGAL.test(tanggal) || tanggal < u.hariIni || tanggal > tambahHari(u.hariIni, 28)) redirect(kembali);
  const ditemukan = slotPadaTanggal(u.jadwal, u.terisi, u.tutup, tanggal, tanggal === u.hariIni ? u.jamSekarang : undefined).find((s) => s.slot.id === searchParams.slot);
  if (!ditemukan || ditemukan.sisa <= 0) redirect(kembali);

  const { slot } = ditemukan;
  const istilah = getIstilah(u.istilah);
  const pengajar = u.pengajar.find((p) => p.id === slot.pengajarId)?.nama ?? "";

  return (
    <DaftarWizard
      slug={params.slug}
      slot={{ id: slot.id, jam: slot.jam, nama: slot.nama, hari: labelTanggal(tanggal), pengajar, tanggal }}
      paket={u.paket.map((p) => ({ id: p.id, nama: p.nama, kategori: p.kategori, harga: p.harga, aktif: true, catatan: `${labelJenis[p.jenis]} · ${p.jumlahSesi} ${istilah.sesi} · berlaku ${p.masaBerlakuHari} hari` }))}
      promo={[]}
      promoServer
      aturan={syaratUntuk(u.kategori, aturanUntuk(u.kategori), istilah.sesi)}
    />
  );
}
