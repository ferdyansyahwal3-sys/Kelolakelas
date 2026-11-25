"use client";
import { LogoK } from "@/components/LogoK";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { NavMelayang } from "@/components/NavMelayang";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePlatform } from "./PlatformProvider";

const NAV = [
  { href: "/platform", label: "Ringkasan", icon: "chart", persis: true },
  { href: "/platform/usaha", label: "Usaha", icon: "users" },
  { href: "/platform/tagihan", label: "Tagihan", icon: "bill" },
  { href: "/platform/promo", label: "Promo", icon: "tag" },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { sembunyi, setSembunyi } = usePlatform();
  const aktif = (n: (typeof NAV)[number]) => (n.persis ? path === n.href : path.startsWith(n.href));
  return (
    <div className="plat">
      <aside className="plat-side" aria-label="Menu platform">
        <div className="plat-brand"><LogoK className="plat-logo" /><div><b>KelolaKelas</b><span className="meta" style={{ display: "block" }}>Pemilik platform</span></div></div>
        <nav className="plat-nav">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={aktif(n) ? "page" : undefined}><Icon name={n.icon} />{n.label}</Link>)}
        </nav>
        <div className="plat-side-foot">
          <button type="button" className="btn btn-2 btn-sm" aria-pressed={sembunyi} onClick={() => setSembunyi(!sembunyi)}>{sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"}</button>
        </div>
      </aside>

      <div className="plat-col">
        <div className="plat-top">
          <span className="st st-few" role="note">Data contoh · tidak terhubung database · hilang saat reload</span>
          <span className="plat-top-aksi">
            <button type="button" className="circ plat-mata" aria-pressed={sembunyi} aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} onClick={() => setSembunyi(!sembunyi)}>
              <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {sembunyi ? <><path d="M3 3l18 18" /><path d="M10.6 6.1A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2.5 12S6 18 12 18c1.5 0 2.8-.4 4-.9" /></> : <><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
            <ThemeToggle />
          </span>
        </div>
        <main className="plat-main">{children}</main>
        <NavMelayang label="Menu utama platform" aktifId={NAV.find(aktif)?.href ?? ""} items={NAV.map((n) => ({ id: n.href, href: n.href, label: n.label, icon: n.icon }))} />
      </div>
    </div>
  );
}
