import type { Metadata } from "next";
import Link from "next/link";
import { klienServer } from "@/lib/supabase/server";
import { FormSandiBaru } from "./FormSandiBaru";

export const metadata: Metadata = { title: "Kata sandi baru · KelolaKelas", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AturSandi() {
  const { data } = await klienServer().auth.getUser();
  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 28 }}>
        <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 className="title" style={{ color: "var(--panel-text)" }}>Kata sandi baru</h1>
          {data.user ? <FormSandiBaru email={data.user.email ?? ""} /> : (
            <>
              <p style={{ margin: 0, lineHeight: 1.55 }}>Tautan ini sudah kedaluwarsa atau dibuka di peramban lain. Minta tautan baru.</p>
              <Link href="/lupa-sandi" className="btn">Minta tautan baru</Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
