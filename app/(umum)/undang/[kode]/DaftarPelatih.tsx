"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buatAkun } from "@/app/(umum)/daftar-usaha/actions";

/** Pelatih yang belum punya akun: buat akun saja (tanpa membuat usaha), lalu kembali ke undangan yang sama. */
export function DaftarPelatih({ kode }: { kode: string }) {
  const router = useRouter();
  const [f, setF] = useState({ nama: "", email: "", sandi: "" });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState("");
  const [sibuk, mulai] = useTransition();
  const ubah = (k: "nama" | "email" | "sandi", v: string) => { setF({ ...f, [k]: v }); setGalat({}); setPesan(""); };

  function daftar() {
    mulai(async () => {
      const r = await buatAkun(f.nama, f.email, f.sandi);
      if (r.ok) { router.refresh(); return; }
      setGalat(r.galat); setPesan(r.pesan ?? "");
    });
  }
  return (
    <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 className="title" style={{ color: "var(--panel-text)" }}>Undangan menjadi pelatih</h1>
      <p style={{ margin: 0, color: "var(--panel-text-2)", lineHeight: 1.55 }}>Buat akun dulu dengan <b>email yang sama dengan yang diundang</b>. Kamu tidak perlu membuat usaha.</p>
      <form onSubmit={(e) => { e.preventDefault(); daftar(); }} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {([["nama", "Nama", "text", "name"], ["email", "Email", "email", "email"], ["sandi", "Kata sandi", "password", "new-password"]] as const).map(([k, label, tipe, ac]) => (
          <label className="field" key={k}><span className="label l2">{label}</span>
            <input type={tipe} autoComplete={ac} value={f[k]} onChange={(e) => ubah(k, e.target.value)} />
            {galat[k] && <span className="galat" role="alert">{galat[k]}</span>}</label>
        ))}
        {pesan && <span className="galat" role="alert">{pesan}</span>}
        <button type="submit" className="btn" disabled={sibuk}>{sibuk ? "Membuat akun…" : "Buat akun"}</button>
      </form>
      <p className="meta" style={{ margin: 0 }}>Sudah punya akun? <Link href={`/masuk?lanjut=${encodeURIComponent(`/undang/${kode}`)}`}>Masuk</Link></p>
    </div>
  );
}
