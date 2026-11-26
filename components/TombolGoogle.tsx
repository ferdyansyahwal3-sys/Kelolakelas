"use client";
import { useState } from "react";
import { googleTersedia } from "@/app/(umum)/masuk/actions";
import { klienBrowser } from "@/lib/supabase/browser";

function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.27a12 12 0 0 0 0 10.74z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

/**
 * Tombol "dengan Google". Penyedia Google dicek dulu di server (Supabase bisa saja belum mengaktifkannya): bila belum aktif,
 * tampil pesan ramah, bukan halaman galat mentah. Tidak ada kunci rahasia di sini; Client ID/Secret diisi pemilik di dashboard Supabase.
 */
export function TombolGoogle({ label, lanjut, className = "btn btn-2 tg-btn" }: { label: string; lanjut?: string | null; className?: string }) {
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  async function klik() {
    setPesan(""); setSibuk(true);
    try {
      if (!(await googleTersedia())) { setPesan("Masuk dengan Google belum diaktifkan. Pakai email dulu, ya."); setSibuk(false); return; }
      const balik = `${window.location.origin}/auth/callback${lanjut ? `?lanjut=${encodeURIComponent(lanjut)}` : ""}`;
      const { error } = await klienBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: balik } });
      if (error) { setPesan("Belum bisa menghubungkan ke Google. Coba lagi sebentar."); setSibuk(false); }
      // Berhasil: browser dialihkan ke Google, tombol tetap sibuk sampai halaman berganti.
    } catch {
      setPesan("Belum bisa menghubungkan ke Google. Coba lagi sebentar."); setSibuk(false);
    }
  }

  return (
    <div className="tg-bungkus">
      <button type="button" className={className} onClick={klik} disabled={sibuk} aria-busy={sibuk}>
        {sibuk ? <i className="auth-spin tg-spin" aria-hidden="true" /> : <LogoGoogle />}
        <span>{sibuk ? "Menghubungkan…" : label}</span>
      </button>
      {pesan && <p className="galat" role="alert" style={{ margin: "8px 0 0", textAlign: "center" }}>{pesan}</p>}
    </div>
  );
}
