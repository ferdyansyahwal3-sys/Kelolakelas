import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { MuridDetail } from "@/components/MuridDetail";
import { muridContoh, paketContoh, tenantContoh } from "@/lib/contoh";

export default function DetailMurid({ params }: { params: { id: string } }) {
  const murid = muridContoh.find((m) => m.id === params.id);
  const paket = paketContoh.find((p) => p.id === murid?.paketId);
  if (!murid || !paket) notFound();

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <div className="hrow">
        <Link href="/app/murid" className="circ" aria-label="Kembali ke daftar murid"><Icon name="back" /></Link>
        <h1 className="title t">Detail murid</h1>
      </div>
      <MuridDetail murid={murid} paket={paket} usaha={tenantContoh.nama} />
    </main>
  );
}
