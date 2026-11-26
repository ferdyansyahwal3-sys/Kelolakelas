"use client";
import { LogoK } from "@/components/LogoK";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buatAkun, buatUsaha, cekAlamat } from "@/app/(umum)/daftar-usaha/actions";
import { keluar } from "@/app/(umum)/masuk/actions";
import { Icon } from "./Icon";
import { KotaCombobox } from "./KotaCombobox";
import { TombolGoogle } from "./TombolGoogle";
import { PanelAuth } from "./PanelAuth";
import { SelesaiAuth } from "./SelesaiAuth";
import { ThemeToggle } from "./ThemeToggle";
import { DAFTAR_JENIS, INFO_JENIS, KATEGORI, SANDI_MIN, slugDariNama, validasiAkun, validasiUsaha, type Galat, type JalurBayar, type Jenis } from "@/lib/daftarUsaha";
import { TAHUNAN_BULAN, TAHUNAN_BULAN_BAYAR, TRIAL_HARI, labelPlan } from "@/lib/paketLangganan";

type Langkah = 1 | 2 | 3 | 4;
const TOTAL = 4;
const JUDUL: Record<Langkah, { h: string; p: string }> = {
  1: { h: "Buat akun", p: `Gratis ${TRIAL_HARI} hari, tanpa kartu kredit.` },
  2: { h: "Jenis usaha", p: "Kamu mengajar sendiri, atau punya pelatih lain? Bisa naik ke Agensi kapan saja, datamu ikut." },
  3: { h: "Profil usaha", p: "Ini yang dilihat murid di halaman usahamu." },
  4: { h: "Pilih tampilan", p: "Bisa diganti kapan saja lewat tombol matahari/bulan." },
};

/** Jalur B (bayar sekarang dari /checkout): tanpa kata gratis/trial/kartu sama sekali. */
const JUDUL_BAYAR: Record<Langkah, { h: string; p: string }> = {
  ...JUDUL,
  1: { h: "Buat akun", p: "Satu langkah lagi sebelum pembayaran." },
  2: { h: "Paket pilihanmu", p: "Pembayaran dilakukan setelah usahamu selesai dibuat." },
};

const RINCI_JENIS: Record<Jenis, { ikon: string; label: string[] }> = {
  guru_les: { ikon: "coach", label: ["1 pelatih: kamu", "Privat atau kelas kecil", "Paling ringkas"] },
  agensi: { ikon: "users", label: ["Banyak pelatih", "Bagi hasil dan gaji", "Ganti pelatih"] },
};

