import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { bacaJalurBayar } from "@/lib/daftarUsaha";
import { PAKET, PROMO_PELANGGAN, hargaPeriode, labelPlan, rupiah } from "@/lib/paketLangganan";
import { tglPendek } from "@/lib/format";
import { TombolBayarLangganan } from "@/components/TombolBayarLangganan";

export const metadata: Metadata = { title: "Pembayaran · KelolaKelas", robots: { index: false } };

/**
 * Tujuan jalur B (/checkout → daftar usaha → sini). Parameter dibaca ulang dan divalidasi: paket harus ada dan sesuai
 * jenis usaha yang baru dibuat. Nominal dihitung ulang di server saat tombol ditekan; halaman ini tidak pernah menampilkan "berhasil".
 */
export default async function BayarPaket({ searchParams }: { searchParams: { paket?: string; periode?: string } }) {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app/langganan");
  const j = bacaJalurBayar({ bayar: "1", paket: searchParams.paket, periode: searchParams.periode });
  if (!j || j.jenis !== k.tenant.jenis) redirect("/app/langganan");

  const h = hargaPeriode(j.plan, j.periode, Date.now(), PROMO_PELANGGAN);
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

      <section className="surface kartu-form" aria-label="Pembayaran">
        {j.plan !== k.plan ? (
          <>
            <h2 className="h2">Paket usahamu {labelPlan(k.plan)}</h2>
            <p className="sub" style={{ margin: 0, fontSize: 13 }}>Paket yang kamu pilih ({labelPlan(j.plan)}) berbeda dari paket usahamu sekarang. Ganti paketnya dulu, lalu bayar dari halaman Langganan.</p>
            <Link href="/app/langganan/ganti" className="btn">Ganti paket</Link>
          </>
        ) : (
          <>
            <h2 className="h2">Lanjut ke pembayaran</h2>
            <p className="sub" style={{ margin: 0, fontSize: 13 }}>
              Kamu memilih metode bayar di langkah berikutnya; biaya admin (bila ada) tampil setelah metode dipilih. Langganan aktif otomatis setelah pembayaran terkonfirmasi.
              {k.akses.tenggat ? ` Masa percobaan berlaku sampai ${tglPendek(k.akses.tenggat)}.` : ""}
            </p>
            <TombolBayarLangganan periode={j.periode} label="Pilih metode pembayaran" />
          </>
        )}
      </section>

      <Link href="/app/langganan/pilih" className="btn btn-2">Ubah paket</Link>
    </main>
  );
}
