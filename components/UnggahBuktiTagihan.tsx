"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BUKTI_MAKS_BYTE, formatNomor, validasiBerkas, type Rekening } from "@/lib/rekening";

export interface BuktiTagihanServer {
  slug: string; token: string; rekening: Rekening[];
  kirim: (form: FormData) => Promise<{ ok: true } | { ok: false; pesan: string }>;
}

/** Murid unggah bukti transfer untuk satu tagihan 'belum'. Berhasil → tagihan jadi "Dicek pemilik" (halaman dimuat ulang). */
export function UnggahBuktiTagihan({ tagihanId, nominalTeks, server }: { tagihanId: string; nominalTeks: string; server: BuktiTagihanServer }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [pilih, setPilih] = useState(server.rekening[0]?.id ?? "");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [galat, setGalat] = useState("");
  const [sibuk, mulai] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function pilihBerkas(f: File | null) {
    setGalat("");
    if (!f) { setBerkas(null); return; }
    const salah = validasiBerkas({ tipe: f.type, ukuran: f.size });
    if (salah) { setBerkas(null); setGalat(salah); if (input.current) input.current.value = ""; return; }
    setBerkas(f);
  }

  function kirim() {
    if (!pilih) { setGalat("Pilih rekening tujuan transfer."); return; }
    if (!berkas) { setGalat("Pilih foto atau PDF bukti transfer."); return; }
    mulai(async () => {
      const f = new FormData();
      f.set("slug", server.slug); f.set("token", server.token); f.set("tagihanId", tagihanId); f.set("rekeningId", pilih); f.set("berkas", berkas);
      const r = await server.kirim(f);
      if (r.ok) router.refresh(); else setGalat(r.pesan);
    });
  }

  if (!buka) return <button type="button" className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setBuka(true)}>Unggah bukti bayar</button>;
  return (
    <div className="surface kartu-form" style={{ width: "100%" }}>
      <h3 className="h2" style={{ margin: 0 }}>Bukti bayar {nominalTeks}</h3>
      {server.rekening.length === 0 ? <p className="sub" style={{ margin: 0, fontSize: 13 }}>Pemilik belum mengisi rekening. Hubungi pemilik lewat WhatsApp.</p> : (
        <div className="grp" role="radiogroup" aria-label="Rekening tujuan">
          {server.rekening.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={pilih === r.id} className={pilih === r.id ? "opt on" : "opt"} onClick={() => setPilih(r.id)}>
              <span className="radio" />
              <span className="grow" style={{ textAlign: "left" }}><span className="name" style={{ display: "block" }}>{r.bank} · {formatNomor(r.nomor)}</span><span className="meta">a.n. {r.atasNama}</span></span>
            </button>
          ))}
        </div>
      )}
      <label className="field"><span className="label l2">Foto atau PDF (maks {BUKTI_MAKS_BYTE / 1024 / 1024} MB)</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pilihBerkas(e.target.files?.[0] ?? null)} /></label>
      {berkas && <p className="meta" style={{ margin: 0 }}>{berkas.name}</p>}
      {galat && <p className="galat" role="alert" style={{ margin: 0 }}>{galat}</p>}
      <div className="aksi">
        <button type="button" className="btn btn-sm" disabled={sibuk || server.rekening.length === 0} onClick={kirim}>{sibuk ? "Mengirim…" : "Kirim bukti bayar"}</button>
        <button type="button" className="btn btn-2 btn-sm" disabled={sibuk} onClick={() => { setBuka(false); setGalat(""); }}>Batal</button>
      </div>
      <p className="meta" style={{ margin: 0 }}>Berkasmu disimpan privat dan hanya bisa dilihat pemilik usaha.</p>
    </div>
  );
}
