"use client";
import { usePathname } from "next/navigation";
import { NavMelayang } from "./NavMelayang";

const ITEM = [
  { id: "beranda", href: "/app", label: "Beranda", icon: "home", cocok: [] as string[] },
  { id: "jadwal", href: "/app/jadwal", label: "Jadwal", icon: "cal", cocok: ["/app/jadwal", "/app/sesi"] },
  { id: "murid", href: "/app/murid", label: "Murid", icon: "users", cocok: ["/app/murid"] },
  { id: "tagihan", href: "/app/tagihan", label: "Tagihan", icon: "bill", cocok: ["/app/tagihan"] },
  { id: "lainnya", href: "/app/lainnya", label: "Lainnya", icon: "grid", cocok: ["/app/lainnya"] },
];

export function TabBar() {
  const path = usePathname();
  const aktif = path === "/app" ? "beranda" : ITEM.find((t) => t.cocok.some((c) => path.startsWith(c)))?.id ?? "lainnya";
  return <NavMelayang items={ITEM} aktifId={aktif} label="Menu utama" />;
}
