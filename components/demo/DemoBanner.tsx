"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AWALAN_KUNCI_DEMO } from "@/lib/basis";

/** Hapus semua data demo di perangkat ini (kunci berawalan `kk-demo-`), lalu muat ulang. */
export function aturUlangDemo() {
  try {
    const hapus: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(AWALAN_KUNCI_DEMO)) hapus.push(k); }
    hapus.forEach((k) => localStorage.removeItem(k)); // sudah berawalan kk-demo-, tidak dipetakan ulang
  } catch {}
  window.location.reload();
}

/** Banner tetap di atas semua halaman /demo: jujur bahwa ini data contoh, ajak coba gratis, tautan ke harga. */
export function DemoBanner() {
  const path = usePathname();
  // Di dalam iframe (pratinjau di Landing) banner disembunyikan: tampilan app saja, tanpa keterangan demo.
  const [mode, setMode] = useState<"tunggu" | "tampil" | "sembunyi">("tunggu");
  useEffect(() => { setMode(window.self !== window.top ? "sembunyi" : "tampil"); }, []);
  if (mode === "sembunyi") return null;
  return (
    <div className="demo-bar" role="region" aria-label="Mode demo" style={mode === "tunggu" ? { visibility: "hidden" } : undefined}>
      <div className="demo-in">
        <div className="demo-teks">
          <span className="demo-tag">Mode Demo</span>
          <span className="demo-ket">Data contoh, tidak tersimpan, tidak perlu daftar</span>
          {path.startsWith("/demo/pelatih") && <Link href="/demo" className="demo-balik">← Kembali ke panel owner</Link>}
        </div>
        <div className="demo-aksi">
          <Link href="/daftar-usaha" className="btn btn-sm">Coba gratis 7 hari</Link>
        </div>
      </div>
    </div>
  );
}
