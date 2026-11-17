import { TagihanOwnerList } from "@/components/TagihanOwner";
import { HARI_INI, tagihanContoh, tenantContoh } from "@/lib/contoh";

export default function Tagihan() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <h1 className="title">Tagihan</h1>
      <TagihanOwnerList awal={tagihanContoh} hariIni={HARI_INI} usaha={tenantContoh.nama} />
    </main>
  );
}
