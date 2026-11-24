"use client";
import { Icon } from "./Icon";

/** Tombol ikon mata di dalam kolom kata sandi: tampilkan / sembunyikan. */
export function TombolMata({ tampil, onToggle }: { tampil: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="wz-lihat" onClick={onToggle} aria-pressed={tampil} aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>
      <Icon name={tampil ? "eyeoff" : "eye"} />
    </button>
  );
}
