"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import { inisial } from "@/lib/format";
import { labelBayar, labelFilter, saring, SISA_SEDIKIT, type FilterMurid } from "@/lib/murid";
import type { MuridContoh } from "@/lib/contoh";

export function MuridList({ murid, linkDaftar }: { murid: MuridContoh[]; linkDaftar: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterMurid>("semua");
  const [tersalin, setTersalin] = useState(false);
  const hasil = saring(murid, q, filter);

  async function salin() {
    try { await navigator.clipboard.writeText(linkDaftar); setTersalin(true); setTimeout(() => setTersalin(false), 2000); } catch {}
  }

  return (
    <>
      <label className="cari">
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama murid atau orang tua" aria-label="Cari murid" />
      </label>
      <div className="chips" role="group" aria-label="Filter murid">
        {(Object.keys(labelFilter) as FilterMurid[]).map((f) => (
          <button key={f} type="button" className={filter === f ? "chip on" : "chip"} aria-pressed={filter === f} onClick={() => setFilter(f)}>{labelFilter[f]}</button>
        ))}
      </div>

      {hasil.length === 0 ? (
        <div className="surface kosong">
          <span className="circ"><Icon name="users" /></span>
          <h2 className="h2">{murid.length === 0 ? "Belum ada murid" : "Tidak ada yang cocok"}</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>
            {murid.length === 0 ? "Bagikan link pendaftaran ke grup WA. Murid isi sendiri dan langsung muncul di sini." : "Coba ganti kata kunci atau filter."}
          </p>
          {murid.length === 0 && <button type="button" className="btn" onClick={salin}><Icon name="link" />{tersalin ? "Link tersalin" : "Salin link pendaftaran"}</button>}
        </div>
      ) : (
        <div className="surface batas batas-tinggi">
          {hasil.map((m) => {
            const b = labelBayar(m.bayar);
            const sedikit = m.aktif && m.sisaSesi <= SISA_SEDIKIT;
            return (
              <Link key={m.id} href={`/app/murid/${m.id}`} className="item" style={{ borderTop: 0 }}>
                <span className="avatar s">{inisial(m.nama)}</span>
                <span className="grow">
                  <span className="name" style={{ display: "block" }}>{m.nama}</span>
                  <span className="meta">{m.pengajar} · {m.aktif ? `sisa ${m.sisaSesi} dari ${m.totalSesi}` : "nonaktif"}</span>
                </span>
                {m.aktif && <span className={sedikit && m.bayar === "lunas" ? "st st-few" : b.kelas}>{sedikit && m.bayar === "lunas" ? `Sisa ${m.sisaSesi}` : b.pendek}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
