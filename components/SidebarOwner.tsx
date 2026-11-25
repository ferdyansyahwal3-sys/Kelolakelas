"use client";
import { LogoK } from "@/components/LogoK";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { Tautan as Link, useBasis, useDemo } from "./BasisApp";
import { ubahHref } from "@/lib/basis";

interface Item { href: string; label: string; icon: string; badge?: "pendaftaran"; hanyaAsli?: boolean }
const KELOMPOK: { judul: string; item: Item[] }[] = [
  { judul: "Utama", item: [
    { href: "/app", label: "Beranda", icon: "home" },
    { href: "/app/pendaftaran", label: "Pendaftaran", icon: "inbox", badge: "pendaftaran" },
  ] },
  { judul: "Operasional", item: [
    { href: "/app/jadwal", label: "Jadwal", icon: "cal" },
    { href: "/app/sesi", label: "Sesi dan absensi", icon: "check" },
    { href: "/app/murid", label: "Murid", icon: "users" },
  ] },
  { judul: "Keuangan", item: [
    { href: "/app/tagihan", label: "Tagihan", icon: "bill" },
    { href: "/app/rekap", label: "Rekap", icon: "chart" },
    { href: "/app/paket", label: "Paket dan harga", icon: "doc" },
    { href: "/app/promo", label: "Promo dan referral", icon: "tag" },
  ] },
  { judul: "Usaha", item: [
    { href: "/app/pengajar", label: "Pengajar", icon: "coach" },
    { href: "/app/pemberitahuan", label: "Pemberitahuan", icon: "bell" },
    { href: "/app/langganan", label: "Langganan", icon: "grid", hanyaAsli: true },
  ] },
];
const FOOT: Item[] = [
  { href: "/app/pengaturan", label: "Pengaturan", icon: "gear" },
  { href: "/pengajar", label: "Halaman pelatih", icon: "link" },
];

/** Sidebar panel owner untuk laptop (>= 1024). Dikelompokkan, bisa dilipat jadi rel ikon (pilihan disimpan). Di HP/tablet disembunyikan; menu bawah yang dipakai. */
export function SidebarOwner({ pendaftaran = 0 }: { pendaftaran?: number }) {
  const path = usePathname();
  const basis = useBasis();
  const demo = useDemo();
  const [ciut, setCiut] = useState<boolean | null>(null);

  useEffect(() => {
    try { const v = localStorage.getItem("kk-side"); if (v === "buka" || v === "ciut") { document.documentElement.setAttribute("data-side", v); setCiut(v === "ciut"); return; } } catch {}
    setCiut(null);
  }, []);
  function ganti() {
    const sekarangCiut = document.documentElement.getAttribute("data-side") === "ciut" || (document.documentElement.getAttribute("data-side") !== "buka" && window.matchMedia("(max-width: 1279px)").matches);
    const baru = sekarangCiut ? "buka" : "ciut";
    document.documentElement.setAttribute("data-side", baru);
    setCiut(baru === "ciut");
    try { localStorage.setItem("kk-side", baru); } catch {}
  }

  const aktif = (href: string) => {
    const h = ubahHref(href, basis);
    return href === "/app" ? path === h : path === h || path.startsWith(h + "/");
  };
  const baris = (it: Item) => (
    <Link key={it.href} href={it.href} className="side-item" aria-current={aktif(it.href) ? "page" : undefined} title={it.label}>
      <Icon name={it.icon} /><span className="side-lbl">{it.label}</span>
      {it.badge === "pendaftaran" && pendaftaran > 0 && <span className="side-n" aria-label={`${pendaftaran} menunggu`}>{pendaftaran}</span>}
    </Link>
  );

  return (
    <aside className="side-owner" aria-label="Menu panel" data-ciut={ciut === null ? undefined : ciut ? "ya" : "tidak"}>
      <div className="side-merek"><LogoK className="side-logo" /><span className="side-lbl">KelolaKelas</span></div>
      <nav className="side-nav">
        {KELOMPOK.map((k) => {
          const item = k.item.filter((i) => !i.hanyaAsli || !demo);
          return (
            <div key={k.judul} className="side-grup">
              <div className="side-judul">{k.judul}</div>
              {item.map(baris)}
            </div>
          );
        })}
      </nav>
      <div className="side-foot">
        {FOOT.map(baris)}
        <button type="button" className="side-item side-lipat" onClick={ganti} aria-label="Lipat atau buka menu samping" title="Lipat / buka menu">
          <Icon name="back" /><span className="side-lbl">Ciutkan menu</span>
        </button>
      </div>
    </aside>
  );
}
