"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cariKota, kotaPopuler, normalKata } from "@/lib/daftarUsaha";

interface Props {
  value: string;
  onChange: (v: string) => void;
  galat?: string;
}

/**
 * Kolom kota dengan pencarian (514 kabupaten/kota). Mengetik mencari; memilih mengisi nama resmi;
 * kota yang tidak ada di daftar boleh tetap ditulis sendiri. Mendukung papan ketik (panah, Enter, Esc).
 */
export function KotaCombobox({ value, onChange, galat }: Props) {
  const id = useId();
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const daftarRef = useRef<HTMLUListElement>(null);

  const kueri = value.trim();
  const hasil = useMemo(() => (kueri ? cariKota(kueri) : kotaPopuler()), [kueri]);
  const persis = hasil.some((h) => normalKata(h.nama) === normalKata(kueri));
  const bolehTulisSendiri = kueri.length >= 2 && !persis;
  const jumlah = hasil.length + (bolehTulisSendiri ? 1 : 0);

  useEffect(() => { setAktif(-1); }, [kueri]);
  useEffect(() => {
    if (aktif < 0) return;
    daftarRef.current?.querySelector<HTMLElement>(`[data-i="${aktif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aktif]);

  function pilih(i: number) {
    if (i < hasil.length) onChange(hasil[i]!.nama);
    setBuka(false);
  }

  function tombol(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setBuka(true); setAktif((a) => (jumlah === 0 ? -1 : (a + 1) % jumlah)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setBuka(true); setAktif((a) => (jumlah === 0 ? -1 : (a <= 0 ? jumlah - 1 : a - 1))); }
    else if (e.key === "Enter" && buka && aktif >= 0) { e.preventDefault(); pilih(aktif); }
    else if (e.key === "Escape" && buka) { e.preventDefault(); setBuka(false); }
  }

  return (
    <div className="field">
      <label htmlFor={`${id}-i`} className="label" style={{ color: "var(--text-2)" }}>Kota (opsional)</label>
      <div className="wz-kombo">
        <input
          id={`${id}-i`}
          role="combobox"
          aria-expanded={buka}
          aria-controls={`${id}-l`}
          aria-autocomplete="list"
          aria-activedescendant={buka && aktif >= 0 ? `${id}-o${aktif}` : undefined}
          value={value}
          onChange={(e) => { onChange(e.target.value); setBuka(true); }}
          onFocus={() => setBuka(true)}
          onBlur={() => setBuka(false)}
          onKeyDown={tombol}
          placeholder="Cari kota atau kabupaten"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={60}
        />
        {buka && jumlah > 0 && (
          <ul ref={daftarRef} id={`${id}-l`} role="listbox" aria-label="Daftar kota" className="wz-daftar" onMouseDown={(e) => e.preventDefault()}>
            {!kueri && <li className="wz-judul-daftar" role="presentation">Kota yang sering dipilih</li>}
            {hasil.map((h, i) => (
              <li key={h.nama} id={`${id}-o${i}`} data-i={i} role="option" aria-selected={aktif === i} onClick={() => pilih(i)}>
                <span>{h.nama}</span>
                <small>{h.provinsi}</small>
              </li>
            ))}
            {bolehTulisSendiri && (
              <li id={`${id}-o${hasil.length}`} data-i={hasil.length} role="option" aria-selected={aktif === hasil.length} onClick={() => pilih(hasil.length)}>
                <span>Pakai “{kueri}”</span>
                <small>Tulis sendiri, tidak ada di daftar</small>
              </li>
            )}
          </ul>
        )}
      </div>
      {buka && kueri && jumlah === 0 && <span className="wz-status">Tidak ketemu. Teruskan mengetik nama kotamu.</span>}
      {galat && <span className="galat" role="alert">{galat}</span>}
    </div>
  );
}
