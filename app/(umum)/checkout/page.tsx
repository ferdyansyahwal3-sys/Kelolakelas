import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SitusFooter } from "@/components/situs/SitusFooter";
import { SitusNav } from "@/components/situs/SitusNav";
import { JENIS, PAKET, TRIAL_HARI, adalahPlan, fasePromo, hargaPeriode, persenHemat, rupiah, singkatRupiah } from "@/lib/paketLangganan";
import { konfigUntukHalaman } from "@/lib/situs";

// Harga bergantung pada jadwal promo (waktu sekarang), jadi dirender tiap permintaan. Halaman transaksi tidak diindeks.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout · KelolaKelas", robots: { index: false } };

type Periode = "bulanan" | "tahunan";

/**
 * Ringkasan pesanan sebelum membuat akun. Pembayaran sendiri dilakukan di panel (menu Langganan) setelah akun dan usaha dibuat,
 * jadi halaman ini hanya merangkum paket dan total, lalu meneruskan ke pendaftaran usaha.
 */
export default function Checkout({ searchParams }: { searchParams: { paket?: string; periode?: string; promo?: string } }) {
  if (!adalahPlan(searchParams.paket)) redirect("/harga");
  const key = searchParams.paket;
  const periode: Periode = searchParams.periode === "tahunan" ? "tahunan" : "bulanan";
  const dev = process.env.NODE_ENV !== "production";
  const sekarang = Date.now();
  const konfig = konfigUntukHalaman(searchParams.promo, sekarang, dev);
  const p = PAKET[key];
  const h = hargaPeriode(key, periode, sekarang, konfig);
  const promo = fasePromo(sekarang, konfig).aktif && h.promo;
  const dev2 = searchParams.promo && dev ? `&promo=${searchParams.promo}` : "";
  const ke = (per: Periode) => `/checkout?paket=${key}&periode=${per}${dev2}`;

  return (
    <div className="situs">
      <SitusNav />
      <main>
        <section className="s-bagian" style={{ paddingTop: 40 }}>
          <div className="s-wrap">
            <div className="s-kop">
              <h1 className="s-judul" style={{ fontSize: "clamp(26px, 5vw, 42px)" }}>Checkout</h1>
              <p className="s-lead">Cek paket dan totalnya, lalu lanjut membuat akun.</p>
            </div>

            <div className="co-grid">
              <section className="surface co-kartu" aria-labelledby="co-ringkas">
                <h2 id="co-ringkas" className="co-judul">Ringkasan pesanan</h2>
                <div className="co-paket">
                  <div><b>{p.nama}</b><span>{JENIS[p.jenis].nama}</span></div>
                  <Link href={`/harga?jenis=${p.jenis}`} className="meta" style={{ color: "var(--accent-text)", fontWeight: 600 }}>Ganti paket</Link>
                </div>
                <div className="seg h-seg" role="group" aria-label="Periode bayar">
                  <Link href={ke("bulanan")} className={periode === "bulanan" ? "on" : ""} aria-current={periode === "bulanan" ? "true" : undefined}>Bulanan</Link>
                  <Link href={ke("tahunan")} className={periode === "tahunan" ? "on" : ""} aria-current={periode === "tahunan" ? "true" : undefined}>Tahunan</Link>
                </div>
                <div className="co-baris">
                  <span>{periode === "tahunan" ? "Paket 12 bulan (bayar 10)" : "Paket 1 bulan"}</span>
                  <span>
                    {promo && <s className="co-coret">{rupiah(h.normalTotal)}</s>}
                    {rupiah(h.total)}
                  </span>
                </div>
                {promo && <div className="co-baris"><span>Hemat promo</span><span>{persenHemat(key)}%</span></div>}
                <div className="co-baris co-total">
                  <span>Total</span>
                  <span><b>{rupiah(h.total)}</b>{periode === "tahunan" && <span className="meta"> · setara {singkatRupiah(Math.round(h.total / 12))}/bulan</span>}</span>
                </div>
                <ul className="h-list" style={{ marginTop: 0 }}>
                  {p.sorotan.map((s) => <li key={s}><Icon name="check" className="ic h-ya" /><span>{s}</span></li>)}
                </ul>
              </section>

              <section className="surface co-kartu" aria-labelledby="co-lanjut">
                <h2 id="co-lanjut" className="co-judul">Langkah berikutnya</h2>
                <ol className="co-langkah">
                  <li><div><b>Buat akun dan usaha</b>Sekitar 5 menit: nama usaha, kategori, dan tampilan.</div></li>
                  <li><div><b>Bayar di panel</b>Tagihan dibuat dari menu Langganan di panel kamu.</div></li>
                  <li><div><b>Bagikan link ke murid</b>Murid daftar, bayar, dan pilih jadwal sendiri.</div></li>
                </ol>
                <Link href={`/daftar-usaha?jenis=${p.jenis}&paket=${key}&periode=${periode}&bayar=1`} className="btn co-cta">Lanjut buat akun <Icon name="arrow" className="ic" /></Link>
                <p className="co-catatan">Total di atas memakai harga yang berlaku sekarang. Tagihan dibuat di panel dan memakai harga yang berlaku saat tagihan itu dibuat. Harga coret adalah harga normal yang berlaku di luar jendela promo.</p>
                <p className="co-tautan">Belum siap bayar? <Link href={`/daftar-usaha?jenis=${p.jenis}&paket=${key}`}>Coba gratis {TRIAL_HARI} hari dulu</Link></p>
              </section>
            </div>
          </div>
        </section>
      </main>
      <SitusFooter />
    </div>
  );
}
