"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { linkWa } from "@/lib/beranda";
import { selisih } from "@/lib/langganan";
import { PAKET, labelPlan } from "@/lib/paketLangganan";
import type { Fase } from "@/lib/langganan";
import { ALASAN_LIHAT_MIN, CATATAN_USAHA_MAKS, MODE_LIHAT_MENIT, NAMA_FASE, URUT_FASE, aksesDariFase, faseUsaha, linkPengingatWa, ringkasStatus, modeLihatAktif, telat, terakhirAktifLabel, tidakAktif } from "@/lib/platform";
import { kelasFase, kelasTagihan, labelFase, labelTagihan, tgl, useRp, waktuAudit } from "./umum";
import { FormAktivasi } from "./FormAktivasi";
import { usePlatform } from "./PlatformProvider";


export function DetailUsahaPlatform({ id }: { id: string }) {
  const p = usePlatform();
  const rp = useRp();
  const u = p.usaha.find((x) => x.id === id);
  const [catatan, setCatatan] = useState(p.catatan[id] ?? "");
  const [alasan, setAlasan] = useState("");
  const [bukaLihat, setBukaLihat] = useState(false);
  const [galatLihat, setGalatLihat] = useState("");
  const [aktivasi, setAktivasi] = useState<string | null>(null);
  const [bukaStatus, setBukaStatus] = useState(false);
  const [fStatus, setFStatus] = useState<{ fase: Fase; alasan: string; sampai: string }>({ fase: "aktif", alasan: "", sampai: "" });
  const [galatStatus, setGalatStatus] = useState<Partial<Record<"fase" | "alasan" | "sampai" | "umum", string>>>({});
  const [toast, setToast] = useState<{ teks: string; galat: boolean } | null>(null);
  const [tik, setTik] = useState(0);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3800); return () => clearTimeout(t); }, [toast]);
  const berakhir = p.modeLihat[id] ?? null;
  useEffect(() => { if (!berakhir) return; const t = setInterval(() => setTik((n) => n + 1), 15000); return () => clearInterval(t); }, [berakhir]);

  if (!u) return <div className="surface kosong"><h2 className="h2">Usaha tidak ditemukan</h2><Link href="/platform/usaha" className="btn btn-2">Kembali ke daftar</Link></div>;

  const fase = faseUsaha(u, p.hari);
  const st = ringkasStatus(u, p.hari);
  const aktifLihat = modeLihatAktif(berakhir, p.sekarang());
  void tik;
  const menitSisa = berakhir ? Math.max(0, Math.ceil((Date.parse(berakhir) - Date.parse(p.sekarang())) / 60000)) : 0;
  const tagihan = p.tagihan.filter((t) => t.usahaId === id).sort((a, b) => b.terbit.localeCompare(a.terbit) || b.orderId.localeCompare(a.orderId));
  const audit = p.audit.filter((a) => a.usahaId === id);
  const akhir = u.periodeBerakhir ?? u.trialBerakhir;
  const sisa = selisih(p.hari, akhir);
  const info = (teks: string, galat = false) => setToast({ teks, galat });
  const waPemilik = linkWa(u.noWa, `Halo ${u.pemilik}, ini dari KelolaKelas.`);
  const paket = PAKET[u.plan];
  const batasMurid = paket.batas.murid;
  const batasPelatih = paket.batas.pelatih;

  async function mulaiLihat() {
    const h = await p.mulaiLihat(id, alasan);
    if (!h.ok) { setGalatLihat(h.galat); return; }
    setGalatLihat(""); setBukaLihat(false); setAlasan(""); info(h.pesan);
  }
  function bukaFormStatus() {
    setFStatus({ fase: st.manual?.fase ?? st.efektif, alasan: st.manual?.alasan ?? "", sampai: st.manual?.sampai ?? "" });
    setGalatStatus({}); setBukaStatus(true);
  }
  function simpanStatus() {
    const h = p.aturStatus(id, { fase: fStatus.fase, alasan: fStatus.alasan, sampai: fStatus.sampai || null });
    if (!h.ok) { setGalatStatus(h.galat); return; }
    setBukaStatus(false); setGalatStatus({}); info(`Status diatur manual: ${NAMA_FASE[fStatus.fase]}. Tercatat di audit log.`);
  }
  function pengingat(tId: string) {
    const h = p.catatPengingat(tId, "wa");
    if (!h.ok) { info(h.galat, true); return false; }
    return true;
  }

  return (
    <>
      <div className="plat-head">
        <div>
          <Link href="/platform/usaha" className="link" style={{ color: "var(--head-text-2)" }}><Icon name="back" />Semua usaha</Link>
          <h1 className="title" style={{ marginTop: 6 }}>{u.nama}</h1>
          <div className="label">{u.pemilik} · {u.kategori} · {u.kota}</div>
        </div>
        <span className="plat-aksi">
          <span className={kelasFase[fase]}>{labelFase[fase]}</span>
          {st.manual && <span className="st st-few" title="Diatur manual oleh admin">Manual</span>}
          <span className="st st-free">{labelPlan(u.plan)}</span>
          {tidakAktif(u, p.hari) && <span className="st st-few">Tidak aktif {terakhirAktifLabel(u.terakhirAktif, p.hari)}</span>}
          {waPemilik && <a href={waPemilik} target="_blank" rel="noopener noreferrer" className="btn btn-2 btn-sm"><Icon name="wa" />WA pemilik</a>}
        </span>
      </div>

      <div className="plat-kpis">
        <div className="surface plat-kpi"><span className="meta">Berlaku sampai</span><span className="angka">{tgl(akhir)}</span><span className="meta">{sisa >= 0 ? `${sisa} hari lagi` : `lewat ${-sisa} hari`}{u.periodeBerakhir ? "" : " · masa trial"}</span></div>
        <div className="surface plat-kpi"><span className="meta">Murid aktif</span><span className="angka">{u.muridAktif}<span className="meta"> / {u.murid}</span></span>{Number.isFinite(batasMurid) ? <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (u.muridAktif / batasMurid) * 100)}%` }} /></div> : null}<span className="meta">{Number.isFinite(batasMurid) ? `Batas ${labelPlan(u.plan)} ${batasMurid.toLocaleString("id-ID")} murid` : "Murid tanpa batas"}</span></div>
        <div className="surface plat-kpi"><span className="meta">Pengajar</span><span className="angka">{u.pengajar}</span><span className="meta">{Number.isFinite(batasPelatih) ? `Batas ${labelPlan(u.plan)} ${batasPelatih}` : "Pelatih tanpa batas"}</span></div>
        <div className="surface plat-kpi"><span className="meta">Sesi bulan ini</span><span className="angka">{u.sesiBulanIni}</span><span className="meta">Terakhir masuk {terakhirAktifLabel(u.terakhirAktif, p.hari).toLowerCase()} · daftar {tgl(u.dibuat)}</span></div>
      </div>

      <section className="grp" id="status" style={{ scrollMarginTop: 16 }}>
        <h2 className="h2" style={{ color: "var(--head-text)" }}>Status langganan</h2>
        <div className="surface kartu-form">
          <div className="plat-status-baris">
            <div><span className="meta">Otomatis (dihitung dari tanggal)</span><span className={kelasFase[st.otomatis]}>{labelFase[st.otomatis]}</span></div>
            <div><span className="meta">Dipakai sekarang</span><span style={{ display: "inline-flex", gap: 6 }}><span className={kelasFase[st.efektif]}>{labelFase[st.efektif]}</span>{st.manual && <span className="st st-few">Manual</span>}</span></div>
          </div>
          <p className="meta" style={{ margin: 0, lineHeight: 1.5 }}>
            {st.manual
              ? <>Diatur manual sejak {tgl(st.manual.diubah)}, {st.manual.sampai ? `berlaku sampai ${tgl(st.manual.sampai)} lalu kembali otomatis` : "berlaku sampai kamu mengembalikannya"}. Alasan: {st.manual.alasan}</>
              : st.manualKedaluwarsa ? "Pengaturan manual sudah berakhir, status kembali otomatis mengikuti tanggal." : "Status mengikuti tanggal secara otomatis (trial, aktif, jatuh tempo, ditangguhkan, berhenti). Kamu bisa menimpanya dengan tangan kapan saja."}
          </p>
          {bukaStatus ? (
            <form className="plat-form" style={{ margin: "0 -16px -16px", borderRadius: "0 0 var(--r) var(--r)" }} onSubmit={(e) => { e.preventDefault(); simpanStatus(); }} noValidate>
              <label className="field"><span className="label l2">Status</span>
                <select value={fStatus.fase} onChange={(e) => { setFStatus({ ...fStatus, fase: e.target.value as Fase }); setGalatStatus((g) => ({ ...g, fase: undefined })); }}>
                  {URUT_FASE.map((f) => <option key={f} value={f}>{NAMA_FASE[f]}</option>)}
                </select>
                <span className="meta">{({ penuh: "Akses penuh.", penuh_peringatan: "Akses penuh dengan peringatan bayar.", hanya_lihat: "Hanya lihat dan ekspor; pendaftaran murid publik ditutup.", ditutup: "Akses ditutup." } as const)[aksesDariFase(fStatus.fase)]}</span>
                {galatStatus.fase && <span className="galat" role="alert">{galatStatus.fase}</span>}</label>
              <label className="field"><span className="label l2">Berlaku sampai (kosong = sampai dikembalikan)</span>
                <input type="date" min={p.hari} value={fStatus.sampai} onChange={(e) => { setFStatus({ ...fStatus, sampai: e.target.value }); setGalatStatus((g) => ({ ...g, sampai: undefined })); }} />
                {galatStatus.sampai && <span className="galat" role="alert">{galatStatus.sampai}</span>}</label>
              <label className="field lebar"><span className="label l2">Alasan (tercatat di audit log)</span>
                <input value={fStatus.alasan} placeholder="Contoh: owner minta waktu, janji bayar 30 Nov" onChange={(e) => { setFStatus({ ...fStatus, alasan: e.target.value }); setGalatStatus((g) => ({ ...g, alasan: undefined })); }} />
                {galatStatus.alasan && <span className="galat" role="alert">{galatStatus.alasan}</span>}</label>
              <div className="aksi lebar"><button type="submit" className="btn btn-sm">Simpan status manual</button><button type="button" className="btn btn-2 btn-sm" onClick={() => { setBukaStatus(false); setGalatStatus({}); }}>Batal</button></div>
            </form>
          ) : (
            <div className="aksi">
              <button type="button" className="btn btn-sm" onClick={bukaFormStatus}>{st.manual ? "Ubah pengaturan manual" : "Atur status manual"}</button>
              {st.manual && <button type="button" className="btn btn-2 btn-sm" onClick={() => { const h = p.kembalikanStatus(id); info(h.ok ? h.pesan : h.galat, !h.ok); }}>Kembalikan ke otomatis</button>}
            </div>
          )}
        </div>
      </section>

      <section className="grp">
        <h2 className="h2" style={{ color: "var(--head-text)" }}>Tagihan langganan</h2>
        <div className="surface plat-wrap batas-tabel">
          {tagihan.length === 0 ? <div className="kosong"><p className="sub" style={{ margin: 0 }}>Belum ada tagihan. Tagihan pertama terbit di hari ke-10 trial.</p></div> : (
            <table className="plat-tbl">
              <thead><tr><th>Order</th><th>Paket</th><th className="num">Nominal</th><th>Tempo</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {tagihan.map((t) => (
                  <Fragment key={t.id}>
                    <tr>
                      <td className="utama"><b>{t.orderId}</b>{t.kodePromo && <span className="meta" style={{ display: "block" }}>Promo {t.kodePromo}</span>}</td>
                      <td data-label="Paket">{labelPlan(t.plan)} · {t.bulan === 12 ? "1 tahun" : `${t.bulan} bln`}</td>
                      <td data-label="Nominal" className="num">{rp(t.nominal)}</td>
                      <td data-label="Tempo">{tgl(t.tempo)}</td>
                      <td data-label="Status"><span className={kelasTagihan[t.status]}>{telat(t, p.hari) ? "Telat" : labelTagihan[t.status]}</span></td>
                      <td className="aksi-sel">
                        {(t.status === "belum_bayar" || t.status === "kedaluwarsa") && (
                          <span className="plat-aksi">
                            <button type="button" className="btn btn-sm" aria-expanded={aktivasi === t.id} onClick={() => setAktivasi(aktivasi === t.id ? null : t.id)}>Aktivasi manual</button>
                            {t.status === "belum_bayar" && (() => { const wa = linkPengingatWa(u, t, p.hari); return wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-2 btn-sm" onClick={(e) => { if (!pengingat(t.id)) e.preventDefault(); }}><Icon name="wa" />Ingatkan</a> : null; })()}
                          </span>
                        )}
                        {t.status === "lunas" && <span className="meta">{t.metode === "transfer_bank" ? "Transfer manual" : "DuitKu"} · {tgl(t.dibayar)}</span>}
                      </td>
                    </tr>
                    {aktivasi === t.id && <tr><td colSpan={6} style={{ padding: 0 }}><FormAktivasi tagihan={t} usaha={u} onBatal={() => setAktivasi(null)} onSelesai={(m) => { setAktivasi(null); info(m); }} /></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="plat-2col">
        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Mode lihat</h2>
          {aktifLihat ? (
            <div className="plat-lihat" role="region" aria-label="Mode lihat aktif">
              <span className="st st-ok" style={{ alignSelf: "flex-start" }}>Mode lihat aktif · sisa {menitSisa} menit · tercatat</span>
              <dl className="mini-dl">
                <dt>Murid aktif / total</dt><dd>{u.muridAktif} / {u.murid}</dd>
                <dt>Pengajar</dt><dd>{u.pengajar}</dd>
                <dt>Sesi bulan ini</dt><dd>{u.sesiBulanIni}</dd>
                <dt>Halaman publik</dt><dd>/u/{u.slug}</dd>
                <dt>Email pemilik</dt><dd>{u.email}</dd>
              </dl>
              <p className="meta" style={{ margin: 0 }}>Hanya melihat, tidak bisa mengubah. Di versi sambungan database, tombol ini membuka panel usaha dalam mode baca saja dan server menolak membaca data bila tidak ada catatan mode lihat yang masih berlaku.</p>
              <div className="aksi"><button type="button" className="btn btn-2 btn-sm" onClick={() => p.akhiriLihat(id)}>Akhiri mode lihat</button></div>
            </div>
          ) : bukaLihat ? (
            <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); mulaiLihat(); }} noValidate>
              <p className="meta" style={{ margin: 0 }}>Untuk membantu setup. Alasanmu dicatat di audit log, mode lihat habis sendiri setelah {MODE_LIHAT_MENIT} menit.</p>
              <label className="field"><span className="label l2">Alasan (min. {ALASAN_LIHAT_MIN} huruf)</span>
                <input value={alasan} onChange={(e) => { setAlasan(e.target.value); setGalatLihat(""); }} placeholder="Contoh: bantu setup jadwal, diminta owner lewat WA" />
                {galatLihat && <span className="galat" role="alert">{galatLihat}</span>}</label>
              <div className="aksi"><button type="submit" className="btn btn-sm">Buka dan catat</button><button type="button" className="btn btn-2 btn-sm" onClick={() => { setBukaLihat(false); setGalatLihat(""); }}>Batal</button></div>
            </form>
          ) : (
            <div className="surface kartu-form">
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Lihat isi usaha ini untuk membantu setup. Wajib ada alasan, tercatat, dan hanya {MODE_LIHAT_MENIT} menit.</p>
              <div className="aksi"><button type="button" className="btn btn-sm" onClick={() => setBukaLihat(true)}>Buka mode lihat</button></div>
            </div>
          )}
        </section>

        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Catatan pribadi</h2>
          <form className="surface kartu-form" onSubmit={async (e) => { e.preventDefault(); const h = await p.simpanCatatan(id, catatan); info(h.ok ? h.pesan : h.galat, !h.ok); }}>
            <label className="field"><span className="label l2">Hanya kamu yang melihat ini</span>
              <textarea value={catatan} maxLength={CATATAN_USAHA_MAKS} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: minta fitur laporan bulanan, ingatkan upgrade Pro setelah 30 murid" />
              <span className="meta" style={{ textAlign: "right" }}>{catatan.length}/{CATATAN_USAHA_MAKS}</span></label>
            <div className="aksi"><button type="submit" className="btn btn-sm">Simpan catatan</button></div>
          </form>
        </section>
      </div>

      <section className="grp">
        <h2 className="h2" style={{ color: "var(--head-text)" }}>Audit log usaha ini</h2>
        <div className="surface plat-list batas">
          {audit.length === 0 ? <div className="sub">Belum ada tindakan admin untuk usaha ini.</div> : audit.map((a) => (
            <div key={a.id}><span className="name" style={{ display: "block", whiteSpace: "normal" }}>{a.ringkas}</span><span className="meta">{waktuAudit(a.waktu)}{a.alasan ? ` · alasan: ${a.alasan}` : ""}</span></div>
          ))}
        </div>
      </section>

      {toast && <div className="toast" role={toast.galat ? "alert" : "status"}>{toast.teks}</div>}
    </>
  );
}
