import type { Metadata } from "next";
import { DokumenHukumView } from "@/components/DokumenHukumView";
import { syarat } from "@/lib/hukum";

export const metadata: Metadata = { title: "Syarat Layanan · KelolaKelas", description: syarat.ringkas };

export default function Syarat() {
  return <DokumenHukumView dok={syarat} lain={{ href: "/privasi", label: "Baca juga Kebijakan Privasi" }} />;
}
