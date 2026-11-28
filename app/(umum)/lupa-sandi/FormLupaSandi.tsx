"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { kirimResetSandi } from "./actions";

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormLupaSandi() {
  const [email, setEmail] = useState("");
  const [galat, setGalat] = useState("");
  const [terkirim, setTerkirim] = useState(false);
  const [sibuk, mulai] = useTransition();
  const masukan = useRef<HTMLInputElement>(null);

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    const g = !email.trim() ? "Isi email kamu." : !FORMAT_EMAIL.test(email.trim()) ? "Format email belum benar." : "";
    setGalat(g);
    if (g) { masukan.current?.focus(); return; }
    mulai(async () => {
      const r = await kirimResetSandi(email);
      if (r.ok) setTerkirim(true); else setGalat(r.pesan);
    });
  }

  if (terkirim) {
    return (
      <div className="auth-form" role="status" style={{ "--i": 1 } as React.CSSProperties}>
        <p className="auth-sub" style={{ textAlign: "center", lineHeight: 1.55 }}>Kalau email itu terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Cek kotak masuk dan folder spam, lalu buka tautannya di peramban ini juga.</p>
        <Link href="/masuk" className="btn auth-btn">Kembali ke Masuk</Link>
      </div>
    );
  }
  return (
    <>
      <form className="auth-form" onSubmit={kirim} noValidate data-status={sibuk ? "sibuk" : "diam"}>
        <div className="auth-fld" style={{ "--i": 1 } as React.CSSProperties}>
          <label className="auth-lbl" htmlFor="lupa-email">Email</label>
          <div className="auth-pil" data-salah={galat ? "ya" : undefined}>
            <input id="lupa-email" ref={masukan} type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (galat) setGalat(""); }} autoComplete="email" inputMode="email" maxLength={120} placeholder="nama@email.com" aria-invalid={galat ? true : undefined} aria-describedby={galat ? "lupa-email-galat" : undefined} />
          </div>
          <div className="auth-gal" data-ada={galat ? "ya" : "tidak"}><p id="lupa-email-galat" role={galat ? "alert" : undefined}>{galat}</p></div>
        </div>
        <button type="submit" className="btn auth-btn" disabled={sibuk} style={{ "--i": 2 } as React.CSSProperties}>
          <span className="auth-btn-isi">{sibuk ? <><i className="auth-spin" aria-hidden="true" />Mengirim…</> : <>Kirim tautan</>}</span>
        </button>
      </form>
      <p className="auth-buat" style={{ "--i": 3 } as React.CSSProperties}><Link href="/masuk">Kembali ke Masuk</Link></p>
    </>
  );
}
