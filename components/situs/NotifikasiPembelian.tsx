"use client";
import { useEffect, useState } from "react";
import { labelUmur, teksKejadian, type KejadianTampil } from "@/lib/buktiSosial";
import { Icon } from "@/components/Icon";

/** Notifikasi kecil "baru memilih paket". Data nyata saja di production; di pengembangan diberi label "Contoh tampilan". */
export function NotifikasiPembelian({ daftar, contoh }: { daftar: KejadianTampil[]; contoh: boolean }) {
  const [i, setI] = useState(-1);
  const [tutup, setTutup] = useState(false);

  useEffect(() => {
    if (daftar.length === 0 || tutup) return;
    let timer: ReturnType<typeof setTimeout>;
    let n = -1;
    const kurangGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tampil = () => {
      n += 1;
      setI(n % daftar.length);
      timer = setTimeout(sembunyi, 6000);
    };
    const sembunyi = () => {
      setI(-1);
      timer = setTimeout(tampil, kurangGerak ? 30000 : 22000);
    };
    timer = setTimeout(tampil, 7000);
    return () => clearTimeout(timer);
  }, [daftar, tutup]);

  if (daftar.length === 0 || tutup || i < 0) return null;
  const k = daftar[i]!;
  return (
    <div className="s-notif" role="status" aria-live="polite">
      <span className="s-notif-ikon"><Icon name="check" /></span>
      <div className="s-notif-isi">
        <span className="s-notif-teks">{teksKejadian(k)}</span>
        <span className="meta">{labelUmur(k.menitLalu)}{contoh && <> · <b>Contoh tampilan</b></>}</span>
      </div>
      <button type="button" className="s-notif-x" onClick={() => setTutup(true)} aria-label="Tutup notifikasi"><Icon name="x" /></button>
    </div>
  );
}
