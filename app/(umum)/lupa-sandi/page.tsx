import type { Metadata } from "next";
import { KerangkaAuth } from "@/components/KerangkaAuth";
import { FormLupaSandi } from "./FormLupaSandi";

export const metadata: Metadata = { title: "Lupa kata sandi · KelolaKelas", robots: { index: false } };

export default function LupaSandi() {
  return (
    <KerangkaAuth judul="Lupa kata sandi?" sub="Tulis email akunmu. Kami kirim tautan untuk membuat kata sandi baru.">
      <FormLupaSandi />
    </KerangkaAuth>
  );
}
