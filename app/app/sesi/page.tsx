import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SesiOwner } from "@/components/SesiOwner";
import { dariBarisJadwal, hitungTerisi, type BarisJadwalDb } from "@/lib/berandaDb";
import { getIstilah } from "@/lib/istilah";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_MINTA, KOLOM_PENGGANTI, KOLOM_PINDAH, KOLOM_TUKAR, aturanPenggantiUsaha, dariBarisMinta, dariBarisPengganti, dariBarisPindah, dariBarisTukar, type BarisMintaDb, type BarisPenggantiDb, type BarisPindahDb, type BarisTukarDb } from "@/lib/permintaanDb";
import { labelTanggal, tambahHari, type Absensi } from "@/lib/sesi";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatDaftarMurid } from "@/lib/supabase/muridData";
import { absenSesi, batalkanPenggantiDb, batalkanPindah, gantiPelatihSekali, jadwalkanPenggantiDb, kirimKabarKeputusan, putuskanMinta, putuskanTukar } from "./actions";

export default async function Sesi() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/sesi");

  const hariIni = hariIniJakarta();
  const [{ data: jadwal, error }, { data: pengajar }, { data: peserta }, { data: sesi }, muridDb, { data: gantiRows }, { data: mintaRows }, { data: tukarRows }, { data: pindahRows }, { data: penggantiRows }, { data: tenantRow }] = await Promise.all([
    k.db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", k.tenant.id),
    k.db.from("pengajar").select("id, nama").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
    k.db.from("peserta_tetap").select("jadwal_id, murid_id").eq("tenant_id", k.tenant.id),
    k.db.from("sesi").select("jadwal_id, murid_id, tanggal, status").eq("tenant_id", k.tenant.id).not("jadwal_id", "is", null)
      .gte("tanggal", tambahHari(hariIni, -60)).lte("tanggal", tambahHari(hariIni, 60)).in("status", ["hadir", "izin", "alpa"]),
    muatDaftarMurid(k),
    k.db.from("ganti_pelatih").select("jadwal_id, tanggal, pengajar_id").eq("tenant_id", k.tenant.id).gte("tanggal", tambahHari(hariIni, -60)),
    k.db.from("minta_ganti").select(KOLOM_MINTA).eq("tenant_id", k.tenant.id).eq("status", "menunggu").order("tanggal"),
    k.db.from("tukar_jadwal").select(KOLOM_TUKAR).eq("tenant_id", k.tenant.id).in("status", ["menunggu", "disetujui"]).gte("tanggal_asal", tambahHari(hariIni, -60)).order("tanggal_asal"),
    k.db.from("pindah_jadwal").select(KOLOM_PINDAH).eq("tenant_id", k.tenant.id).gte("tanggal_baru", tambahHari(hariIni, -60)),
    k.db.from("sesi_pengganti").select(KOLOM_PENGGANTI).eq("tenant_id", k.tenant.id).gte("tanggal", tambahHari(hariIni, -60)).lte("tanggal", tambahHari(hariIni, 60)),
    k.db.from("tenants").select("pengaturan").eq("id", k.tenant.id).maybeSingle(),
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
  const gantiAwal = ((gantiRows ?? []) as { jadwal_id: string; tanggal: string; pengajar_id: string }[]).map((g) => ({ slotId: g.jadwal_id, tanggal: g.tanggal, pelatihId: g.pengajar_id }));
  const mintaAwal = ((mintaRows ?? []) as unknown as BarisMintaDb[]).map(dariBarisMinta).filter((x): x is NonNullable<typeof x> => x !== null);
  const tukarAwal = ((tukarRows ?? []) as unknown as BarisTukarDb[]).map(dariBarisTukar).filter((x): x is NonNullable<typeof x> => x !== null);
  const pindahAwal = ((pindahRows ?? []) as unknown as BarisPindahDb[]).map(dariBarisPindah);
  const penggantiAwal = ((penggantiRows ?? []) as unknown as BarisPenggantiDb[]).map(dariBarisPengganti);
  const aturanPenggantiAwal = aturanPenggantiUsaha(k.tenant.kategori, (tenantRow as { pengaturan?: unknown } | null)?.pengaturan);
  const istilah = getIstilah(k.tenant.istilah);
  const boleh = bolehUbahData(k.akses.akses);

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
        aksiAbsen={boleh ? absenSesi : undefined}
        gantiAwal={gantiAwal}
        aksiGanti={boleh ? gantiPelatihSekali : undefined}
        mintaAwal={mintaAwal}
        tukarAwal={tukarAwal}
        pindahAwal={pindahAwal}
        penggantiAwal={penggantiAwal}
        aturanPenggantiAwal={aturanPenggantiAwal}
        aksiJadwal={boleh ? { putuskanMinta, putuskanTukar, batalkanPindah, jadwalkanPengganti: jadwalkanPenggantiDb, batalkanPengganti: batalkanPenggantiDb, kirimKabar: kirimKabarKeputusan } : undefined}
      />
    </main>
  );
}
