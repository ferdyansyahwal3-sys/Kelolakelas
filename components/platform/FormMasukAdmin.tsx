"use client";
import { LogoK } from "@/components/LogoK";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { masukAdmin } from "@/app/(umum)/platform/aksi";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PanelAuth } from "@/components/PanelAuth";
import { SelesaiAuth } from "@/components/SelesaiAuth";

/** Getar kecil pada kolom yang salah (dilewati bila pengguna minta gerak dikurangi). */
function goyang(el: HTMLElement | null) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
}

/** Login pemilik platform. Tampilan mengikuti /masuk; tanpa Google dan tanpa buat akun. Pesan gagal selalu sama (tidak membocorkan akun/admin). */
export function FormMasukAdmin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState("");
  const [galatEmail, setGalatEmail] = useState("");
  const [galatSandi, setGalatSandi] = useState("");
  const [selesai, setSelesai] = useState(false);
  const [sibuk, mulai] = useTransition();
  const pilEmail = useRef<HTMLDivElement>(null);
  const pilSandi = useRef<HTMLDivElement>(null);
  const inEmail = useRef<HTMLInputElement>(null);
  const inSandi = useRef<HTMLInputElement>(null);
  const galatSandiTampil = galatSandi || galat;

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    const ge = !email.trim() ? "Isi email kamu." : "";
    const gs = !sandi ? "Isi kata sandi." : "";
    setGalatEmail(ge); setGalatSandi(gs);
    if (ge || gs) {
      if (ge) { goyang(pilEmail.current); inEmail.current?.focus(); } else { goyang(pilSandi.current); inSandi.current?.focus(); }
      return;
    }
    mulai(async () => {
      const h = await masukAdmin(email, sandi);
      if (h.ok) { setSelesai(true); router.prefetch("/platform"); }
      else { setGalat(h.pesan); goyang(pilSandi.current); }
    });
  }

  const status = selesai ? "ok" : sibuk ? "sibuk" : "diam";

  return (
    <div className="shell auth">
      {selesai && <SelesaiAuth logo lamaMs={3800} judul="Selamat datang, Bos Ferdy" sub="Menyiapkan panel platform…" lanjut={() => { router.replace("/platform"); router.refresh(); }} />}
      <div className="auth-latar" aria-hidden="true"><i /><i /><i /></div>
      <PanelAuth admin />
      <main className="auth-main" id="isi">
        <div className="auth-atas">
          <div className="auth-logo auth-logo-hp"><LogoK className="auth-tanda" />KelolaKelas</div>
          <ThemeToggle />
        </div>
        <div className="auth-kotak">
          <div className="auth-kepala" style={{ "--i": 0 } as React.CSSProperties}>
            <h1 className="auth-h1">Masuk pemilik platform</h1>
            <p className="auth-sub">Khusus pemilik KelolaKelas.</p>
          </div>
          <form className="auth-form" onSubmit={kirim} noValidate data-status={status}>
            <div className="auth-fld" style={{ "--i": 1 } as React.CSSProperties}>
              <label className="auth-lbl" htmlFor="admin-email">Email</label>
              <div className="auth-pil" ref={pilEmail} data-salah={galatEmail ? "ya" : undefined}>
                <input id="admin-email" ref={inEmail} type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (galatEmail) setGalatEmail(""); }} autoComplete="username" inputMode="email" maxLength={120} placeholder="nama@email.com" aria-invalid={galatEmail ? true : undefined} aria-describedby={galatEmail ? "admin-email-galat" : undefined} />
              </div>
              <div className="auth-gal" data-ada={galatEmail ? "ya" : "tidak"}><p id="admin-email-galat" role={galatEmail ? "alert" : undefined}>{galatEmail}</p></div>
            </div>
            <div className="auth-fld" style={{ "--i": 2 } as React.CSSProperties}>
              <label className="auth-lbl" htmlFor="admin-sandi">Kata sandi</label>
              <div className="auth-pil" ref={pilSandi} data-salah={galatSandiTampil ? "ya" : undefined}>
                <input id="admin-sandi" ref={inSandi} type={lihat ? "text" : "password"} value={sandi} onChange={(e) => { setSandi(e.target.value); if (galatSandi) setGalatSandi(""); if (galat) setGalat(""); }} autoComplete="current-password" maxLength={72} placeholder="Kata sandi kamu" aria-invalid={galatSandiTampil ? true : undefined} aria-describedby={galatSandiTampil ? "admin-sandi-galat" : undefined} />
                <button type="button" className="auth-mata" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}><Icon name={lihat ? "eyeoff" : "eye"} /></button>
              </div>
              <div className="auth-gal" data-ada={galatSandiTampil ? "ya" : "tidak"}><p id="admin-sandi-galat" role={galatSandiTampil ? "alert" : undefined}>{galatSandiTampil}</p></div>
            </div>
            <button type="submit" className="btn auth-btn" disabled={sibuk || selesai} style={{ "--i": 3 } as React.CSSProperties}>
              <span className="auth-btn-isi">{status === "ok" ? <><Icon name="check" />Berhasil</> : status === "sibuk" ? <><i className="auth-spin" aria-hidden="true" />Memeriksa…</> : "Masuk"}</span>
            </button>
          </form>
          <p className="auth-buat" style={{ "--i": 4 } as React.CSSProperties}><Link href="/lupa-sandi">Lupa kata sandi?</Link></p>
        </div>
        <p className="auth-legal auth-legal-luar">Halaman ini bukan untuk pelanggan. Kalau kamu pelatih atau pemilik kelas, masuk lewat <Link href="/masuk">halaman masuk biasa</Link>.</p>
      </main>
    </div>
  );
}
