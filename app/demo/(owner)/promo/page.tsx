import { PageHeader } from "@/components/PageHeader";
import { PromoOwnerList } from "@/components/PromoOwner";
import { HARI_INI, muridContoh, pemakaianPromoContoh, promoOwnerContoh } from "@/lib/contoh";

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/promo`, itu membaca DB). */
export default function PromoDemo() {
  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Promo" icon="tag" chip="Diskon dan referral murid" />
      <PromoOwnerList awal={promoOwnerContoh} pemakaian={pemakaianPromoContoh} murid={muridContoh.filter((m) => m.aktif).map((m) => ({ id: m.id, nama: m.nama }))} hariIni={HARI_INI} />
    </main>
  );
}
