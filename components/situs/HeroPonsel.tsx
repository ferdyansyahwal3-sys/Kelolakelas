"use client";
import { useEffect, useState } from "react";
import { PonselApp } from "./PonselApp";

/** Ponsel hero: tampilan asli aplikasi (rute /demo, hanya dilihat). */
export function HeroPonsel() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setSrc("/demo"), 350); // setelah halaman utama siap, supaya tidak menghambat muat awal
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const samakan = () => {
      const tema = document.documentElement.getAttribute("data-theme");
      const f = document.querySelector<HTMLIFrameElement>(".s-hero-ponsel iframe");
      try { if (tema && f?.contentDocument) f.contentDocument.documentElement.setAttribute("data-theme", tema); } catch {}
    };
    const mo = new MutationObserver(samakan);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const f = document.querySelector<HTMLIFrameElement>(".s-hero-ponsel iframe");
    f?.addEventListener("load", samakan);
    return () => { mo.disconnect(); f?.removeEventListener("load", samakan); };
  }, [src]);

  return (
    <div className="s-hero-ponsel">
      <div className="s-hero-glow" aria-hidden="true" />
      <PonselApp src={src} interaktif={false} judul="Tampilan aplikasi KelolaKelas di ponsel" />
    </div>
  );
}
