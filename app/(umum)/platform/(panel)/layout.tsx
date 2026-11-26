import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlatformProvider } from "@/components/platform/PlatformProvider";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { klienServer } from "@/lib/supabase/server";
import { supabaseTersambung } from "@/lib/supabase/env";
import { adminSaatIni, muatDataPlatform } from "@/lib/supabase/platformData";

export const metadata: Metadata = { title: "Platform · KelolaKelas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * PINTU PANEL ADMIN. Admin = baris di tabel platform_admins (diisi manual lewat SQL editor), bukan email di kode.
 * Belum login → ke /platform/masuk. Sudah login tapi bukan admin → 404 (panel tidak mengaku ada).
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseTersambung()) notFound();
  const { data } = await klienServer().auth.getUser();
  if (!data.user) redirect("/platform/masuk");
  const admin = await adminSaatIni();
  if (!admin) notFound();
  const awal = await muatDataPlatform(admin.db);
  return (
    <PlatformProvider awal={awal}>
      <PlatformShell>{children}</PlatformShell>
    </PlatformProvider>
  );
}
