import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HasilBayarLangganan } from "@/components/HasilBayarLangganan";
import { PageHeader } from "@/components/PageHeader";
import { PilihMetodeBayar } from "@/components/PilihMetodeBayar";
import { FORMAT_ORDER_INVOICE } from "@/lib/duitku";
import { ambilMetodeDuitku, konfigDuitku } from "@/lib/duitkuServer";
import { tanggalJakarta } from "@/lib/langgananData";
import { adalahPlan } from "@/lib/paketLangganan";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { klienAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pembayaran · KelolaKelas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function HalamanBayar({ params, searchParams }: { params: { tagihan: string }; searchParams: { ganti?: string } }) {
  const k = await ambilKonteksOwner();
  if (!k) redirect(`/masuk?lanjut=/app/langganan/bayar/${encodeURIComponent(params.tagihan)}`);
  // Nominal, paket, dan status dibaca dari tagihan di database (milik usaha ini), tidak dari alamat atau browser.
  if (!FORMAT_ORDER_INVOICE.test(params.tagihan)) notFound();
  const [{ data: inv }, { data: sub }] = await Promise.all([
    k.db.from("subscription_invoices").select("id, order_id, plan, period_months, amount, biaya_admin, status").eq("tenant_id", k.tenant.id).eq("order_id", params.tagihan).maybeSingle(),
    k.db.from("subscriptions").select("current_period_end").eq("tenant_id", k.tenant.id).maybeSingle(),
  ]);
  if (!inv || !adalahPlan(inv.plan)) notFound();
  const plan = inv.plan;
  const nominal = inv.amount as number;
  const bulan = inv.period_months as number;
  const status = inv.status as string;
  const ringkas = { orderId: inv.order_id as string, plan, bulan, nominal, biayaAdmin: (inv.biaya_admin as number) ?? 0, aktifSampai: sub?.current_period_end ? tanggalJakarta(sub.current_period_end as string) : null };
  const kepala = <PageHeader title="Pembayaran" back="/app/langganan" chip={ringkas.orderId} />;

  if (status === "lunas") return <main className="scroll" style={{ paddingTop: 20 }}>{kepala}<HasilBayarLangganan ringkas={ringkas} awal="berhasil" urlBayar={null} /></main>;
  if (status !== "belum_bayar") {
    return (
      <main className="scroll" style={{ paddingTop: 20 }}>
        {kepala}
        <section className="surface kartu-form" role="status">
          <h2 className="h2">Tagihan ini sudah tidak berlaku</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Tagihan {status === "batal" ? "dibatalkan" : "kedaluwarsa"}. Mulai pembayaran baru dari halaman Langganan. Masa aktifmu tidak berubah.</p>
          <Link href="/app/langganan" className="btn">Kembali ke Langganan</Link>
        </section>
      </main>
    );
  }
  if (plan !== k.plan) redirect("/app/langganan");

  const cfg = konfigDuitku();
  if (!cfg.ok) {
    return (
      <main className="scroll" style={{ paddingTop: 20 }}>
        {kepala}
        <section className="surface kartu-form" role="status">
          <h2 className="h2">Pembayaran online belum aktif</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Server ini belum tersambung ke DuitKu, jadi belum ada yang bisa ditagih. <b>Kamu belum dipotong apa pun.</b> Coba lagi nanti atau hubungi kami.</p>
          <Link href="/app/langganan" className="btn">Kembali ke Langganan</Link>
        </section>
      </main>
    );
  }

  // Ada percobaan bayar yang masih berjalan -> halaman menunggu (kecuali pelanggan minta ganti metode).
  const admin = klienAdmin();
  const { data: aktif } = await admin.from("duitku_percobaan").select("payment_url, kedaluwarsa_pada")
    .eq("tenant_id", k.tenant.id).eq("invoice_id", inv.id as string).eq("status", "menunggu").not("payment_url", "is", null).order("dibuat_pada", { ascending: false }).limit(1);
  const p = aktif?.[0] as { payment_url: string; kedaluwarsa_pada: string } | undefined;
  if (p && Date.parse(p.kedaluwarsa_pada) > Date.now() && searchParams.ganti !== "1") {
    return <main className="scroll" style={{ paddingTop: 20 }}>{kepala}<HasilBayarLangganan ringkas={ringkas} awal="menunggu" urlBayar={p.payment_url} /></main>;
  }

  const daftar = await ambilMetodeDuitku(cfg.konfig, nominal);
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      {kepala}
      {daftar ? <PilihMetodeBayar orderId={ringkas.orderId} plan={plan} bulan={bulan} nominal={nominal} metode={daftar} /> : (
        <section className="surface kartu-form" role="status">
          <h2 className="h2">Metode pembayaran belum bisa dimuat</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>DuitKu tidak merespons. Kamu belum dipotong apa pun. Muat ulang halaman ini sebentar lagi.</p>
          <Link href={`/app/langganan/bayar/${ringkas.orderId}`} className="btn">Muat ulang</Link>
        </section>
      )}
    </main>
  );
}
