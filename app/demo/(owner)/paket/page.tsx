import { PageHeader } from "@/components/PageHeader";
import { PaketOwnerList } from "@/components/PaketOwner";
import { muridContoh, paketOwnerContoh } from "@/lib/contoh";

/** Paket dan harga versi demo: data contoh saja (tanpa database, tanpa login). Perubahan hanya hidup di halaman. */
export default function PaketDemo() {
  const dipakai: Record<string, number> = {};
  for (const m of muridContoh) if (m.aktif) dipakai[m.paketId] = (dipakai[m.paketId] ?? 0) + 1;
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Paket dan harga" back="/app/lainnya" />
      <PaketOwnerList awal={paketOwnerContoh} dipakai={dipakai} />
    </main>
  );
}
