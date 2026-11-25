"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { cariStatus, type HasilStatus } from "@/app/u/[slug]/status/actions";
import { infoStatus } from "@/lib/status";

export function CekStatus({ slug }: { slug: string }) {
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilStatus | null>(null);
  const [sibuk, mulai] = useTransition();

  return (
    <>
      <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); mulai(async () => setHasil(await cariStatus(slug, teks))); }} noValidate>
        <label className="field"><span className="label l2">Kode pendaftaran atau nomor WhatsApp</span>
          <input value={teks} onChange={(e) => { setTeks(e.target.value); setHasil(null); }} placeholder="G473FN atau 08123456789" autoCapitalize="characters" spellCheck={false} /></label>
        <button type="submit" className="btn" disabled={sibuk || teks.trim() === ""}>{sibuk ? "Mencari…" : "Cek status"}</button>
      </form>

      {hasil && !hasil.ok && <p className="galat" role="alert" style={{ margin: 0 }}>{hasil.pesan}</p>}
      {hasil && hasil.ok && (
        <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }} role="status">
          <span className="meta">Pendaftaran {hasil.nama}</span>
          <div className="big" style={{ color: "var(--panel-text)", fontSize: 26 }}>{infoStatus[hasil.status].judul}</div>
          <span className="sub" style={{ fontSize: 13 }}>Slot {hasil.slot}</span>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>{infoStatus[hasil.status].pesan}</p>
          {hasil.status === "ditolak" && <Link href={`/u/${slug}/slot`} className="btn btn-sm" style={{ alignSelf: "flex-start" }}>Pilih slot lain</Link>}
        </div>
      )}
    </>
  );
}
