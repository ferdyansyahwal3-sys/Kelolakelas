import type { Metadata } from "next";
import { FormMasuk } from "@/components/FormMasuk";
import { lanjutAman } from "@/lib/daftarUsaha";
import { supabaseTersambung } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Masuk · KelolaKelas", robots: { index: false } };

export default function Masuk({ searchParams }: { searchParams: { lanjut?: string; galat?: string } }) {
  return (
    <FormMasuk lanjut={lanjutAman(searchParams.lanjut)} tersambung={supabaseTersambung()} galatAwal={searchParams.galat === "google" ? "Masuk dengan Google belum berhasil. Coba lagi, atau pakai email." : ""} />
  );
}
