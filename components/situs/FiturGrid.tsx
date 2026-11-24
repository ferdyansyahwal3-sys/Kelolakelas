"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export interface Fitur { ikon: string; judul: string; isi: string; tim?: boolean }

/** 3 fitur dulu, sisanya lewat tombol (seperti Journalyze). */
export function FiturGrid({ daftar, awal = 3 }: { daftar: Fitur[]; awal?: number }) {
  const [semua, setSemua] = useState(false);
  const tampil = semua ? daftar : daftar.slice(0, awal);
  const sisa = daftar.length - awal;
  return (
    <>
      <div className="s-3 s-fitur">
        {tampil.map((f, i) => (
          <article key={f.judul} className="surface s-kartu s-hover" data-reveal data-delay={(i % 3) + 1}>
            <span className="s-ikon"><Icon name={f.ikon} /></span>
            <h3>{f.judul}{f.tim && <span className="s-tag-tim">Agensi</span>}</h3>
            <p>{f.isi}</p>
          </article>
        ))}
      </div>
      <div className="s-tengah">
        <button type="button" className="btn btn-2" onClick={() => setSemua((v) => !v)}>{semua ? "Tampilkan lebih sedikit ↑" : `Lihat ${sisa} fitur lainnya ↓`}</button>
      </div>
    </>
  );
}
