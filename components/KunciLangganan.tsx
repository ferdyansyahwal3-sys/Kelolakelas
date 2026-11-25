"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

/**
 * Bila langganan terkunci (masa percobaan habis tanpa pernah bayar), semua halaman panel diganti kartu "Langganan untuk lanjut".
 * Hanya halaman /app/langganan (pilih paket, bayar) yang tetap terbuka. Perubahan data juga ditolak di sisi server (akses "ditutup").
 */
export function KunciLangganan({ terkunci, nama, pernahBayar = false, planLabel = "", hrefBayar = "/app/langganan/pilih", keluar, children }: { terkunci: boolean; nama: string; pernahBayar?: boolean; planLabel?: string; hrefBayar?: string; keluar: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  if (!terkunci || path === "/app/langganan" || path.startsWith("/app/langganan/")) return <>{children}</>;
  return (
    <main className="scroll kunci-halaman" aria-labelledby="kunci-judul">
      <div className="kunci-kartu" role="dialog" aria-modal="false" aria-labelledby="kunci-judul">
        <span className="kunci-ikon" aria-hidden="true"><Icon name="lock" /></span>
        <h1 id="kunci-judul" className="kunci-judul">{pernahBayar ? `Langganan ${nama} berakhir` : `Masa percobaan ${nama} berakhir`}</h1>
        <p className="kunci-teks">Semua fitur dikunci sampai kamu berlangganan. Datamu aman dan tidak dihapus: jadwal, murid, dan tagihan kembali terbuka begitu pembayaran selesai.</p>
        <Link href={pernahBayar ? hrefBayar : "/app/langganan/pilih"} className="btn kunci-btn">{pernahBayar ? `Lanjut bayar paket ${planLabel}` : "Pilih paket dan langganan"}<span className="auth-panah kunci-panah" aria-hidden="true"><Icon name="arrow" /></span></Link>
        {pernahBayar && <Link href="/app/langganan/pilih" className="kunci-ubah">Ubah paket</Link>}
        <div className="kunci-keluar">{keluar}</div>
      </div>
    </main>
  );
}
