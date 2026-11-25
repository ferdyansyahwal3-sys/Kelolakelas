import { PageHeader } from "@/components/PageHeader";
import { PendaftaranList } from "@/components/PendaftaranList";
import { paketContoh, pendaftaranContoh, promoContoh, tenantContoh } from "@/lib/contoh";

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/pendaftaran`, itu membaca DB). */
export default function PendaftaranMasukDemo() {
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
