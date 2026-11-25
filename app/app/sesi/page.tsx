import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SesiOwner } from "@/components/SesiOwner";
import { dariBarisJadwal, hitungTerisi, type BarisJadwalDb } from "@/lib/berandaDb";
import { getIstilah } from "@/lib/istilah";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { labelTanggal, tambahHari, type Absensi } from "@/lib/sesi";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatDaftarMurid } from "@/lib/supabase/muridData";
import { absenSesi } from "./actions";

export default async function Sesi() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/sesi");

  const hariIni = hariIniJakarta();
  const [{ data: jadwal, error }, { data: pengajar }, { data: peserta }, { data: sesi }, muridDb] = await Promise.all([
    k.db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", k.tenant.id),
    k.db.from("pengajar").select("id, nama").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
    k.db.from("peserta_tetap").select("jadwal_id, murid_id").eq("tenant_id", k.tenant.id),
    k.db.from("sesi").select("jadwal_id, murid_id, tanggal, status").eq("tenant_id", k.tenant.id).not("jadwal_id", "is", null)
      .gte("tanggal", tambahHari(hariIni, -60)).lte("tanggal", tambahHari(hariIni, 60)).in("status", ["hadir", "izin", "alpa"]),
    muatDaftarMurid(k),
  ]);
  if (error) console.error("[sesi]", error.code, error.message);

  const pesertaRows = (peserta ?? []) as { jadwal_id: string; murid_id: string }[];
  const terisi = hitungTerisi(pesertaRows);
  const slot = ((jadwal ?? []) as unknown as BarisJadwalDb[]).map(dariBarisJadwal).map((s) => ({ ...s, terisi: terisi.get(s.id) ?? 0 }));
  const pesertaTetap: Record<string, string[]> = {};
  for (const s of slot) pesertaTetap[s.id] = [];
  for (const p of pesertaRows) (pesertaTetap[p.jadwal_id] ??= []).push(p.murid_id);
  const absensiAwal: Absensi = {};
  for (const s of (sesi ?? []) as { jadwal_id: string; murid_id: string; tanggal: string; status: "hadir" | "izin" | "alpa" }[]) absensiAwal[`${s.jadwal_id}|${s.tanggal}|${s.murid_id}`] = s.status;
  const murid = muridDb.map((m) => ({ id: m.id, nama: m.nama, kategori: m.kategori, sisaSesi: m.sisaSesi, totalSesi: m.totalSesi, berlakuSampai: m.berlakuSampai, aktif: m.aktif, bayar: m.bayar }));
  const istilah = getIstilah(k.tenant.istilah);

  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Sesi dan absensi" icon="check" chip={`${labelTanggal(hariIni)} · hari ini`} />
      <SesiOwner
        jadwal={slot}
        pesertaTetap={pesertaTetap}
        murid={murid}
        pengajar={(pengajar ?? []) as { id: string; nama: string }[]}
        hariIni={hariIni}
        absensiAwal={absensiAwal}
        istilah={{ murid: istilah.murid, sesi: istilah.sesi }}
        aksiAbsen={bolehUbahData(k.akses.akses) ? absenSesi : undefined}
      />
    </main>
  );
}
