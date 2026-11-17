import { PageHeader } from "@/components/PageHeader";
import { TagihanOwnerList } from "@/components/TagihanOwner";
import { HARI_INI, tagihanContoh, tenantContoh } from "@/lib/contoh";

export default function Tagihan() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Tagihan" icon="bill" chip={`${tagihanContoh.filter((t) => t.status === "menunggu_verifikasi").length} bukti perlu dicek`} />
      <TagihanOwnerList awal={tagihanContoh} hariIni={HARI_INI} usaha={tenantContoh.nama} />
    </main>
  );
}
