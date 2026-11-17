import Link from "next/link";
import { Icon } from "@/components/Icon";
import { MuridList } from "@/components/MuridList";
import { muridContoh, tenantContoh } from "@/lib/contoh";
import { getIstilah, kapital } from "@/lib/istilah";

export default function DaftarMurid() {
  const istilah = getIstilah(tenantContoh.istilah);
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <div className="hrow">
        <h1 className="title t">{kapital(istilah.murid)}</h1>
        <Link href="/app/pendaftaran" className="circ" aria-label="Pendaftaran masuk"><Icon name="inbox" /></Link>
      </div>
      <MuridList murid={muridContoh} linkDaftar={`/u/${tenantContoh.slug}/slot`} />
    </main>
  );
}
