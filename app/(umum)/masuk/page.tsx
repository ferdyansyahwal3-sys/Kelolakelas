import type { Metadata } from "next";
import Link from "next/link";
import { FormMasuk } from "@/components/FormMasuk";
import { lanjutAman } from "@/lib/daftarUsaha";
import { supabaseTersambung } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Masuk · KelolaKelas", robots: { index: false } };

export default function Masuk({ searchParams }: { searchParams: { lanjut?: string; galat?: string } }) {
  return (
    <>
      <FormMasuk lanjut={lanjutAman(searchParams.lanjut)} tersambung={supabaseTersambung()} galatAwal={searchParams.galat === "google" ? "Masuk dengan Google belum berhasil. Coba lagi, atau pakai email." : ""} />
      <p style={{ textAlign: "center", margin: "12px 0 24px" }}><Link href="/lupa-sandi" className="meta">Lupa kata sandi?</Link></p>
    </>
  );
}
