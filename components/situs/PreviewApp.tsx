"use client";
import { useEffect, useRef, useState } from "react";
import { PonselApp } from "./PonselApp";

const TAB = [
  { id: "beranda", label: "Dashboard", src: "/demo" },
  { id: "pendaftaran", label: "Pendaftaran", src: "/demo/pendaftaran" },
  { id: "jadwal", label: "Jadwal", src: "/demo/jadwal" },
  { id: "sesi", label: "Absensi", src: "/demo/sesi" },
  { id: "tagihan", label: "Tagihan", src: "/demo/tagihan" },
  { id: "rekap", label: "Rekap", src: "/demo/rekap" },
  { id: "pelatih", label: "Halaman pelatih", src: "/demo/pelatih" },
];

/**
 * Tampilan aplikasi owner yang asli (rute /demo, data contoh, tanpa login) di bingkai iPhone. Bisa diklik dan diutak-atik;
 * perubahan hanya tersimpan di browser pengunjung. Banner demo disembunyikan otomatis saat berada di dalam iframe.
 * Tombol tab menampilkan 3 sekaligus, sisanya digulir ke samping.
 */
export function PreviewApp() {
  const [aktif, setAktif] = useState("beranda");
  const [mulai, setMulai] = useState(false);
  const bingkai = useRef<HTMLIFrameElement>(null);
  const wadah = useRef<HTMLDivElement>(null);
  const jalur = useRef<HTMLDivElement>(null);

  // muat iframe hanya saat mendekati layar (hemat data)
  useEffect(() => {
    const el = wadah.current;
    if (!el || typeof IntersectionObserver === "undefined") { setMulai(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setMulai(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // tema halaman ikut ke isi iframe (satu asal-usul, jadi boleh diatur langsung)
  useEffect(() => {
    const samakan = () => {
      const t = document.documentElement.getAttribute("data-theme");
      try { if (t) bingkai.current?.contentDocument?.documentElement.setAttribute("data-theme", t); } catch {}
    };
    const mo = new MutationObserver(samakan);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const f = bingkai.current;
    f?.addEventListener("load", samakan);
    return () => { mo.disconnect(); f?.removeEventListener("load", samakan); };
  }, [mulai]);

  function pilih(id: string, el: HTMLButtonElement) {
    setAktif(id);
    // tab terpilih digulirkan ke tengah jalur (hanya jalur tab, bukan halaman)
    const j = jalur.current;
    if (j) j.scrollTo({ left: el.offsetLeft - (j.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }

  const src = TAB.find((t) => t.id === aktif)!.src;
  return (
    <div className="s-preview">
      <div className="s-tab-bungkus">
        <div className="s-tab" role="tablist" aria-label="Bagian aplikasi yang bisa dicoba" ref={jalur} tabIndex={0}>
          {TAB.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={aktif === t.id} className={aktif === t.id ? "on" : ""} onClick={(e) => pilih(t.id, e.currentTarget)}>{t.label}</button>
          ))}
        </div>
        <span className="s-tab-petunjuk" aria-hidden="true">Geser untuk lihat lainnya ›</span>
      </div>
      <div className="s-preview-ponsel" ref={wadah} data-reveal>
        <PonselApp ref={bingkai} src={mulai ? src : null} judul="Tampilan aplikasi KelolaKelas yang bisa dicoba" />
      </div>
      <p className="h-catatan" style={{ textAlign: "center", marginTop: 16 }}>Data contoh. Klik, geser, dan ubah apa saja; tidak tersimpan ke akun siapa pun.</p>
    </div>
  );
}
