"use client";
import { useEffect } from "react";
import { HalamanGalat } from "@/components/HalamanGalat";

export default function Galat({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Pesan asli hanya ke konsol; layar tidak menampilkan detail teknis.
  useEffect(() => { console.error(error); }, [error]);
  return (
    <HalamanGalat
      kode="Oops"
      judul="Ada yang tidak beres"
      isi="Halaman ini gagal dimuat. Data kamu aman. Coba muat ulang, dan kalau masih sama, kabari kami."
      aksi={[{ label: "Coba lagi", onKlik: reset }, { label: "Ke dashboard", href: "/app", utama: false }]}
    />
  );
}
