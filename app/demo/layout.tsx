import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo/DemoProvider";

/**
 * Demo publik: panel owner dengan data contoh, tanpa login dan tanpa database.
 * Bukan rute yang dijaga middleware (matcher hanya /app, /pengajar, /masuk, /daftar-usaha), dan tidak boleh diindeks mesin pencari.
 */
export const metadata: Metadata = {
  title: "Demo KelolaKelas",
  description: "Coba tampilan KelolaKelas tanpa daftar. Data contoh, tidak tersimpan.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
