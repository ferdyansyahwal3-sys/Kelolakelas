import { Tautan as Link } from "@/components/BasisApp";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { MuridList } from "@/components/MuridList";
import { muridContoh, tenantContoh } from "@/lib/contoh";
import { getIstilah, kapital } from "@/lib/istilah";

/**
 * Daftar murid versi demo: murni data contoh, tanpa database dan tanpa login.
 * Sengaja TIDAK memakai ulang `app/app/murid/page` (itu membaca database dan mengarahkan ke /masuk bila belum login).
 */
export default function DaftarMuridDemo() {
  const istilah = getIstilah(tenantContoh.istilah);
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title={kapital(istilah.murid)} icon="users" chip={`${muridContoh.filter((m) => m.aktif).length} aktif`}>
        <Link href="/app/pendaftaran" className="circ" aria-label="Pendaftaran masuk"><Icon name="inbox" /></Link>
      </PageHeader>
      <MuridList murid={muridContoh} linkDaftar={`/u/${tenantContoh.slug}/slot`} />
    </main>
  );
}
