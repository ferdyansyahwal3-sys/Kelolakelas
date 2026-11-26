import { LogoK } from "@/components/LogoK";
import { Icon } from "./Icon";

/** Panel samping halaman masuk dan buat akun (laptop): warna mengikuti tema aplikasi, kaca dipertahankan. Dekoratif, disembunyikan dari pembaca layar. */
export function PanelAuth({ admin = false }: { admin?: boolean }) {
  return (
    <aside className="auth-side" aria-hidden="true">
      <div className="vs-mesh"><i /><i /><i /></div>
      <div className="auth-logo"><LogoK className="auth-tanda" />KelolaKelas</div>
      {admin ? (
        <div className="vs-scene ap-scene">
          <div className="ap-kartu ap-besar">
            <span className="ap-k">Pendapatan bulanan</span>
            <b className="ap-angka">Rp 12<i>.480.000</i></b>
            <svg className="ap-garis" viewBox="0 0 240 64" preserveAspectRatio="none"><path className="ap-area" d="M0 52 C30 48 44 38 70 40 S120 22 150 26 S205 8 240 6 V64 H0Z" /><path className="ap-tepi" d="M0 52 C30 48 44 38 70 40 S120 22 150 26 S205 8 240 6" /></svg>
          </div>
          <div className="ap-baris">
            <div className="ap-kartu"><span className="ap-k">Usaha aktif</span><b className="ap-angka">128</b><span className="ap-naik">+9 bulan ini</span></div>
            <div className="ap-kartu"><span className="ap-k">Jatuh tempo</span><b className="ap-angka">3</b><span className="ap-naik ap-awas">perlu ditagih</span></div>
          </div>
          <div className="ap-kartu ap-daftar">
            <div className="ap-r"><i className="ap-dot" /><span>Aktivasi manual berhasil</span><em>2 mnt</em></div>
            <div className="ap-r"><i className="ap-dot" /><span>Usaha baru mulai trial</span><em>1 jam</em></div>
            <div className="ap-r"><i className="ap-dot" /><span>Promo dipakai</span><em>3 jam</em></div>
          </div>
        </div>
      ) : (
      <div className="vs-scene">
        <span className="vs-ring r1" /><span className="vs-ring r2" />
        <span className="vs-bola b1" /><span className="vs-bola b2" /><span className="vs-bola b3" />
        <div className="vs-ob vs-app">
          <span className="k">{admin ? "Pendapatan platform" : "Pemasukan November"}</span>
          <b>Rp 4.350<i>.000</i></b>
          <div className="vs-bars"><i style={{ height: "34%" }} /><i style={{ height: "48%" }} /><i style={{ height: "42%" }} /><i style={{ height: "62%" }} /><i style={{ height: "56%" }} /><i className="on" style={{ height: "90%" }} /></div>
        </div>
        <div className="vs-ob vs-tile t-cal"><Icon name="cal" /></div>
        <div className="vs-ob vs-tile t-ok"><Icon name="check" /></div>
        <div className="vs-ob vs-koin"><i /></div>
        <div className="vs-ob vs-chip"><span className="dot" />{admin ? "3 usaha jatuh tempo" : "2 menunggu ACC"}</div>
      </div>
      )}
      <div className="vs-bawah">
        <span className="vs-pil"><span className="dot" />{admin ? "Ruang kendali pemilik" : "Untuk pelatih dan pemilik kelas"}</span>
        {admin ? (
          <>
            <div className="vs-judul">
              <span>Semua usaha, <em>satu layar.</em></span>
              <span>Tagihan dan promo <em>terpantau.</em></span>
              <span>Kamu tinggal <em>memutuskan.</em></span>
            </div>
            <div className="vs-langkah">
              <div className="vs-lk"><b>1</b><span>Pantau usaha, trial, dan jatuh tempo</span></div>
              <div className="vs-lk"><b>2</b><span>Aktivasi manual dan tandai lunas</span></div>
              <div className="vs-lk"><b>3</b><span>Atur promo, semua tercatat di audit</span></div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </aside>
  );
}
