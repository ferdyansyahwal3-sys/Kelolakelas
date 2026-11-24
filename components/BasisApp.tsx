"use client";
import Link from "next/link";
import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import { BASIS_ASLI, ubahHref } from "@/lib/basis";

const BasisContext = createContext<string>(BASIS_ASLI);

/** Dipasang di layout demo supaya komponen owner tahu awalan alamatnya `/demo`, bukan `/app`. */
export function BasisProvider({ basis, children }: { basis: string; children: ReactNode }) {
  return <BasisContext.Provider value={basis}>{children}</BasisContext.Provider>;
}

export const useBasis = () => useContext(BasisContext);
export const useDemo = () => useContext(BasisContext) !== BASIS_ASLI;

/** Pengganti `next/link` untuk alamat panel owner: `/app/...` otomatis menjadi `/demo/...` di mode demo. */
export function Tautan({ href, ...sisa }: ComponentProps<typeof Link> & { href: string }) {
  return <Link href={ubahHref(href, useBasis())} {...sisa} />;
}

/** Isi hanya tampil di panel asli, disembunyikan di demo (fitur yang butuh login/akun, mis. tombol Keluar). */
export function HanyaAsli({ children }: { children: ReactNode }) {
  return useDemo() ? null : <>{children}</>;
}
