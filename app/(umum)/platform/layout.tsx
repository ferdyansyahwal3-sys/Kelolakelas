import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformProvider } from "@/components/platform/PlatformProvider";
import { PlatformShell } from "@/components/platform/PlatformShell";

export const metadata: Metadata = { title: "Platform · KelolaKelas", robots: { index: false, follow: false } };

/**
 * PINTU SEMENTARA. Login admin (tabel platform_admins + Supabase Auth) belum ada, jadi panel ini hanya hidup di mesin lokal.
 * Di build production semua alamat /platform menjadi 404. Tidak ada kata sandi, email admin, atau kunci apa pun di kode.
 * Jangan dihapus sebelum login admin sungguhan dibuat dan dites.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <PlatformProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformProvider>
  );
}
