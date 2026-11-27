"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { cekKodePromo, kirimPendaftaran } from "@/app/u/[slug]/daftar/actions";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { cariPromo, hitungTotal } from "@/lib/harga";
import { pecahRupiah } from "@/lib/format";
import { kategoriTersedia } from "@/lib/paket";
import { type Galat } from "@/lib/pendaftaran";

interface Paket { id: string; nama: string; kategori: string; harga: number; catatan: string; aktif?: boolean }
interface Promo { kode: string; jenis: "persen" | "nominal"; nilai: number }
interface Props {
  slug: string;
  slot: { id: string; jam: string; nama: string; hari: string; pengajar: string; tanggal?: string };
  paket: Paket[];
  promo: Promo[];
  aturan: string[];
  /** true = kode promo diperiksa di server (data nyata); false = daftar `promo` lokal (demo/contoh). */
  promoServer?: boolean;
}

const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

export function DaftarWizard({ slug, slot, paket, promo, aturan, promoServer = false }: Props) {
  const [langkah, setLangkah] = useState<2 | 3>(2);
  const [syarat, setSyarat] = useState(aturan);
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { aturan?: { daftar?: unknown } } | null;
      const a = d?.aturan?.daftar;
      if (Array.isArray(a) && a.length > 0 && a.length <= 8 && a.every((x) => typeof x === "string" && x.length <= 120)) setSyarat(a as string[]);
    } catch {}
  }, []);
  const tersedia = kategoriTersedia(paket);
  const aktifSemua = paket.filter((p) => p.aktif !== false);
  const [kategori, setKategori] = useState<"anak" | "dewasa">(tersedia[0] ?? "anak");
  const [paketId, setPaketId] = useState(() => aktifSemua.find((p) => p.kategori === (tersedia[0] ?? "anak"))?.id ?? "");
  const [nama, setNama] = useState("");
  const [usia, setUsia] = useState("");
  const [namaOrtu, setNamaOrtu] = useState("");
  const [noWa, setNoWa] = useState("");
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [promoAktif, setPromoAktif] = useState<Promo | null>(null);
  const [pesanPromo, setPesanPromo] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState<Galat>({});
  const [pesan, setPesan] = useState("");
  const [hasil, setHasil] = useState<{ kode: string; total: number } | null>(null);
  const [sibuk, mulai] = useTransition();

  const daftarPaket = aktifSemua.filter((p) => p.kategori === kategori);
  const terpilih = daftarPaket.find((p) => p.id === paketId) ?? daftarPaket[0];
  const rincian = hitungTotal(terpilih?.harga ?? 0, promoAktif);

  const bersihkan = (k: keyof Galat) => setGalat((g) => ({ ...g, [k]: undefined }));

  function ganti(k: "anak" | "dewasa") {
    setKategori(k);
    setPaketId(aktifSemua.find((p) => p.kategori === k)?.id ?? "");
    setGalat({});
  }

  function pakaiPromo() {
    if (kode.trim() === "") { setPromoAktif(null); setPesanPromo(""); return; }
    mulai(async () => {
      const p = promoServer ? await cekKodePromo(slug, kode) : cariPromo(kode, promo);
      setPromoAktif(p);
      setPesanPromo(p ? "Kode dipakai." : "Kode tidak ditemukan atau sudah tidak berlaku.");
    });
  }

  function kirim() {
    setPesan("");
    mulai(async () => {
      const r = await kirimPendaftaran(slug, {
        slotId: slot.id, tanggal: slot.tanggal, paketId: terpilih?.id ?? "", kategori, nama,
        usia: usia ? Number(usia) : undefined, namaOrtu, noWa, email,
        kodePromo: promoAktif?.kode, setuju,
      });
      if (r.ok) {
        setHasil({ kode: r.kode, total: r.total });
        try {
          const lama = JSON.parse(localStorage.getItem("kk-pendaftaran-saya") ?? "[]") as unknown[];
          localStorage.setItem("kk-pendaftaran-saya", JSON.stringify([...lama.slice(-9), { kode: r.kode, nama: nama.trim().split(" ")[0] ?? nama, slot: `${slot.hari} ${slot.jam}`, total: r.total }]));
        } catch {}
      }
      else { setGalat(r.galat); setPesan(r.pesan ?? ""); }
    });
  }

  if (hasil) {
    return (
      <div className="shell">
        <main className="scroll" style={{ paddingTop: 28 }}>
          <div className="hrow"><span className="circ" style={{ background: "var(--accent)", color: "#fff", boxShadow: "var(--accent-glow)" }}><Icon name="check" /></span><div className="t" /><ThemeToggle /></div>
          <div className="grp">
            <h1 className="title">Pendaftaran terkirim</h1>
            <p className="label" style={{ margin: 0 }}>Menunggu ACC dari pemilik. Kamu akan dihubungi lewat WhatsApp.</p>
          </div>
          <div className="surface">
            <div className="item"><span className="sub grow">Kode pendaftaran</span><b style={{ letterSpacing: "0.08em" }}>{hasil.kode}</b></div>
            <div className="item"><span className="sub grow">Slot</span><span>{slot.hari} {slot.jam}</span></div>
            <div className="item"><span className="sub grow">Total</span><b>{rp(hasil.total)}</b></div>
          </div>
          <p className="meta" style={{ margin: 0 }}>Simpan kode ini. Transfer lalu kirim bukti bayar supaya pendaftaranmu bisa di-ACC.</p>
          <Link href={`/u/${slug}/bayar?kode=${hasil.kode}`} className="btn">Bayar dan kirim bukti</Link>
          <Link href={`/u/${slug}/status`} className="btn btn-2">Cek status pendaftaran</Link>
          <Link href={`/u/${slug}/slot`} className="btn btn-2">Kembali ke slot</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <div className="hrow">
          {langkah === 3
            ? <button type="button" className="circ" onClick={() => setLangkah(2)} aria-label="Kembali"><Icon name="back" /></button>
            : <Link href={`/u/${slug}/slot`} className="circ" aria-label="Kembali ke slot"><Icon name="back" /></Link>}
          <div className="t label">Pendaftaran · {langkah} dari 3</div>
          <ThemeToggle />
        </div>
        <div className="bar"><i style={{ width: `${(langkah / 3) * 100}%` }} /></div>

        <div className="surface">
          <div className="item">
            <span className="time" style={{ width: "auto" }}>{slot.jam}</span>
            <div className="grow"><div className="name">{slot.nama}</div><div className="meta">{slot.hari} · {slot.pengajar}</div></div>
            <Link href={`/u/${slug}/slot`} className="link">Ganti</Link>
          </div>
        </div>

        {langkah === 2 ? (
          <>
            <h1 className="title">Pilih paket</h1>
            {tersedia.length > 1 && (
              <div className="seg">
                <button type="button" className={kategori === "anak" ? "on" : ""} onClick={() => ganti("anak")}>Anak</button>
                <button type="button" className={kategori === "dewasa" ? "on" : ""} onClick={() => ganti("dewasa")}>Dewasa</button>
              </div>
            )}
            <div className="grp" role="radiogroup" aria-label="Paket">
              {daftarPaket.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={p.id === terpilih?.id} className={p.id === terpilih?.id ? "opt on" : "opt"} onClick={() => setPaketId(p.id)}>
                  <span className="radio" />
                  <span className="grow" style={{ textAlign: "left" }}><span className="name" style={{ display: "block" }}>{p.nama}</span><span className="meta">{p.catatan}</span></span>
                  <b>{rp(p.harga)}</b>
                </button>
              ))}
            </div>
            {galat.paketId && <p className="galat">{galat.paketId}</p>}
            <button type="button" className="btn" onClick={() => setLangkah(3)}>Lanjut, isi data</button>
          </>
        ) : (
          <>
            <h1 className="title">{kategori === "anak" ? "Data anak" : "Data kamu"}</h1>
            <div className="grp">
              <Field label={kategori === "anak" ? "Nama anak" : "Nama lengkap"} galat={galat.nama}>
                <input value={nama} onChange={(e) => { setNama(e.target.value); bersihkan("nama"); }} autoComplete="name" />
              </Field>
              {kategori === "anak" && (
                <>
                  <Field label="Usia anak" galat={galat.usia}>
                    <input value={usia} onChange={(e) => { setUsia(e.target.value.replace(/\D/g, "")); bersihkan("usia"); }} inputMode="numeric" maxLength={2} />
                  </Field>
                  <Field label="Nama orang tua" galat={galat.namaOrtu}>
                    <input value={namaOrtu} onChange={(e) => { setNamaOrtu(e.target.value); bersihkan("namaOrtu"); }} />
                  </Field>
                </>
              )}
              <Field label={kategori === "anak" ? "WhatsApp orang tua" : "Nomor WhatsApp"} galat={galat.noWa}>
                <input value={noWa} onChange={(e) => { setNoWa(e.target.value); bersihkan("noWa"); }} inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" />
              </Field>
              <Field label="Email (opsional)" galat={galat.email}>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); bersihkan("email"); }} inputMode="email" autoComplete="email" placeholder="untuk konfirmasi lewat email" maxLength={130} />
              </Field>
              <Field label="Kode promo atau referral (opsional)" galat={undefined}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={kode} onChange={(e) => setKode(e.target.value)} style={{ flex: 1, textTransform: "uppercase" }} />
                  <button type="button" className="btn btn-2 btn-sm" style={{ height: 46 }} onClick={pakaiPromo}>Pakai</button>
                </div>
                {pesanPromo && <span className="meta" role="status">{pesanPromo}</span>}
              </Field>
            </div>

            <div className="surface" style={{ padding: 16 }}>
              <div className="sum"><span className="sub">{terpilih?.nama}</span><span>{rp(rincian.harga)}</span></div>
              {rincian.potongan > 0 && <div className="sum"><span className="sub">Promo {promoAktif?.kode}</span><span style={{ color: "var(--accent-text)" }}>−{rp(rincian.potongan)}</span></div>}
              <div className="sum total"><b>Total</b><b>{rp(rincian.total)}</b></div>
            </div>

            <div className="grp">
              <span className="label" style={{ color: "var(--text-2)" }}>Syarat dan ketentuan</span>
              <ul className="aturan">{syarat.map((a) => <li key={a}>{a}</li>)}</ul>
              <label className="cek">
                <input type="checkbox" checked={setuju} onChange={(e) => { setSetuju(e.target.checked); bersihkan("setuju"); }} />
                <span>Saya sudah baca dan setuju dengan syarat dan ketentuan di atas.</span>
              </label>
              {galat.setuju && <p className="galat">{galat.setuju}</p>}
            </div>

            {(pesan || galat.slotId) && <p className="galat" role="alert">{pesan || galat.slotId}</p>}
            <button type="button" className="btn" disabled={sibuk} onClick={kirim}>{sibuk ? "Mengirim…" : "Kirim pendaftaran"}</button>
          </>
        )}
      </main>
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
