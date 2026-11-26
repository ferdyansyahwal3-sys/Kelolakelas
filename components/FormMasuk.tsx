"use client";
import { LogoK } from "@/components/LogoK";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { masuk } from "@/app/(umum)/masuk/actions";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { TombolGoogle } from "./TombolGoogle";
import { PanelAuth } from "./PanelAuth";
import { SelesaiAuth } from "./SelesaiAuth";

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Getar kecil pada kolom yang salah (WAAPI, tidak memasang ulang elemen, dilewati bila pengguna minta gerak dikurangi). */
function goyang(el: HTMLElement | null) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
}

export function FormMasuk({ lanjut, tersambung, galatAwal = "" }: { lanjut: string | null; tersambung: boolean; galatAwal?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [lihat, setLihat] = useState(false);
  const [pesan, setPesan] = useState("");
  const [galatEmail, setGalatEmail] = useState("");
  const [galatSandi, setGalatSandi] = useState("");
  const [selesai, setSelesai] = useState(false);
  const [tujuan, setTujuan] = useState<{ ke: string; nama: string } | null>(null);
  const [sibuk, mulai] = useTransition();
  const pilEmail = useRef<HTMLDivElement>(null);
  const pilSandi = useRef<HTMLDivElement>(null);
  const inEmail = useRef<HTMLInputElement>(null);
  const inSandi = useRef<HTMLInputElement>(null);
  const galatSandiTampil = galatSandi || pesan;

  function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPesan("");
    const ge = !email.trim() ? "Isi email kamu." : !FORMAT_EMAIL.test(email.trim()) ? "Format email belum benar." : "";
    const gs = !sandi ? "Isi kata sandi." : "";
    setGalatEmail(ge); setGalatSandi(gs);
    if (ge || gs) {
      if (ge) { goyang(pilEmail.current); inEmail.current?.focus(); } else { goyang(pilSandi.current); inSandi.current?.focus(); }
      return;
    }
    mulai(async () => {
      const r = await masuk(email, sandi, lanjut);
      if (r.ok) { setSelesai(true); setTujuan({ ke: r.ke, nama: r.nama }); router.prefetch(r.ke); }
      else { setPesan(r.pesan); goyang(pilSandi.current); }
    });
  }

  const status = selesai ? "ok" : sibuk ? "sibuk" : "diam";

  return (
    <div className="shell auth">
      {tujuan && <SelesaiAuth judul={tujuan.nama ? `Selamat datang, ${tujuan.nama.split(" ")[0]}` : "Selamat datang"} sub="Menyiapkan dashboard kamu…" lanjut={() => { router.replace(tujuan.ke); router.refresh(); }} />}
      <div className="auth-latar" aria-hidden="true"><i /><i /><i /></div>

      <PanelAuth />

      <main className="auth-main" id="isi">
        <div className="auth-atas">
          <div className="auth-logo auth-logo-hp"><LogoK className="auth-tanda" />KelolaKelas</div>
          <ThemeToggle />
        </div>
        <div className="auth-kotak">
          <div className="auth-kepala" style={{ "--i": 0 } as React.CSSProperties}>
            <h1 className="auth-h1">Selamat datang kembali</h1>
          </div>
          {!tersambung && <p className="galat" role="alert">Layanan belum dikonfigurasi di server ini.</p>}
          {galatAwal && <p className="galat auth-galat" role="alert">{galatAwal}</p>}
          <form className="auth-form" onSubmit={kirim} noValidate data-status={status}>
            <div className="auth-fld" style={{ "--i": 1 } as React.CSSProperties}>
              <label className="auth-lbl" htmlFor="masuk-email">Email</label>
              <div className="auth-pil" ref={pilEmail} data-salah={galatEmail ? "ya" : undefined}>
                <input id="masuk-email" ref={inEmail} type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (galatEmail) setGalatEmail(""); }} autoComplete="email" inputMode="email" maxLength={120} placeholder="nama@email.com" aria-invalid={galatEmail ? true : undefined} aria-describedby={galatEmail ? "masuk-email-galat" : undefined} />
              </div>
              <div className="auth-gal" data-ada={galatEmail ? "ya" : "tidak"}><p id="masuk-email-galat" role={galatEmail ? "alert" : undefined}>{galatEmail}</p></div>
            </div>
            <div className="auth-fld" style={{ "--i": 2 } as React.CSSProperties}>
              <label className="auth-lbl" htmlFor="masuk-sandi">Kata sandi</label>
              <Link href="/lupa-sandi" className="auth-lupa auth-lupa-lbl">Lupa kata sandi?</Link>
              <div className="auth-pil" ref={pilSandi} data-salah={galatSandiTampil ? "ya" : undefined}>
                <input id="masuk-sandi" ref={inSandi} type={lihat ? "text" : "password"} value={sandi} onChange={(e) => { setSandi(e.target.value); if (galatSandi) setGalatSandi(""); if (pesan) setPesan(""); }} autoComplete="current-password" maxLength={72} placeholder="Kata sandi kamu" aria-invalid={galatSandiTampil ? true : undefined} aria-describedby={galatSandiTampil ? "masuk-sandi-galat" : undefined} />
                <button type="button" className="auth-mata" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}><Icon name={lihat ? "eyeoff" : "eye"} /></button>
              </div>
              <div className="auth-gal" data-ada={galatSandiTampil ? "ya" : "tidak"}><p id="masuk-sandi-galat" role={galatSandiTampil ? "alert" : undefined}>{galatSandiTampil}</p></div>
            </div>
            <button type="submit" className="btn auth-btn" disabled={sibuk || selesai || !tersambung} style={{ "--i": 3 } as React.CSSProperties}>
              <span className="auth-btn-isi">{status === "ok" ? <><Icon name="check" />Berhasil</> : status === "sibuk" ? <><i className="auth-spin" aria-hidden="true" />Memeriksa…</> : "Masuk"}</span>
            </button>
          </form>
          <div className="auth-atau" style={{ "--i": 4 } as React.CSSProperties}><span>atau</span></div>
          <div className="auth-alt" style={{ "--i": 5 } as React.CSSProperties}>
            <TombolGoogle label="Masuk dengan Google" lanjut={lanjut} className="tg-btn" />
            <p className="auth-buat">Belum punya akun? <Link href="/daftar-usaha">Buat akun</Link></p>
            <Link href="/lupa-sandi" className="auth-lupa auth-lupa-hp">Lupa kata sandi?</Link>
          </div>
        </div>
        <p className="auth-legal auth-legal-luar">Dengan masuk, kamu setuju dengan <Link href="/syarat">Syarat layanan</Link> dan <Link href="/privasi">Kebijakan privasi</Link>.</p>
      </main>
    </div>
  );
}
