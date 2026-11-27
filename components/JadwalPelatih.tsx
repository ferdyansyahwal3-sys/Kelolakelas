"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { inisial, tglPendek } from "@/lib/format";
import type { SlotJadwal } from "@/lib/jadwal";
import { labelBayar } from "@/lib/murid";
import { ajukanGanti, ALASAN_MAKS, batalkanMinta, CATATAN_MAKS, KUNCI_PINDAH, validasiCatatan, validasiTukar, type GalatMinta, type GalatTukar, type PengajuanTukar, type PermintaanGanti } from "@/lib/pelatih";
import {
  hakPengganti, labelPekan, labelTanggal, hariPekan, ringkasHari, sesiDipindahKeluar, sesiPadaTanggal, sisaSesiKini, tambahHari,
  tandai, tandaiSemuaHadir, type Absensi, type GantiPelatih, type Keadaan, type Konteks, type MuridSesi, type Pengganti, type PindahJadwal, type StatusAbsen,
} from "@/lib/sesi";

export const KUNCI_CATATAN = "kk-catatan-pelatih";
export const KUNCI_TUKAR = "kk-tukar-jadwal";
export const KUNCI_MINTA = "kk-minta-ganti";
const KUNCI_GANTI = "kk-ganti-pelatih";
const GULIR_MULAI = 2;

type Catatan = Record<string, { tgl: string; teks: string }[]>;
interface Props {
  jadwal: SlotJadwal[];
  pesertaTetap: Record<string, string[]>;
  murid: MuridSesi[];
  catatanAwal: Catatan;
  saya: { id: string; nama: string };
  hariIni: string;
  absensiAwal: Absensi;
  pengajar: { id: string; nama: string }[];
  gantiAwal?: GantiPelatih[];
  /** Panel asli: absen dan catatan disimpan ke database. Tanpa ini = hanya lokal (demo). */
  aksiAbsen?: (jadwalId: string, tanggal: string, muridId: string, status: StatusAbsen | null) => Promise<{ ok: true } | { ok: false; pesan: string }>;
  aksiCatatan?: (muridId: string, teks: string) => Promise<{ ok: true } | { ok: false; pesan: string }>;
  /** Panel asli (B3b): adanya `mintaAwal` = mode database (permintaan ganti, pengajuan tukar, pemindahan, murid pengganti dari server). Tanpa itu (demo) lokal. */
  mintaAwal?: PermintaanGanti[];
  tukarAwal?: PengajuanTukar[];
  pindahAwal?: PindahJadwal[];
  penggantiAwal?: Pengganti[];
  aturanPenggantiAwal?: boolean;
  aksiJadwal?: {
    ajukanMinta: (jadwalId: string, tanggal: string, keId: string, alasan: string) => Promise<AksiJ>;
    tarikMinta: (id: string) => Promise<AksiJ>;
    ajukanTukar: (jadwalId: string, tanggalAsal: string, tanggalBaru: string, jamBaru: string, alasan: string) => Promise<AksiJ>;
    batalkanTukar: (id: string) => Promise<AksiJ>;
  };
}
type AksiJ = { ok: true; id?: string } | { ok: false; pesan: string };
const TUTUP_DB = "Akses pengubahan data ditutup karena langgananmu belum aktif. Hubungi pemilik usaha.";

const PILIHAN: { status: StatusAbsen; label: string }[] = [
  { status: "hadir", label: "Hadir" },
  { status: "izin", label: "Izin" },
  { status: "alpa", label: "Alpa" },
];
const STATUS_TUKAR = { menunggu: "Menunggu persetujuan pemilik", disetujui: "Disetujui", ditolak: "Ditolak", dibatalkan: "Pindah dibatalkan pemilik" } as const;

