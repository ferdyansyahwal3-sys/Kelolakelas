import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RekapOwner } from "@/components/RekapOwner";
import { bolehUbahData } from "@/lib/langganan";
import { hariIniJakarta } from "@/lib/langgananData";
import { geserBulan } from "@/lib/rekap";
import { KOLOM_TAGIHAN, bacaBagiHasil, bacaGajiDibayar, pembayaranDariTagihan, type BarisTagihanDb, type PaketMurid } from "@/lib/tagihanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { simpanBagiHasil, simpanGajiDibayar } from "./actions";

export default async function Rekap() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/rekap");

  const hariIni = hariIniJakarta();
  const bulanAwal = hariIni.slice(0, 7);
  const bulanMin = geserBulan(bulanAwal, -6);
  const [{ data: tagihan, error }, { data: paketMurid }, { data: pengajar }, { data: t }] = await Promise.all([
    k.db.from("tagihan").select(KOLOM_TAGIHAN).eq("tenant_id", k.tenant.id).eq("status", "lunas").gte("dibayar_pada", `${bulanMin}-01T00:00:00+07:00`).limit(2000),
    k.db.from("murid_paket").select("murid_id, paket_id, pengajar_id, dibuat_pada").eq("tenant_id", k.tenant.id),
    k.db.from("pengajar").select("id, nama, user_id").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
    k.db.from("tenants").select("pengaturan").eq("id", k.tenant.id).maybeSingle(),
  ]);
  if (error) console.error("[rekap]", error.code, error.message);

  const daftarPengajar = (pengajar ?? []) as { id: string; nama: string; user_id: string | null }[];
  const cadangan = (daftarPengajar.find((p) => p.user_id === k.userId) ?? daftarPengajar[0])?.id ?? "";
  const pembayaran = pembayaranDariTagihan((tagihan ?? []) as unknown as BarisTagihanDb[], (paketMurid ?? []) as PaketMurid[], cadangan);
  const peng = (t?.pengaturan ?? {}) as { bagiHasil?: unknown; gajiDibayar?: unknown };
  const bagi = bacaBagiHasil(peng.bagiHasil);

  return (
    <main className="scroll kolom2" style={{ paddingTop: 20 }}>
      <PageHeader title="Rekap" icon="chart" chip="Pemasukan dan bagi hasil" />
      <RekapOwner
        hariIni={hariIni}
        dibayarAwal={bacaGajiDibayar(peng.gajiDibayar)}
        pembayaran={pembayaran}
        pengajar={daftarPengajar.map((p) => ({ id: p.id, nama: p.nama }))}
        persenAwal={bagi.persen}
        nominalAwal={bagi.nominal}
        modeAwal={bagi.mode}
        bulanAwal={bulanAwal}
        bulanMin={bulanMin}
        simpan={bolehUbahData(k.akses.akses) ? { bagiHasil: simpanBagiHasil, gaji: simpanGajiDibayar } : undefined}
      />
    </main>
  );
}
