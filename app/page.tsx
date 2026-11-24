import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { FaqAkordeon } from "@/components/situs/FaqAkordeon";
import { FiturGrid, type Fitur } from "@/components/situs/FiturGrid";
import { HargaPaket } from "@/components/situs/HargaPaket";
import { JsonLd } from "@/components/situs/JsonLd";
import { NotifikasiPembelian } from "@/components/situs/NotifikasiPembelian";
import { HeroPonsel } from "@/components/situs/HeroPonsel";
import { PreviewApp } from "@/components/situs/PreviewApp";
import { PromoChip } from "@/components/situs/PromoChip";
import { PromoStrip } from "@/components/situs/PromoStrip";
import { RevealRoot } from "@/components/situs/Reveal";
import { SitusFooter } from "@/components/situs/SitusFooter";
import { SitusNav } from "@/components/situs/SitusNav";
import { ambilKejadianNyata, kejadianContoh, pilihKejadian } from "@/lib/buktiSosial";
import { TRIAL_HARI } from "@/lib/paketLangganan";
import { FAQ_LANDING, konfigUntukHalaman } from "@/lib/situs";

// Hitung mundur dan notifikasi bergantung pada waktu sekarang, jadi halaman dirender tiap permintaan.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KelolaKelas · Jadwal, kuota, dan tagihan les dalam satu link",
  description: `Aplikasi untuk pelatih dan pengajar les: murid daftar, pilih slot, bayar, dan unggah bukti sendiri lewat satu link. Coba gratis ${TRIAL_HARI} hari tanpa kartu.`,
  alternates: { canonical: "/" },
  openGraph: { title: "KelolaKelas", description: "Jadwal, kuota, pendaftaran, dan tagihan les dalam satu link.", type: "website", locale: "id_ID" },
};

const MASALAH = [
  { n: "01", ikon: "cal", judul: "Jadwal berantakan di WhatsApp", isi: "Murid tanya jam kosong lewat chat, kamu cek catatan, lalu balas satu per satu. Jam kosong sebenarnya cuma ada di kepalamu." },
  { n: "02", ikon: "users", judul: "Kuota tidak jelas", isi: "Kelas grup kelebihan murid, atau slot privat bentrok karena ada yang lupa dicatat." },
  { n: "03", ikon: "bill", judul: "Lupa siapa yang sudah bayar", isi: "Bukti transfer tercecer di chat, sisa sesi dihitung manual, dan akhir bulan bingung rekapnya." },
];

const BANDING = [
  { k: "Cari jam kosong", lama: "Balas chat satu per satu, cek catatan", baru: "Murid lihat slot kosong sendiri di satu link" },
  { k: "Pembayaran", lama: "Bukti transfer tercecer di chat", baru: "Murid unggah bukti, masuk ke daftar ACC" },
  { k: "Sisa sesi dan rekap", lama: "Dicatat di buku dan dijumlahkan sendiri", baru: "Sisa sesi dipotong otomatis, rekap siap dilihat" },
];

const FITUR: Fitur[] = [
  { ikon: "link", judul: "Halaman usaha dan link pendaftaran", isi: "Satu link berisi pelatih, paket, harga, aturan sesi, dan slot kosong. Bagikan ke grup atau bio." },
  { ikon: "cal", judul: "Slot dan kuota otomatis", isi: "Sisa tempat dihitung dari kuota, jadi status Tersedia, Sisa, dan Penuh selalu benar." },
  { ikon: "inbox", judul: "Pendaftaran, bukti bayar, dan ACC", isi: "Murid daftar, bayar ke rekeningmu, dan unggah bukti. Kamu cek dan ACC dari satu daftar." },
  { ikon: "users", judul: "Murid dan portal pribadi", isi: "Setiap murid mendapat link pribadi untuk melihat sisa sesi, jadwal, dan pemberitahuan, tanpa akun." },
  { ikon: "check", judul: "Absensi dan sesi pengganti", isi: "Hadir, izin, alpa dengan satu ketukan. Izin bisa diganti jadwal pengganti sesuai aturan yang kamu atur." },
  { ikon: "bill", judul: "Tagihan dan rekap pemasukan", isi: "Tagihan per murid, rekap per bulan, paket, dan pengajar, siap diekspor ke CSV." },
  { ikon: "tag", judul: "Paket dan promo", isi: "Atur paket (jumlah sesi, masa berlaku, harga), kode promo, dan referral." },
  { ikon: "coach", judul: "Banyak pelatih dan bagi hasil", isi: "Undang pelatih, tiap pelatih punya halaman jadwalnya sendiri, gaji dihitung dari pembayaran murid.", tim: true },
  { ikon: "arrow", judul: "Ganti pelatih dan tukar jadwal", isi: "Pelatih mengajukan, kamu setujui atau tolak, dan pemberitahuan terkirim ke yang terkait.", tim: true },
  { ikon: "bell", judul: "Pemberitahuan ke murid", isi: "Kirim kabar ke semua murid atau hanya satu sesi, tampil di portal murid." },
  { ikon: "chart", judul: "Ringkasan Pagi", isi: "Setiap pagi: berapa sesi, murid, bukti bayar yang perlu dicek, dan kelas yang hampir penuh." },
  { ikon: "doc", judul: "Ekspor data kapan saja", isi: "Data murid dan tagihan milikmu bisa diekspor ke CSV, tidak mengunci." },
];

