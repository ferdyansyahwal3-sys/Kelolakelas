import type { Metadata } from "next";
import Link from "next/link";
import { KerangkaAuth } from "@/components/KerangkaAuth";
import { klienServer } from "@/lib/supabase/server";
import { FormSandiBaru } from "./FormSandiBaru";

export const metadata: Metadata = { title: "Kata sandi baru · KelolaKelas", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AturSandi() {
  const { data } = await klienServer().auth.getUser();
  if (!data.user) {
    return (
      <KerangkaAuth judul="Tautan tidak berlaku" sub="Tautan ini sudah dipakai, sudah kedaluwarsa (berlaku sekitar 1 jam), atau dibuka di peramban lain dari yang kamu pakai saat memintanya.">
        <div className="auth-form" style={{ "--i": 1 } as React.CSSProperties}>
          <Link href="/lupa-sandi" className="btn auth-btn">Minta tautan baru</Link>
        </div>
        <p className="auth-buat" style={{ "--i": 2 } as React.CSSProperties}><Link href="/masuk">Kembali ke Masuk</Link></p>
      </KerangkaAuth>
    );
  }
  return (
    <KerangkaAuth judul="Kata sandi baru" sub={data.user.email ?? undefined}>
      <FormSandiBaru />
    </KerangkaAuth>
  );
}
