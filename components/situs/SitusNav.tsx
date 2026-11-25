"use client";
import { LogoK } from "@/components/LogoK";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/Icon";

/** Nav situs. Di Landing tautan bagian memakai anchor (#), di halaman lain kembali ke Landing. */
export function SitusNav({ aktif, promo, landing = false }: { aktif?: "harga"; promo?: ReactNode; landing?: boolean }) {
  const [buka, setBuka] = useState(false);
  const p = landing ? "" : "/";
  const link = [
    { href: `${p}#solusi`, label: "Fitur", id: "fitur" },
    { href: `${p}#preview`, label: "Tampilan", id: "tampilan" },
    { href: landing ? "#harga" : "/harga", label: "Harga", id: "harga" },
    { href: `${p}#faq`, label: "FAQ", id: "faq" },
  ];
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, [buka]);

  return (
    <header className="s-nav">
      <div className="s-nav-dalam">
        <Link href="/" className="s-logo" aria-label="KelolaKelas, ke beranda">
          <LogoK className="s-logo-k" />
          <span>KelolaKelas</span>
        </Link>
        <nav className="s-nav-link" aria-label="Menu utama">
          {link.map((l) => <Link key={l.id} href={l.href} aria-current={aktif === "harga" && l.id === "harga" ? "page" : undefined}>{l.label}</Link>)}
        </nav>
        <div className="s-nav-aksi">
          {promo}
          <ThemeToggle />
          <Link href="/masuk" className="s-nav-masuk">Masuk</Link>
          <Link href="/daftar-usaha" className="btn btn-sm s-nav-cta">Coba gratis</Link>
          <button type="button" className="circ s-nav-menu" aria-label={buka ? "Tutup menu" : "Buka menu"} aria-expanded={buka} onClick={() => setBuka((v) => !v)}>
            <Icon name={buka ? "x" : "grid"} />
          </button>
        </div>
      </div>
      {buka && (
        <nav className="s-nav-laci" aria-label="Menu">
          {link.map((l) => <Link key={l.id} href={l.href} onClick={() => setBuka(false)}>{l.label}</Link>)}
          <Link href="/masuk" onClick={() => setBuka(false)}>Masuk</Link>
          <Link href="/daftar-usaha" className="btn" onClick={() => setBuka(false)}>Coba gratis 7 hari</Link>
        </nav>
      )}
    </header>
  );
}
