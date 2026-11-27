import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalMurid } from "@/components/PortalMurid";
import { muatPortal } from "@/lib/supabase/portalData";
import { ajukanIzin, kirimBuktiTagihan } from "../actions";
import { bolehLanjut } from "@/lib/rateLimitServer";
import { PESAN_TERLALU_SERING } from "@/lib/rateLimit";

export const dynamic = "force-dynamic"; // halaman pribadi: tidak pernah di-cache

export const metadata: Metadata = { title: "Pembayaran · Portal murid", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function PortalPembayaran({ params }: { params: { slug: string; token: string } }) {
  // Token tidak valid, tak dikenal, dicabut, atau milik usaha lain sama-sama 404, supaya tidak bisa dipakai menebak.
  // Dihitung SEBELUM token dicek, jadi respons tidak membocorkan apakah token ada.
  if (!(await bolehLanjut("portal"))) return <main className="scroll" style={{ padding: 32, textAlign: "center" }}><p>{PESAN_TERLALU_SERING}</p></main>;
  const p = await muatPortal(params.slug, params.token);
  if (!p) notFound();

  // Hanya data murid ini yang dikirim ke browser. Nomor WA dan data murid lain tidak ikut.
  return (
    <PortalMurid
      usaha={p.usaha}
      data={p.data}
      sekarang={p.sekarang}
      batasIzinJam={p.batasIzinJam}
      pengajarId={p.pengajarId}
      slotIds={p.slotIds}
      info={p.info}
      izin={{ slug: params.slug, token: params.token, kirim: ajukanIzin }}
      href={{ beranda: `/u/${params.slug}/murid/${params.token}`, pembayaran: `/u/${params.slug}/murid/${params.token}/pembayaran` }}
      halaman="pembayaran"
      bukti={{ slug: params.slug, token: params.token, rekening: p.rekening, kirim: kirimBuktiTagihan }}
    />
  );
}
