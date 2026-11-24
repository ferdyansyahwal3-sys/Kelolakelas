import Link from "next/link";

export function SitusFooter() {
  return (
    <footer className="s-footer s-wrap">
      <div className="s-footer-atas">
        <div>
          <span className="s-logo"><span className="s-logo-tanda" aria-hidden="true" /><span>KelolaKelas</span></span>
          <p className="meta" style={{ margin: "10px 0 0", maxWidth: 320 }}>Jadwal, kuota, pendaftaran, dan tagihan les dalam satu link, untuk pelatih dan pengajar.</p>
        </div>
        <nav className="s-footer-link" aria-label="Tautan bawah">
          <Link href="/harga">Harga</Link>
          <Link href="/masuk">Masuk</Link>
          <Link href="/daftar-usaha">Daftar usaha</Link>
          <Link href="/privasi">Kebijakan Privasi</Link>
          <Link href="/syarat">Syarat Layanan</Link>
        </nav>
      </div>
      <span className="meta">© {new Date().getFullYear()} KelolaKelas</span>
    </footer>
  );
}
