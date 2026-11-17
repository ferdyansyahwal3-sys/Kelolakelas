import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalMurid } from "@/components/PortalMurid";
import { aturanUntuk } from "@/lib/pengaturan";
import { muridContoh, paketContoh, SEKARANG_CONTOH, sesiBerikutnyaContoh, tenantContoh, tokenPortalContoh } from "@/lib/contoh";
import { tokenValid } from "@/lib/portal";

export const metadata: Metadata = { title: "Portal murid", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function Portal({ params }: { params: { slug: string; token: string } }) {
  // Token tidak valid dan token tidak dikenal sama-sama 404, supaya tidak bisa dipakai menebak.
  if (!tokenValid(params.token)) notFound();
  const muridId = Object.keys(tokenPortalContoh).find((id) => tokenPortalContoh[id] === params.token);
  const m = muridContoh.find((x) => x.id === muridId);
  if (!m || params.slug !== tenantContoh.slug) notFound();
  const paket = paketContoh.find((p) => p.id === m.paketId);

  // Hanya data murid ini yang dikirim ke browser. Nomor WA dan data murid lain tidak ikut.
  return (
    <PortalMurid
      usaha={tenantContoh.nama}
      data={{
        nama: m.nama.split(" ")[0]!,
        pengajar: m.pengajar,
        paket: paket?.nama ?? "-",
        sisa: m.sisaSesi,
        total: m.totalSesi,
        berlakuSampai: m.berlakuSampai,
        aktif: m.aktif,
        riwayat: m.riwayat,
        tagihan: m.tagihan,
        catatan: m.catatan,
        berikutnya: sesiBerikutnyaContoh[m.id] ?? null,
      }}
      sekarang={SEKARANG_CONTOH}
      batasIzinJam={aturanUntuk("Renang").batasIzinJam}
    />
  );
}
