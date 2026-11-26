import { useId } from "react";

/** `susun`: tiga bagian logo bisa dianimasikan satu per satu (kelas lk-1..3). Logo KelolaKelas (huruf K: batang pil + dua daun). Vektor, gradasi biru → ungu; dipakai di login, sidebar, landing, dan platform. */
export function LogoK({ className, title, susun = false }: { className?: string; title?: string; susun?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="375 390 540 410" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <defs>
        <linearGradient id={`${id}a`} x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#3aa6ff" /><stop offset="1" stopColor="#1648f0" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#22b0ff" /><stop offset="1" stopColor="#3b86ff" /></linearGradient>
        <linearGradient id={`${id}c`} x1="0.05" y1="0.1" x2="0.95" y2="1"><stop offset="0" stopColor="#2237f2" /><stop offset="0.6" stopColor="#4a5cff" /><stop offset="1" stopColor="#7048ff" /></linearGradient>
      </defs>
      <rect className={susun ? "lk-1" : undefined} x="381" y="397" width="168" height="396" rx="84" fill={`url(#${id}a)`} />
      <path className={susun ? "lk-2" : undefined} d="M576 575V540C576 460 650 397 745 397H886C862 490 780 575 680 575Z" fill={`url(#${id}b)`} />
      <path className={susun ? "lk-3" : undefined} d="M576 607H680C760 607 810 650 850 700L898 770Q906 782 895 793H745C650 793 576 710 576 640Z" fill={`url(#${id}c)`} />
    </svg>
  );
}
