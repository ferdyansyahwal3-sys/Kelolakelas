import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { MuridDetail } from "@/components/MuridDetail";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatMurid } from "@/lib/supabase/muridData";
import { bolehUbahData } from "@/lib/langganan";
import { buatLinkPortal, perpanjangMurid, tambahCatatan, ubahAktifMurid, ubahDataMurid } from "../actions";

export default async function DetailMurid({ params }: { params: { id: string } }) {
  const k = await ambilKonteksOwner();
  if (!k) redirect(`/masuk?lanjut=/app/murid/${encodeURIComponent(params.id)}`);
  const murid = await muatMurid(k, params.id);
  if (!murid) notFound();
  const { data: paket } = murid.paketId ? await k.db.from("paket").select("id, nama, harga").eq("tenant_id", k.tenant.id).eq("id", murid.paketId).maybeSingle() : { data: null };

  const { data: pilihan } = await k.db.from("paket").select("id, nama, harga").eq("tenant_id", k.tenant.id).eq("aktif", true).eq("kategori", murid.kategori).order("harga");

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Detail murid" back="/app/murid" />
      <MuridDetail
        murid={murid}
        paket={(paket as { id: string; nama: string; harga: number } | null) ?? { id: "", nama: "Tanpa paket", harga: 0 }}
        usaha={k.tenant.nama}
        slug={k.tenant.slug}
        tokenAwal={null}
        bolehUbah={bolehUbahData(k.akses.akses)}
        paketPilihan={(pilihan ?? []) as { id: string; nama: string; harga: number }[]}
        aksi={{ ubahAktif: ubahAktifMurid, tambahCatatan, ubahData: ubahDataMurid, perpanjang: perpanjangMurid, buatLinkPortal }}
      />
    </main>
  );
}
