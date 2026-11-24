import type { Metadata } from "next";
import Link from "next/link";
import { FaqAkordeon } from "@/components/situs/FaqAkordeon";
import { PromoChip } from "@/components/situs/PromoChip";
import { RevealRoot } from "@/components/situs/Reveal";
import { HargaPaket } from "@/components/situs/HargaPaket";
import { JsonLd } from "@/components/situs/JsonLd";
import { NotifikasiPembelian } from "@/components/situs/NotifikasiPembelian";
import { PromoStrip } from "@/components/situs/PromoStrip";
import { SitusFooter } from "@/components/situs/SitusFooter";
import { SitusNav } from "@/components/situs/SitusNav";
import { ambilKejadianNyata, kejadianContoh, pilihKejadian } from "@/lib/buktiSosial";
import { INTI, PAKET, SEMUA_PLAN, TRIAL_HARI, adalahJenis } from "@/lib/paketLangganan";
import { FAQ_HARGA, konfigUntukHalaman } from "@/lib/situs";

// Harga, hitung mundur, dan notifikasi bergantung pada waktu sekarang, jadi halaman dirender tiap permintaan.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Harga · KelolaKelas",
  description: `Dua jenis paket: Guru Les untuk pelatih tunggal dan Agensi/Club untuk banyak pelatih. Coba gratis ${TRIAL_HARI} hari tanpa kartu. Bayar tahunan gratis 2 bulan.`,
  alternates: { canonical: "/harga" },
};

export default function Harga({ searchParams }: { searchParams: { promo?: string; jenis?: string } }) {
  const dev = process.env.NODE_ENV !== "production";
  const awalMs = Date.now();
  const konfig = konfigUntukHalaman(searchParams.promo, awalMs, dev);
  const sosial = pilihKejadian(ambilKejadianNyata(), kejadianContoh(awalMs), dev, awalMs);
  const jenisAwal = adalahJenis(searchParams.jenis) ? searchParams.jenis : "guru_les";

  return (
    <div className="situs">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "SoftwareApplication", name: "KelolaKelas", applicationCategory: "BusinessApplication", operatingSystem: "Web",
        description: "Aplikasi jadwal, kuota, pendaftaran, dan tagihan untuk pelatih dan pengajar les.",
        offers: SEMUA_PLAN.map((k) => ({ "@type": "Offer", name: `${k.startsWith("guru") ? "Guru Les" : "Agensi/Club"} ${PAKET[k].nama}`, price: PAKET[k].hargaNormal, priceCurrency: "IDR" })),
      }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ_HARGA.map((x) => ({ "@type": "Question", name: x.t, acceptedAnswer: { "@type": "Answer", text: x.j } })) }} />
      <RevealRoot />
      <div className="s-progres" aria-hidden="true" />
      <SitusNav aktif="harga" promo={<PromoChip konfig={konfig} awalMs={awalMs} />} />
      <main>
        <section className="h-kepala s-wrap">
          <div className="s-kop">
            <span className="pill"><span className="dot" />Coba gratis {TRIAL_HARI} hari, tanpa kartu</span>
            <h1 className="s-judul" style={{ fontSize: "clamp(26px, 5vw, 46px)" }}>Pilih paket yang <span className="redup">pas dengan usahamu</span></h1>
            <p className="s-lead">Dua jenis pengguna, masing-masing tiga paket. Mulai dari yang kecil, naik kapan saja dan datamu ikut.</p>
          </div>
        </section>

        <section className="s-bagian" style={{ paddingTop: 28 }}>
          <div className="s-wrap">
            <div className="s-promo-bungkus"><PromoStrip konfig={konfig} awalMs={awalMs} /></div>
            <HargaPaket konfig={konfig} awalMs={awalMs} jenisAwal={jenisAwal} />
            <p className="h-catatan">Harga coret adalah harga normal yang benar-benar berlaku di luar jendela promo. Jadwal promo sama untuk semua orang. Perubahan harga tidak berlaku untuk periode yang sudah dibayar. Fitur bertanda &ldquo;segera hadir&rdquo; sedang dikerjakan.</p>
          </div>
        </section>

        <section className="s-bagian" style={{ paddingTop: 0 }}>
          <div className="s-wrap">
            <div className="s-kop"><h2 className="s-h2">Ada di semua paket</h2></div>
            <div className="surface s-kartu"><ul className="h-list" style={{ borderTop: 0, paddingTop: 0, marginTop: 0, display: "grid", gap: 9 }}>
              {INTI.map((x) => <li key={x}><span className="h-ya" aria-hidden="true">✓</span><span>{x}</span></li>)}
            </ul></div>
          </div>
        </section>

        <section className="s-bagian" style={{ paddingTop: 0 }} aria-labelledby="faq-harga">
          <div className="s-wrap">
            <div className="s-kop"><h2 id="faq-harga" className="s-h2">Pertanyaan soal harga</h2></div>
            <FaqAkordeon daftar={FAQ_HARGA} />
          </div>
        </section>

        <section className="s-bagian" style={{ paddingTop: 0 }}>
          <div className="s-wrap">
            <div className="surface s-akhir">
              <h2 className="s-h2">Coba dulu {TRIAL_HARI} hari, baru putuskan</h2>
              <p className="s-p">Tanpa kartu kredit. Isi jadwal dalam hitungan menit.</p>
              <div className="s-cta" style={{ justifyContent: "center", marginTop: 0 }}>
                <Link href="/daftar-usaha" className="btn">Coba gratis {TRIAL_HARI} hari</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SitusFooter />
      <NotifikasiPembelian daftar={sosial.daftar} contoh={sosial.contoh} />
    </div>
  );
}
