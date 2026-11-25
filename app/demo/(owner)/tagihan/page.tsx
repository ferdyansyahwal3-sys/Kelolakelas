import { PageHeader } from "@/components/PageHeader";
import { TagihanOwnerList } from "@/components/TagihanOwner";
import { HARI_INI, tagihanContoh, tenantContoh } from "@/lib/contoh";

/** Versi demo: data contoh, tanpa database dan tanpa login (jangan re-export `app/app/tagihan`, itu membaca DB). */
export default function TagihanDemo() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Tagihan" icon="bill" chip={`${tagihanContoh.filter((t) => t.status === "menunggu_verifikasi").length} bukti perlu dicek`} />
      <TagihanOwnerList awal={tagihanContoh} hariIni={HARI_INI} usaha={tenantContoh.nama} />
    </main>
  );
}