const COCOK = [
  "Kamu pelatih atau pengajar yang mengatur jadwal dan tagihan sendiri",
  "Usahamu renang, yoga, pilates, gym PT, badminton, tenis, bela diri, musik, bimbel, atau tari",
  "Murid sering bertanya jam kosong lewat WhatsApp",
  "Kamu punya tim pelatih dan butuh jadwal serta bagi hasil yang jelas",
];
const BUKAN = [
  "Kamu menyewakan lapangan atau ruangan per jam",
  "Usahamu memakai sistem membership bulanan tanpa kuota sesi",
  "Kamu butuh kasir toko atau stok barang",
  "Kamu mencari aplikasi yang menahan dan menyalurkan uang les (uang murid langsung ke rekeningmu)",
];

const JAMINAN = [
  { ikon: "doc", judul: "Data tetap milikmu", isi: "Ekspor data murid dan tagihan ke CSV kapan saja. Tidak ada penguncian." },
  { ikon: "bill", judul: "Uang les tidak kami tahan", isi: "Murid transfer langsung ke rekeningmu. KelolaKelas hanya mencatat dan memeriksa bukti." },
  { ikon: "bell", judul: "Berhenti tanpa mendadak", isi: "Kalau langganan berakhir ada masa tenggang 7 hari, lalu 30 hari hanya lihat dan ekspor." },
  { ikon: "users", judul: "Data anak dijaga", isi: "Data murid dibatasi seperlunya. Detailnya ada di Kebijakan Privasi." },
];

