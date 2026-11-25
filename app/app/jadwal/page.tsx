import { redirect } from "next/navigation";
import { JadwalOwner } from "@/components/JadwalOwner";
import { PageHeader } from "@/components/PageHeader";
import { dariBarisJadwal, hitungTerisi, type BarisJadwalDb } from "@/lib/berandaDb";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { hariPekan, labelTanggal, nomorHari } from "@/lib/sesi";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { hapusSlot, tambahSlot, tutupSlot, ubahKuotaSlot } from "./actions";

export default async function Jadwal() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/jadwal");

  const hariIni = hariIniJakarta();
  const minggu = hariPekan(hariIni);
  const [{ data: jadwal, error }, { data: pengajar }, { data: peserta }, { data: tutup }] = await Promise.all([
    k.db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", k.tenant.id),
    k.db.from("pengajar").select("id, nama").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
    k.db.from("peserta_tetap").select("jadwal_id").eq("tenant_id", k.tenant.id),
    k.db.from("slot_tutup").select("jadwal_id, tanggal").eq("tenant_id", k.tenant.id).gte("tanggal", minggu[0]!.tgl).lte("tanggal", minggu[6]!.tgl),
  ]);
  if (error) console.error("[jadwal]", error.code, error.message);
  const terisi = hitungTerisi((peserta ?? []) as { jadwal_id: string }[]);
  const slot = ((jadwal ?? []) as unknown as BarisJadwalDb[]).map(dariBarisJadwal).map((s) => ({ ...s, terisi: terisi.get(s.id) ?? 0 }));

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Jadwal" icon="cal" chip={`${labelTanggal(hariIni)} · hari ini`} />
      <JadwalOwner
        awal={slot}
        pengajar={(pengajar ?? []) as { id: string; nama: string }[]}
        minggu={minggu}
        hariAwal={nomorHari(hariIni)}
        tutupAwal={((tutup ?? []) as { jadwal_id: string; tanggal: string }[]).map((t) => `${t.jadwal_id}|${t.tanggal}`)}
        bolehUbah={bolehUbahData(k.akses.akses)}
        aksi={{ tambah: tambahSlot, ubahKuota: ubahKuotaSlot, hapus: hapusSlot, tutup: tutupSlot }}
      />
    </main>
  );
}
