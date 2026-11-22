import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  kode: string;
  judul: string;
  isi: string;
  /** Tombol utama dan (opsional) tombol kedua. `href` memakai Link, `onKlik` memakai tombol (untuk "Coba lagi"). */
  aksi: { label: string; href?: string; onKlik?: () => void; utama?: boolean }[];
}

/** Layar galat satu gaya untuk 404 dan galat tak terduga: kode besar, kalimat jujur, satu jalan keluar. */
export function HalamanGalat({ kode, judul, isi, aksi }: Props) {
  return (
    <div className="shell">
      <main className="scroll galat-layar" id="isi">
        <div className="hrow" style={{ width: "100%" }}><div className="t" /><ThemeToggle /></div>
        <div className="galat-isi">
          <span className="galat-kode" aria-hidden="true">{kode}</span>
          <h1 className="title" style={{ textAlign: "center" }}>{judul}</h1>
          <p className="sub" style={{ margin: 0, textAlign: "center", lineHeight: 1.55, maxWidth: 320 }}>{isi}</p>
          <div className="aksi" style={{ justifyContent: "center" }}>
            {aksi.map((a) => a.href
              ? <Link key={a.label} href={a.href} className={a.utama === false ? "btn btn-2" : "btn"}>{a.label}</Link>
              : <button key={a.label} type="button" className={a.utama === false ? "btn btn-2" : "btn"} onClick={a.onKlik}>{a.label}</button>)}
          </div>
        </div>
      </main>
    </div>
  );
}
