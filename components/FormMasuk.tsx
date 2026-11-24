"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { masuk } from "@/app/masuk/actions";
import { ThemeToggle } from "./ThemeToggle";
import { TombolMata } from "./TombolMata";

export function FormMasuk({ lanjut, tersambung }: { lanjut: string | null; tersambung: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [lihat, setLihat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [sibuk, mulai] = useTransition();

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPesan("");
    if (!email.trim() || !sandi) { setPesan("Isi email dan kata sandi."); return; }
    mulai(async () => {
      const r = await masuk(email, sandi, lanjut);
      if (r.ok) { router.replace(r.ke); router.refresh(); }
      else setPesan(r.pesan);
    });
  }

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <div className="hrow">
          <div className="t label">KelolaKelas</div>
          <ThemeToggle />
        </div>
        <div className="grp">
          <h1 className="title">Masuk</h1>
          <p className="label" style={{ margin: 0 }}>Untuk pemilik usaha dan pelatih.</p>
        </div>
        {!tersambung && <p className="galat" role="alert">Layanan belum dikonfigurasi di server ini.</p>}
        <form className="grp" onSubmit={kirim} noValidate>
          <label className="field">
            <span className="label" style={{ color: "var(--text-2)" }}>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" maxLength={120} />
          </label>
          <label className="field">
            <span className="label" style={{ color: "var(--text-2)" }}>Kata sandi</span>
            <div className="wz-masukan">
              <input type={lihat ? "text" : "password"} value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="current-password" maxLength={72} />
              <TombolMata tampil={lihat} onToggle={() => setLihat((v) => !v)} />
            </div>
          </label>
          {pesan && <p className="galat" role="alert">{pesan}</p>}
          <button type="submit" className="btn" disabled={sibuk || !tersambung}>{sibuk ? "Memeriksa…" : "Masuk"}</button>
        </form>
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Belum punya usaha? <Link href="/daftar-usaha" className="link">Daftar usaha</Link></p>
      </main>
    </div>
  );
}
