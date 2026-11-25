"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Garis tipis di atas layar saat pindah halaman terasa lambat. Baru muncul bila perpindahan lebih dari 160 ms,
 * jadi pindah halaman yang cepat (puluhan kali sehari) tidak menampilkan apa-apa. Selesai otomatis begitu alamat berganti.
 */
export function BarNavigasi() {
  const path = usePathname();
  const [fase, setFase] = useState<"diam" | "jalan" | "selesai">("diam");
  const tunda = useRef<ReturnType<typeof setTimeout>>();
  const aman = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function klik(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      clearTimeout(tunda.current); clearTimeout(aman.current);
      tunda.current = setTimeout(() => setFase("jalan"), 160);
      aman.current = setTimeout(() => setFase("diam"), 12000);
    }
    document.addEventListener("click", klik, true);
    return () => document.removeEventListener("click", klik, true);
  }, []);

  useEffect(() => {
    clearTimeout(tunda.current); clearTimeout(aman.current);
    setFase((f) => (f === "jalan" ? "selesai" : "diam"));
    const t = setTimeout(() => setFase("diam"), 380);
    return () => clearTimeout(t);
  }, [path]);

  return <div className="bar-nav" data-fase={fase} aria-hidden="true"><i /></div>;
}
