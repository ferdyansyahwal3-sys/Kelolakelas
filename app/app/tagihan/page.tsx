import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TagihanOwnerList } from "@/components/TagihanOwner";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_TAGIHAN, dariBarisTagihan, type BarisTagihanDb } from "@/lib/tagihanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { lunasiTagihan, tolakBuktiTagihan } from "./actions";

export default async function Tagihan() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/tagihan");

  const { data, error } = await k.db.from("tagihan").select(KOLOM_TAGIHAN).eq("tenant_id", k.tenant.id).order("jatuh_tempo", { ascending: true }).limit(500);
  if (error) console.error("[tagihan]", error.code, error.message);
  const daftar = ((data ?? []) as unknown as BarisTagihanDb[]).map(dariBarisTagihan).filter((t) => t !== null);

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Tagihan" icon="bill" chip={`${daftar.filter((t) => t.status === "menunggu_verifikasi").length} bukti perlu dicek`} />
      <TagihanOwnerList awal={daftar} hariIni={hariIniJakarta()} usaha={k.tenant.nama} bolehUbah={bolehUbahData(k.akses.akses)} aksi={{ lunas: lunasiTagihan, tolak: tolakBuktiTagihan }} />
    </main>
  );
}
