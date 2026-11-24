"use client";
import { useEffect, useState } from "react";

/** Waktu sekarang (ms). Render pertama memakai waktu server (`awalMs`) supaya HTML server dan klien sama, lalu berdetak tiap detik. */
export function useWaktu(awalMs: number): number {
  const [n, setN] = useState(awalMs);
  useEffect(() => {
    setN(Date.now());
    const id = setInterval(() => setN(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return n;
}
