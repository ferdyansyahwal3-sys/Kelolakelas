import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { MuridDetail } from "@/components/MuridDetail";
import { muridContoh, paketContoh, tenantContoh, tokenPortalContoh } from "@/lib/contoh";

/** Detail murid versi demo: data contoh saja (tanpa database, tanpa login). Lihat catatan di ../page.tsx. */
export default function DetailMuridDemo({ params }: { params: { id: string } }) {
  const murid = muridContoh.find((m) => m.id === params.id);
  const paket = paketContoh.find((p) => p.id === murid?.paketId);
  if (!murid || !paket) notFound();

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Detail murid" back="/app/murid" />
      <MuridDetail murid={murid} paket={paket} usaha={tenantContoh.nama} slug={tenantContoh.slug} tokenAwal={tokenPortalContoh[murid.id] ?? null} />
    </main>
  );
}
