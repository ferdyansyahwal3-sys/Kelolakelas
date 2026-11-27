import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GantiPaket } from "@/components/GantiPaket";
import { PageHeader } from "@/components/PageHeader";
import { bacaPemakaian } from "@/lib/langgananGanti";
import { labelPlan } from "@/lib/paketLangganan";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { gantiPaket } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ganti paket · KelolaKelas", robots: { index: false } };

/** Ganti paket, naik/turun, dan pindah jenis (Guru Les <-> Agensi). Pemakaian dibaca dari database lewat pemakaian_paket(). */
export default async function GantiPaketHalaman() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/langganan/ganti");
  const { data, error } = await k.db.rpc("pemakaian_paket");
  if (error) console.error("[ganti-paket]", error.code, error.message);
  const pemakaian = bacaPemakaian(data);
  return (
    <main className="scroll lebar" style={{ paddingTop: 20 }}>
      <PageHeader title="Ganti paket" back="/app/langganan" chip={`Sekarang: ${labelPlan(k.plan)}`} />
      {pemakaian ? <GantiPaket planAwal={k.plan} pemakaian={pemakaian} sekarangMs={Date.now()} aksi={gantiPaket} /> : <p className="sub" role="alert">Pemakaian usahamu belum bisa dibaca. Muat ulang halaman ini sebentar lagi.</p>}
    </main>
  );
}
