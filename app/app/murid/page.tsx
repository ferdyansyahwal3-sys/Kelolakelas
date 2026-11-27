import { redirect } from "next/navigation";
import { Tautan as Link } from "@/components/BasisApp";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { MuridList } from "@/components/MuridList";
import { TambahMurid } from "@/components/TambahMurid";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatDaftarMurid, muatSlotPilih } from "@/lib/supabase/muridData";
import { getIstilah, kapital } from "@/lib/istilah";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { PAKET, labelPlan } from "@/lib/paketLangganan";
import { tambahMurid } from "./actions";

export default async function DaftarMurid() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/murid");

  const [murid, slot, { data: paket }, { data: pengajar }] = await Promise.all([
    muatDaftarMurid(k),
    muatSlotPilih(k),
    k.db.from("paket").select("id, nama, kategori, harga").eq("tenant_id", k.tenant.id).eq("aktif", true).order("harga"),
    k.db.from("pengajar").select("id, nama").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
  ]);
  const istilah = getIstilah(k.tenant.istilah);
  const aktif = murid.filter((m) => m.aktif).length;
  const maks = PAKET[k.plan].batas.murid;

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title={kapital(istilah.murid)} icon="users" chip={`${aktif} aktif`}>
        <Link href="/app/pendaftaran" className="circ" aria-label="Pendaftaran masuk"><Icon name="inbox" /></Link>
      </PageHeader>
      <TambahMurid
        paket={(paket ?? []) as { id: string; nama: string; kategori: "anak" | "dewasa"; harga: number }[]}
        pengajar={(pengajar ?? []) as { id: string; nama: string }[]}
        hariIni={hariIniJakarta()}
        bolehUbah={bolehUbahData(k.akses.akses)}
        batas={{ aktif, maks: Number.isFinite(maks) ? maks : null, nama: labelPlan(k.plan) }}
        slot={slot}
        tambah={tambahMurid}
      />
      <MuridList murid={murid} linkDaftar={`/u/${k.tenant.slug}/slot`} />
    </main>
  );
}
