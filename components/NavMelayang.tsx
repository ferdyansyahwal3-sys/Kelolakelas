"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export interface ItemNav { id: string; label: string; icon: string; href?: string; /** Titik kecil penanda ada yang baru (mis. kabar belum dibaca). */ titik?: boolean }
interface Props { items: ItemNav[]; aktifId: string; onPilih?: (id: string) => void; label: string }

/**
 * Menu bawah berbentuk pil melayang: tab aktif diberi batang cahaya di tepi atas dan sorot cahaya ke bawah (acuan: video dari Ferdy).
 * Hanya ikon (nama tab ada di aria-label dan tooltip). Digulir ke bawah menu mengecil, digulir ke atas membesar lagi (seperti Instagram).
 * Item memakai `href` (Link) atau `onPilih` (tombol, untuk halaman yang berganti isi tanpa pindah alamat).
 */
export function NavMelayang({ items, aktifId, onPilih, label }: Props) {
  const [kecil, setKecil] = useState(false);

  useEffect(() => {
    let terakhir = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - terakhir;
      if (Math.abs(d) < 8) return;
      setKecil(d > 0 && y > 48);
      terakhir = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const idx = Math.max(0, items.findIndex((i) => i.id === aktifId));
  return (
    <nav className="nav-mel" data-kecil={kecil ? "ya" : "tidak"} aria-label={label} style={{ "--i": idx, "--n": items.length } as React.CSSProperties}>
      <span className="nav-lampu" aria-hidden="true"><i className="nav-bar" /><i className="nav-sorot" /></span>
      {items.map((it) => {
        const isi = <><Icon name={it.icon} />{it.titik && <i className="nav-titik" aria-hidden="true" />}</>;
        const aktif = it.id === aktifId;
        return it.href ? (
          <Link key={it.id} href={it.href} className="nav-item" aria-current={aktif ? "page" : undefined} aria-label={it.titik ? `${it.label}, ada yang baru` : it.label} title={it.label}>{isi}</Link>
        ) : (
          <button key={it.id} type="button" className="nav-item" aria-current={aktif ? "page" : undefined} aria-label={it.titik ? `${it.label}, ada yang baru` : it.label} title={it.label} onClick={() => onPilih?.(it.id)}>{isi}</button>
        );
      })}
    </nav>
  );
}