export function JadwalPelatih({ jadwal, pesertaTetap, murid, catatanAwal, saya, hariIni, absensiAwal, pengajar, aksiAbsen, aksiCatatan, gantiAwal, mintaAwal, tukarAwal, pindahAwal, penggantiAwal, aturanPenggantiAwal, aksiJadwal }: Props) {
  const [mode, setMode] = useState<"hari" | "minggu">("hari");
  const [tanggal, setTanggal] = useState(hariIni);
  const dbJ = mintaAwal !== undefined;
  const [kead, setKead] = useState<Keadaan>({ absensi: absensiAwal, pengganti: penggantiAwal ?? [] });
  const [aturanPengganti, setAturanPengganti] = useState(aturanPenggantiAwal ?? true);
  const [catatan, setCatatan] = useState<Catatan>(catatanAwal);
  const [pengajuan, setPengajuan] = useState<PengajuanTukar[]>(tukarAwal ?? []);
  const [minta, setMinta] = useState<PermintaanGanti[]>(mintaAwal ?? []);
  const [bukaMinta, setBukaMinta] = useState<string | null>(null);
  const [formMinta, setFormMinta] = useState({ keId: "", alasan: "" });
  const [galatMinta, setGalatMinta] = useState<GalatMinta>({});
  const [gantiList, setGantiList] = useState<GantiPelatih[]>(gantiAwal ?? []);
  const [pindah, setPindah] = useState<PindahJadwal[]>(pindahAwal ?? []);
  const [bukaCatatan, setBukaCatatan] = useState<string | null>(null);
  const [teksCatatan, setTeksCatatan] = useState("");
  const [galatCatatan, setGalatCatatan] = useState("");
  const [bukaTukar, setBukaTukar] = useState<string | null>(null);
  const [formTukar, setFormTukar] = useState({ tanggalBaru: "", jamBaru: "", alasan: "" });
  const [galatTukar, setGalatTukar] = useState<GalatTukar>({});
  const [toast, setToast] = useState<{ teks: string; galat: boolean } | null>(null);

  useEffect(() => {
    try {
      if (!dbJ) {
        const d = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { aturan?: { sesiPengganti?: unknown } } | null;
        if (typeof d?.aturan?.sesiPengganti === "boolean") setAturanPengganti(d.aturan.sesiPengganti);
      }
      if (!aksiCatatan) {
        const c = JSON.parse(localStorage.getItem(KUNCI_CATATAN) ?? "null") as Catatan | null;
        if (c && typeof c === "object" && !Array.isArray(c)) setCatatan(c);
      }
      const g = gantiAwal ? null : (JSON.parse(localStorage.getItem(KUNCI_GANTI) ?? "null") as GantiPelatih[] | null);
      if (Array.isArray(g)) setGantiList(g.filter((x) => x && typeof x.slotId === "string" && typeof x.tanggal === "string" && typeof x.pelatihId === "string"));
      if (dbJ) return;
      const q = JSON.parse(localStorage.getItem(KUNCI_MINTA) ?? "null") as PermintaanGanti[] | null;
      if (Array.isArray(q)) setMinta(q);
      const t = JSON.parse(localStorage.getItem(KUNCI_TUKAR) ?? "null") as PengajuanTukar[] | null;
      if (Array.isArray(t)) setPengajuan(t);
      const pj = JSON.parse(localStorage.getItem(KUNCI_PINDAH) ?? "null") as PindahJadwal[] | null;
      if (Array.isArray(pj)) setPindah(pj.filter((x) => x && typeof x.slotId === "string" && typeof x.tanggalAsal === "string" && typeof x.tanggalBaru === "string" && typeof x.jamBaru === "string"));
    } catch {}
  }, [aksiCatatan, gantiAwal, dbJ]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const muridMap = useMemo(() => Object.fromEntries(murid.map((m) => [m.id, m])), [murid]);
  const k: Konteks = useMemo(() => ({ hariIni, aturanPengganti, murid: muridMap, awal: absensiAwal }), [hariIni, aturanPengganti, muridMap, absensiAwal]);
  const jadwalSaya = useMemo(() => jadwal.filter((s) => s.pengajarId === saya.id), [jadwal, saya.id]);

  const sesiDi = (tgl: string) => sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, tgl, gantiList, pindah).filter((s) => s.pelatihId === saya.id);
  const serahanDi = (tgl: string) => sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, tgl, gantiList, pindah).filter((s) => s.slot.pengajarId === saya.id && s.pelatihId !== saya.id);
  const namaPengajar = (id: string) => pengajar.find((x) => x.id === id)?.nama ?? "";
  const sesiHari = sesiDi(tanggal);
  const ringkas = ringkasHari(sesiHari, kead.absensi);
  const sudahLewat = tanggal <= hariIni;

  function info(teks: string, galat = false) { setToast({ teks, galat }); }
  const simpanLokal = (kunci: string, nilai: unknown) => { if (dbJ) return; try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch {} };

  const [menyimpan, setMenyimpan] = useState(false);

  /** Simpan selisih absen ke database (hanya peserta tetap). Mengembalikan galat pertama bila ada. */
  async function simpanSelisih(sebelum: Absensi, sesudah: Absensi): Promise<string | null> {
    if (!aksiAbsen) return null;
    const kunciSemua = new Set([...Object.keys(sebelum), ...Object.keys(sesudah)]);
    for (const kunci of Array.from(kunciSemua)) {
      if (sebelum[kunci] === sesudah[kunci]) continue;
      const [slotId, tgl, muridId] = kunci.split("|") as [string, string, string];
      // Peserta tetap dan murid pengganti disimpan ke database (database juga memeriksa pemegang sesinya).
      if (!(pesertaTetap[slotId] ?? []).includes(muridId) && !kead.pengganti.some((x) => x.slotId === slotId && x.tanggal === tgl && x.muridId === muridId)) continue;
      const r = await aksiAbsen(slotId, tgl, muridId, sesudah[kunci] ?? null);
      if (!r.ok) return r.pesan;
    }
    return null;
  }

  async function ketuk(kunci: string, status: StatusAbsen) {
    if (menyimpan) return;
    const h = tandai(k, kead, kunci, status);
    if (!h.ok) { info(h.galat, true); return; }
    setMenyimpan(true);
    const galat = await simpanSelisih(kead.absensi, h.keadaan.absensi);
    setMenyimpan(false);
    if (galat) { info(galat, true); return; }
    setKead(h.keadaan); info(h.pesan);
  }

  async function hadirSemua(sesi: ReturnType<typeof sesiDi>[number]) {
    if (menyimpan) return;
    const h = tandaiSemuaHadir(k, kead, sesi);
    setMenyimpan(true);
    const galat = await simpanSelisih(kead.absensi, h.keadaan.absensi);
    setMenyimpan(false);
    if (galat) { info(galat, true); return; }
    setKead(h.keadaan);
    info(h.pesan, h.berhasil === 0 && h.dilewati.length > 0);
  }

  async function simpanCatatan(muridId: string) {
    const h = validasiCatatan(teksCatatan);
    if (!h.ok) { setGalatCatatan(h.galat); return; }
    if (aksiCatatan) {
      const r = await aksiCatatan(muridId, h.teks);
      if (!r.ok) { setGalatCatatan(r.pesan); return; }
    }
    const baru = { ...catatan, [muridId]: [{ tgl: tglPendek(hariIni), teks: h.teks }, ...(catatan[muridId] ?? [])] };
    setCatatan(baru); if (!aksiCatatan) simpanLokal(KUNCI_CATATAN, baru);
    setTeksCatatan(""); setGalatCatatan(""); setBukaCatatan(null);
    info(`Catatan untuk ${muridMap[muridId]?.nama ?? "murid"} disimpan.`);
  }

  function bukaFormTukar(kunci: string, s: SlotJadwal, tgl: string) {
    if (bukaTukar === kunci) { setBukaTukar(null); return; }
    setBukaTukar(kunci);
    setFormTukar({ tanggalBaru: tgl, jamBaru: s.jam, alasan: "" });
    setGalatTukar({});
  }

  /** Mode database: kirim ke server dulu; layar berubah setelah database menerima. Galat server ditampilkan di bawah form. */
  async function keDb<T extends AksiJ>(panggil: (a: NonNullable<Props["aksiJadwal"]>) => Promise<T>): Promise<T | null> {
    if (!aksiJadwal) { info(TUTUP_DB, true); return null; }
    if (menyimpan) return null;
    setMenyimpan(true);
    const r = await panggil(aksiJadwal);
    setMenyimpan(false);
    return r;
  }

  async function kirimTukar(s: SlotJadwal, tgl: string) {
    const h = validasiTukar({ slotId: s.id, tanggalAsal: tgl, ...formTukar }, hariIni, jadwalSaya, pengajuan);
    if (!h.ok) { setGalatTukar(h.galat); if (h.galat.umum) info(h.galat.umum, true); return; }
    let idBaru = `tk-${Date.now()}`;
    if (dbJ) {
      const r = await keDb((a) => a.ajukanTukar(s.id, tgl, h.pengajuan.tanggalBaru, h.pengajuan.jamBaru, h.pengajuan.alasan));
      if (!r) return;
      if (!r.ok) { setGalatTukar({ umum: r.pesan }); info(r.pesan, true); return; }
      if (r.id) idBaru = r.id;
    }
    const baru = [...pengajuan, { ...h.pengajuan, id: idBaru, status: "menunggu" as const, pelatihId: saya.id }];
    setPengajuan(baru); simpanLokal(KUNCI_TUKAR, baru);
    setBukaTukar(null); setGalatTukar({});
    info("Pengajuan tukar jadwal terkirim ke pemilik.");
  }

  async function kirimMinta(slotId: string, tgl: string) {
    const h = ajukanGanti({ hariIni, jadwal, ganti: gantiList, pelatih: pengajar, permintaan: minta }, saya.id, slotId, tgl, formMinta.keId, formMinta.alasan);
    if (!h.ok) { setGalatMinta(h.galat); if (h.galat.umum) info(h.galat.umum, true); return; }
    let idBaru = `mg-${Date.now()}`;
    if (dbJ) {
      const r = await keDb((a) => a.ajukanMinta(slotId, tgl, h.permintaan.keId, h.permintaan.alasan));
      if (!r) return;
      if (!r.ok) { setGalatMinta({ umum: r.pesan }); info(r.pesan, true); return; }
      if (r.id) idBaru = r.id;
    }
    const baru = [...minta, { id: idBaru, ...h.permintaan }];
    setMinta(baru); simpanLokal(KUNCI_MINTA, baru);
    setBukaMinta(null); setGalatMinta({}); setFormMinta({ keId: "", alasan: "" });
    info("Permintaan ganti pelatih terkirim ke pemilik.");
  }

  async function tarikMinta(id: string) {
    const h = batalkanMinta(minta, id, saya.id);
    if (!h.ok) { info(h.galat, true); return; }
    if (dbJ) {
      const r = await keDb((a) => a.tarikMinta(id));
      if (!r) return;
      if (!r.ok) { info(r.pesan, true); return; }
    }
    setMinta(h.permintaan); simpanLokal(KUNCI_MINTA, h.permintaan);
    info("Permintaan ganti pelatih ditarik.");
  }

  async function batalkanTukar(id: string) {
    if (dbJ) {
      const r = await keDb((a) => a.batalkanTukar(id));
      if (!r) return;
      if (!r.ok) { info(r.pesan, true); return; }
    }
    const baru = pengajuan.filter((p) => p.id !== id);
    setPengajuan(baru); simpanLokal(KUNCI_TUKAR, baru);
    info("Pengajuan tukar jadwal dibatalkan.");
  }

  function geser(hari: number) { setTanggal(tambahHari(tanggal, hari)); setBukaCatatan(null); setBukaTukar(null); }
  function buka(tgl: string) { setTanggal(tgl); setMode("hari"); setBukaCatatan(null); setBukaTukar(null); }

  return (
    <>
      <div className="seg" role="tablist" aria-label="Tampilan jadwal">
        <button type="button" role="tab" aria-selected={mode === "hari"} className={mode === "hari" ? "on" : ""} onClick={() => setMode("hari")}>Hari ini</button>
        <button type="button" role="tab" aria-selected={mode === "minggu"} className={mode === "minggu" ? "on" : ""} onClick={() => setMode("minggu")}>Minggu ini</button>
      </div>

      {mode === "minggu" ? (
        <>
          <div className="bulan" role="group" aria-label="Pilih pekan">
            <button type="button" className="circ" onClick={() => geser(-7)} aria-label="Pekan sebelumnya"><Icon name="back" /></button>
            <b aria-live="polite" style={{ fontSize: 14 }}>{labelPekan(tanggal)}</b>
            <button type="button" className="circ" onClick={() => geser(7)} aria-label="Pekan berikutnya"><Icon name="arrow" /></button>
          </div>
          {(() => {
            const hariAda = hariPekan(tanggal).map((h) => ({ h, sesi: sesiDi(h.tgl) })).filter((x) => x.sesi.length > 0);
            if (hariAda.length === 0) return (
              <div className="surface kosong">
                <span className="circ"><Icon name="cal" /></span>
                <h2 className="h2">Tidak ada sesi di pekan ini</h2>
                <p className="sub" style={{ margin: 0, fontSize: 13 }}>Jadwal tetap diatur oleh pemilik.</p>
              </div>
            );
            return hariAda.map(({ h, sesi }) => (
              <section key={h.tgl} className="grp" aria-label={labelTanggal(h.tgl)}>
                <h2 className="h2" style={{ color: "var(--head-text)", fontSize: 14 }}>{labelTanggal(h.tgl)}{h.tgl === hariIni ? " · hari ini" : ""}</h2>
                <div className="surface batas">
                  {sesi.map((s) => {
                    const belum = s.peserta.filter((p) => !kead.absensi[p.kunci]).length;
                    return (
                      <button key={s.slot.id} type="button" className="item buka baris-minggu" onClick={() => buka(h.tgl)}>
                        <span className="time">{s.slot.jam}</span>
                        <span className="grow">
                          <span className="name" style={{ display: "block" }}>{s.slot.nama}</span>
                          <span className="meta">{s.peserta.length === 0 ? "Belum ada murid" : s.peserta.map((p) => muridMap[p.muridId]!.nama.split(" ")[0]).join(", ")}</span>
                        </span>
                        {h.tgl <= hariIni && s.peserta.length > 0 ? (belum === 0 ? <span className="st st-ok">Selesai</span> : <span className="st st-few">{belum} belum</span>) : <span className="st st-free">{s.peserta.length}/{s.slot.kuota}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ));
          })()}
        </>
      ) : (
        <>
          <div className="bulan" role="group" aria-label="Pilih hari">
            <button type="button" className="circ" onClick={() => geser(-1)} aria-label="Hari sebelumnya"><Icon name="back" /></button>
            <b aria-live="polite" style={{ fontSize: 14 }}>{labelTanggal(tanggal)}{tanggal === hariIni ? " · hari ini" : ""}</b>
            <button type="button" className="circ" onClick={() => geser(1)} aria-label="Hari berikutnya"><Icon name="arrow" /></button>
          </div>
          {tanggal !== hariIni && <button type="button" className="btn btn-2 btn-sm" style={{ alignSelf: "center" }} onClick={() => buka(hariIni)}>Kembali ke hari ini</button>}

          <div className="sec-head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <h2 className="h2">Sesi saya</h2>
            <span className="meta">
              {ringkas.sesi === 0 ? "Tidak ada sesi" : `${ringkas.sesi} sesi · ${ringkas.peserta} murid${sudahLewat && ringkas.belum > 0 ? ` · ${ringkas.belum} belum diabsen` : ringkas.peserta > 0 && ringkas.belum === 0 ? " · semua sudah diabsen" : ""}`}
            </span>
          </div>

          {sesiHari.length === 0 ? (
            <div className="surface kosong">
              <span className="circ"><Icon name="cal" /></span>
              <h2 className="h2">Tidak ada sesi di hari ini</h2>
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Lihat tab Minggu ini untuk hari lain.</p>
              <button type="button" className="btn btn-2" onClick={() => setMode("minggu")}>Lihat minggu ini</button>
            </div>
          ) : sesiHari.map((s) => {
            const kunciTukar = `${s.slot.id}|${tanggal}`;
            const tukar = pengajuan.find((p) => p.slotId === s.slot.id && p.tanggalAsal === tanggal && (p.status === "menunggu" || p.status === "disetujui"));
            const tukarDitolak = !tukar ? pengajuan.find((p) => p.slotId === s.slot.id && p.tanggalAsal === tanggal && (p.status === "ditolak" || p.status === "dibatalkan")) : undefined;
            const belum = s.peserta.filter((p) => !kead.absensi[p.kunci]).length;
            const selesai = s.peserta.length > 0 && belum === 0;
            const bisaTukar = tanggal >= hariIni && !s.dipindahDari;
            const kunciMinta = `${s.slot.id}|${tanggal}`;
            const mintaIni = minta.filter((m) => m.slotId === s.slot.id && m.tanggal === tanggal && m.dariId === saya.id && m.status !== "disetujui").sort((a, b) => b.id.localeCompare(a.id))[0];
            const mintaMenunggu = mintaIni?.status === "menunggu" ? mintaIni : undefined;
            return (
              <section key={s.slot.id} className="surface" aria-label={`${s.slot.nama} ${s.slot.jam}`}>
                <div className="sesi-head">
                  <span className="time">{s.slot.jam}</span>
                  <span className="grow">
                    <span className="name" style={{ display: "block" }}>{s.slot.nama}</span>
                    <span className="meta">{s.slot.durasi} mnt{s.slot.lokasi ? ` · ${s.slot.lokasi}` : ""}{s.diganti ? <b style={{ color: "var(--accent-text)" }}> · menggantikan {namaPengajar(s.slot.pengajarId)}</b> : null}{s.dipindahDari ? <b style={{ color: "var(--accent-text)" }}> · pindahan dari {labelTanggal(s.dipindahDari)} {jadwal.find((x) => x.id === s.slot.id)?.jam}</b> : null}</span>
                  </span>
                  {selesai ? <span className="st st-ok">Selesai</span> : sudahLewat && belum > 0 ? <span className="st st-few">{belum} belum</span> : <span className="st st-free">{s.peserta.length}/{s.slot.kuota}</span>}
                </div>

                {(belum > 0 && sudahLewat) || bisaTukar ? (
                  <div className="sesi-aksi">
                    {belum > 0 && sudahLewat && <button type="button" className="btn btn-sm" onClick={() => hadirSemua(s)}><Icon name="check" />Hadirkan semua ({belum})</button>}
                    {bisaTukar && !tukar && <button type="button" className="btn btn-2 btn-sm" aria-expanded={bukaTukar === kunciTukar} onClick={() => bukaFormTukar(kunciTukar, s.slot, tanggal)}>Ajukan tukar jadwal</button>}
                    {bisaTukar && !mintaMenunggu && pengajar.length > 1 && <button type="button" className="btn btn-2 btn-sm" aria-expanded={bukaMinta === kunciMinta} onClick={() => { setBukaMinta(bukaMinta === kunciMinta ? null : kunciMinta); setFormMinta({ keId: "", alasan: "" }); setGalatMinta({}); }}>Minta ganti pelatih</button>}
                  </div>
                ) : null}

                {mintaIni && (
                  <div className="pengganti-info" style={{ padding: "0 16px 12px" }}>
                    <span className="meta">Minta ganti ke <b>{namaPengajar(mintaIni.keId)}</b><br />{mintaIni.status === "menunggu" ? "Menunggu persetujuan pemilik" : "Ditolak pemilik, kamu masih memegang sesi ini"}</span>
                    {mintaIni.status === "menunggu" && <button type="button" className="btn btn-2 btn-sm" onClick={() => void tarikMinta(mintaIni.id)}>Tarik</button>}
                  </div>
                )}

                {bukaMinta === kunciMinta && (
                  <form className="form-tukar" onSubmit={(e) => { e.preventDefault(); void kirimMinta(s.slot.id, tanggal); }} noValidate>
                    <h3 className="h2" style={{ fontSize: 14 }}>Serahkan sesi {s.slot.jam} · {labelTanggal(tanggal)} ke pelatih lain</h3>
                    <p className="meta" style={{ margin: 0 }}>Hanya untuk sesi ini. Minggu berikutnya kamu mengajar seperti biasa. Pemilik yang memutuskan.</p>
                    <label className="field"><span className="label l2">Pelatih pengganti</span>
                      <select value={formMinta.keId} onChange={(e) => { setFormMinta({ ...formMinta, keId: e.target.value }); setGalatMinta((g) => ({ ...g, keId: undefined })); }}>
                        <option value="">Pilih pelatih…</option>
                        {pengajar.filter((x) => x.id !== saya.id).map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
                      </select>
                      {galatMinta.keId && <span className="galat" role="alert">{galatMinta.keId}</span>}</label>
                    <label className="field"><span className="label l2">Alasan</span>
                      <textarea value={formMinta.alasan} maxLength={ALASAN_MAKS} placeholder="Contoh: ada keperluan keluarga" onChange={(e) => { setFormMinta({ ...formMinta, alasan: e.target.value }); setGalatMinta((g) => ({ ...g, alasan: undefined })); }} />
                      {galatMinta.alasan && <span className="galat" role="alert">{galatMinta.alasan}</span>}</label>
                    <div className="aksi"><button type="submit" className="btn">Kirim permintaan</button><button type="button" className="btn btn-2" onClick={() => setBukaMinta(null)}>Batal</button></div>
                  </form>
                )}

                {tukarDitolak && (
                  <div className="pengganti-info" style={{ padding: "0 16px 12px" }}>
                    <span className="meta">Pindah ke {labelTanggal(tukarDitolak.tanggalBaru)} · {tukarDitolak.jamBaru}<br />{tukarDitolak.status === "dibatalkan" ? "Pemilik membatalkan pemindahan, jadwal kembali seperti semula" : "Ditolak pemilik, jadwal tetap seperti semula"}</span>
                  </div>
                )}

                {tukar && (
                  <div className="pengganti-info" style={{ padding: "0 16px 12px" }}>
                    <span className="meta">Tukar ke <b>{labelTanggal(tukar.tanggalBaru)} · {tukar.jamBaru}</b><br />{STATUS_TUKAR[tukar.status]}</span>
                    {tukar.status === "menunggu" && <button type="button" className="btn btn-2 btn-sm" onClick={() => void batalkanTukar(tukar.id)}>Batalkan</button>}
                  </div>
                )}

                {bukaTukar === kunciTukar && (
                  <form className="form-tukar" onSubmit={(e) => { e.preventDefault(); void kirimTukar(s.slot, tanggal); }} noValidate>
                    <h3 className="h2" style={{ fontSize: 14 }}>Pindahkan sesi {s.slot.jam} · {labelTanggal(tanggal)}</h3>
                    <div style={{ display: "flex", gap: 12 }}>
                      <label className="field" style={{ flex: 1.3 }}><span className="label l2">Tanggal baru</span>
                        <input type="date" min={hariIni} value={formTukar.tanggalBaru} onChange={(e) => { setFormTukar({ ...formTukar, tanggalBaru: e.target.value }); setGalatTukar((g) => ({ ...g, tanggalBaru: undefined })); }} />
                        {galatTukar.tanggalBaru && <span className="galat" role="alert">{galatTukar.tanggalBaru}</span>}</label>
                      <label className="field" style={{ flex: 1 }}><span className="label l2">Jam baru</span>
                        <input value={formTukar.jamBaru} inputMode="decimal" placeholder="16.00" onChange={(e) => { setFormTukar({ ...formTukar, jamBaru: e.target.value }); setGalatTukar((g) => ({ ...g, jamBaru: undefined })); }} />
                        {galatTukar.jamBaru && <span className="galat" role="alert">{galatTukar.jamBaru}</span>}</label>
                    </div>
                    <label className="field"><span className="label l2">Alasan</span>
                      <textarea value={formTukar.alasan} maxLength={ALASAN_MAKS} placeholder="Contoh: ada keperluan keluarga" onChange={(e) => { setFormTukar({ ...formTukar, alasan: e.target.value }); setGalatTukar((g) => ({ ...g, alasan: undefined })); }} />
                      {galatTukar.alasan && <span className="galat" role="alert">{galatTukar.alasan}</span>}</label>
                    <p className="meta" style={{ margin: 0 }}>Pemilik yang menyetujui dan memberi tahu murid. Jadwal baru baru berlaku setelah disetujui.</p>
                    <div className="aksi">
                      <button type="submit" className="btn">Kirim pengajuan</button>
                      <button type="button" className="btn btn-2" onClick={() => setBukaTukar(null)}>Batal</button>
                    </div>
                  </form>
                )}

                {s.peserta.length === 0 ? (
                  <div className="sesi-kosong meta">Belum ada murid di sesi ini.</div>
                ) : (
                <>
                {s.peserta.length > GULIR_MULAI && <div className="gulir-info meta">{s.peserta.length} murid · gulir untuk melihat semua</div>}
                <div className={s.peserta.length > GULIR_MULAI ? "peserta-gulir peserta-gulir-tinggi" : undefined} {...(s.peserta.length > GULIR_MULAI ? { tabIndex: 0, role: "region", "aria-label": `Daftar murid ${s.slot.nama} ${s.slot.jam}, gulir untuk melihat semua` } : {})}>
                {s.peserta.map((p) => {
                  const m = muridMap[p.muridId]!;
                  const status = kead.absensi[p.kunci];
                  const sisa = sisaSesiKini(k, kead, p.muridId);
                  const hak = hakPengganti(k, kead, p.muridId);
                  const byr = labelBayar(m.bayar as "lunas" | "belum" | "menunggu_verifikasi");
                  const catatanMurid = catatan[p.muridId] ?? [];
                  const terbukaCatatan = bukaCatatan === p.kunci;
                  return (
                    <div key={p.kunci} className="peserta">
                      <div className="prow">
                        <span className="avatar s" aria-hidden="true">{inisial(m.nama)}</span>
                        <span className="grow">
                          <span className="name" style={{ display: "block" }}>{m.nama}{p.pengganti && <span className="st st-few" style={{ marginLeft: 8 }}>Pengganti</span>}</span>
                          <span className="meta">Sisa {sisa} dari {m.totalSesi}{m.bayar !== "lunas" ? ` · ${byr.teks}` : ""}</span>
                        </span>
                        {sisa <= 0 && <span className="st st-full">Paket habis</span>}
                      </div>

                      <div className="absen absen-pelatih" role="group" aria-label={`Absen ${m.nama}`}>
                        {PILIHAN.map((o) => {
                          const aktif = status === o.status;
                          return (
                            <button key={o.status} type="button" className={`ab ab-${o.status}`} aria-pressed={aktif} onClick={() => ketuk(p.kunci, o.status)}>
                              {aktif && <Icon name="check" />}{o.label}
                            </button>
                          );
                        })}
                      </div>

                      {status === "izin" && !p.pengganti && hak > 0 && <span className="meta">Izin diterima. Jadwal pengganti diatur pemilik.</span>}

                      {catatanMurid[0] && !terbukaCatatan && (
                        <p className="catatan-terakhir"><span className="meta">Catatan {catatanMurid[0].tgl}</span> {catatanMurid[0].teks}</p>
                      )}

                      {terbukaCatatan ? (
                        <div className="form-catatan">
                          <label className="field"><span className="label l2">Catatan perkembangan {m.nama.split(" ")[0]}</span>
                            <textarea value={teksCatatan} maxLength={CATATAN_MAKS} autoFocus placeholder="Contoh: napas sudah teratur, besok latih gaya punggung" onChange={(e) => { setTeksCatatan(e.target.value); setGalatCatatan(""); }} />
                            <span className="meta" style={{ textAlign: "right" }}>{teksCatatan.length}/{CATATAN_MAKS}</span>
                            {galatCatatan && <span className="galat" role="alert">{galatCatatan}</span>}</label>
                          <div className="aksi">
                            <button type="button" className="btn btn-sm" onClick={() => simpanCatatan(p.muridId)}>Simpan catatan</button>
                            <button type="button" className="btn btn-2 btn-sm" onClick={() => { setBukaCatatan(null); setGalatCatatan(""); }}>Batal</button>
                          </div>
                        </div>
                      ) : (
                        <div className="aksi">
                          <button type="button" className="btn btn-2 btn-sm" onClick={() => { setBukaCatatan(p.kunci); setTeksCatatan(""); setGalatCatatan(""); }}>Tulis catatan</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
                </>
                )}
              </section>
            );
          })}

          {sesiDipindahKeluar(jadwal, gantiList, pindah, tanggal).filter((x) => x.pelatihId === saya.id).length > 0 && (
            <p className="meta" style={{ margin: 0 }}>
              Dipindah ke tanggal lain sekali ini: {sesiDipindahKeluar(jadwal, gantiList, pindah, tanggal).filter((x) => x.pelatihId === saya.id).map((x) => `${x.slot.jam} ${x.slot.nama} → ${labelTanggal(x.ke.tanggalBaru)} ${x.ke.jamBaru}`).join(", ")}.
            </p>
          )}

          {serahanDi(tanggal).length > 0 && (
            <p className="meta" style={{ margin: 0 }}>
              Diserahkan ke pelatih lain sekali ini: {serahanDi(tanggal).map((s) => `${s.slot.jam} ${s.slot.nama} → ${namaPengajar(s.pelatihId)}`).join(", ")}.
            </p>
          )}

          <p className="meta" style={{ margin: 0 }}>
            Ketuk Hadir sekali untuk menandai, ketuk lagi untuk membatalkan. Hadir dan alpa memotong sisa sesi, izin tidak memotong{aturanPengganti ? " dan jadwal penggantinya diatur pemilik" : ""}.
          </p>
        </>
      )}

      {toast && <div className="toast" role={toast.galat ? "alert" : "status"}>{toast.teks}</div>}
    </>
  );
}
