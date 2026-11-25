"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { linkWa } from "@/lib/acc";
import { inisial, pecahRupiah, ringkasRupiah, tglPendek } from "@/lib/format";
import { labelMetode, ringkasan, tandaiLunas, terlambatHari, tolakBukti, type Metode, type StatusTagihan, type TagihanOwner } from "@/lib/tagihan";

type Tab = "dicek" | "belum" | "lunas";
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const tab: { id: Tab; nama: string; status: StatusTagihan }[] = [
  { id: "dicek", nama: "Perlu dicek", status: "menunggu_verifikasi" },
  { id: "belum", nama: "Belum bayar", status: "belum" },
  { id: "lunas", nama: "Lunas", status: "lunas" },
];

type Hasil = { ok: true } | { ok: false; pesan: string };
export interface AksiTagihan { lunas: (id: string, metode: string, tanggal: string) => Promise<Hasil>; tolak: (id: string) => Promise<Hasil> }

export function TagihanOwnerList({ awal, hariIni, usaha, aksi, bolehUbah = true }: { awal: TagihanOwner[]; hariIni: string; usaha: string; aksi?: AksiTagihan; bolehUbah?: boolean }) {
  const [daftar, setDaftar] = useState(awal);
  const [aktif, setAktif] = useState<Tab>(awal.some((t) => t.status === "menunggu_verifikasi") ? "dicek" : "belum");
  const [buka, setBuka] = useState<string | null>(null);
  const [tolak, setTolak] = useState<string | null>(null);
  const [metode, setMetode] = useState<Metode>("tunai");
  const [tanggal, setTanggal] = useState(hariIni);
  const [galat, setGalat] = useState("");
  const [toast, setToast] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const r = ringkasan(daftar, hariIni);
  const status = tab.find((t) => t.id === aktif)!.status;
  const tampil = daftar.filter((t) => t.status === status);
  const jumlah = (s: StatusTagihan) => daftar.filter((t) => t.status === s).length;

  function info(teks: string) { setToast(teks); setTimeout(() => setToast(""), 3500); }
  function ganti(id: string | null) { setBuka(id); setTolak(null); setGalat(""); setMetode("tunai"); setTanggal(hariIni); }
  function perbarui(baru: TagihanOwner) { setDaftar((d) => d.map((t) => (t.id === baru.id ? baru : t))); }

  async function lunas(t: TagihanOwner, m: Metode, tgl: string) {
    if (sibuk) return;
    const h = tandaiLunas(t, m, tgl, hariIni);
    if (!h.ok) { setGalat(h.galat); return; }
    if (aksi) {
      setSibuk(true);
      const r = await aksi.lunas(t.id, m, tgl);
      setSibuk(false);
      if (!r.ok) { setGalat(r.pesan); return; }
    }
    perbarui(h.tagihan);
    ganti(null);
    info(`${t.nama} lunas, ${rp(t.nominal)}.`);
  }

  async function tolakBukti_(t: TagihanOwner) {
    if (sibuk) return;
    if (aksi) {
      setSibuk(true);
      const r = await aksi.tolak(t.id);
      setSibuk(false);
      if (!r.ok) { setGalat(r.pesan); return; }
    }
    perbarui(tolakBukti(t));
    ganti(null);
    info(`Bukti ${t.nama} ditolak. Kirim WA minta bukti baru.`);
  }

  function pengingat(t: TagihanOwner): string {
    const telat = terlambatHari(t, hariIni);
    const waktu = telat > 0 ? `sudah lewat jatuh tempo ${tglPendek(t.tempo)}` : `jatuh tempo ${tglPendek(t.tempo)}`;
    return linkWa(t.noWa, `Halo ${t.namaOrtu ?? t.nama}, pengingat dari ${usaha}: tagihan ${rp(t.nominal)} untuk ${t.nama} ${waktu}. Terima kasih!`);
  }

  return (
    <>
      <div className="kpis">
        <div className="surface kpi"><div className="meta">Belum lunas</div><div className="big-kpi">{ringkasRupiah(r.belumLunasNominal)}</div><div className="meta">{r.belumLunasJumlah} tagihan{r.terlambat > 0 ? ` · ${r.terlambat} terlambat` : ""}</div></div>
        <div className="panel kpi"><div className="meta">Perlu dicek</div><div className="big-kpi">{r.perluDicek}</div><div className="meta">bukti bayar masuk</div></div>
      </div>

      <div className="seg" role="tablist" aria-label="Status tagihan">
        {tab.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={aktif === t.id} className={aktif === t.id ? "on" : ""} onClick={() => { setAktif(t.id); ganti(null); }}>
            {t.nama}{jumlah(t.status) > 0 ? ` ${jumlah(t.status)}` : ""}
          </button>
        ))}
      </div>

      {tampil.length === 0 ? (
        <div className="surface kosong">
          <span className="circ"><Icon name="bill" /></span>
          <h2 className="h2">{aktif === "dicek" ? "Tidak ada bukti yang perlu dicek" : aktif === "belum" ? "Semua tagihan sudah lunas" : "Belum ada tagihan lunas"}</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>{aktif === "dicek" ? "Bukti bayar dari murid akan muncul di sini." : "Tagihan baru dibuat otomatis saat pendaftaran di-ACC."}</p>
        </div>
      ) : (
        <div className="surface batas batas-tinggi">
          {tampil.map((t) => {
            const terbuka = buka === t.id;
            const telat = terlambatHari(t, hariIni);
            return (
              <div key={t.id} className="baris">
                <button type="button" className="item buka" style={{ padding: "14px 16px", width: "100%" }} aria-expanded={terbuka} onClick={() => ganti(terbuka ? null : t.id)}>
                  <span className="avatar s">{inisial(t.nama)}</span>
                  <span className="grow" style={{ textAlign: "left" }}>
                    <span className="name" style={{ display: "block" }}>{t.nama}</span>
                    <span className="meta">{ringkasRupiah(t.nominal)} · {t.status === "lunas" && t.dibayar ? `bayar ${tglPendek(t.dibayar.tanggal)}` : `tempo ${tglPendek(t.tempo)}`}</span>
                  </span>
                  {telat > 0 ? <span className="st st-full">Telat {telat} hari</span>
                    : t.status === "menunggu_verifikasi" ? <span className="st st-few">Verifikasi</span>
                    : t.status === "lunas" ? <span className="st st-ok">Lunas</span>
                    : <span className="st st-free">Belum bayar</span>}
                </button>

                {terbuka && (
                  <div className="detail">
                    <dl>
                      <dt>Paket</dt><dd>{t.paket}</dd>
                      <dt>Nominal</dt><dd><b>{rp(t.nominal)}</b></dd>
                      <dt>Jatuh tempo</dt><dd>{tglPendek(t.tempo)}</dd>
                      {t.dibayar && <><dt>Dibayar</dt><dd>{tglPendek(t.dibayar.tanggal)} · {labelMetode[t.dibayar.metode]}</dd></>}
                    </dl>
                    {t.catatan && <p className="meta" style={{ margin: 0 }}>{t.catatan}</p>}

                    {t.status === "menunggu_verifikasi" && t.bukti && (
                      <>
                        <div className="bukti">
                          <span className="circ"><Icon name="doc" /></span>
                          <div className="grow"><div className="name">{t.bukti.berkas}</div><div className="meta">{labelMetode[t.bukti.metode]} · diunggah {t.bukti.diunggah}</div></div>
                        </div>
                        <p className="meta" style={{ margin: 0 }}>Cocokkan nominal dan nama pengirim di mutasi rekening sebelum menerima.</p>
                        <div className="aksi">
                          <button type="button" className="btn btn-sm" disabled={!bolehUbah || sibuk} onClick={() => lunas(t, t.bukti!.metode, hariIni)}>Terima, tandai lunas</button>
                          {tolak === t.id ? (
                            <>
                              <button type="button" className="btn btn-2 btn-sm" disabled={!bolehUbah || sibuk} onClick={() => tolakBukti_(t)}>Ya, tolak</button>
                              <button type="button" className="btn btn-2 btn-sm" onClick={() => setTolak(null)}>Batal</button>
                            </>
                          ) : (
                            <button type="button" className="btn btn-2 btn-sm" onClick={() => setTolak(t.id)}>Tolak bukti</button>
                          )}
                        </div>
                      </>
                    )}

                    {t.status === "belum" && (
                      <>
                        <div className="seg" role="radiogroup" aria-label="Cara bayar">
                          {(["tunai", "transfer", "qris"] as Metode[]).map((m) => (
                            <button key={m} type="button" role="radio" aria-checked={metode === m} className={metode === m ? "on" : ""} onClick={() => setMetode(m)}>{labelMetode[m]}</button>
                          ))}
                        </div>
                        <label className="field"><span className="label" style={{ color: "var(--text-2)" }}>Tanggal bayar</span>
                          <input type="date" value={tanggal} max={hariIni} onChange={(e) => { setTanggal(e.target.value); setGalat(""); }} /></label>
                        {galat && <p className="galat" role="alert" style={{ margin: 0 }}>{galat}</p>}
                        <div className="aksi">
                          <button type="button" className="btn btn-sm" disabled={!bolehUbah || sibuk} onClick={() => lunas(t, metode, tanggal)}>{sibuk ? "Menyimpan…" : "Catat sudah bayar"}</button>
                          <a className="btn btn-2 btn-sm" href={pengingat(t)} target="_blank" rel="noopener noreferrer"><Icon name="wa" />Kirim pengingat</a>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
