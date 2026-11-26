import type { Metadata } from "next";
import { DokumenHukumView } from "@/components/DokumenHukumView";
import { privasi } from "@/lib/hukum";

export const metadata: Metadata = { title: "Kebijakan Privasi · KelolaKelas", description: privasi.ringkas };

export default function Privasi() {
  return <DokumenHukumView dok={privasi} lain={{ href: "/syarat", label: "Baca juga Syarat Layanan" }} />;
}
