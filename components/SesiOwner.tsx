"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { inisial } from "@/lib/format";
import type { SlotJadwal } from "@/lib/jadwal";
import { selisih } from "@/lib/langganan";
import { setujuiMinta, tolakMinta, type PermintaanGanti } from "@/lib/pelatih";
import { labelBayar } from "@/lib/murid";
import {
  batalkanGanti, batalkanPengganti, gantiPelatih, hakPengganti, hariPekan, jadwalkanPengganti, labelPekan, labelTanggal, opsiPengganti, ringkasHari,
  sesiPadaTanggal, sisaSesiKini, tambahHari, tandai,
  type Absensi, type GantiPelatih, type Keadaan, type Konteks, type MuridSesi, type StatusAbsen,
} from "@/lib/sesi";

interface Pengajar { id: string; nama: string }
interface Props {
  jadwal: SlotJadwal[];
  pesertaTetap: Record<string, string[]>;
  murid: MuridSesi[];
  pengajar: Pengajar[];
  hariIni: string;
  absensiAwal: Absensi;
  istilah: { murid: string; sesi: string };
}

const PILIHAN: { status: StatusAbsen; label: string }[] = [
  { status: "hadir", label: "Hadir" },
  { status: "izin", label: "Izin" },
  { status: "alpa", label: "Alpa" },
];
const MAKS_OPSI = 6;
const KUNCI_GANTI = "kk-ganti-pelatih";
const KUNCI_MINTA = "kk-minta-ganti";
const GULIR_MULAI = 2; // lebih dari ini, daftar murid digulir di dalam kartu