export default function Landing({ searchParams }: { searchParams: { promo?: string } }) {
  const dev = process.env.NODE_ENV !== "production";
  const awalMs = Date.now();
  const konfig = konfigUntukHalaman(searchParams.promo, awalMs, dev);
  const sosial = pilihKejadian(ambilKejadianNyata(), kejadianContoh(awalMs), dev, awalMs);

  return (
    <div className="situs s-landing">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "KelolaKelas", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "Aplikasi jadwal, kuota, pendaftaran, dan tagihan untuk pelatih dan pengajar les." }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ_LANDING.map((x) => ({ "@type": "Question", name: x.t, acceptedAnswer: { "@type": "Answer", text: x.j } })) }} />
      <RevealRoot />
      <div className="s-progres" aria-hidden="true" />
      <SitusNav landing promo={<PromoChip konfig={konfig} awalMs={awalMs} />} />

      <main>
        <section className="s-hero" aria-labelledby="judul-utama">
          <div className="s-hero-bg" aria-hidden="true"><i className="s-orb s-orb-1" /><i className="s-orb s-orb-2" /><i className="s-garis-bg" /></div>
          <div className="s-wrap s-hero-grid">
            <div className="s-hero-teks">
              <h1 id="judul-utama" className="s-judul">
                <span className="s-baris" style={{ animationDelay: "0.12s" }}>Murid daftar, bayar, dan pilih jadwal sendiri.</span>
                <span className="s-baris redup" style={{ animationDelay: "0.26s" }}>Kamu tinggal ACC.</span>
              </h1>
              <p className="s-lead s-pop" style={{ animationDelay: "0.42s" }}>
                KelolaKelas merapikan jadwal, kuota, bukti bayar, dan absensi les kamu dalam satu link, jadi kamu bisa fokus mengajar, bukan membalas chat.
              </p>
              <div className="s-cta s-pop" style={{ animationDelay: "0.6s" }}>
                <Link href="/daftar-usaha" className="btn s-kilau">Coba gratis {TRIAL_HARI} hari <Icon name="arrow" className="ic" /></Link>
                <a href="#harga" className="btn btn-2">Lihat paket dan harga</a>
              </div>
            </div>
            <HeroPonsel />
          </div>
        </section>

        <div className="s-pembatas" />

        <section className="s-bagian" aria-labelledby="masalah">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />Masalahnya</span>
              <h2 id="masalah" className="s-h2">Kenapa Ngatur Les<br /><span className="s-aksen">Sering Bikin Capek?</span></h2>
              <p className="s-p">Bukan karena kamu kurang rapi. Tapi jadwal, kuota, dan pembayaran tersebar di chat, buku, dan kepala.</p>
            </div>
            <div className="s-3">
              {MASALAH.map((m, i) => (
                <article key={m.n} className="surface s-kartu s-hover s-masalah" data-reveal data-delay={i + 1}>
                  <span className="s-besar-no">{m.n}</span>
                  <span className="s-ikon"><Icon name={m.ikon} /></span>
                  <h3>{m.judul}</h3>
                  <p>{m.isi}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="s-pembatas" />

        <section className="s-bagian" aria-labelledby="jujur">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />Jujur dulu</span>
              <h2 id="jujur" className="s-h2">KelolaKelas vs<br /><span className="s-aksen">WhatsApp dan Buku Catatan</span></h2>
              <p className="s-p">WhatsApp dan buku itu gratis dan fleksibel. Tapi ada harga yang dibayar dengan waktu dan ketelitian. Bandingkan sendiri.</p>
            </div>
            <div className="s-banding">
              {BANDING.map((b, i) => (
                <div key={b.k} className="surface s-banding-baris" data-reveal data-delay={(i % 3) + 1}>
                  <span className="s-label">{b.k}</span>
                  <div className="s-banding-dua">
                    <div className="s-lama"><span className="s-label">WA / buku</span>{b.lama}</div>
                    <div className="s-baru"><span className="s-label">KelolaKelas</span>{b.baru}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="s-p s-tengah" style={{ fontSize: 13.5, color: "var(--text-3)", maxWidth: 620 }} data-reveal>
              KelolaKelas tidak menahan uang les kamu dan tidak menjamin muridmu bertambah. Pengingat WA otomatis masih dalam pengerjaan; sekarang tersedia tombol kirim WA manual.
            </p>
          </div>
        </section>

        <div className="s-pembatas" />

        <section className="s-bagian" aria-labelledby="solusi">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />Solusi lengkap</span>
              <h2 id="solusi" className="s-h2">Semua yang Dibutuhkan Pelatih<br /><span className="s-aksen">dalam Satu Aplikasi</span></h2>
              <p className="s-p">Dari murid pertama sampai rekap akhir bulan. Fitur bertanda Agensi untuk pemilik yang punya pelatih lain.</p>
            </div>
            <FiturGrid daftar={FITUR} />
          </div>
        </section>

        <div className="s-pembatas" />

        <section id="preview" className="s-bagian" aria-labelledby="lihat">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />Lihat langsung</span>
              <h2 id="lihat" className="s-h2">Coba Sendiri<br /><span className="s-aksen">Tampilan Aplikasinya</span></h2>
              <p className="s-p">Ini tampilan asli panel owner. Pilih tab di atas ponsel, lalu klik, geser, dan ubah apa saja. Datanya contoh, tidak tersimpan.</p>
            </div>
            <PreviewApp />
          </div>
        </section>

        <div className="s-pembatas" />

        <section id="harga" className="s-bagian" aria-labelledby="paket">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />Pilih paket</span>
              <h2 id="paket" className="s-h2">Mulai Murah,<br /><span className="s-aksen">Naik Saat Muridmu Bertambah</span></h2>
              <p className="s-p">Dua jenis pengguna, masing-masing tiga paket. Coba gratis {TRIAL_HARI} hari tanpa kartu.</p>
            </div>
            <div className="s-promo-bungkus" data-reveal><PromoStrip konfig={konfig} awalMs={awalMs} /></div>
            <HargaPaket konfig={konfig} awalMs={awalMs} tanpaBanding />
            <div className="s-tengah"><Link href="/harga" className="link">Bandingkan semua fitur di halaman Harga <Icon name="arrow" className="ic" /></Link></div>
          </div>
        </section>

        <div className="s-pembatas" />

        <section className="s-bagian" aria-labelledby="untuk">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />Untuk siapa?</span>
              <h2 id="untuk" className="s-h2">KelolaKelas Cocok<br /><span className="s-aksen">untuk Kamu?</span></h2>
            </div>
            <div className="s-3 s-2">
              <article className="surface s-kartu s-cocok" data-reveal>
                <h3><span className="s-lencana ya">✓</span>Untuk kamu jika:</h3>
                <ul>{COCOK.map((c) => <li key={c}><Icon name="check" className="ic h-ya" /><span>{c}</span></li>)}</ul>
              </article>
              <article className="surface s-kartu s-cocok" data-reveal data-delay="1">
                <h3><span className="s-lencana tidak">✗</span>Bukan untuk kamu jika:</h3>
                <ul>{BUKAN.map((c) => <li key={c}><span className="s-silang" aria-hidden="true">✗</span><span>{c}</span></li>)}</ul>
              </article>
            </div>
          </div>
        </section>

        <div className="s-pembatas" />

        <section className="s-bagian" aria-labelledby="faq">
          <div className="s-wrap">
            <div className="s-kop s-kop-tengah" data-reveal>
              <span className="pill"><span className="dot" />FAQ</span>
              <h2 id="faq" className="s-h2">Pertanyaan<br /><span className="s-aksen">yang Sering Ditanya</span></h2>
            </div>
            <FaqAkordeon daftar={FAQ_LANDING} />
          </div>
        </section>

        <section className="s-bagian" aria-labelledby="aman" style={{ paddingTop: 0 }}>
          <div className="s-wrap">
            <div className="surface s-jaminan" data-reveal>
              <div className="s-kop"><h2 id="aman" className="s-h2" style={{ fontSize: "clamp(22px, 4vw, 30px)" }}>Aturan main yang jelas</h2><p className="s-p">Beberapa hal yang kami pegang sejak awal.</p></div>
              <div className="s-jaminan-grid">
                {JAMINAN.map((j) => (
                  <div key={j.judul} className="s-jaminan-item"><span className="s-ikon"><Icon name={j.ikon} /></span><div><b>{j.judul}</b><p>{j.isi}</p></div></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="s-akhir-bagian" aria-labelledby="mulai">
          <div className="s-hero-bg" aria-hidden="true"><i className="s-orb s-orb-1" /></div>
          <div className="s-wrap s-akhir-isi">
            <span className="pill" data-reveal><span className="dot" />Mulai hari ini</span>
            <h2 id="mulai" className="s-judul s-tengah" style={{ fontSize: "clamp(28px, 6.4vw, 54px)" }} data-reveal>
              <span className="s-baris-diam">Berhenti catat manual.</span>
              <span className="s-baris-diam redup">Mulai dari satu link.</span>
            </h2>
            <p className="s-lead s-tengah" data-reveal data-delay="1">Daftar, isi jadwal dari template, bagikan link ke murid. Gratis {TRIAL_HARI} hari.</p>
            <div className="s-cta s-tengah" data-reveal data-delay="2">
              <Link href="/daftar-usaha" className="btn s-kilau">Coba gratis {TRIAL_HARI} hari <Icon name="arrow" className="ic" /></Link>
            </div>
            <p className="s-kecil s-tengah" data-reveal data-delay="3">Tanpa kartu kredit · Murid tanpa akun · Data bisa diekspor kapan saja</p>
          </div>
        </section>
      </main>
      <SitusFooter />
      <NotifikasiPembelian daftar={sosial.daftar} contoh={sosial.contoh} />
    </div>
  );
}
