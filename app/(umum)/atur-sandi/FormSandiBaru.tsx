"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { simpanSandiBaru } from "../lupa-sandi/actions";

export function FormSandiBaru() {
  const [sandi, setSandi] = useState("");
  const [ulang, setUlang] = useState("");
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState<{ sandi?: string; ulang?: string }>({});
  const [pesan, setPesan] = useState("");
  const [sibuk, mulai] = useTransition();
  const [selesai, setSelesai] = useState(false);
  const galatUlang = galat.ulang || pesan;

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(""); setGalat({});
    mulai(async () => {
      const r = await simpanSandiBaru(sandi, ulang);
      if (r.ok) { setSelesai(true); window.location.href = `${r.ke}?sandi=baru`; return; }
      setPesan(r.pesan); setGalat(r.galat ?? {});
    });
  }
  return (
    <>
      <form className="auth-form" onSubmit={simpan} noValidate data-status={selesai ? "ok" : sibuk ? "sibuk" : "diam"}>
        <div className="auth-fld" style={{ "--i": 1 } as React.CSSProperties}>
          <label className="auth-lbl" htmlFor="baru-sandi">Kata sandi baru</label>
          <div className="auth-pil" data-salah={galat.sandi ? "ya" : undefined}>
            <input id="baru-sandi" type={lihat ? "text" : "password"} value={sandi} onChange={(e) => { setSandi(e.target.value); setGalat({}); }} autoComplete="new-password" maxLength={72} placeholder="Kata sandi baru" aria-invalid={galat.sandi ? true : undefined} />
            <button type="button" className="auth-mata" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}><Icon name={lihat ? "eyeoff" : "eye"} /></button>
          </div>
          <div className="auth-gal" data-ada={galat.sandi ? "ya" : "tidak"}><p role={galat.sandi ? "alert" : undefined}>{galat.sandi}</p></div>
        </div>
        <div className="auth-fld" style={{ "--i": 2 } as React.CSSProperties}>
          <label className="auth-lbl" htmlFor="baru-ulang">Ulangi kata sandi</label>
          <div className="auth-pil" data-salah={galatUlang ? "ya" : undefined}>
            <input id="baru-ulang" type={lihat ? "text" : "password"} value={ulang} onChange={(e) => { setUlang(e.target.value); setGalat({}); setPesan(""); }} autoComplete="new-password" maxLength={72} placeholder="Ulangi kata sandi" aria-invalid={galatUlang ? true : undefined} />
          </div>
          <div className="auth-gal" data-ada={galatUlang ? "ya" : "tidak"}><p role={galatUlang ? "alert" : undefined}>{galatUlang}</p></div>
        </div>
        <button type="submit" className="btn auth-btn" disabled={sibuk || selesai} style={{ "--i": 3 } as React.CSSProperties}>
          <span className="auth-btn-isi">{selesai ? <><Icon name="check" />Tersimpan</> : sibuk ? <><i className="auth-spin" aria-hidden="true" />Menyimpan…</> : "Simpan kata sandi"}</span>
        </button>
      </form>
      <p className="auth-buat" style={{ "--i": 4 } as React.CSSProperties}><Link href="/masuk">Kembali ke Masuk</Link></p>
    </>
  );
}
