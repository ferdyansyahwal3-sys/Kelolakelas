import type { Metadata } from "next";
import { DaftarUsahaWizard } from "@/components/DaftarUsahaWizard";
import { klienServer } from "@/lib/supabase/server";
import { supabaseTersambung } from "@/lib/supabase/env";
import { adalahJenis } from "@/lib/paketLangganan";
import { bacaJalurBayar } from "@/lib/daftarUsaha";

export const metadata: Metadata = { title: "Daftar usaha · KelolaKelas", robots: { index: false } };

export default async function DaftarUsaha({ searchParams }: { searchParams: { jenis?: string; paket?: string; bayar?: string; periode?: string } }) {
  const tersambung = supabaseTersambung();
  let sudahMasuk = false;
  let nama = "";
  if (tersambung) {
    const { data } = await klienServer().auth.getUser();
    if (data.user) {
      sudahMasuk = true;
      nama = String(data.user.user_metadata?.nama ?? "");
    }
  }
  // Dari halaman Harga: ?jenis= hanya prefilter (divalidasi). ?paket= diabaikan: plan awal trial tetap paket terendah jenisnya.
  const jenisAwal = adalahJenis(searchParams.jenis) ? searchParams.jenis : undefined;
  // Jalur B (/checkout): ?bayar=1 + paket valid. Tidak valid = jalur A seperti biasa.
  const jalurBayar = bacaJalurBayar(searchParams);
  return <DaftarUsahaWizard tersambung={tersambung} sudahMasuk={sudahMasuk} namaAwal={nama} jenisAwal={jenisAwal} jalurBayar={jalurBayar} />;
}
