"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const tabs = [
  { href: "/app", label: "Beranda", icon: "home" },
  { href: "/app/jadwal", label: "Jadwal", icon: "cal" },
  { href: "/app/murid", label: "Murid", icon: "users" },
  { href: "/app/tagihan", label: "Tagihan", icon: "bill" },
  { href: "/app/lainnya", label: "Lainnya", icon: "grid" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Menu utama">
      {tabs.map((t) => {
        const aktif = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="tab" aria-current={aktif ? "page" : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