export function SesiOwner({ jadwal, pesertaTetap, murid, pengajar, hariIni, absensiAwal, istilah }: Props) {
  const [tanggal, setTanggal] = useState(hariIni);
  const [pid, setPid] = useState<string>("semua");
  const [kead, setKead] = useState<Keadaan>({ absensi: absensiAwal, pengganti: [] });
  const [aturanPengganti, setAturanPengganti] = useState(true);
  const [bukaPengganti, setBukaPengganti] = useState<string | null>(null);
  const [gantiList, setGantiList] = useState<GantiPelatih[]>([]);
  const [bukaGanti, setBukaGanti] = useState<string | null>(null);
  const [minta, setMinta] = useState<PermintaanGanti[]>([]);
  const [toast, setToast] = useState<{ teks: string; galat: boolean } | null>(null);

  useEffect(() => {
    try {
      const q = JSON.parse(localStorage.getItem(KUNCI_MINTA) ?? "null") as PermintaanGanti[] | null;
      if (Array.isArray(q)) setMinta(q);
      const g = JSON.parse(localStorage.getItem(KUNCI_GANTI) ?? "null") as GantiPelatih[] | null;
      if (Array.isArray(g)) setGantiList(g.filter((x) => x && typeof x.slotId === "string" && typeof x.tanggal === "string" && typeof x.pelatihId === "string"));
      const d = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { aturan?: { sesiPengganti?: unknown } } | null;
      if (typeof d?.aturan?.sesiPengganti === "boolean") setAturanPengganti(d.aturan.sesiPengganti);
    } catch {}
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const muridMap = useMemo(() => Object.fromEntries(murid.map((m) => [m.id, m])), [murid]);
  const k: Konteks = useMemo(() => ({ hariIni, aturanPengganti, murid: muridMap, awal: absensiAwal }), [hariIni, aturanPengganti, muridMap, absensiAwal]);
  const namaPengajar = (id: string) => pengajar.find((p) => p.id === id)?.nama ?? "";

  const pekan = hariPekan(tanggal);
  const sesiHari = sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, tanggal, gantiList).filter((s) => pid === "semua" || s.pelatihId === pid);
  const ringkas = ringkasHari(sesiHari, kead.absensi);
  const sudahLewat = tanggal <= hariIni;

  function hasil(h: { ok: true; keadaan: Keadaan; pesan: string } | { ok: false; galat: string }) {
    if (h.ok) { setKead(h.keadaan); setToast({ teks: h.pesan, galat: false }); }
    else setToast({ teks: h.galat, galat: true });
    return h.ok;
  }

  function ketuk(kunci: string, status: StatusAbsen) {
    hasil(tandai(k, kead, kunci, status));
  }

  function pilihPengganti(dariKunci: string, slotId: string, tgl: string) {
    if (hasil(jadwalkanPengganti(k, kead, jadwal, pesertaTetap, dariKunci, slotId, tgl, `pg-${Date.now()}`))) setBukaPengganti(null);
  }

  function simpanGanti(g: GantiPelatih[]) {
    setGantiList(g);
    try { localStorage.setItem(KUNCI_GANTI, JSON.stringify(g)); } catch {}
  }

  function simpanMinta(q: PermintaanGanti[]) {
    setMinta(q);
    try { localStorage.setItem(KUNCI_MINTA, JSON.stringify(q)); } catch {}
  }

  function putuskan(id: string, setuju: boolean) {
    if (setuju) {
      const h = setujuiMinta({ hariIni, jadwal, ganti: gantiList, pelatih: pengajar, permintaan: minta }, id);
      if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
      simpanGanti(h.ganti); simpanMinta(h.permintaan); setToast({ teks: `Disetujui. ${h.pesan}`, galat: false });
    } else {
      const h = tolakMinta(minta, id, hariIni);
      if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
      simpanMinta(h.permintaan); setToast({ teks: "Permintaan ditolak, pelatih tetap memegang sesinya.", galat: false });
    }
  }

  const menunggu = minta.filter((m) => m.status === "menunggu").sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  function pilihGanti(slotId: string, pelatihBaruId: string) {
    const h = gantiPelatih(jadwal, gantiList, pengajar, hariIni, slotId, tanggal, pelatihBaruId);
    if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
    simpanGanti(h.ganti); setBukaGanti(null); setToast({ teks: h.pesan, galat: false });
  }

  const ringkasTeks = (() => {
    if (ringkas.sesi === 0) return "Tidak ada sesi";
    const bagian = [`${ringkas.sesi} ${istilah.sesi}`, `${ringkas.peserta} ${istilah.murid}`];
    if (sudahLewat && ringkas.belum > 0) bagian.push(`${ringkas.belum} belum diabsen`);
    else if (ringkas.peserta > 0 && ringkas.belum === 0) bagian.push("semua sudah diabsen");
    return bagian.join(" · ");
  })();

  return (
    <>
      <div className="bulan" role="group" aria-label="Pilih pekan">
        <button type="button" className="circ" onClick={() => { setTanggal(tambahHari(tanggal, -7)); setBukaPengganti(null); }} aria-label="Pekan sebelumnya"><Icon name="back" /></button>
        <b aria-live="polite" style={{ fontSize: 14 }}>{labelPekan(tanggal)}</b>
        <button type="button" className="circ" onClick={() => { setTanggal(tambahHari(tanggal, 7)); setBukaPengganti(null); }} aria-label="Pekan berikutnya"><Icon name="arrow" /></button>
      </div>

      <div className="days d7" role="tablist" aria-label="Hari">
        {pekan.map((h) => {
          const ada = sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, h.tgl, gantiList).some((s) => pid === "semua" || s.pelatihId === pid);
          return (
            <button key={h.tgl} type="button" role="tab" aria-selected={tanggal === h.tgl} aria-label={`${labelTanggal(h.tgl)}${h.tgl === hariIni ? ", hari ini" : ""}`}
              className={tanggal === h.tgl ? "hari on" : "hari"} onClick={() => { setTanggal(h.tgl); setBukaPengganti(null); }}>
              <small>{h.nama}</small><b>{h.angka}</b><i className={ada ? "titik" : "titik titik-off"} />
            </button>
          );
        })}
      </div>

      {pengajar.length > 1 && (
        <div className="seg" role="tablist" aria-label="Pengajar">
          <button type="button" role="tab" aria-selected={pid === "semua"} className={pid === "semua" ? "on" : ""} onClick={() => { setPid("semua"); setBukaPengganti(null); }}>Semua</button>
          {pengajar.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={pid === p.id} className={pid === p.id ? "on" : ""} onClick={() => { setPid(p.id); setBukaPengganti(null); }}>{p.nama}</button>
          ))}
        </div>
      )}

      {menunggu.length > 0 && (
        <section className="panel hero-usaha" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Permintaan ganti pelatih">
          <h2 className="h2" style={{ color: "var(--panel-text)", fontSize: 15 }}>Permintaan ganti pelatih · {menunggu.length}</h2>
          {menunggu.map((m) => {
            const slot = jadwal.find((x) => x.id === m.slotId);
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--panel-border)" }}>
                <span><b>{namaPengajar(m.dariId)}</b> minta menyerahkan <b>{labelTanggal(m.tanggal)} · {slot?.jam} {slot?.nama}</b> ke <b>{namaPengajar(m.keId)}</b>.</span>
                <span className="meta">Alasan: {m.alasan}</span>
                <div className="aksi">
                  <button type="button" className="btn btn-sm" onClick={() => putuskan(m.id, true)}>Setujui</button>
                  <button type="button" className="btn btn-2 btn-sm" onClick={() => putuskan(m.id, false)}>Tolak</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="sec-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <h2 className="h2" style={{ fontSize: 14 }}>{labelTanggal(tanggal)}{tanggal === hariIni ? " · hari ini" : ""}</h2>
        <span className="meta">{ringkasTeks}</span>
      </div>

      {sesiHari.length === 0 ? (
        <div className="surface kosong">
          <span className="circ"><Icon name="cal" /></span>
          <h2 className="h2">Tidak ada {istilah.sesi} di hari ini</h2>
          <p className="sub" style={{ margin: 0, fontSize: 13 }}>Atur jam latihan tetap di Jadwal.</p>
          <Link href="/app/jadwal" className="btn btn-2">Buka jadwal</Link>
        </div>
      ) : (
        sesiHari.map((s) => {
          const belum = s.peserta.filter((p) => !kead.absensi[p.kunci]).length;
          const terisi = s.peserta.filter((p) => kead.absensi[p.kunci] !== "izin").length;
          const selesai = s.peserta.length > 0 && belum === 0;
          return (
            <section key={s.slot.id} className="surface" aria-label={`${s.slot.nama} ${s.slot.jam}`}>
              <div className="sesi-head">
                <span className="time">{s.slot.jam}</span>
                <span className="grow">
                  <span className="name" style={{ display: "block" }}>{s.slot.nama}</span>
                  <span className="meta">{s.slot.durasi} mnt{s.slot.lokasi ? ` · ${s.slot.lokasi}` : ""} · {namaPengajar(s.pelatihId)}{s.diganti ? <b style={{ color: "var(--accent-text)" }}> · ganti sekali ini</b> : null}</span>
                </span>
                {selesai ? <span className="st st-ok">Selesai</span>
                  : sudahLewat && belum > 0 ? <span className="st st-few">{belum} belum</span>
                  : <span className="st st-free">{terisi}/{s.slot.kuota}</span>}
              </div>

              {pengajar.length > 1 && tanggal >= hariIni && (
                <div className="sesi-aksi">
                  <button type="button" className="btn btn-2 btn-sm" aria-expanded={bukaGanti === s.slot.id} onClick={() => setBukaGanti(bukaGanti === s.slot.id ? null : s.slot.id)}>Ganti pelatih (sekali ini)</button>
                  {s.diganti && <button type="button" className="btn btn-2 btn-sm" onClick={() => { simpanGanti(batalkanGanti(gantiList, s.slot.id, tanggal)); setToast({ teks: `Sesi ${s.slot.jam} dikembalikan ke ${namaPengajar(s.slot.pengajarId)}.`, galat: false }); }}>Kembalikan ke {namaPengajar(s.slot.pengajarId)}</button>}
                </div>
              )}
              {bukaGanti === s.slot.id && (
                <div className="opsi-pengganti" style={{ margin: "0 12px 12px" }}>
                  <span className="meta">Hanya untuk {labelTanggal(tanggal)} · {s.slot.jam}. Minggu berikutnya kembali ke {namaPengajar(s.slot.pengajarId)}.</span>
                  {pengajar.filter((x) => x.id !== s.pelatihId).map((x) => (
                    <button key={x.id} type="button" className="opt" onClick={() => pilihGanti(s.slot.id, x.id)}>
                      <span className="grow" style={{ textAlign: "left" }}><b style={{ display: "block" }}>{x.nama}</b><span className="meta">Pegang sesi {s.slot.jam} {s.slot.nama}</span></span>
                      <Icon name="arrow" />
                    </button>
                  ))}
                </div>
              )}

              {s.peserta.length > GULIR_MULAI && <div className="gulir-info meta">{s.peserta.length} {istilah.murid} · gulir untuk melihat semua</div>}
              {s.peserta.length === 0 ? (
                <div className="sesi-kosong meta">Belum ada {istilah.murid} di {istilah.sesi} ini.</div>
              ) : (
                <div className={s.peserta.length > GULIR_MULAI ? "peserta-gulir" : undefined} {...(s.peserta.length > GULIR_MULAI ? { tabIndex: 0, role: "region", "aria-label": `Daftar ${istilah.murid} ${s.slot.nama} ${s.slot.jam}, gulir untuk melihat semua` } : {})}>
                {s.peserta.map((p) => {
                  const m = muridMap[p.muridId]!;
                  const status = kead.absensi[p.kunci];
                  const sisa = sisaSesiKini(k, kead, p.muridId);
                  const hak = hakPengganti(k, kead, p.muridId);
                  const terkait = kead.pengganti.find((x) => x.dariKunci === p.kunci);
                  const byr = labelBayar(m.bayar as "lunas" | "belum" | "menunggu_verifikasi");
                  const terbuka = bukaPengganti === p.kunci;
                  const opsi = terbuka ? opsiPengganti(k, kead, jadwal, pesertaTetap, p.muridId) : [];
                  return (
                    <div key={p.kunci} className="peserta">
                      <div className="prow">
                        <span className="avatar s" aria-hidden="true">{inisial(m.nama)}</span>
                        <span className="grow">
                          <span className="name" style={{ display: "block" }}>
                            <Link href={`/app/murid/${m.id}`}>{m.nama}</Link>
                            {p.pengganti && <span className="st st-few" style={{ marginLeft: 8 }}>Pengganti</span>}
                          </span>
                          <span className="meta">Sisa {sisa} dari {m.totalSesi} · {selisih(tanggal, m.berlakuSampai) < 0 ? <span style={{ color: "var(--accent-text)" }}>paket berakhir {labelTanggal(m.berlakuSampai)}</span> : selisih(tanggal, m.berlakuSampai) <= 7 ? <span style={{ color: "var(--accent-text)" }}>berakhir {labelTanggal(m.berlakuSampai)}</span> : <>sampai {labelTanggal(m.berlakuSampai)}</>}{m.bayar !== "lunas" ? " · " : ""}{m.bayar !== "lunas" && <span style={{ color: "var(--accent-text)" }}>{byr.teks}</span>}</span>
                        </span>
                        {sisa <= 0 && <span className="st st-full">Paket habis</span>}
                      </div>

                      <div className="absen" role="group" aria-label={`Absen ${m.nama}`}>
                        {PILIHAN.map((o) => {
                          const aktif = status === o.status;
                          return (
                            <button key={o.status} type="button" className={`ab ab-${o.status}`} aria-pressed={aktif} onClick={() => ketuk(p.kunci, o.status)}>
                              {aktif && <Icon name="check" />}{o.label}
                            </button>
                          );
                        })}
                      </div>

                      {sisa <= 0 && (
                        <div className="pengganti-info">
                          <span className="meta">Sisa sesi habis, tawarkan perpanjang paket.</span>
                          <Link href={`/app/murid/${m.id}`} className="btn btn-2 btn-sm">Perpanjang</Link>
                        </div>
                      )}

                      {status === "izin" && !p.pengganti && aturanPengganti && (
                        terkait ? (
                          <div className="pengganti-info">
                            <span className="meta">Pengganti: <b>{labelTanggal(terkait.tanggal)} · {jadwal.find((x) => x.id === terkait.slotId)?.jam}</b></span>
                            <button type="button" className="btn btn-2 btn-sm" onClick={() => hasil(batalkanPengganti(kead, terkait.id))}>Batalkan</button>
                          </div>
                        ) : hak > 0 ? (
                          <div className="pengganti-info">
                            <span className="meta">Dapat {hak} {istilah.sesi} pengganti</span>
                            <button type="button" className="btn btn-2 btn-sm" aria-expanded={terbuka} onClick={() => setBukaPengganti(terbuka ? null : p.kunci)}>{terbuka ? "Tutup" : "Jadwalkan pengganti"}</button>
                          </div>
                        ) : null
                      )}

                      {terbuka && (
                        <div className="opsi-pengganti">
                          {opsi.length === 0 ? (
                            <p className="meta" style={{ margin: 0 }}>Belum ada slot kosong sampai paket berakhir ({labelTanggal(m.berlakuSampai)}). Tambah slot di Jadwal atau perpanjang paket.</p>
                          ) : (
                            <>
                              <span className="meta">Pilih jadwal pengganti</span>
                              {opsi.slice(0, MAKS_OPSI).map((o) => (
                                <button key={`${o.slot.id}${o.tanggal}`} type="button" className="opt" onClick={() => pilihPengganti(p.kunci, o.slot.id, o.tanggal)}>
                                  <span className="grow" style={{ textAlign: "left" }}>
                                    <b style={{ display: "block" }}>{labelTanggal(o.tanggal)} · {o.slot.jam}</b>
                                    <span className="meta">{o.slot.nama} · {namaPengajar(o.slot.pengajarId)} · sisa {o.sisaTempat} tempat</span>
                                  </span>
                                  <Icon name="arrow" />
                                </button>
                              ))}
                              {opsi.length > MAKS_OPSI && <span className="meta">dan {opsi.length - MAKS_OPSI} pilihan lain, lebih jauh tanggalnya</span>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              )}
            </section>
          );
        })
      )}

      <p className="meta" style={{ margin: 0 }}>
        Hadir dan alpa memotong sisa sesi. Izin tidak memotong{aturanPengganti ? " dan memberi hak 1 sesi pengganti" : ", tapi aturan usaha ini tanpa sesi pengganti jadi izin tetap terhitung"}. Masa berlaku paket diatur per paket di menu Paket dan harga. Ketuk tanda yang sama sekali lagi untuk membatalkan.
      </p>

      {toast && <div className="toast" role={toast.galat ? "alert" : "status"}>{toast.teks}</div>}
    </>
  );
}
