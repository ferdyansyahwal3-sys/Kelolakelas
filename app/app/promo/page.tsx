import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PromoOwnerList } from "@/components/PromoOwner";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_PEMAKAIAN, KOLOM_PROMO, dariBarisPromo, pemakaianPromo, type BarisPemakaianDb, type BarisPromoDb } from "@/lib/promoDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { buatPromo, buatReferralMurid, hapusPromo, ubahAktifPromo } from "./actions";

export default async function Promo() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/promo");

  const [{ data: promo, error }, { data: pakai }, { data: murid }] = await Promise.all([
    k.db.from("promo").select(KOLOM_PROMO).eq("tenant_id", k.tenant.id).order("kode"),
    k.db.from("pendaftaran").select(KOLOM_PEMAKAIAN).eq("tenant_id", k.tenant.id).eq("promo_dihitung", true).order("diputuskan_pada", { ascending: false }).limit(200),
    k.db.from("murid").select("id, nama").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
  ]);
  if (error) console.error("[promo]", error.code, error.message);

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Promo" icon="tag" chip="Diskon dan referral murid" />
      <PromoOwnerList
        awal={((promo ?? []) as unknown as BarisPromoDb[]).map(dariBarisPromo).filter((p) => p !== null)}
        pemakaian={pemakaianPromo((pakai ?? []) as unknown as BarisPemakaianDb[])}
        murid={(murid ?? []) as { id: string; nama: string }[]}
        hariIni={hariIniJakarta()}
        bolehUbah={bolehUbahData(k.akses.akses)}
        aksi={{ buat: buatPromo, buatReferral: buatReferralMurid, ubahAktif: ubahAktifPromo, hapus: hapusPromo }}
      />
    </main>
  );
}
