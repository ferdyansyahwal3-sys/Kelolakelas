import type { Metadata } from "next";
import { BayarMurid } from "@/components/BayarMurid";
import { PageHeader } from "@/components/PageHeader";
import { paketContoh, pendaftaranContoh, promoContoh, rekeningContoh } from "@/lib/contoh";
import { cariPromo, hitungTotal } from "@/lib/harga";
import { bacaPencarian, namaSamar } from "@/lib/status";

export const metadata: Metadata = { title: "Bayar", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function Bayar({ params, searchParams }: { params: { slug: string }; searchParams: { kode?: string } }) {
  const q = bacaPencarian(searchParams.kode ?? "");
  const p = q.jenis === "kode" ? pendaftaranContoh.find((x) => x.kode === q.nilai) : undefined;
  const paket = paketContoh.find((x) => x.id === p?.paketId);
  const total = p && paket ? hitungTotal(paket.harga, cariPromo(p.kodePromo ?? "", promoContoh)).total : 0;

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title="Bayar pendaftaran" back={`/u/${params.slug}/status`} chip="Transfer lalu kirim bukti" />
        <BayarMurid
          slug={params.slug}
          kode={q.jenis === "kode" ? q.nilai : ""}
          server={p ? { nama: namaSamar(p.nama), slot: p.slotLabel, total, sudahBayar: !!p.bayar } : null}
          rekening={rekeningContoh}
        />
      </main>
    </div>
  );
}
