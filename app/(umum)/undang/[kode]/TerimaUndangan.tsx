"use client";
import { useState, useTransition } from "react";
import { terimaUndangan } from "./actions";

export function TerimaUndangan({ kode, email }: { kode: string; email: string }) {
  const [pesan, setPesan] = useState("");
  const [sibuk, mulai] = useTransition();

  function terima() {
    setPesan("");
    mulai(async () => {
      const r = await terimaUndangan(kode);
      if (r.ok) window.location.href = "/pengajar"; else setPesan(r.pesan);
    });
  }

  return (
    <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 className="title" style={{ color: "var(--panel-text)" }}>Undangan menjadi pelatih</h1>
      <p style={{ margin: 0, color: "var(--panel-text-2)", lineHeight: 1.55 }}>Kamu masuk sebagai <b>{email}</b>. Terima undangan untuk melihat jadwal dan murid yang kamu pegang.</p>
      {pesan && <p className="galat" role="alert" style={{ margin: 0 }}>{pesan}</p>}
      <button type="button" className="btn" disabled={sibuk} onClick={terima}>{sibuk ? "Memproses…" : "Terima undangan"}</button>
    </div>
  );
}
