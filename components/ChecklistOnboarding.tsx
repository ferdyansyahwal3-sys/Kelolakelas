"use client";
import { Tautan as Link } from "@/components/BasisApp";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { hitungChecklist, type DataOnboarding } from "@/lib/onboarding";

interface Props { awal: Omit<DataOnboarding, "linkDibagikan">; /** Panel asli: profil dan rekening datang dari database, bukan dari localStorage perangkat. */ dariServer?: boolean }
const KUNCI = "kk-onboarding";

/** Checklist hanya tampil sampai semua langkah beres atau pemilik menyembunyikannya. Profil dan rekening dibaca dari Pengaturan di perangkat ini. */
export function ChecklistOnboarding({ awal, dariServer = false }: Props) {
  const [d, setD] = useState<DataOnboarding>({ ...awal, linkDibagikan: false });
  const [tutup, setTutup] = useState(false);
  const [buka, setBuka] = useState(false);
  const [toast, setToast] = useState("");
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { profil?: DataOnboarding["profil"]; rekening?: unknown[] } | null;
      const o = JSON.parse(localStorage.getItem(KUNCI) ?? "null") as { link?: boolean; tutup?: boolean } | null;
      setD((x) => ({ ...x, profil: !dariServer && p?.profil && typeof p.profil.nama === "string" ? { nama: p.profil.nama, kategori: p.profil.kategori ?? "", kota: p.profil.kota ?? "", slug: p.profil.slug ?? "" } : x.profil, rekening: !dariServer && Array.isArray(p?.rekening) ? p!.rekening!.length : x.rekening, linkDibagikan: !!o?.link }));
      setTutup(!!o?.tutup);
    } catch {}
    setSiap(true);
  }, [dariServer]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3000); return () => clearTimeout(t); }, [toast]);

  const simpan = (o: { link?: boolean; tutup?: boolean }) => { try { const lama = JSON.parse(localStorage.getItem(KUNCI) ?? "{}") as object; localStorage.setItem(KUNCI, JSON.stringify({ ...lama, ...o })); } catch {} };

  async function salinLink() {
    const url = `${location.origin}/u/${d.profil.slug}`;
    try { await navigator.clipboard.writeText(url); setToast("Link pendaftaran disalin. Kirim ke grup WA murid."); }
    catch { setToast(`Salin manual: ${url}`); }
    setD((x) => ({ ...x, linkDibagikan: true })); simpan({ link: true });
  }

  const c = hitungChecklist(d);
  const tampil = siap && !tutup && !c.lengkap;
  // Toast ada di luar kartu supaya tetap muncul walau kartunya hilang karena langkah terakhir baru selesai.
  if (!tampil) return toast ? <div className="toast" role="status">{toast}</div> : null;

  return (
    <>
    <section className="surface" aria-label="Siapkan usahamu" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 className="h2">Siapkan usahamu</h2>
        <span className="st st-few">{c.selesai}/{c.total}</span>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={c.persen} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan persiapan"><i style={{ width: `${c.persen}%` }} /></div>

      {c.berikutnya && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="grow"><span className="name" style={{ display: "block", whiteSpace: "normal" }}>{c.berikutnya.judul}</span><span className="meta">{c.berikutnya.ket}</span></span>
          {c.berikutnya.id === "link" ? <button type="button" className="btn btn-sm" onClick={salinLink}>Salin link</button> : <Link href={c.berikutnya.href} className="btn btn-sm">Buka</Link>}
        </div>
      )}

      {buka && (
        <ul className="cek-langkah" aria-label="Semua langkah">
          {c.langkah.map((l) => (
            <li key={l.id} className={l.selesai ? "selesai" : undefined}>
              <span className="cek-bulat" aria-hidden="true">{l.selesai && <Icon name="check" />}</span>
              <span className="grow"><span className="name" style={{ display: "block", whiteSpace: "normal" }}>{l.judul}</span></span>
              {l.selesai ? <span className="meta">Selesai</span> : l.id === "link" ? <button type="button" className="link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={salinLink}>Salin</button> : <Link href={l.href} className="link">Buka</Link>}
            </li>
          ))}
        </ul>
      )}

      <div className="aksi">
        <button type="button" className="btn btn-2 btn-sm" aria-expanded={buka} onClick={() => setBuka(!buka)}>{buka ? "Tutup daftar" : "Lihat semua langkah"}</button>
        <button type="button" className="btn btn-2 btn-sm" onClick={() => { setTutup(true); simpan({ tutup: true }); }}>Sembunyikan</button>
      </div>
    </section>
    {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
