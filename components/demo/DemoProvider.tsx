"use client";
import type { ReactNode } from "react";
import { BasisProvider } from "@/components/BasisApp";
import { BASIS_DEMO, dalamDemo, kunciDemo } from "@/lib/basis";
import { DemoBanner } from "./DemoBanner";

/**
 * Pasang sekali per tab: selama alamat berada di /demo, setiap kunci localStorage `kk-x` dibaca/ditulis sebagai `kk-demo-x`.
 * Dicek tiap panggilan (bukan sekali saat dipasang), jadi navigasi keluar dari /demo otomatis kembali memakai kunci asli,
 * dan komponen owner (pengaturan, absen, bagi hasil, dst.) tidak perlu tahu sedang demo. Tidak ada tulis ke database di sini.
 */
function pasangPenyimpananDemo() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __kkDemoPatch?: boolean };
  if (w.__kkDemoPatch) return;
  w.__kkDemoPatch = true;
  const proto = Storage.prototype;
  const { getItem, setItem, removeItem } = proto;
  const peta = (s: Storage, k: string) => (s === window.localStorage && dalamDemo(window.location.pathname) ? kunciDemo(k) : k);
  proto.getItem = function (this: Storage, k: string) { return getItem.call(this, peta(this, k)); };
  proto.setItem = function (this: Storage, k: string, v: string) { return setItem.call(this, peta(this, k), v); };
  proto.removeItem = function (this: Storage, k: string) { return removeItem.call(this, peta(this, k)); };
}

pasangPenyimpananDemo();

export function DemoProvider({ children }: { children: ReactNode }) {
  pasangPenyimpananDemo();
  return (
    <BasisProvider basis={BASIS_DEMO}>
      <DemoBanner />
      {children}
    </BasisProvider>
  );
}
