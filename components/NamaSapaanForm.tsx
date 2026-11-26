"use client";
import { useState, useTransition } from "react";
import { simpanNamaSapaan } from "@/app/app/pengaturan/sapaan";

/** Kartu kecil di Pengaturan: nama yang disapa di dashboard. */
export function NamaSapaanForm({ awal }: { awal: string }) {
  const [nama, setNama] = useState(awal);
  const [pesan, setPesan] = useState<{ teks: string; galat: boolean } | null>(null);
  const [sibuk, mulai] = useTransition();

  function simpan() {
    setPesan(null);
    mulai(async () => {
      const r = await simpanNamaSapaan(nama);
      setPesan(r.ok ? { teks: `Tersimpan. Dashboard menyapa "${r.nama}".`, galat: false } : { teks: r.pesan, galat: true });
    });
  }
  return (
    <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); simpan(); }} noValidate>
      <h2 className="h2">Nama sapaan</h2>
      <label className="field"><span className="label l2">Nama yang disapa di dashboard</span>
        <input value={nama} maxLength={40} placeholder="Contoh: Ferdy" onChange={(e) => { setNama(e.target.value); setPesan(null); }} /></label>
      {pesan && <span className={pesan.galat ? "galat" : "meta"} role={pesan.galat ? "alert" : "status"}>{pesan.teks}</span>}
      <div className="aksi"><button type="submit" className="btn btn-sm" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan nama"}</button></div>
    </form>
  );
}
