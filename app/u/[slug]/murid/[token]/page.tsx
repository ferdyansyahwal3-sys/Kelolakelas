import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalMurid } from "@/components/PortalMurid";
import { muatPortal } from "@/lib/supabase/portalData";
import { ajukanIzin } from "./actions";

export const dynamic = "force-dynamic"; // halaman pribadi: tidak pernah di-cache

export const metadata: Metadata = { title: "Portal murid", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Portal({ params }: { params: { slug: string; token: string } }) {
  // Token tidak valid, tak dikenal, dicabut, atau milik usaha lain sama-sama 404, supaya tidak bisa dipakai menebak.
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
    />
  );
}
