"use client";
import { usePathname } from "next/navigation";
import { NavMelayang } from "./NavMelayang";
import { useBasis } from "./BasisApp";
import { ubahHref } from "@/lib/basis";

const ITEM = [
  { id: "beranda", href: "/app", label: "Beranda", icon: "home", cocok: [] as string[] },
  { id: "jadwal", href: "/app/jadwal", label: "Jadwal", icon: "cal", cocok: ["/app/jadwal", "/app/sesi"] },
  { id: "murid", href: "/app/murid", label: "Murid", icon: "users", cocok: ["/app/murid"] },
  { id: "tagihan", href: "/app/tagihan", label: "Tagihan", icon: "bill", cocok: ["/app/tagihan"] },
  { id: "lainnya", href: "/app/lainnya", label: "Lainnya", icon: "grid", cocok: ["/app/lainnya"] },
];

/** Menu bawah owner. Alamat `/app/...` diganti awalan demo lewat konteks (lihat lib/basis.ts), jadi satu komponen untuk panel asli dan demo. */
export function TabBar() {
  const path = usePathname();
  const basis = useBasis();
  const item = ITEM.map((t) => ({ ...t, href: ubahHref(t.href, basis), cocok: t.cocok.map((c) => ubahHref(c, basis)) }));
  const aktif = path === basis ? "beranda" : item.find((t) => t.cocok.some((c) => path.startsWith(c)))?.id ?? "lainnya";
  return <NavMelayang items={item} aktifId={aktif} label="Menu utama" />;
}
