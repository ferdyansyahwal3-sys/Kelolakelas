import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMasukAdmin } from "@/components/platform/FormMasukAdmin";
import { adminSaatIni } from "@/lib/supabase/platformData";
import { supabaseTersambung } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Masuk admin · KelolaKelas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MasukAdmin() {
  if (supabaseTersambung() && (await adminSaatIni())) redirect("/platform");
  return <FormMasukAdmin />;
}
