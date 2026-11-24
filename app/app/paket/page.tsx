import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PaketOwnerList } from "@/components/PaketOwner";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { KOLOM_PAKET, daftarPaket, hitungDipakai, type BarisPaket } from "@/lib/paketDb";
import { PAKET, labelPlan } from "@/lib/paketLangganan";
import { bolehUbahData } from "@/lib/langganan";
import { hapusPaket, simpanPaket, ubahAktifPaket } from "./actions";

export default async function Paket() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/paket");

  const { data: baris } = await k.db.from("paket").select(KOLOM_PAKET).eq("tenant_id", k.tenant.id).order("kategori").order("harga");
  const awal = daftarPaket((baris ?? []) as BarisPaket[]);

  // Murid aktif per paket: dari paket yang diikuti murid (murid_paket); satu murid dihitung sekali.
  const { data: mp } = await k.db.from("murid_paket").select("paket_id, murid_id, murid(aktif)").eq("tenant_id", k.tenant.id);
  const dipakai = hitungDipakai((mp ?? []).map((t: { paket_id: string | null; murid_id: string; murid: { aktif: boolean } | { aktif: boolean }[] | null }) => ({
    paket_id: t.paket_id, murid_id: t.murid_id, murid_aktif: (Array.isArray(t.murid) ? t.murid[0]?.aktif : t.murid?.aktif) === true,
  })));

  const batas = PAKET[k.plan].batas.paketJual;
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Paket dan harga" back="/app/lainnya" />
      <PaketOwnerList
        awal={awal}
        dipakai={dipakai}
        batasJual={Number.isFinite(batas) ? batas : null}
        namaLangganan={labelPlan(k.plan)}
        bolehUbah={bolehUbahData(k.akses.akses)}
        aksi={{ simpan: simpanPaket, ubahAktif: ubahAktifPaket, hapus: hapusPaket }}
      />
    </main>
  );
}
