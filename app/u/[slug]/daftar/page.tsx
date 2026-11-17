import { redirect } from "next/navigation";
import { DaftarWizard } from "@/components/DaftarWizard";
import { aturanContoh, hariContoh, paketContoh, pengajarContoh, promoContoh, slotContoh } from "@/lib/contoh";
import { hitungSlot } from "@/lib/slot";

export default function Daftar({ params, searchParams }: { params: { slug: string }; searchParams: { slot?: string; pengajar?: string; hari?: string } }) {
  const slot = slotContoh.find((s) => s.id === searchParams.slot);
  if (!slot || hitungSlot(slot.kuota, slot.terisi).status === "penuh") redirect(`/u/${params.slug}/slot`);

  const pengajar = pengajarContoh.find((p) => p.id === searchParams.pengajar) ?? pengajarContoh[0]!;
  const hari = hariContoh.find((h) => h.id === searchParams.hari) ?? hariContoh[2]!;

  return (
    <DaftarWizard
      slug={params.slug}
      slot={{ id: slot.id, jam: slot.jam, nama: slot.nama, hari: `${hari.hari} ${hari.tgl} Nov`, pengajar: pengajar.nama }}
      paket={paketContoh}
      promo={promoContoh}
      aturan={aturanContoh}
    />
  );
}
