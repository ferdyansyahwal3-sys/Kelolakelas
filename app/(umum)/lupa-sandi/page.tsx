import type { Metadata } from "next";
import Link from "next/link";
import { FormLupaSandi } from "./FormLupaSandi";

export const metadata: Metadata = { title: "Lupa kata sandi · KelolaKelas", robots: { index: false } };

export default function LupaSandi() {
  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 28 }}>
        <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 className="title" style={{ color: "var(--panel-text)" }}>Lupa kata sandi</h1>
          <p style={{ margin: 0, color: "var(--panel-text-2)", lineHeight: 1.55 }}>Tulis email akunmu. Kami kirim tautan untuk membuat kata sandi baru. Buka tautannya di peramban yang sama dengan yang kamu pakai sekarang.</p>
          <FormLupaSandi />
          <Link href="/masuk" className="meta">Kembali ke Masuk</Link>
        </div>
      </main>
    </div>
  );
}
