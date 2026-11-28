import Link from "next/link";
import { LogoK } from "@/components/LogoK";
import { PanelAuth } from "./PanelAuth";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Kerangka halaman auth (lupa sandi, sandi baru): sama persis dengan halaman Masuk — latar bercahaya, panel samping di laptop,
 * logo + tema di atas, kartu kaca di tengah, catatan hukum di bawah. Hanya isi kartunya yang berbeda.
 */
export function KerangkaAuth({ judul, sub, children }: { judul: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="shell auth">
      <div className="auth-latar" aria-hidden="true"><i /><i /><i /></div>
      <PanelAuth />
      <main className="auth-main" id="isi">
        <div className="auth-atas">
          <div className="auth-logo auth-logo-hp"><LogoK className="auth-tanda" />KelolaKelas</div>
          <ThemeToggle />
        </div>
        <div className="auth-kotak">
          <div className="auth-kepala" style={{ "--i": 0 } as React.CSSProperties}>
            <h1 className="auth-h1">{judul}</h1>
            {sub && <p className="auth-sub" style={{ marginTop: 8 }}>{sub}</p>}
          </div>
          {children}
        </div>
        <p className="auth-legal auth-legal-luar">Dengan memakai KelolaKelas, kamu setuju dengan <Link href="/syarat">Syarat layanan</Link> dan <Link href="/privasi">Kebijakan privasi</Link>.</p>
      </main>
    </div>
  );
}
