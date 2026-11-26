"use client";
import { useState, useTransition } from "react";
import { simpanSandiBaru } from "../lupa-sandi/actions";

export function FormSandiBaru({ email }: { email: string }) {
  const [sandi, setSandi] = useState("");
  const [ulang, setUlang] = useState("");
  const [galat, setGalat] = useState<{ sandi?: string; ulang?: string }>({});
  const [pesan, setPesan] = useState("");
  const [sibuk, mulai] = useTransition();

  function simpan() {
    setPesan(""); setGalat({});
    mulai(async () => {
      const r = await simpanSandiBaru(sandi, ulang);
      if (r.ok) { window.location.href = `${r.ke}?sandi=baru`; return; }
      setPesan(r.pesan); setGalat(r.galat ?? {});
    });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); simpan(); }} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, lineHeight: 1.55 }}>Buat kata sandi baru untuk <b>{email}</b>.</p>
      <label className="field"><span className="label l2">Kata sandi baru</span>
        <input type="password" autoComplete="new-password" value={sandi} onChange={(e) => { setSandi(e.target.value); setGalat({}); }} />
        {galat.sandi && <span className="galat" role="alert">{galat.sandi}</span>}</label>
      <label className="field"><span className="label l2">Ulangi kata sandi</span>
        <input type="password" autoComplete="new-password" value={ulang} onChange={(e) => { setUlang(e.target.value); setGalat({}); }} />
        {galat.ulang && <span className="galat" role="alert">{galat.ulang}</span>}</label>
      {pesan && <span className="galat" role="alert">{pesan}</span>}
      <button type="submit" className="btn" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan kata sandi"}</button>
    </form>
  );
}
