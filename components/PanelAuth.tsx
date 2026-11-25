import { LogoK } from "@/components/LogoK";
import { Icon } from "./Icon";

/** Panel samping halaman masuk dan buat akun (laptop): warna mengikuti tema aplikasi, kaca dipertahankan. Dekoratif, disembunyikan dari pembaca layar. */
export function PanelAuth() {
  return (
    <aside className="auth-side" aria-hidden="true">
      <div className="vs-mesh"><i /><i /><i /></div>
      <div className="auth-logo"><LogoK className="auth-tanda" />KelolaKelas</div>
      <div className="vs-scene">
        <span className="vs-ring r1" /><span className="vs-ring r2" />
        <span className="vs-bola b1" /><span className="vs-bola b2" /><span className="vs-bola b3" />
        <div className="vs-ob vs-app">
          <span className="k">Pemasukan November</span>
          <b>Rp 4.350<i>.000</i></b>
          <div className="vs-bars"><i style={{ height: "34%" }} /><i style={{ height: "48%" }} /><i style={{ height: "42%" }} /><i style={{ height: "62%" }} /><i style={{ height: "56%" }} /><i className="on" style={{ height: "90%" }} /></div>
        </div>
        <div className="vs-ob vs-tile t-cal"><Icon name="cal" /></div>
        <div className="vs-ob vs-tile t-ok"><Icon name="check" /></div>
        <div className="vs-ob vs-koin"><i /></div>
        <div className="vs-ob vs-chip"><span className="dot" />2 menunggu ACC</div>
      </div>
      <div className="vs-bawah">
        <span className="vs-pil"><span className="dot" />Untuk pelatih dan pemilik kelas</span>
        <div className="vs-judul">
          <span>Kelola kelas, <em>tanpa ribet.</em></span>
          <span>Jadwal dan kuota <em>terhitung sendiri.</em></span>
          <span>Kamu tinggal <em>ACC.</em></span>
        </div>
        <div className="vs-langkah">
          <div className="vs-lk"><b>1</b><span>Murid daftar dan bayar lewat satu link</span></div>
          <div className="vs-lk"><b>2</b><span>Slot dan kuota terisi otomatis</span></div>
          <div className="vs-lk"><b>3</b><span>Cek bukti bayar, lalu ACC</span></div>
        </div>
      </div>
    </aside>
  );
}
