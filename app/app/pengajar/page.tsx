import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PengajarOwnerList } from "@/components/PengajarOwner";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_PENGAJAR, dariBarisPengajar, type BarisPengajarDb } from "@/lib/pengajarDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { batalkanUndangan, ubahAktifPengajar, undangPengajar } from "./actions";

export default async function Pengajar() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/pengajar");

  const hariIni = hariIniJakarta();
  const [{ data: baris, error }, { data: jadwal }, { data: paket }, { data: auth }] = await Promise.all([
    k.db.from("pengajar").select(KOLOM_PENGAJAR).eq("tenant_id", k.tenant.id).order("nama"),
    k.db.from("jadwal_template").select("pengajar_id").eq("tenant_id", k.tenant.id),
    k.db.from("murid_paket").select("murid_id, pengajar_id, murid(aktif)").eq("tenant_id", k.tenant.id).gte("berlaku_sampai", hariIni),
    k.db.auth.getUser(),
  ]);
  if (error) console.error("[pengajar]", error.code, error.message);

  const daftar = ((baris ?? []) as unknown as BarisPengajarDb[]).map((b) => dariBarisPengajar(b, k.userId, auth.user?.email ?? ""));
  const ringkas: Record<string, { murid: number; slot: number }> = {};
  for (const p of daftar) ringkas[p.id] = { murid: 0, slot: 0 };
  for (const j of (jadwal ?? []) as { pengajar_id: string }[]) if (ringkas[j.pengajar_id]) ringkas[j.pengajar_id]!.slot++;
  const dihitung = new Set<string>();
  for (const m of (paket ?? []) as unknown as { murid_id: string; pengajar_id: string | null; murid: { aktif: boolean } | { aktif: boolean }[] | null }[]) {
    const aktif = Array.isArray(m.murid) ? m.murid[0]?.aktif : m.murid?.aktif;
    const kunci = `${m.pengajar_id}|${m.murid_id}`;
    if (m.pengajar_id && aktif && ringkas[m.pengajar_id] && !dihitung.has(kunci)) { dihitung.add(kunci); ringkas[m.pengajar_id]!.murid++; }
  }

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Pengajar" icon="coach" chip="Undang dan atur pelatih" />
      <PengajarOwnerList awal={daftar} plan={k.plan} ringkas={ringkas} bolehUbah={bolehUbahData(k.akses.akses)} aksi={{ undang: undangPengajar, batalkan: batalkanUndangan, ubahAktif: ubahAktifPengajar }} />
    </main>
  );
}
