import type { Metadata } from "next";
import { HalamanGalat } from "@/components/HalamanGalat";

export const metadata: Metadata = { title: "Halaman tidak ditemukan · KelolaKelas", robots: { index: false, follow: false } };

export default function TidakDitemukan() {
  return (
    <HalamanGalat
      kode="404"
      judul="Halaman tidak ditemukan"
      isi="Alamatnya mungkin salah ketik, atau halaman ini sudah dipindah. Kalau kamu murid, minta link terbaru ke pelatihmu."
      aksi={[{ label: "Ke dashboard", href: "/app" }]}
    />
  );
}
