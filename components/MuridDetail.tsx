"use client";
import { Tautan as Link } from "@/components/BasisApp";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "./Icon";
import { linkWa } from "@/lib/acc";
import { buatTokenPortal, linkPortal } from "@/lib/portal";
import { inisial, pecahRupiah, tglPendek } from "@/lib/format";
import { labelBayar } from "@/lib/murid";
import { normalisasiWa, validasiEditMurid, type GalatMurid, type InputEditMurid } from "@/lib/muridDb";
import type { MuridContoh, StatusBayar } from "@/lib/contoh";

interface Paket { id: string; nama: string; harga: number }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const kelasSesi = { hadir: "st st-ok", izin: "st st-few", alpa: "st st-full" } as const;
const namaSesi = { hadir: "Hadir", izin: "Izin", alpa: "Alpa" } as const;

/** Aksi server (panel asli). Tanpa `aksi` (demo) perubahan hanya hidup di halaman dan fitur portal/perpanjang tampil seperti biasa. */
export interface AksiMurid {
  ubahAktif: (id: string, aktif: boolean) => Promise<{ ok: true; aktif: boolean } | { ok: false; pesan: string }>;
  tambahCatatan: (id: string, teks: string) => Promise<{ ok: true; tgl: string; teks: string } | { ok: false; pesan: string }>;
  ubahData: (id: string, i: InputEditMurid) => Promise<{ ok: true } | { ok: false; galat: GalatMurid; pesan?: string }>;
  perpanjang: (id: string, paketId: string) => Promise<{ ok: true } | { ok: false; pesan: string }>;
}