export function DaftarUsahaWizard({ tersambung, sudahMasuk, namaAwal, jenisAwal, jalurBayar }: { tersambung: boolean; sudahMasuk: boolean; namaAwal: string; jenisAwal?: Jenis; jalurBayar?: JalurBayar | null }) {
  const router = useRouter();
  const [langkah, setLangkah] = useState<Langkah>(sudahMasuk ? 2 : 1);
  const [masukSudah, setMasukSudah] = useState(sudahMasuk);

  const [nama, setNama] = useState(namaAwal);
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [lihat, setLihat] = useState(false);

  const [jenis, setJenis] = useState<Jenis>(jalurBayar?.jenis ?? jenisAwal ?? "guru_les");
  const [namaUsaha, setNamaUsaha] = useState("");
  const [kategori, setKategori] = useState("Renang");
  const [kategoriLain, setKategoriLain] = useState("");
  const [kota, setKota] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [statusSlug, setStatusSlug] = useState<{ ok: boolean; pesan: string } | null>(null);

  const [tema, setTema] = useState<"gelap" | "terang">("gelap");
  const [galat, setGalat] = useState<Galat>({});
  const [pesan, setPesan] = useState("");
  const [tujuan, setTujuan] = useState<string | null>(null);
  const [sibuk, mulai] = useTransition();
  const urutCek = useRef(0);
  const lainRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem("kk-tema");
      if (t === "gelap" || t === "terang") setTema(t);
    } catch {}
  }, []);

  // Alamat otomatis dari nama usaha sampai pemilik mengubahnya sendiri.
  useEffect(() => { if (!slugManual) setSlug(slugDariNama(namaUsaha)); }, [namaUsaha, slugManual]);

  // Alamat berubah (diketik atau otomatis dari nama): galat alamat yang lama tidak berlaku lagi.
  useEffect(() => { setGalat((g) => { if (!g.slug) return g; const { slug: _, ...sisa } = g; return sisa; }); }, [slug]);

  // Cek ketersediaan alamat (ditunda 400 ms, hasil lama diabaikan).
  useEffect(() => {
    if (!masukSudah || langkah !== 3) return;
    if (slug.length < 3) { setStatusSlug(null); return; }
    const nomor = ++urutCek.current;
    const t = setTimeout(async () => {
      const r = await cekAlamat(slug);
      if (nomor === urutCek.current) setStatusSlug(r);
    }, 400);
    return () => clearTimeout(t);
  }, [slug, masukSudah, langkah]);

  // Memilih "Lainnya": kolom isian muncul dan langsung difokus.
  useEffect(() => { if (kategori === "Lainnya") lainRef.current?.focus(); }, [kategori]);

  const bersih = (k: string) => setGalat((g) => { const { [k]: _, ...sisa } = g; return sisa; });

  function langkah1() {
    setPesan("");
    const g = validasiAkun({ nama, email, sandi });
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    mulai(async () => {
      const r = await buatAkun(nama, email, sandi);
      if (r.ok) { setMasukSudah(true); setSandi(""); setLangkah(2); router.refresh(); }
      else { setGalat(r.galat); setPesan(r.pesan ?? ""); }
    });
  }

  function langkah3() {
    setPesan("");
    const g = validasiUsaha({ nama: namaUsaha, kategori, kategoriLain, kota, slug });
    if (!g.slug && statusSlug && !statusSlug.ok) g.slug = statusSlug.pesan;
    setGalat(g);
    if (Object.keys(g).length === 0) setLangkah(4);
  }

  function pilihTema(t: "gelap" | "terang") {
    setTema(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("kk-tema", t); } catch {}
  }

  function selesai() {
    setPesan("");
    mulai(async () => {
      const r = await buatUsaha({ jenis, nama: namaUsaha, kategori, kategoriLain, kota, slug, tema, bayar: jalurBayar ? { paket: jalurBayar.plan, periode: jalurBayar.periode } : undefined });
      if (r.ok) { setTujuan(r.ke); router.prefetch(r.ke); return; }
      setGalat(r.galat);
      setPesan(r.pesan ?? "");
      if (r.galat.slug || r.galat.kategoriLain || r.galat.nama) setLangkah(3);
    });
  }

  // Setelah akun dibuat, langkah 1 tidak boleh diulang (akun sudah ada): dari langkah 2 tidak ada tombol kembali.
  const kembali = langkah >= 3 ? () => { setPesan(""); setLangkah((l) => (l - 1) as Langkah); } : null;
  const j = (jalurBayar ? JUDUL_BAYAR : JUDUL)[langkah];

  return (
    <div className="shell auth auth-wz">
      {tujuan && <SelesaiAuth judul="Usahamu siap" sub={namaUsaha.trim() ? `${namaUsaha.trim()} sudah dibuat.` : "Menyiapkan dashboard kamu…"} lanjut={() => { router.replace(tujuan); router.refresh(); }} />}
      <div className="auth-latar" aria-hidden="true"><i /><i /><i /></div>
      <PanelAuth />
      <main className="auth-main" id="isi">
        <div className="auth-atas">
          <div className="auth-logo auth-logo-hp"><LogoK className="auth-tanda" />KelolaKelas</div>
          <ThemeToggle />
        </div>
        <div className="auth-kotak wz-kotak">
        <div className="hrow wz-bar">
          {kembali
            ? <button type="button" className="circ" onClick={kembali} aria-label="Kembali"><Icon name="back" /></button>
            : langkah === 1 ? <Link href="/masuk" className="circ" aria-label="Ke halaman masuk"><Icon name="back" /></Link> : null}
          <div className="t label">Langkah {langkah} dari {TOTAL}</div>
        </div>
        <div className="wz-langkah" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={langkah} aria-label="Kemajuan pendaftaran">
          {Array.from({ length: TOTAL }, (_, i) => <i key={i} className={i < langkah ? "sudah" : ""} />)}
        </div>

        <div className="wz-judul"><h1 className="title">{j.h}</h1><p>{j.p}</p></div>
        {!tersambung && <p className="galat" role="alert">Layanan belum dikonfigurasi di server ini.</p>}

        {langkah === 1 && (
          <form className="wz-isi" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); langkah1(); }} noValidate>
            <TombolGoogle label="Daftar dengan Google" lanjut={typeof window === "undefined" ? "/daftar-usaha" : `${window.location.pathname}${window.location.search}`} />
            <div className="auth-atau"><span>atau pakai email</span></div>
            <Pil id="akun-nama" label="Nama kamu" galat={galat.nama}>
              <input id="akun-nama" value={nama} onChange={(e) => { setNama(e.target.value); bersih("nama"); }} autoComplete="name" maxLength={60} placeholder="Nama lengkap" />
            </Pil>
            <Pil id="akun-email" label="Email" galat={galat.email}>
              <input id="akun-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); bersih("email"); }} autoComplete="email" inputMode="email" maxLength={120} placeholder="nama@email.com" />
            </Pil>
            <Pil id="akun-sandi" label={`Kata sandi (minimal ${SANDI_MIN} karakter)`} galat={galat.sandi}>
              <input id="akun-sandi" type={lihat ? "text" : "password"} value={sandi} onChange={(e) => { setSandi(e.target.value); bersih("sandi"); }} autoComplete="new-password" maxLength={72} placeholder={`Kata sandi (minimal ${SANDI_MIN} karakter)`} />
              <button type="button" className="auth-mata" onClick={() => setLihat((v) => !v)} aria-pressed={lihat} aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}><Icon name={lihat ? "eyeoff" : "eye"} /></button>
            </Pil>
            {pesan && <p className="galat" role="alert">{pesan}</p>}
            <div className="wz-kaki">
              <button type="submit" className="btn" disabled={sibuk || !tersambung}>{sibuk ? "Membuat akun…" : "Lanjut"}</button>
              <p>Sudah punya akun? <Link href="/masuk" className="link" style={{ color: "var(--accent-text)" }}>Masuk</Link></p>
            </div>
          </form>
        )}

        {langkah === 2 && jalurBayar && (
          <div className="wz-isi" style={{ flex: 1 }}>
            <div className="wz-kartu on" aria-label="Paket pilihanmu" style={{ cursor: "default" }}>
              <span className="wz-ikon"><Icon name={jalurBayar.jenis === "agensi" ? "users" : "coach"} /></span>
              <span className="wz-teks">
                <b>{labelPlan(jalurBayar.plan)}</b>
                <span>{INFO_JENIS[jalurBayar.jenis].nama} · {jalurBayar.periode === "tahunan" ? `Tahunan (bayar ${TAHUNAN_BULAN_BAYAR} bulan untuk ${TAHUNAN_BULAN})` : "Bulanan"}</span>
              </span>
              <span className="wz-cek"><Icon name="check" /></span>
            </div>
            <p className="meta" style={{ margin: 0 }}>Rincian harga dan cara bayar tampil setelah usahamu dibuat. Mau ganti paket? <Link href="/harga" className="link" style={{ color: "var(--accent-text)" }}>Lihat semua paket</Link></p>
            <div className="wz-kaki">
              <button type="button" className="btn" onClick={() => { setPesan(""); setLangkah(3); }}>Lanjut</button>
              <p>Bukan kamu? <button type="button" onClick={() => keluar()} className="link" style={{ color: "var(--accent-text)" }}>Keluar</button></p>
            </div>
          </div>
        )}

        {langkah === 2 && !jalurBayar && (
          <div className="wz-isi" style={{ flex: 1 }}>
            <div className="wz-isi" role="radiogroup" aria-label="Jenis usaha">
              {DAFTAR_JENIS.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={jenis === k} className={jenis === k ? "wz-kartu on" : "wz-kartu"} onClick={() => setJenis(k)}>
                  <span className="wz-ikon"><Icon name={RINCI_JENIS[k].ikon} /></span>
                  <span className="wz-teks">
                    <b>{INFO_JENIS[k].nama}</b>
                    <span>{INFO_JENIS[k].untuk}.</span>
                    <span className="wz-label">{RINCI_JENIS[k].label.map((l) => <em key={l}>{l}</em>)}</span>
                  </span>
                  <span className="wz-cek"><Icon name="check" /></span>
                </button>
              ))}
            </div>
            <div className="wz-kaki">
              <button type="button" className="btn" onClick={() => { setPesan(""); setLangkah(3); }}>Lanjut</button>
              <p>Bukan kamu? <button type="button" onClick={() => keluar()} className="link" style={{ color: "var(--accent-text)" }}>Keluar</button></p>
            </div>
          </div>
        )}

        {langkah === 3 && (
          <form className="wz-isi" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); langkah3(); }} noValidate>
            <Field label="Nama usaha" galat={galat.nama}>
              <input value={namaUsaha} onChange={(e) => { setNamaUsaha(e.target.value); bersih("nama"); }} maxLength={60} placeholder="Contoh: Privat Renang Ilham" autoComplete="organization" />
            </Field>
            <Field label="Jenis kelas" galat={galat.kategori}>
              <select value={kategori} onChange={(e) => { setKategori(e.target.value); bersih("kategori"); bersih("kategoriLain"); }}>
                {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            {kategori === "Lainnya" && (
              <Field label="Tulis jenis kelasmu" galat={galat.kategoriLain}>
                <input ref={lainRef} value={kategoriLain} onChange={(e) => { setKategoriLain(e.target.value); bersih("kategoriLain"); }} maxLength={30} placeholder="Contoh: Panahan, Catur, Melukis" />
              </Field>
            )}
            <KotaCombobox value={kota} onChange={(v) => { setKota(v); bersih("kota"); }} galat={galat.kota} />
            <Field label="Alamat link usaha" galat={galat.slug}>
              <div className="wz-awalan">
                <span>kelolakelas.id/u/</span>
                <input value={slug} onChange={(e) => { setSlugManual(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); bersih("slug"); }} maxLength={40} autoCapitalize="none" spellCheck={false} aria-label="Alamat link usaha" />
              </div>
              {statusSlug && !galat.slug && <span className={statusSlug.ok ? "wz-status ok" : "wz-status"} role="status">{statusSlug.pesan}</span>}
            </Field>
            {pesan && <p className="galat" role="alert">{pesan}</p>}
            <div className="wz-kaki">
              <button type="submit" className="btn" disabled={sibuk}>Lanjut</button>
            </div>
          </form>
        )}

        {langkah === 4 && (
          <div className="wz-isi" style={{ flex: 1 }}>
            <div className="wz-tema" role="radiogroup" aria-label="Tema">
              {(["gelap", "terang"] as const).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={tema === t} className={tema === t ? "wz-kartu on" : "wz-kartu"} onClick={() => pilihTema(t)}>
                  <span className="wz-contoh" aria-hidden="true" style={t === "gelap" ? { background: "linear-gradient(160deg,#0b1a52,#050a1c 70%)" } : { background: "linear-gradient(160deg,#f4f8ff,#dce7ff)" }}>
                    <i style={{ width: "46%", background: t === "gelap" ? "#2f6bff" : "#1f55e0" }} />
                    <i style={{ width: "70%", background: t === "gelap" ? "#1a2a5e" : "#c5d4f5" }} />
                    <span className="blok" style={{ background: t === "gelap" ? "#0f1b3d" : "#ffffff" }} />
                  </span>
                  <span className="wz-teks"><b>{t === "gelap" ? "Gelap" : "Terang"}</b><span className="wz-cek"><Icon name="check" /></span></span>
                </button>
              ))}
            </div>
            <dl className="surface wz-ringkas" style={{ margin: 0 }}>
              <div><dt>Jenis</dt><dd>{INFO_JENIS[jenis].nama}</dd></div>
              <div><dt>Usaha</dt><dd>{namaUsaha.trim()}</dd></div>
              <div><dt>Kelas</dt><dd>{kategori === "Lainnya" ? kategoriLain.trim() : kategori}</dd></div>
              {kota.trim() && <div><dt>Kota</dt><dd>{kota.trim()}</dd></div>}
              <div><dt>Link</dt><dd>/u/{slug}</dd></div>
            </dl>
            {(pesan || galat.slug) && <p className="galat" role="alert">{pesan || galat.slug}</p>}
            <div className="wz-kaki">
              <button type="button" className="btn" disabled={sibuk} onClick={selesai}>{sibuk ? "Membuat usaha…" : "Buat usaha saya"}</button>
              <p>Paket dan jadwal kamu isi sendiri setelah ini; dashboard menuntunmu langkah demi langkah.</p>
            </div>
          </div>
        )}
        </div>
        {langkah === 1 && <p className="auth-legal auth-legal-luar">Dengan mendaftar kamu setuju dengan <Link href="/syarat" className="link" style={{ color: "var(--accent-text)" }}>Syarat Layanan</Link> dan <Link href="/privasi" className="link" style={{ color: "var(--accent-text)" }}>Kebijakan Privasi</Link>.</p>}
      </main>
    </div>
  );
}

/** Kolom berbentuk pil (sama dengan halaman masuk): label kecil di dalam pil di HP, di atas pil di laptop; galat meluncur di bawahnya. */
function Pil({ id, label, galat, children }: { id: string; label: string; galat?: string; children: React.ReactNode }) {
  return (
    <div className="auth-fld">
      <label className="auth-lbl" htmlFor={id}>{label}</label>
      <div className="auth-pil" data-salah={galat ? "ya" : undefined}>{children}</div>
      <div className="auth-gal" data-ada={galat ? "ya" : "tidak"}><p role={galat ? "alert" : undefined}>{galat}</p></div>
    </div>
  );
}

function Field({ label, galat, children }: { label: string; galat?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="label" style={{ color: "var(--text-2)" }}>{label}</span>
      {children}
      {galat && <span className="galat" role="alert">{galat}</span>}
    </label>
  );
}
