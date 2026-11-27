import type { Metadata } from "next";
import { PortalMurid } from "@/components/PortalMurid";
import { muridContoh, paketContoh, pemberitahuanContoh, pengajarContoh, pesertaTetapContoh, SEKARANG_CONTOH, sesiBerikutnyaContoh, tenantContoh } from "@/lib/contoh";
import { aturanUntuk } from "@/lib/pengaturan";
import { untukMurid } from "@/lib/pemberitahuan";

export const metadata: Metadata = { title: "Contoh pembayaran portal murid", robots: { index: false, follow: false } };

/** Contoh portal murid (data karangan, tanpa database dan tanpa token). */
export default function PortalPembayaranDemo() {
  const m = muridContoh[0]!;
  const paket = paketContoh.find((p) => p.id === m.paketId);
  const pengajarId = pengajarContoh.find((x) => x.nama === m.pengajar)?.id ?? "";
  const slotIds = Object.keys(pesertaTetapContoh).filter((sid) => pesertaTetapContoh[sid]!.includes(m.id));
  return (
    <PortalMurid
      usaha={tenantContoh.nama}
      data={{ nama: m.nama.split(" ")[0]!, pengajar: m.pengajar, paket: paket?.nama ?? "-", sisa: m.sisaSesi, total: m.totalSesi, berlakuSampai: m.berlakuSampai, aktif: m.aktif, riwayat: m.riwayat, tagihan: m.tagihan, catatan: m.catatan, berikutnya: sesiBerikutnyaContoh[m.id] ?? null }}
      sekarang={SEKARANG_CONTOH}
      batasIzinJam={aturanUntuk("Renang").batasIzinJam}
      pengajarId={pengajarId}
      slotIds={slotIds}
      info={untukMurid(pemberitahuanContoh, pengajarId, slotIds)}
      halaman="pembayaran"
      href={{ beranda: "/demo/portal", pembayaran: "/demo/portal/pembayaran" }}
    />
  );
}
