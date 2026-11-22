"use client";
import { useEffect, useState } from "react";
import { ringkasAturan } from "@/lib/beranda";
import type { AturanSesi } from "@/lib/pengaturan";

/** Angka aturan dibaca dari Pengaturan yang tersimpan di perangkat ini; sebelum database ada, murid lain melihat angka bawaan cabang. */
export function AturanBeranda({ bawaan, sebutSesi }: { bawaan: AturanSesi; sebutSesi: string }) {
  const [a, setA] = useState(bawaan);
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { aturan?: Partial<AturanSesi> } | null;
      const x = d?.aturan;
      if (x && Number.isFinite(x.batasIzinJam) && Number.isFinite(x.masaBerlakuHari) && Number.isFinite(x.toleransiTelatMenit) && typeof x.sesiPengganti === "boolean") setA({ ...bawaan, ...(x as AturanSesi) });
    } catch {}
  }, [bawaan]);
  return (
    <ul className="aturan" style={{ padding: "0 0 0 18px" }}>
      {ringkasAturan(a, sebutSesi).map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}
