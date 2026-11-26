import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PengaturanForm } from "@/components/PengaturanForm";
import { NamaSapaanForm } from "@/components/NamaSapaanForm";
import { bolehUbahData } from "@/lib/langganan";
import { dariTenant, type BarisTenant } from "@/lib/pengaturanDb";
import { KOLOM_TAGIHAN, dariBarisTagihan, type BarisTagihanDb } from "@/lib/tagihanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatDaftarMurid } from "@/lib/supabase/muridData";
import { simpanPengaturan } from "./actions";

export default async function PengaturanUsaha() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/pengaturan");

  const [{ data: t }, { data: rek }, { data: tagihan }, murid] = await Promise.all([
    k.db.from("tenants").select("nama, slug, kategori, tema, istilah, pengaturan").eq("id", k.tenant.id).single(),
    k.db.from("rekening_usaha").select("id, bank, nomor, atas_nama").eq("tenant_id", k.tenant.id).order("bank"),
    k.db.from("tagihan").select(KOLOM_TAGIHAN).eq("tenant_id", k.tenant.id).limit(2000),
    muatDaftarMurid(k),
  ]);
  const rekening = ((rek ?? []) as { id: string; bank: string; nomor: string; atas_nama: string }[]).map((r) => ({ id: r.id, bank: r.bank, nomor: r.nomor, atasNama: r.atas_nama }));
  const daftarTagihan = ((tagihan ?? []) as unknown as BarisTagihanDb[]).map(dariBarisTagihan).filter((x) => x !== null);

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Pengaturan" back="/app/lainnya" />
      <NamaSapaanForm awal={k.namaPengguna === "Pemilik" ? "" : k.namaPengguna} />
      <PengaturanForm awal={dariTenant(t as unknown as BarisTenant, rekening)} murid={murid} tagihan={daftarTagihan} simpan={bolehUbahData(k.akses.akses) ? simpanPengaturan : undefined} />
    </main>
  );
}
