import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HasilBayarLangganan } from "@/components/HasilBayarLangganan";
import { PageHeader } from "@/components/PageHeader";
import { FORMAT_ORDER } from "@/lib/bayarLangganan";
import { HARI_INI, tagihanLanggananContoh } from "@/lib/contoh";

export const metadata: Metadata = { title: "Hasil pembayaran · KelolaKelas", robots: { index: false, follow: false } };

export default function HasilBayar({ params }: { params: { tagihan: string } }) {
  // Nominal, paket, dan periode dibaca dari tagihan di server, tidak dari alamat atau browser.
  if (!FORMAT_ORDER.test(params.tagihan)) notFound();
  const t = tagihanLanggananContoh.find((x) => x.orderId === params.tagihan);
  if (!t) notFound();
  return (
    <main className="scroll" style={{ paddingTop: 20 }}>
      <PageHeader title="Hasil pembayaran" back="/app/langganan" chip={t.orderId} />
      <HasilBayarLangganan tagihan={t} hariIni={HARI_INI} />
    </main>
  );
}
