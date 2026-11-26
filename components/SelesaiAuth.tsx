"use client";
import { useEffect, useRef, useState } from "react";
import { LogoK } from "@/components/LogoK";

/**
 * Layar singkat setelah masuk / buat akun berhasil: lingkaran centang tergambar, cincin cahaya berdenyut sekali, sapaan.
 * Lalu memudar dan memanggil `lanjut` (pindah ke dashboard). Klik di mana saja untuk langsung lanjut.
 * Gerak dikurangi: tanpa animasi, jeda dipendekkan.
 */
/** `logo`: tampilkan logo K sebagai pengganti centang. `lamaMs`: lama layar tampil sebelum lanjut (bawaan 900). */
export function SelesaiAuth({ judul, sub, lanjut, tahan = false, logo = false, lamaMs = 900 }: { judul: string; sub?: string; lanjut: () => void; tahan?: boolean; logo?: boolean; lamaMs?: number }) {
  const [keluar, setKeluar] = useState(false);
  const sudah = useRef(false);
  const lanjutRef = useRef(lanjut);
  lanjutRef.current = lanjut;

  useEffect(() => {
    if (tahan) return;
    const kurang = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = setTimeout(() => setKeluar(true), kurang ? 150 : lamaMs);
    const t2 = setTimeout(() => { if (!sudah.current) { sudah.current = true; lanjutRef.current(); } }, kurang ? 300 : lamaMs + 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tahan, lamaMs]);

  function lewati() {
    if (sudah.current) return;
    sudah.current = true; setKeluar(true); lanjutRef.current();
  }

  return (
    <div className="sl-layar" data-keluar={keluar ? "ya" : undefined} onClick={lewati} role="status" aria-live="polite">
      <div className={logo ? "sl-bulat sl-bulat-logo" : "sl-bulat"}>
        <span className="sl-cincin" aria-hidden="true" />
        {logo ? <LogoK className="sl-logo" susun /> : <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path className="sl-centang" d="M13 25.5l8 8L35.5 16" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <h2 className="sl-judul">{judul}</h2>
      {sub && <p className="sl-sub">{sub}</p>}
    </div>
  );
}
