import { Icon } from "@/components/Icon";

/** Cuplikan tampilan aplikasi dalam satu tema. Atribut data-theme di sini memaksa token tema itu untuk isinya, terlepas dari tema halaman. */
export function PonselContoh({ tema }: { tema: "gelap" | "terang" }) {
  return (
    <div className="s-ponsel" data-theme={tema} aria-hidden="true">
      <div className="s-ponsel-isi">
        <div className="hrow">
          <span className="avatar s">IL</span>
          <div className="t"><div className="hi">Halo, <b>Ilham</b></div></div>
          <span className="circ" style={{ width: 34, height: 34 }}><Icon name="bell" /><span className="badge" /></span>
        </div>
        <span className="pill" style={{ alignSelf: "flex-start" }}><span className="dot" />2 bukti perlu dicek</span>
        <div className="surface" style={{ padding: "14px 16px" }}>
          <span className="meta">Pemasukan bulan ini</span>
          <div className="big">Rp 4.350<span className="dim">.000</span></div>
        </div>
        <div className="surface">
          <div className="item"><span className="time" style={{ width: 40 }}>08.30</span><div className="grow"><div className="name">Kelas Anak A</div><span className="meta">Kolam utama</span></div><span className="st st-few">Sisa 2</span></div>
          <div className="item"><span className="time" style={{ width: 40 }}>10.00</span><div className="grow"><div className="name">Privat Dewasa</div><span className="meta">Kolam kecil</span></div><span className="st st-full">Penuh</span></div>
          <div className="item"><span className="time" style={{ width: 40 }}>16.00</span><div className="grow"><div className="name">Kelas Anak B</div><span className="meta">Kolam utama</span></div><span className="st st-free">Tersedia</span></div>
        </div>
      </div>
    </div>
  );
}
