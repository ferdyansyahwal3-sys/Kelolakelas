import type { Metadata } from "next";
import { BayarMurid } from "@/components/BayarMurid";
import { PageHeader } from "@/components/PageHeader";
import { bacaPencarian, namaSamar } from "@/lib/status";
import { cariPendaftaranPublik, rekeningPublik } from "@/lib/supabase/publikData";

export const metadata: Metadata = { title: "Bayar", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Bayar({ params, searchParams }: { params: { slug: string }; searchParams: { kode?: string } }) {
  const q = bacaPencarian(searchParams.kode ?? "");
  const p = q.jenis === "kode" ? await cariPendaftaranPublik(params.slug, q) : null;
  const rekening = p ? await rekeningPublik(p.tenantId) : [];

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title="Bayar pendaftaran" back={`/u/${params.slug}/status`} chip="Transfer lalu kirim bukti" />
        <BayarMurid
          slug={params.slug}
          kode={q.jenis === "kode" ? q.nilai : ""}
          server={p ? { nama: namaSamar(p.nama), slot: p.slotLabel, total: p.total, sudahBayar: p.jumlahBukti > 0 || p.status !== "menunggu" } : null}
          rekening={rekening}
        />
      </main>
    </div>
  );
}
