import { PageHeader } from "@/components/PageHeader";
import { PendaftaranList } from "@/components/PendaftaranList";
import { paketContoh, pendaftaranContoh, promoContoh, tenantContoh } from "@/lib/contoh";

export default function PendaftaranMasuk() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Pendaftaran masuk" back="/app" />
      <PendaftaranList
        awal={pendaftaranContoh}
        paket={paketContoh}
        promo={promoContoh}
        usaha={tenantContoh.nama}
        linkDaftar={`/u/${tenantContoh.slug}/slot`}
        slug={tenantContoh.slug}
      />
    </main>
  );
}
