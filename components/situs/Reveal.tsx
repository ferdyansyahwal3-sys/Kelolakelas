"use client";
import { useEffect } from "react";

/**
 * Animasi muncul saat digulir. Elemen cukup diberi `data-reveal` (opsional `data-delay="1..4"`); HTML dari server tetap terlihat penuh.
 * Setelah halaman hidup, elemen yang masih di bawah layar disembunyikan lalu dimunculkan saat masuk layar. Tanpa JS atau dengan
 * prefers-reduced-motion semuanya tetap terlihat.
 */
export function RevealRoot() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { (e.target as HTMLElement).classList.add("rv-in"); io.unobserve(e.target); }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) continue; // sudah terlihat: biarkan
      el.classList.add("rv-sembunyi");
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return null;
}
