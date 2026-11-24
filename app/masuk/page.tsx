import type { Metadata } from "next";
import { FormMasuk } from "@/components/FormMasuk";
import { lanjutAman } from "@/lib/daftarUsaha";
import { supabaseTersambung } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Masuk · KelolaKelas", robots: { index: false } };

export default function Masuk({ searchParams }: { searchParams: { lanjut?: string } }) {
  return <FormMasuk lanjut={lanjutAman(searchParams.lanjut)} tersambung={supabaseTersambung()} />;
}
