"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import { linkWa } from "@/lib/acc";
import { buatTokenPortal, linkPortal } from "@/lib/portal";
import { inisial, pecahRupiah, tglPendek } from "@/lib/format";
import { labelBayar } from "@/lib/murid";
import type { MuridContoh, StatusBayar } from "@/lib/contoh";

interface Paket { id: string; nama: string; harga: number }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const kelasSesi = { hadir: "st st-ok", izin: "st st-few", alpa: "st st-full" } as const;
const namaSesi = { hadir: "Hadir", izin: "Izin", alpa: "Alpa" } as const;

export function MuridDetail({ murid, paket, usaha, slug, tokenAwal }: { murid: MuridContoh; paket: Paket; usaha: string; slug: string; tokenAwal: string | null }) {
  const [token, setToken] = useState<string | null>(tokenAwal);
  const [baru, setBaru] = useState(false);
  const [ulang, setUlang] = useState(false);
  const url = token && typeof window !== "undefined" ? linkPortal(window.location.origin, slug, token) : "";
  const [aktif, setAktif] = useState(murid.aktif);
  const [tagihan, setTagihan] = useState(murid.tagihan);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [toast, setToast] = useState("");

  const bayar: StatusBayar = tagihan.some((t) => t.status === "belum") ? "belum" : tagihan.some((t) => t.status === "menunggu_verifikasi") ? "menunggu_verifikasi" : "lunas";
  const b = labelBayar(bayar);
  const belumLunas = tagihan.find((t) => t.status !== "lunas");
  const persen = murid.totalSesi === 0 ? 0 : Math.round((murid.sisaSesi / murid.totalSesi) * 100);

  function info(teks: string) {
    setToast(teks);
    setTimeout(() => setToast(""), 3500);
  }

  async function salinLink() {
    try { await navigator.clipboard.writeText(url); info("Link portal disalin."); } catch { info("Gagal menyalin, salin manual dari kotak."); }
  }

  function buatLink() {
    setToken(buatTokenPortal()); setBaru(true); setUlang(false);
    info("Link baru dibuat. Link lama tidak berlaku lagi.");
  }

  function perpanjang() {
    const tempo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setTagihan((t) => [{ id: `baru-${t.length + 1}`, nominal: paket.harga, status: "belum", tempo }, ...t]);
    info(`Tagihan perpanjangan ${rp(paket.harga)} dibuat.`);
  }

  const pengingat = belumLunas
    ? linkWa(murid.noWa, `Halo ${murid.namaOrtu ?? murid.nama}, pengingat dari ${usaha}: tagihan ${rp(belumLunas.nominal)} untuk ${murid.nama} jatuh tempo ${tglPendek(belumLunas.tempo)}. Terima kasih!`)
    : null;

  return (
    <>
      <div className="surface" style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
        <span className="avatar">{inisial(murid.nama)}</span>
        <div className="grow">
          <div className="name" style={{ fontSize: 16 }}>{murid.nama}</div>
          <div className="meta">{murid.kategori === "anak" ? `Anak · ${murid.usia} tahun` : "Dewasa"} · {murid.pengajar}</div>
          {murid.namaOrtu && <div className="meta">Orang tua: {murid.namaOrtu}</div>}
        </div>
        <a className="circ" href={`https://wa.me/${murid.noWa.replace(/^0/, "62")}`} target="_blank" rel="noopener noreferrer" aria-label={`Chat WA ${murid.nama}`}><Icon name="wa" /></a>
      </div>

      <section className="grp">
        <h2 className="h2">Paket aktif</h2>
        <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>{paket.nama}</b>
            <span className={b.kelas}>{b.teks}</span>
          </div>
          <div className="sub" style={{ fontSize: 13 }}>{aktif ? `Sisa ${murid.sisaSesi} dari ${murid.totalSesi} sesi` : "Murid nonaktif"} · berlaku sampai {tglPendek(murid.berlakuSampai)}</div>
          <div className="bar" aria-hidden="true"><i style={{ width: `${persen}%` }} /></div>
        </div>
        {aktif && <button type="button" className="btn" onClick={perpanjang}>Perpanjang paket</button>}
      </section>

      <section className="grp">
        <h2 className="h2">Link portal murid</h2>
        <div className="surface kartu-form">
          {token ? (
            <>
              <input readOnly value={url} aria-label="Link portal murid" onFocus={(e) => e.currentTarget.select()} style={{ height: 46, padding: "0 14px", borderRadius: 14, border: "1px solid var(--surface-border)", background: "var(--pill)", color: "var(--text)", font: "inherit", fontSize: 12, width: "100%" }} />
              <div className="aksi">
                <button type="button" className="btn btn-sm" onClick={salinLink}>Salin</button>
                <a className="btn btn-2 btn-sm" target="_blank" rel="noopener noreferrer" href={linkWa(murid.noWa, `Halo ${murid.namaOrtu ?? murid.nama}, ini link pribadi untuk melihat sisa sesi, jadwal, dan pembayaran ${murid.nama} di ${usaha}: ${url}`)}>Kirim lewat WA</a>
                {ulang ? (
                  <><button type="button" className="btn btn-2 btn-sm" onClick={buatLink}>Ya, buat baru</button><button type="button" className="btn btn-2 btn-sm" onClick={() => setUlang(false)}>Batal</button></>
                ) : <button type="button" className="btn btn-2 btn-sm" onClick={() => setUlang(true)}>Buat ulang</button>}
              </div>
              <p className="meta" style={{ margin: 0 }}>{baru ? "Link baru ini belum aktif di halaman murid sampai database tersambung." : "Siapa pun yang memegang link ini bisa melihat data murid ini. Buat ulang bila link bocor atau murid ganti HP."}</p>
            </>
          ) : (
            <>
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Murid belum punya link. Link dibuat otomatis saat pendaftaran di-ACC.</p>
              <button type="button" className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={buatLink}>Buat link portal</button>
            </>
          )}
        </div>
      </section>

      <section className="grp">
        <h2 className="h2">Tagihan</h2>
        <div className="surface">
          {tagihan.map((t) => {
            const l = labelBayar(t.status);
            return (
              <div key={t.id} className="item">
                <div className="grow"><div className="name">{rp(t.nominal)}</div><div className="meta">Jatuh tempo {tglPendek(t.tempo)}</div></div>
                <span className={l.kelas}>{l.teks}</span>
              </div>
            );
          })}
        </div>
        {pengingat && <a className="btn btn-2" href={pengingat} target="_blank" rel="noopener noreferrer"><Icon name="wa" />Kirim pengingat WA</a>}
      </section>

      <section className="grp">
        <h2 className="h2">Riwayat sesi</h2>
        {murid.riwayat.length === 0 ? (
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada sesi. Riwayat muncul setelah sesi pertama.</p>
        ) : (
          <div className="surface">
            {murid.riwayat.map((r) => (
              <div key={r.tgl} className="item"><span className="grow">{r.tgl}</span><span className={kelasSesi[r.status]}>{namaSesi[r.status]}</span></div>
            ))}
          </div>
        )}
      </section>

      <section className="grp">
        <h2 className="h2">Catatan perkembangan</h2>
        {murid.catatan.length === 0 ? (
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada catatan.</p>
        ) : (
          <div className="surface">
            {murid.catatan.map((c) => (
              <div key={c.tgl} className="item" style={{ alignItems: "flex-start" }}><span className="meta" style={{ width: 46, paddingTop: 2 }}>{c.tgl}</span><span className="grow">{c.teks}</span></div>
            ))}
          </div>
        )}
      </section>

      {aktif && (
        <div className="aksi">
          {konfirmasi ? (
            <>
              <button type="button" className="btn btn-2 btn-sm" onClick={() => { setAktif(false); setKonfirmasi(false); info(`${murid.nama} dinonaktifkan.`); }}>Ya, nonaktifkan</button>
              <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasi(false)}>Batal</button>
            </>
          ) : (
            <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasi(true)}>Nonaktifkan</button>
          )}
        </div>
      )}
      <Link href="/app/murid" className="link" style={{ alignSelf: "center" }}>Kembali ke daftar murid</Link>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
