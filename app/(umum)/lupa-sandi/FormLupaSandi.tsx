"use client";
import { useState, useTransition } from "react";
import { kirimResetSandi } from "./actions";

export function FormLupaSandi() {
  const [email, setEmail] = useState("");
  const [pesan, setPesan] = useState("");
  const [terkirim, setTerkirim] = useState(false);
  const [sibuk, mulai] = useTransition();

  function kirim() {
    setPesan("");
    mulai(async () => {
      const r = await kirimResetSandi(email);
      if (r.ok) setTerkirim(true); else setPesan(r.pesan);
    });
  }
  if (terkirim) return <p role="status" style={{ margin: 0, lineHeight: 1.55 }}>Kalau email itu terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Cek kotak masuk dan folder spam.</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); kirim(); }} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label className="field"><span className="label l2">Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setPesan(""); }} /></label>
      {pesan && <span className="galat" role="alert">{pesan}</span>}
      <button type="submit" className="btn" disabled={sibuk}>{sibuk ? "Mengirim…" : "Kirim tautan"}</button>
    </form>
  );
}