export function MuridDetail({ murid, paket, usaha, slug, tokenAwal, aksi, bolehUbah = true, paketPilihan = [] }: { murid: MuridContoh; paket: Paket; usaha: string; slug: string; tokenAwal: string | null; aksi?: AksiMurid; bolehUbah?: boolean; paketPilihan?: Paket[] }) {
  const router = useRouter();
  const [lokal, setLokal] = useState<{ nama: string; noWa: string; namaOrtu?: string; usia?: number } | null>(null);
  const v = !aksi && lokal ? { ...murid, ...lokal } : murid; // tanpa `aksi` (demo) hasil edit hanya hidup di halaman
  const [editBuka, setEditBuka] = useState(false);
  const [fNama, setFNama] = useState(murid.nama);
  const [fWa, setFWa] = useState(murid.noWa);
  const [fOrtu, setFOrtu] = useState(murid.namaOrtu ?? "");
  const [fUsia, setFUsia] = useState(murid.usia ? String(murid.usia) : "");
  const [galatEdit, setGalatEdit] = useState<GalatMurid>({});
  const [perpBuka, setPerpBuka] = useState(false);
  const [perpPaket, setPerpPaket] = useState(paketPilihan.find((p) => p.id === paket.id)?.id ?? paketPilihan[0]?.id ?? "");
  const [sibuk, mulai] = useTransition();
  const [catatan, setCatatan] = useState(murid.catatan);
  const [teksBaru, setTeksBaru] = useState("");
  const [token, setToken] = useState<string | null>(tokenAwal);
  const [baru, setBaru] = useState(false);
  const [ulang, setUlang] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []); // setelah mount, supaya HTML server dan klien sama (hindari galat hidrasi)
  const url = token && origin ? linkPortal(origin, slug, token) : "";
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
          <div className="name" style={{ fontSize: 16 }}>{v.nama}</div>
          <div className="meta">{v.kategori === "anak" ? `Anak · ${v.usia} tahun` : "Dewasa"} · {v.pengajar}</div>
          {v.namaOrtu && <div className="meta">Orang tua: {v.namaOrtu}</div>}
        </div>
        <a className="circ" href={`https://wa.me/${v.noWa.replace(/^0/, "62")}`} target="_blank" rel="noopener noreferrer" aria-label={`Chat WA ${v.nama}`}><Icon name="wa" /></a>
      </div>

      {(editBuka ? (
        <form className="surface kartu-form" noValidate onSubmit={(e) => {
          e.preventDefault();
          const i: InputEditMurid = { nama: fNama, noWa: normalisasiWa(fWa), namaOrtu: fOrtu, usia: fUsia ? Number(fUsia) : null };
          const g = validasiEditMurid(i, murid.kategori); setGalatEdit(g); if (Object.keys(g).length > 0) return;
          if (!aksi) { setLokal({ nama: i.nama.trim(), noWa: i.noWa, namaOrtu: murid.kategori === "anak" ? i.namaOrtu.trim() : undefined, usia: murid.kategori === "anak" ? (i.usia ?? undefined) : undefined }); setEditBuka(false); info("Data murid diperbarui (contoh, tidak disimpan)."); return; }
          mulai(async () => { const r = await aksi.ubahData(murid.id, i); if (r.ok) { setEditBuka(false); info("Data murid diperbarui."); router.refresh(); } else { setGalatEdit(r.galat); if (r.pesan) info(r.pesan); } });
        }}>
          <h2 className="h2">Ubah data</h2>
          <label className="field"><span className="label l2">Nama</span><input value={fNama} onChange={(e) => { setFNama(e.target.value); setGalatEdit((g) => ({ ...g, nama: "" })); }} maxLength={60} />{galatEdit.nama && <span className="galat" role="alert">{galatEdit.nama}</span>}</label>
          {murid.kategori === "anak" && (
            <>
              <label className="field"><span className="label l2">Usia</span><input inputMode="numeric" value={fUsia} onChange={(e) => { setFUsia(e.target.value.replace(/\D/g, "").slice(0, 2)); setGalatEdit((g) => ({ ...g, usia: "" })); }} />{galatEdit.usia && <span className="galat" role="alert">{galatEdit.usia}</span>}</label>
              <label className="field"><span className="label l2">Nama orang tua</span><input value={fOrtu} onChange={(e) => { setFOrtu(e.target.value); setGalatEdit((g) => ({ ...g, namaOrtu: "" })); }} maxLength={60} />{galatEdit.namaOrtu && <span className="galat" role="alert">{galatEdit.namaOrtu}</span>}</label>
            </>
          )}
          <label className="field"><span className="label l2">WhatsApp</span><input inputMode="tel" value={fWa} onChange={(e) => { setFWa(e.target.value); setGalatEdit((g) => ({ ...g, noWa: "" })); }} maxLength={20} />{galatEdit.noWa && <span className="galat" role="alert">{galatEdit.noWa}</span>}</label>
          <div className="aksi"><button type="submit" className="btn btn-sm" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan"}</button><button type="button" className="btn btn-2 btn-sm" onClick={() => { setEditBuka(false); setGalatEdit({}); }}>Batal</button></div>
        </form>
      ) : <button type="button" className="btn btn-2 btn-sm" style={{ alignSelf: "flex-start" }} disabled={!bolehUbah} onClick={() => { setFNama(v.nama); setFWa(v.noWa); setFOrtu(v.namaOrtu ?? ""); setFUsia(v.usia ? String(v.usia) : ""); setGalatEdit({}); setEditBuka(true); }}>Ubah data</button>)}

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
        {aktif && !aksi && <button type="button" className="btn" onClick={perpanjang}>Perpanjang paket</button>}
        {aktif && aksi && !perpBuka && <button type="button" className="btn" disabled={!bolehUbah || paketPilihan.length === 0} onClick={() => setPerpBuka(true)}>Perpanjang paket</button>}
        {aktif && aksi && paketPilihan.length === 0 && <p className="meta" style={{ margin: 0 }}>Belum ada paket aktif untuk kategori ini. Buat dulu di menu Paket dan harga.</p>}
        {aktif && aksi && perpBuka && (
          <div className="surface kartu-form">
            <label className="field"><span className="label l2">Paket perpanjangan</span>
              <select value={perpPaket} onChange={(e) => setPerpPaket(e.target.value)}>{paketPilihan.map((p) => <option key={p.id} value={p.id}>{p.nama} · {rp(p.harga)}</option>)}</select></label>
            <p className="meta" style={{ margin: 0 }}>Paket baru mulai setelah masa berlaku sekarang habis (atau hari ini bila sudah lewat). Tagihan dibuat otomatis, belum lunas, jatuh tempo 7 hari.</p>
            <div className="aksi">
              <button type="button" className="btn btn-sm" disabled={sibuk || !perpPaket} onClick={() => mulai(async () => { const r = await aksi.perpanjang(murid.id, perpPaket); if (r.ok) { setPerpBuka(false); info("Paket diperpanjang. Tagihan baru dibuat."); router.refresh(); } else info(r.pesan); })}>{sibuk ? "Memproses…" : "Perpanjang sekarang"}</button>
              <button type="button" className="btn btn-2 btn-sm" onClick={() => setPerpBuka(false)}>Batal</button>
            </div>
          </div>
        )}
      </section>

      {aksi ? (
        <section className="grp">
          <h2 className="h2">Link portal murid</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Link pribadi murid aktif setelah tahap keamanan portal selesai (token disimpan sebagai hash dan bisa dicabut).</p>
        </section>
      ) : (
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
      )}

      <section className="grp">
        <h2 className="h2">Tagihan</h2>
        <div className="surface batas">
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
          <div className="surface batas">
            {murid.riwayat.map((r) => (
              <div key={r.tgl} className="item"><span className="grow">{r.tgl}</span><span className={kelasSesi[r.status]}>{namaSesi[r.status]}</span></div>
            ))}
          </div>
        )}
      </section>

      <section className="grp">
        <h2 className="h2">Catatan perkembangan</h2>
        {catatan.length === 0 ? (
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada catatan.</p>
        ) : (
          <div className="surface batas">
            {catatan.map((c, i) => (
              <div key={`${c.tgl}-${i}`} className="item" style={{ alignItems: "flex-start" }}><span className="meta" style={{ width: 46, paddingTop: 2 }}>{c.tgl}</span><span className="grow">{c.teks}</span></div>
            ))}
          </div>
        )}
        {aksi && (
          <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); const t = teksBaru.trim(); if (!t) return; mulai(async () => { const r = await aksi.tambahCatatan(murid.id, t); if (r.ok) { setCatatan((c) => [{ tgl: tglPendek(r.tgl), teks: r.teks }, ...c]); setTeksBaru(""); info("Catatan disimpan."); } else info(r.pesan); }); }}>
            <label className="field"><span className="label l2">Tambah catatan</span>
              <textarea value={teksBaru} onChange={(e) => setTeksBaru(e.target.value.slice(0, 500))} rows={3} placeholder="Perkembangan hari ini…" /></label>
            <div className="aksi"><button type="submit" className="btn btn-sm" disabled={sibuk || !bolehUbah || teksBaru.trim() === ""}>Simpan catatan</button></div>
          </form>
        )}
      </section>

      {aktif && (
        <div className="aksi">
          {konfirmasi ? (
            <>
              <button type="button" className="btn btn-2 btn-sm" disabled={sibuk} onClick={() => { if (!aksi) { setAktif(false); setKonfirmasi(false); info(`${murid.nama} dinonaktifkan.`); return; } mulai(async () => { const r = await aksi.ubahAktif(murid.id, false); setKonfirmasi(false); if (r.ok) { setAktif(r.aktif); info(`${murid.nama} dinonaktifkan.`); } else info(r.pesan); }); }}>Ya, nonaktifkan</button>
              <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasi(false)}>Batal</button>
            </>
          ) : (
            <button type="button" className="btn btn-2 btn-sm" disabled={!bolehUbah} onClick={() => setKonfirmasi(true)}>Nonaktifkan</button>
          )}
        </div>
      )}
      {!aktif && aksi && (
        <div className="aksi">
          <button type="button" className="btn btn-sm" disabled={sibuk || !bolehUbah} onClick={() => mulai(async () => { const r = await aksi.ubahAktif(murid.id, true); if (r.ok) { setAktif(r.aktif); info(`${murid.nama} diaktifkan lagi.`); } else info(r.pesan); })}>Aktifkan lagi</button>
        </div>
      )}
      <Link href="/app/murid" className="link" style={{ alignSelf: "center" }}>Kembali ke daftar murid</Link>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
