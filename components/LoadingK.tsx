/** Loading layar penuh: logo K bernapas bergantian (pil, lalu dua daun). Muncul setelah jeda 200 ms supaya tidak berkedip pada pemuatan cepat. */
export function LoadingK({ pesan = "Memuat…" }: { pesan?: string }) {
  return (
    <div className="lk-layar" role="status" aria-live="polite">
      <svg className="lk-logo" viewBox="375 390 540 410" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="lk-a" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#3aa6ff" /><stop offset="1" stopColor="#1648f0" /></linearGradient>
          <linearGradient id="lk-b" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#22b0ff" /><stop offset="1" stopColor="#3b86ff" /></linearGradient>
          <linearGradient id="lk-c" x1="0.05" y1="0.1" x2="0.95" y2="1"><stop offset="0" stopColor="#2237f2" /><stop offset="0.6" stopColor="#4a5cff" /><stop offset="1" stopColor="#7048ff" /></linearGradient>
        </defs>
        <rect className="lk-p" x="381" y="397" width="168" height="396" rx="84" fill="url(#lk-a)" />
        <path className="lk-p lk-p2" d="M576 575V540C576 460 650 397 745 397H886C862 490 780 575 680 575Z" fill="url(#lk-b)" />
        <path className="lk-p lk-p3" d="M576 607H680C760 607 810 650 850 700L898 770Q906 782 895 793H745C650 793 576 710 576 640Z" fill="url(#lk-c)" />
      </svg>
      <span className="lk-teks">{pesan}</span>
    </div>
  );
}
