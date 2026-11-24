import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { bacaJalurBayar } from "@/lib/daftarUsaha";
import { PAKET, hargaPeriode, labelPlan, rupiah } from "@/lib/paketLangganan";
import { tglPendek } from "@/lib/format";

export const metadata: Metadata = { title: "Pembayaran · KelolaKelas", robots: { index: false } };

/**
 * Tujuan jalur B (/checkout → daftar usaha → sini). Parameter dibaca ulang dan divalidasi: paket harus ada dan sesuai
 * jenis usaha yang baru dibuat. JUJUR soal gateway: DuitKu belum tersambung, jadi halaman ini tidak pernah menampilkan "berhasil"
 * dan tidak menagih apa pun.
 */
export default async function BayarPaket({ searchParams }: { searchParams: { paket?: string; periode?: string } }) {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/langganan");
  const j = bacaJalurBayar({ bayar: "1", paket: searchParams.paket, periode: searchParams.periode });
  if (!j || j.jenis !== k.tenant.jenis) redirect("/app/langganan");

  const h = hargaPeriode(j.plan, j.periode, Date.now());
  const def = PAKET[j.plan];
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Pembayaran" back="/app/langganan" />
      <section className="surface kartu-form" aria-label="Rincian pesanan">
        <h2 className="h2">Pesananmu</h2>
        <dl className="wz-ringkas" style={{ padding: 0 }}>
          <div><dt>Paket</dt><dd>{labelPlan(j.plan)}</dd></div>
          <div><dt>Periode</dt><dd>{j.periode === "tahunan" ? "Tahunan" : "Bulanan"}</dd></div>
          <div><dt>Usaha</dt><dd>{k.tenant.nama}</dd></div>
          {h.promo && <div><dt>Harga normal</dt><dd style={{ textDecoration: "line-through", fontWeight: 400 }}>{rupiah(h.normalTotal)}</dd></div>}
          <div><dt>Total</dt><dd>{rupiah(h.total)}</dd></div>
        </dl>
        <p className="meta" style={{ margin: 0 }}>{def.nama}: {j.periode === "tahunan" ? "dibayar sekali untuk 12 bulan." : "dibayar tiap bulan."}</p>
      </section>

      <section className="surface kartu-form" role="status" aria-label="Status pembayaran">
        <h2 className="h2">Pembayaran online belum tersedia</h2>
        <p className="sub" style={{ margin: 0, fontSize: 13 }}>
          Kami belum bisa memproses pembayaran online. <b>Kamu belum ditagih dan tidak ada dana yang dipotong.</b> Usahamu sudah dibuat
          {k.akses.tenggat ? ` dan bisa dipakai penuh selama masa percobaan sampai ${tglPendek(k.akses.tenggat)}` : ""}. Paket {labelPlan(j.plan)} bisa dibayar dari halaman Langganan begitu pembayaran dibuka.
        </p>
        <button type="button" className="btn" disabled aria-disabled="true">Bayar sekarang · segera tersedia</button>
      </section>

      <Link href="/app" className="btn btn-2">Buka dashboard</Link>
      <Link href="/harga" className="link" style={{ alignSelf: "center" }}>Ganti paket</Link>
    </main>
  );
}
