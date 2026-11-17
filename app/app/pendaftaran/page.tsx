import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PendaftaranList } from "@/components/PendaftaranList";
import { paketContoh, pendaftaranContoh, promoContoh, tenantContoh } from "@/lib/contoh";

export default function PendaftaranMasuk() {
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <div className="hrow">
        <Link href="/app" className="circ" aria-label="Kembali ke beranda"><Icon name="back" /></Link>
        <h1 className="title t">Pendaftaran masuk</h1>
      </div>
      <PendaftaranList
        awal={pendaftaranContoh}
        paket={paketContoh}
        promo={promoContoh}
        usaha={tenantContoh.nama}
        linkDaftar={`/u/${tenantContoh.slug}/slot`}
      />
    </main>
  );
}
