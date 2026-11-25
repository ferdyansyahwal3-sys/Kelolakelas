import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PemberitahuanPanel } from "@/components/PemberitahuanPanel";
import { dariBarisJadwal, type BarisJadwalDb } from "@/lib/berandaDb";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_INFO, dariBarisInfo, type BarisInfoDb } from "@/lib/pemberitahuanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { hapusInfo, kirimInfo } from "./actions";

export default async function Pemberitahuan() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/pemberitahuan");

  const [{ data: info, error }, { data: pengajar }, { data: jadwal }] = await Promise.all([
    k.db.from("pemberitahuan").select(KOLOM_INFO).eq("tenant_id", k.tenant.id).order("dibuat_pada", { ascending: false }).limit(100),
    k.db.from("pengajar").select("id, nama").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
    k.db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", k.tenant.id),
  ]);
  if (error) console.error("[pemberitahuan]", error.code, error.message);

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Pemberitahuan" back="/app/lainnya" chip="Tampil di portal murid" />
      <PemberitahuanPanel
        awal={((info ?? []) as unknown as BarisInfoDb[]).map(dariBarisInfo).filter((x) => x !== null)}
        pengajar={(pengajar ?? []) as { id: string; nama: string }[]}
        peran="owner"
        saya={{ id: null, nama: k.namaPengguna || "Pemilik" }}
        hariIni={hariIniJakarta()}
        jadwal={((jadwal ?? []) as unknown as BarisJadwalDb[]).map(dariBarisJadwal)}
        aksi={bolehUbahData(k.akses.akses) ? { kirim: kirimInfo, hapus: hapusInfo } : undefined}
      />
    </main>
  );
}
