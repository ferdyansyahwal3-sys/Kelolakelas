import { PageHeader } from "@/components/PageHeader";
import { PaketOwnerList } from "@/components/PaketOwner";
import { muridContoh, paketOwnerContoh } from "@/lib/contoh";

export default function Paket() {
  const dipakai: Record<string, number> = {};
  for (const m of muridContoh) if (m.aktif) dipakai[m.paketId] = (dipakai[m.paketId] ?? 0) + 1;
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Paket dan harga" back="/app/lainnya" />
      <PaketOwnerList awal={paketOwnerContoh} dipakai={dipakai} />
    </main>
  );
}
