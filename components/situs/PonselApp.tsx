"use client";
import { forwardRef, useEffect, useRef, useState } from "react";

/** Ukuran layar iPhone (titik logis). Isi iframe dirender di ukuran ini lalu diskalakan ke lebar bingkai, jadi tampilannya sama dengan di iPhone sungguhan. */
const LAYAR_W = 390;
const LAYAR_H = 844;
const BAR_ATAS = 54; // area status bar + pulau dinamis (titik logis)

/** Isi iframe satu asal-usul: sembunyikan scrollbar bawaan supaya terlihat seperti layar ponsel (gulir tetap jalan). */
function sembunyikanScrollbar(e: React.SyntheticEvent<HTMLIFrameElement>) {
  try {
    const d = e.currentTarget.contentDocument;
    if (!d || d.getElementById("kk-tanpa-scrollbar")) return;
    const st = d.createElement("style");
    st.id = "kk-tanpa-scrollbar";
    st.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}";
    d.head.appendChild(st);
  } catch {}
}

interface Props {
  src: string | null;
  /** false = hanya tampilan (tidak bisa disentuh). */
  interaktif?: boolean;
  judul: string;
  className?: string;
}

/**
 * Bingkai iPhone (proporsi layar 390x844, pulau dinamis, tombol samping, indikator home) berisi iframe aplikasi.
 * Lebar bingkai diatur lewat CSS (--iph-w); skala isi mengikuti lebar itu.
 */
export const PonselApp = forwardRef<HTMLIFrameElement, Props>(function PonselApp({ src, interaktif = true, judul, className = "" }, ref) {
  const layar = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(0.82);

  useEffect(() => {
    const el = layar.current;
    if (!el) return;
    const ukur = () => setSkala(el.clientWidth / LAYAR_W);
    ukur();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`iph ${className}`} role="group" aria-label={judul}>
      <i className="iph-tombol iph-t1" aria-hidden="true" /><i className="iph-tombol iph-t2" aria-hidden="true" /><i className="iph-tombol iph-t3" aria-hidden="true" /><i className="iph-tombol iph-t4" aria-hidden="true" />
      <div className="iph-layar" ref={layar} style={{ "--sk": skala } as React.CSSProperties}>
        <div className="iph-status" aria-hidden="true">
          <span className="iph-jam">9:41</span>
          <span className="iph-ikon">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="currentColor"><rect x="0.5" y="0.5" width="20" height="10" rx="3" opacity="0.45" /><rect x="2" y="2" width="15" height="7" rx="1.8" fill="currentColor" stroke="none" /><rect x="21.5" y="3.5" width="2" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.45" /></svg>
          </span>
        </div>
        {src ? (
          <iframe ref={ref} src={src} title={judul} loading="lazy" tabIndex={interaktif ? 0 : -1} onLoad={sembunyikanScrollbar} style={{ width: LAYAR_W, height: LAYAR_H - BAR_ATAS, top: BAR_ATAS * skala, transform: `scale(${skala})`, pointerEvents: interaktif ? "auto" : "none" }} />
        ) : (
          <div className="iph-muat">Memuat…</div>
        )}
        <span className="iph-pulau" aria-hidden="true" />
        <span className="iph-home" aria-hidden="true" />
      </div>
    </div>
  );
});
