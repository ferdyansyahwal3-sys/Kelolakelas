"use client";
import { useState } from "react";
import { aktivasiManual, type TagihanPlatform, type Usaha } from "@/lib/platform";
import { tgl, useRp } from "./umum";
import { usePlatform } from "./PlatformProvider";

/** Dua langkah: isi data transfer, lalu konfirmasi dengan pratinjau masa aktif baru. Tidak bisa melunasi tagihan yang sudah lunas (idempoten). */
export function FormAktivasi({ tagihan, usaha, onSelesai, onBatal }: { tagihan: TagihanPlatform; usaha: Usaha; onSelesai: (pesan: string) => void; onBatal: () => void }) {
  const { hari, aktifkanManual } = usePlatform();
  const rp = useRp();
  const [f, setF] = useState({ tanggal: hari, referensi: "", alasan: "" });
  const [galat, setGalat] = useState<Partial<Record<"tanggal" | "referensi" | "alasan" | "umum", string>>>({});
  const [pratinjau, setPratinjau] = useState<string | null>(null);

  function lanjut() {
    const h = aktivasiManual(tagihan, usaha, f, hari);
    if (!h.ok) { setGalat(h.galat); setPratinjau(null); return; }
    setGalat({});
    setPratinjau(h.usaha.periodeBerakhir);
  }

  function aktifkan() {
    const h = aktifkanManual(tagihan.id, f);
    if (!h.ok) { setGalat(h.galat); setPratinjau(null); return; }
    onSelesai(`${tagihan.orderId} lunas. ${usaha.nama} aktif sampai ${tgl(h.usaha.periodeBerakhir)}.`);
  }

  const ubah = (k: "tanggal" | "referensi" | "alasan", v: string) => { setF({ ...f, [k]: v }); setGalat((g) => ({ ...g, [k]: undefined, umum: undefined })); setPratinjau(null); };

  return (
    <form className="plat-form" onSubmit={(e) => { e.preventDefault(); if (pratinjau) aktifkan(); else lanjut(); }} noValidate>
      <label className="field"><span className="label l2">Tanggal dana masuk</span>
        <input type="date" value={f.tanggal} max={hari} min={tagihan.terbit} onChange={(e) => ubah("tanggal", e.target.value)} />
        {galat.tanggal && <span className="galat" role="alert">{galat.tanggal}</span>}</label>
      <label className="field"><span className="label l2">Bank pengirim / no. referensi</span>
        <input value={f.referensi} placeholder="BCA a.n. nama pemilik" onChange={(e) => ubah("referensi", e.target.value)} />
        {galat.referensi && <span className="galat" role="alert">{galat.referensi}</span>}</label>
      <label className="field lebar"><span className="label l2">Alasan (tercatat di audit log)</span>
        <input value={f.alasan} placeholder="Contoh: owner kirim bukti transfer lewat WA" onChange={(e) => ubah("alasan", e.target.value)} />
        {galat.alasan && <span className="galat" role="alert">{galat.alasan}</span>}</label>
      {galat.umum && <span className="galat lebar" role="alert">{galat.umum}</span>}
      {pratinjau && <p className="lebar" style={{ margin: 0 }}><b>{usaha.nama}</b> akan aktif sampai <b>{tgl(pratinjau)}</b> (paket {tagihan.plan === "pro" ? "Pro" : "Starter"}, {tagihan.bulan} bulan). Terima {rp(tagihan.nominal)} lewat transfer, tagihan ditandai lunas. Ini tidak bisa dibatalkan dari sini.</p>}
      <div className="aksi lebar">
        {pratinjau ? <button type="submit" className="btn btn-sm">Ya, aktifkan sekarang</button> : <button type="submit" className="btn btn-sm">Lanjut, cek dulu</button>}
        <button type="button" className="btn btn-2 btn-sm" onClick={onBatal}>Batal</button>
      </div>
    </form>
  );
}
