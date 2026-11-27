import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PendaftaranList } from "@/components/PendaftaranList";
import { bolehUbahData } from "@/lib/langganan";
import { KOLOM_PENDAFTARAN, dariBarisPendaftaran, type BarisPendaftaranDb } from "@/lib/pendaftaranDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatTemplat } from "@/lib/notifikasiServer";
import { setujuiPendaftaran, tolakPendaftaran, urlBukti } from "./actions";

export default async function PendaftaranMasuk() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/pendaftaran");

  const [{ data: baris, error }, { data: paket }] = await Promise.all([
    k.db.from("pendaftaran").select(KOLOM_PENDAFTARAN).eq("tenant_id", k.tenant.id).order("dibuat_pada", { ascending: false }).limit(200),
    k.db.from("paket").select("id, nama, harga, jumlah_sesi").eq("tenant_id", k.tenant.id),
  ]);
  const templat = await muatTemplat(k.db, k.tenant.id);
  if (error) console.error("[pendaftaran]", error.code, error.message);

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Pendaftaran masuk" back="/app" />
      <PendaftaranList
        awal={((baris ?? []) as unknown as BarisPendaftaranDb[]).map(dariBarisPendaftaran)}
        paket={((paket ?? []) as { id: string; nama: string; harga: number; jumlah_sesi: number }[]).map((p) => ({ id: p.id, nama: p.nama, harga: p.harga, jumlahSesi: p.jumlah_sesi }))}
        promo={[]}
        usaha={k.tenant.nama}
        templat={templat}
        linkDaftar={`/u/${k.tenant.slug}/slot`}
        slug={k.tenant.slug}
        aksi={{ setujui: setujuiPendaftaran, tolak: tolakPendaftaran, lihatBukti: urlBukti }}
        bolehUbah={bolehUbahData(k.akses.akses)}
      />
    </main>
  );
}
