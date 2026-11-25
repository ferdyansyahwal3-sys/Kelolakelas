"use client";
import { useEffect, useRef } from "react";

const GRAD = (
  <defs>
    <linearGradient id="sp-a" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#3aa6ff" /><stop offset="1" stopColor="#1648f0" /></linearGradient>
    <linearGradient id="sp-b" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#22b0ff" /><stop offset="1" stopColor="#3b86ff" /></linearGradient>
    <linearGradient id="sp-c" x1="0.05" y1="0.1" x2="0.95" y2="1"><stop offset="0" stopColor="#2237f2" /><stop offset="0.6" stopColor="#4a5cff" /><stop offset="1" stopColor="#7048ff" /></linearGradient>
  </defs>
);

/**
 * Animasi pembuka saat aplikasi pertama dibuka di tab ini (sekali per sesi, ~1,6 dtk, bisa dilewati dengan klik/tombol).
 * Ditampilkan hanya bila skrip di <head> memasang `data-splash="ya"` (jalur aplikasi, bukan di iframe, bukan halaman murid),
 * jadi tidak ada kilatan di kunjungan berikutnya. Dilewati bila pengguna meminta gerak dikurangi.
 */
export function SplashAwal() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-splash") !== "ya") return;
    try { sessionStorage.setItem("kk-splash", "1"); } catch {}
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { root.removeAttribute("data-splash"); return; }
    let selesai = false;
    const tutup = () => {
      if (selesai) return;
      selesai = true;
      el.current?.setAttribute("data-fase", "keluar");
      setTimeout(() => root.removeAttribute("data-splash"), 320);
    };
    const t = setTimeout(tutup, 1600);
    window.addEventListener("keydown", tutup, { once: true });
    window.addEventListener("pointerdown", tutup, { once: true });
    return () => { clearTimeout(t); window.removeEventListener("keydown", tutup); window.removeEventListener("pointerdown", tutup); };
  }, []);

  return (
    <div className="splash" ref={el} aria-hidden="true">
      <span className="splash-cahaya" />
      <svg className="splash-logo" viewBox="375 390 540 410" focusable="false">
        {GRAD}
        <rect className="sp-pil" x="381" y="397" width="168" height="396" rx="84" fill="url(#sp-a)" />
        <path className="sp-daun sp-d1" d="M576 575V540C576 460 650 397 745 397H886C862 490 780 575 680 575Z" fill="url(#sp-b)" />
        <path className="sp-daun sp-d2" d="M576 607H680C760 607 810 650 850 700L898 770Q906 782 895 793H745C650 793 576 710 576 640Z" fill="url(#sp-c)" />
      </svg>
      <span className="splash-nama">KelolaKelas</span>
    </div>
  );
}
