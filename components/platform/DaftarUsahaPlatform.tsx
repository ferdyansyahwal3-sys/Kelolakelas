"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { toCsv } from "@/lib/csv";
import { faseUsaha, hitungPerFase, manualBerlaku, saringUsaha, terakhirAktifLabel, tidakAktif, type FilterUsaha, type UrutUsaha } from "@/lib/platform";
import { kelasFase, labelFase, tgl, unduhCsv } from "./umum";
import { usePlatform } from "./PlatformProvider";

const FILTER: { id: FilterUsaha; label: string }[] = [
  { id: "semua", label: "Semua" }, { id: "trial", label: "Trial" }, { id: "aktif", label: "Aktif" }, { id: "jatuh_tempo", label: "Jatuh tempo" },
  { id: "ditangguhkan", label: "Ditangguhkan" }, { id: "berhenti", label: "Berhenti" }, { id: "tidak_aktif", label: "Tidak aktif 7 hari" }, { id: "manual", label: "Diatur manual" },
];
const VALID = new Set(FILTER.map((f) => f.id));

export function DaftarUsahaPlatform({ statusAwal }: { statusAwal?: string }) {
  const { usaha, hari } = usePlatform();
  const [filter, setFilter] = useState<FilterUsaha>(VALID.has(statusAwal as FilterUsaha) ? (statusAwal as FilterUsaha) : "semua");
  const [q, setQ] = useState("");
  const [urut, setUrut] = useState<UrutUsaha>("terbaru");
  const hitung = hitungPerFase(usaha, hari);
  const hasil = saringUsaha(usaha, q, filter, urut, hari);
  const jumlah = (f: FilterUsaha) => (f === "semua" ? usaha.length : hitung[f]);

  function ekspor() {
    unduhCsv(`usaha-${hari}.csv`, toCsv(hasil, [
      { judul: "Usaha", ambil: (u) => u.nama }, { judul: "Pemilik", ambil: (u) => u.pemilik }, { judul: "Email", ambil: (u) => u.email }, { judul: "WhatsApp", ambil: (u) => u.noWa },
      { judul: "Kategori", ambil: (u) => u.kategori }, { judul: "Kota", ambil: (u) => u.kota }, { judul: "Paket", ambil: (u) => u.plan },
      { judul: "Status", ambil: (u) => labelFase[faseUsaha(u, hari)] }, { judul: "Status manual", ambil: (u) => (manualBerlaku(u, hari) ? "ya" : "tidak") }, { judul: "Tidak aktif 7 hari", ambil: (u) => (tidakAktif(u, hari) ? "ya" : "tidak") },
      { judul: "Murid aktif", ambil: (u) => u.muridAktif }, { judul: "Terakhir aktif", ambil: (u) => u.terakhirAktif }, { judul: "Berlaku sampai", ambil: (u) => u.periodeBerakhir ?? u.trialBerakhir }, { judul: "Terdaftar", ambil: (u) => u.dibuat },
    ]));
  }

  return (
    <>
      <div className="plat-head">
        <div><div className="label">Pemilik platform</div><h1 className="title">Usaha</h1></div>
        <button type="button" className="btn btn-2 btn-sm" onClick={ekspor} disabled={hasil.length === 0}>Ekspor CSV ({hasil.length})</button>
      </div>

      <div className="plat-cari">
        <label className="cari"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari usaha, pemilik, atau email" aria-label="Cari usaha" /></label>
        <select className="pilih" value={urut} onChange={(e) => setUrut(e.target.value as UrutUsaha)} aria-label="Urutkan">
          <option value="terbaru">Terbaru daftar</option><option value="terakhir_aktif">Paling lama tidak aktif</option><option value="murid">Murid terbanyak</option><option value="nama">Nama A–Z</option>
        </select>
      </div>
      <div className="chips" role="tablist" aria-label="Filter status">
        {FILTER.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? "chip on" : "chip"} onClick={() => setFilter(f.id)}>{f.label} · {jumlah(f.id)}</button>)}
      </div>

      <div className="surface plat-wrap batas-tabel">
        {hasil.length === 0 ? (
          <div className="kosong"><h2 className="h2">Tidak ada usaha yang cocok</h2><p className="sub" style={{ margin: 0, fontSize: 13 }}>Ubah kata kunci atau filter.</p><button type="button" className="btn btn-2" onClick={() => { setQ(""); setFilter("semua"); }}>Reset filter</button></div>
        ) : (
          <table className="plat-tbl">
            <thead><tr><th>Usaha</th><th>Status</th><th>Paket</th><th className="num">Murid aktif</th><th>Terakhir aktif</th><th>Berlaku sampai</th></tr></thead>
            <tbody>
              {hasil.map((u) => {
                const f = faseUsaha(u, hari);
                const lama = tidakAktif(u, hari);
                return (
                  <tr key={u.id}>
                    <td className="utama"><Link href={`/platform/usaha/${u.id}`} className="name" style={{ display: "block", whiteSpace: "normal" }}>{u.nama}</Link><span className="meta">{u.pemilik} · {u.kategori} · {u.kota}</span></td>
                    <td data-label="Status"><span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}><Link href={`/platform/usaha/${u.id}#status`} className={kelasFase[f]} title="Ubah status">{labelFase[f]}</Link>{manualBerlaku(u, hari) && <span className="st st-few" title={manualBerlaku(u, hari)!.alasan}>Manual</span>}{lama && <span className="st st-free" title={`Terakhir masuk ${terakhirAktifLabel(u.terakhirAktif, hari)}`}>Tidak aktif</span>}</span></td>
                    <td data-label="Paket">{u.plan === "pro" ? "Pro" : "Starter"}</td>
                    <td data-label="Murid aktif" className="num">{u.muridAktif}<span className="meta"> / {u.murid}</span></td>
                    <td data-label="Terakhir aktif">{terakhirAktifLabel(u.terakhirAktif, hari)}</td>
                    <td data-label="Berlaku sampai">{tgl(u.periodeBerakhir ?? u.trialBerakhir)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
