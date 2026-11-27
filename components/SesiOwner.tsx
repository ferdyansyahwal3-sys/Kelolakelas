"use client";
import { Tautan as Link } from "@/components/BasisApp";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { inisial } from "@/lib/format";
import type { SlotJadwal } from "@/lib/jadwal";
import { selisih } from "@/lib/langganan";
import { gabungById, type KabarPelatih, type Pemberitahuan } from "@/lib/pemberitahuan";
import { batalkanPindahan, kabarBatalPindah, kabarGantiLangsung, kabarKeputusan, kabarKeputusanTukar, kabarPermintaanDitutup, KUNCI_PINDAH, pemohonTukar, setujuiMinta, setujuiTukar, tolakMinta, tolakTukar, type HasilKabarKeputusan, type KonteksTukar, type PengajuanTukar, type PermintaanGanti } from "@/lib/pelatih";
import { KUNCI_INFO, KUNCI_KABAR, bacaKabar } from "./PemberitahuanPanel";
import { KUNCI_TUKAR } from "./JadwalPelatih";
import { bongkarKunciSesi, muatanKabar, type MuatanKabar } from "@/lib/permintaanDb";
import { labelBayar } from "@/lib/murid";
import {
  batalkanGanti, batalkanPengganti, gantiPelatih, hakPengganti, hariPekan, jadwalkanPengganti, labelPekan, labelTanggal, opsiPengganti, ringkasHari,
  pelatihSesi, sesiDipindahKeluar, sesiPadaTanggal, sisaSesiKini, tambahHari, tandai,
  type Absensi, type GantiPelatih, type Keadaan, type Konteks, type MuridSesi, type Pengganti, type PindahJadwal, type StatusAbsen,
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
  /** Isi awal pemberitahuan murid (sebelum ada yang tersimpan di perangkat ini), supaya info baru ditambahkan ke daftar yang sama dengan halaman Pemberitahuan. */
  pemberitahuanAwal?: Pemberitahuan[];
  /** Bila ada (panel asli): absen disimpan ke database sebelum layar berubah. Tanpa ini = hanya lokal (demo). */
  aksiAbsen?: (jadwalId: string, tanggal: string, muridId: string, status: StatusAbsen | null) => Promise<{ ok: true } | { ok: false; pesan: string }>;
  /** Panel asli: ganti pelatih sekali disimpan di database (awal dari server). Tanpa ini = hanya lokal (demo). */
  gantiAwal?: GantiPelatih[];
  aksiGanti?: (jadwalId: string, tanggal: string, pengajarId: string | null) => Promise<{ ok: true; ditutup?: { minta: string[]; tukar: string[] } } | { ok: false; pesan: string }>;
  /** Panel asli (B3b): permintaan ganti, pengajuan tukar, pemindahan, dan sesi pengganti dari database. Adanya `mintaAwal` = mode database; tanpa itu (demo) semuanya lokal. */
  mintaAwal?: PermintaanGanti[];
  tukarAwal?: PengajuanTukar[];
  pindahAwal?: PindahJadwal[];
  penggantiAwal?: Pengganti[];
  aturanPenggantiAwal?: boolean;
  aksiJadwal?: {
    putuskanMinta: (id: string, setuju: boolean) => Promise<AksiHasil>;
    putuskanTukar: (id: string, setuju: boolean) => Promise<AksiHasil>;
    batalkanPindah: (jadwalId: string, tanggalAsal: string) => Promise<AksiHasil>;
    jadwalkanPengganti: (dariJadwalId: string, dariTanggal: string, muridId: string, keJadwalId: string, keTanggal: string) => Promise<AksiHasil>;
    batalkanPengganti: (id: string) => Promise<AksiHasil>;
    /** B3c: kabar ke pelatih + info ke murid tetap sesi itu, dikirim server setelah keputusan tersimpan. */
    kirimKabar: (m: MuatanKabar) => Promise<AksiHasil>;
  };
}
type AksiHasil = { ok: true; id?: string } | { ok: false; pesan: string };
const TUTUP_DB = "Akses pengubahan data ditutup karena langgananmu belum aktif. Perpanjang di halaman Langganan.";

const PILIHAN: { status: StatusAbsen; label: string }[] = [
  { status: "hadir", label: "Hadir" },
  { status: "izin", label: "Izin" },
  { status: "alpa", label: "Alpa" },
];
const MAKS_OPSI = 6;
const KUNCI_GANTI = "kk-ganti-pelatih";
const KUNCI_MINTA = "kk-minta-ganti";
const GULIR_MULAI = 2; // lebih dari ini, daftar murid digulir di dalam kartu

export function SesiOwner({ jadwal, pesertaTetap, murid, pengajar, hariIni, absensiAwal, istilah, pemberitahuanAwal = [], aksiAbsen, gantiAwal, aksiGanti, mintaAwal, tukarAwal, pindahAwal, penggantiAwal, aturanPenggantiAwal, aksiJadwal }: Props) {
  const [tanggal, setTanggal] = useState(hariIni);
  const [pid, setPid] = useState<string>("semua");
  const dbJ = mintaAwal !== undefined;
  const [kead, setKead] = useState<Keadaan>({ absensi: absensiAwal, pengganti: penggantiAwal ?? [] });
  const [aturanPengganti, setAturanPengganti] = useState(aturanPenggantiAwal ?? true);
  const [bukaPengganti, setBukaPengganti] = useState<string | null>(null);
  const [gantiList, setGantiList] = useState<GantiPelatih[]>(gantiAwal ?? []);
  const gantiDb = gantiAwal !== undefined;
  const [bukaGanti, setBukaGanti] = useState<string | null>(null);
  const [minta, setMinta] = useState<PermintaanGanti[]>(mintaAwal ?? []);
  const [tukar, setTukar] = useState<PengajuanTukar[]>(tukarAwal ?? []);
  const [pindah, setPindah] = useState<PindahJadwal[]>(pindahAwal ?? []);
  const [toast, setToast] = useState<{ teks: string; galat: boolean } | null>(null);

  useEffect(() => {
    if (dbJ) return; // mode database: semuanya dari server, tidak ada yang dibaca dari penyimpanan lokal
    try {
      const q = JSON.parse(localStorage.getItem(KUNCI_MINTA) ?? "null") as PermintaanGanti[] | null;
      if (Array.isArray(q)) setMinta(q);
      const t = JSON.parse(localStorage.getItem(KUNCI_TUKAR) ?? "null") as PengajuanTukar[] | null;
      if (Array.isArray(t)) setTukar(t);
      const pj = JSON.parse(localStorage.getItem(KUNCI_PINDAH) ?? "null") as PindahJadwal[] | null;
      if (Array.isArray(pj)) setPindah(pj.filter((x) => x && typeof x.slotId === "string" && typeof x.tanggalAsal === "string" && typeof x.tanggalBaru === "string" && typeof x.jamBaru === "string"));
      const g = gantiDb ? null : (JSON.parse(localStorage.getItem(KUNCI_GANTI) ?? "null") as GantiPelatih[] | null);
      if (Array.isArray(g)) setGantiList(g.filter((x) => x && typeof x.slotId === "string" && typeof x.tanggal === "string" && typeof x.pelatihId === "string"));
      const d = JSON.parse(localStorage.getItem("kk-pengaturan") ?? "null") as { aturan?: { sesiPengganti?: unknown } } | null;
      if (typeof d?.aturan?.sesiPengganti === "boolean") setAturanPengganti(d.aturan.sesiPengganti);
    } catch {}
  }, [gantiDb, dbJ]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const muridMap = useMemo(() => Object.fromEntries(murid.map((m) => [m.id, m])), [murid]);
  const k: Konteks = useMemo(() => ({ hariIni, aturanPengganti, murid: muridMap, awal: absensiAwal, pindah }), [hariIni, aturanPengganti, muridMap, absensiAwal, pindah]);
  const namaPengajar = (id: string) => pengajar.find((p) => p.id === id)?.nama ?? "";

  const pekan = hariPekan(tanggal);
  const sesiHari = sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, tanggal, gantiList, pindah).filter((s) => pid === "semua" || s.pelatihId === pid);
  const ringkas = ringkasHari(sesiHari, kead.absensi);
  const sudahLewat = tanggal <= hariIni;

  function hasil(h: { ok: true; keadaan: Keadaan; pesan: string } | { ok: false; galat: string }) {
    if (h.ok) { setKead(h.keadaan); setToast({ teks: h.pesan, galat: false }); }
    else setToast({ teks: h.galat, galat: true });
    return h.ok;
  }

  const [menyimpan, setMenyimpan] = useState(false);

  async function ketuk(kunci: string, status: StatusAbsen) {
    if (menyimpan) return;
    const h = tandai(k, kead, kunci, status);
    if (!h.ok) { hasil(h); return; }
    const [slotId, tgl, muridId] = kunci.split("|") as [string, string, string];
    // Peserta tetap dan murid pengganti (B3b) disimpan ke database; di demo semuanya lokal.
    const dalamDb = (pesertaTetap[slotId] ?? []).includes(muridId) || kead.pengganti.some((x) => x.slotId === slotId && x.tanggal === tgl && x.muridId === muridId);
    if (aksiAbsen && dalamDb) {
      setMenyimpan(true);
      const r = await aksiAbsen(slotId, tgl, muridId, h.keadaan.absensi[kunci] ?? null);
      setMenyimpan(false);
      if (!r.ok) { setToast({ teks: r.pesan, galat: true }); return; }
    }
    hasil(h);
  }

  async function pilihPengganti(dariKunci: string, slotId: string, tgl: string) {
    const idLokal = `pg-${Date.now()}`;
    const h = jadwalkanPengganti(k, kead, jadwal, pesertaTetap, dariKunci, slotId, tgl, idLokal);
    if (!h.ok || !dbJ) { if (hasil(h)) setBukaPengganti(null); return; }
    const dari = bongkarKunciSesi(dariKunci);
    if (!aksiJadwal || !dari) { setToast({ teks: TUTUP_DB, galat: true }); return; }
    if (menyimpan) return;
    setMenyimpan(true);
    const r = await aksiJadwal.jadwalkanPengganti(dari.slotId, dari.tanggal, dari.muridId, slotId, tgl);
    setMenyimpan(false);
    if (!r.ok) { setToast({ teks: r.pesan, galat: true }); return; }
    // Id baris database menggantikan id lokal supaya Batalkan memakai id yang benar.
    const id = r.id;
    if (hasil(id ? { ...h, keadaan: { ...h.keadaan, pengganti: h.keadaan.pengganti.map((p) => (p.id === idLokal ? { ...p, id } : p)) } } : h)) setBukaPengganti(null);
  }

  async function batalPengganti(id: string) {
    const h = batalkanPengganti(kead, id);
    if (!h.ok || !dbJ) { hasil(h); return; }
    if (!aksiJadwal) { setToast({ teks: TUTUP_DB, galat: true }); return; }
    if (menyimpan) return;
    setMenyimpan(true);
    const r = await aksiJadwal.batalkanPengganti(id);
    setMenyimpan(false);
    if (!r.ok) { setToast({ teks: r.pesan, galat: true }); return; }
    hasil(h);
  }

  /** Panel asli: tiap perubahan dikirim ke database dulu; bila gagal, daftar lama dipertahankan dan pesannya ditampilkan. */
  function simpanGanti(g: GantiPelatih[]) {
    if (!gantiDb || !aksiGanti) {
      setGantiList(g);
      try { localStorage.setItem(KUNCI_GANTI, JSON.stringify(g)); } catch {}
      return;
    }
    const lama = gantiList;
    const kunci = (x: GantiPelatih) => `${x.slotId}|${x.tanggal}`;
    const ubah: { slotId: string; tanggal: string; pelatihId: string | null }[] = [];
    for (const x of g) { const y = lama.find((z) => kunci(z) === kunci(x)); if (!y || y.pelatihId !== x.pelatihId) ubah.push({ slotId: x.slotId, tanggal: x.tanggal, pelatihId: x.pelatihId }); }
    for (const y of lama) if (!g.some((x) => kunci(x) === kunci(y))) ubah.push({ slotId: y.slotId, tanggal: y.tanggal, pelatihId: null });
    setGantiList(g);
    void (async () => {
      for (const u of ubah) {
        const r = await aksiGanti(u.slotId, u.tanggal, u.pelatihId);
        if (!r.ok) { setGantiList(lama); setToast({ teks: r.pesan, galat: true }); return; }
        // Database menutup permintaan/pengajuan yang menunggu untuk sesi ini; layar ikut.
        if (r.ditutup && (r.ditutup.minta.length > 0 || r.ditutup.tukar.length > 0)) {
          const m = new Set(r.ditutup.minta), t = new Set(r.ditutup.tukar);
          setMinta((q) => q.filter((x) => !m.has(x.id)));
          setTukar((q) => q.map((x) => (t.has(x.id) ? { ...x, status: "dibatalkan" as const, diputuskan: hariIni } : x)));
        }
      }
    })();
  }

  function simpanMinta(q: PermintaanGanti[]) {
    setMinta(q);
    if (dbJ) return;
    try { localStorage.setItem(KUNCI_MINTA, JSON.stringify(q)); } catch {}
  }

  /** Menulis kabar pelatih + info murid hasil keputusan. Id dari id permintaan, jadi tidak pernah ganda. */
  async function simpanKabar({ kabar, info }: HasilKabarKeputusan, slotId: string): Promise<string> {
    if (dbJ) {
      // Mode database: kabar dikirim server (kabar_pelatih + pemberitahuan murid). Keputusannya sudah tersimpan; bila kabar gagal, owner diberi tahu.
      const m = muatanKabar({ kabar, info });
      if (m.kabar.length === 0 && m.info.length === 0) return "";
      const r = aksiJadwal ? await aksiJadwal.kirimKabar(m) : ({ ok: false, pesan: TUTUP_DB } as const);
      if (!r.ok) return `Keputusan tersimpan, tapi kabarnya belum terkirim: ${r.pesan}`;
    } else try {
      if (kabar.length > 0) localStorage.setItem(KUNCI_KABAR, JSON.stringify(gabungById<KabarPelatih>(bacaKabar(), kabar)));
      if (info.length > 0) {
        const simpan = JSON.parse(localStorage.getItem(KUNCI_INFO) ?? "null") as Pemberitahuan[] | null;
        localStorage.setItem(KUNCI_INFO, JSON.stringify(gabungById(Array.isArray(simpan) ? simpan : pemberitahuanAwal, info)));
      }
    } catch {}
    const nMurid = info.length > 0 ? (pesertaTetap[slotId] ?? []).length : 0;
    const siapa = kabar.length > 1 ? "Kedua pelatih" : "Pelatih";
    return `${siapa}${nMurid > 0 ? ` dan ${nMurid} ${istilah.murid}` : ""} diberi tahu.`;
  }

  const kirimKabar = (permintaan: PermintaanGanti, setuju: boolean) => simpanKabar(kabarKeputusan(permintaan, setuju, { hariIni, jadwal, pelatih: pengajar, pesertaTetap }), permintaan.slotId);

  /** Mode database: aturan dicek di layar (lib/*.ts), lalu database memutuskan secara atomik; layar baru berubah setelah database berhasil. */
  async function keDb(panggil: (a: NonNullable<Props["aksiJadwal"]>) => Promise<AksiHasil>): Promise<boolean> {
    if (!aksiJadwal) { setToast({ teks: TUTUP_DB, galat: true }); return false; }
    if (menyimpan) return false;
    setMenyimpan(true);
    const r = await panggil(aksiJadwal);
    setMenyimpan(false);
    if (!r.ok) { setToast({ teks: r.pesan, galat: true }); return false; }
    return true;
  }

  async function putuskan(id: string, setuju: boolean) {
    const permintaan = minta.find((x) => x.id === id);
    if (setuju) {
      const h = setujuiMinta({ hariIni, jadwal, ganti: gantiList, pelatih: pengajar, permintaan: minta }, id);
      if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
      if (dbJ) {
        if (!(await keDb((a) => a.putuskanMinta(id, true)))) return;
        setGantiList(h.ganti); simpanMinta(h.permintaan); // database sudah menulis ganti_pelatih
        setToast({ teks: `Disetujui. ${h.pesan} ${permintaan ? await kirimKabar(permintaan, true) : ""}`.trim(), galat: false });
        return;
      }
      simpanGanti(h.ganti); simpanMinta(h.permintaan);
      setToast({ teks: `Disetujui. ${h.pesan} ${permintaan ? await kirimKabar(permintaan, true) : ""}`.trim(), galat: false });
    } else {
      const h = tolakMinta(minta, id, hariIni);
      if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
      if (dbJ) {
        if (!(await keDb((a) => a.putuskanMinta(id, false)))) return;
        simpanMinta(h.permintaan);
        setToast({ teks: `Permintaan ditolak, pelatih tetap memegang sesinya. ${permintaan ? await kirimKabar(permintaan, false) : ""}`.trim(), galat: false });
        return;
      }
      simpanMinta(h.permintaan);
      setToast({ teks: `Permintaan ditolak, pelatih tetap memegang sesinya. ${permintaan ? await kirimKabar(permintaan, false) : ""}`.trim(), galat: false });
    }
  }

  const menunggu = minta.filter((m) => m.status === "menunggu").sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  function simpanPindah(p: PindahJadwal[]) {
    setPindah(p);
    if (dbJ) return;
    try { localStorage.setItem(KUNCI_PINDAH, JSON.stringify(p)); } catch {}
  }
  function simpanTukar(t: PengajuanTukar[]) {
    setTukar(t);
    if (dbJ) return;
    try { localStorage.setItem(KUNCI_TUKAR, JSON.stringify(t)); } catch {}
  }

  const muridRingkas = useMemo(() => Object.fromEntries(murid.map((m) => [m.id, { nama: m.nama, berlakuSampai: m.berlakuSampai, aktif: m.aktif }])), [murid]);
  const kTukar: KonteksTukar = { hariIni, jadwal, pelatih: pengajar, pesertaTetap, ganti: gantiList, pindah, pengajuan: tukar, permintaan: minta, murid: muridRingkas, absensi: kead.absensi, pengganti: kead.pengganti };
  const tukarMenunggu = tukar.filter((t) => t.status === "menunggu").sort((a, b) => a.tanggalAsal.localeCompare(b.tanggalAsal));

  async function putuskanTukar(id: string, setuju: boolean) {
    const p = tukar.find((x) => x.id === id);
    if (setuju) {
      const h = setujuiTukar(kTukar, id);
      if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
      if (dbJ) {
        if (!(await keDb((a) => a.putuskanTukar(id, true)))) return;
        simpanPindah(h.pindah); simpanTukar(h.pengajuan);
        setToast({ teks: `Disetujui. ${h.pesan} ${p ? await simpanKabar(kabarKeputusanTukar(p, true, { hariIni, jadwal, ganti: gantiList, pesertaTetap }), p.slotId) : ""}`.trim(), galat: false });
        return;
      }
      simpanPindah(h.pindah); simpanTukar(h.pengajuan);
      setToast({ teks: `Disetujui. ${h.pesan} ${p ? await simpanKabar(kabarKeputusanTukar(p, true, { hariIni, jadwal, ganti: gantiList, pesertaTetap }), p.slotId) : ""}`.trim(), galat: false });
    } else {
      const h = tolakTukar(tukar, id, hariIni);
      if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
      if (dbJ) {
        if (!(await keDb((a) => a.putuskanTukar(id, false)))) return;
        simpanTukar(h.pengajuan);
        setToast({ teks: `Pengajuan ditolak, jadwal tetap. ${p ? await simpanKabar(kabarKeputusanTukar(p, false, { hariIni, jadwal, ganti: gantiList, pesertaTetap }), p.slotId) : ""}`.trim(), galat: false });
        return;
      }
      simpanTukar(h.pengajuan);
      setToast({ teks: `Pengajuan ditolak, jadwal tetap. ${p ? await simpanKabar(kabarKeputusanTukar(p, false, { hariIni, jadwal, ganti: gantiList, pesertaTetap }), p.slotId) : ""}`.trim(), galat: false });
    }
  }

  /** Owner mengganti pelatih sebuah sesi langsung (atau mengembalikannya). Mode database: simpan dulu, lalu layar + kabar (termasuk penutupan permintaan yang menunggu). */
  async function ubahGantiLangsung(slotId: string, tgl: string, dariId: string, keId: string, gBaru: GantiPelatih[], pesan: string) {
    const slot = jadwal.find((x) => x.id === slotId)!;
    const kk = { hariIni, jadwal, pelatih: pengajar, pesertaTetap };
    if (dbJ && aksiGanti) {
      if (menyimpan) return;
      setMenyimpan(true);
      const r = await aksiGanti(slotId, tgl, keId === slot.pengajarId ? null : keId);
      setMenyimpan(false);
      if (!r.ok) { setToast({ teks: r.pesan, galat: true }); return; }
      setGantiList(gBaru); setBukaGanti(null);
      const m = new Set(r.ditutup?.minta ?? []), t = new Set(r.ditutup?.tukar ?? []);
      const tutup: KabarPelatih[] = [];
      for (const x of minta) if (m.has(x.id)) { const kb = kabarPermintaanDitutup({ id: x.id, pelatihId: x.dariId, slotId: x.slotId, tanggal: x.tanggal, macam: "ganti pelatih" }, kk); if (kb) tutup.push(kb); }
      for (const x of tukar) if (t.has(x.id) && x.pelatihId) { const kb = kabarPermintaanDitutup({ id: x.id, pelatihId: x.pelatihId, slotId: x.slotId, tanggal: x.tanggalAsal, macam: "tukar jadwal" }, kk); if (kb) tutup.push(kb); }
      setMinta((q) => q.filter((x) => !m.has(x.id)));
      setTukar((q) => q.map((x) => (t.has(x.id) ? { ...x, status: "dibatalkan" as const, diputuskan: hariIni } : x)));
      const h = kabarGantiLangsung(dariId, keId, slotId, tgl, `gl-${Date.now()}`, kk);
      const teks = await simpanKabar({ kabar: [...h.kabar, ...tutup], info: h.info }, slotId);
      setToast({ teks: `${pesan} ${tutup.length > 0 ? `${tutup.length} permintaan yang menunggu ditutup. ` : ""}${teks}`.trim(), galat: false });
      return;
    }
    simpanGanti(gBaru); setBukaGanti(null);
    const kabar = await simpanKabar(kabarGantiLangsung(dariId, keId, slotId, tgl, `gl-${Date.now()}`, kk), slotId);
    setToast({ teks: `${pesan} ${kabar}`, galat: false });
  }

  async function pilihGanti(slotId: string, pelatihBaruId: string) {
    const h = gantiPelatih(jadwal, gantiList, pengajar, hariIni, slotId, tanggal, pelatihBaruId);
    if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
    const sebelum = pelatihSesi(jadwal.find((x) => x.id === slotId)!, tanggal, gantiList);
    await ubahGantiLangsung(slotId, tanggal, sebelum, pelatihBaruId, h.ganti, h.pesan);
  }

  async function batalkanPindahSesi(slotId: string, tanggalAsal: string) {
    const h = batalkanPindahan({ hariIni, jadwal, pindah, pengajuan: tukar, absensi: kead.absensi }, slotId, tanggalAsal);
    if (!h.ok) { setToast({ teks: h.galat, galat: true }); return; }
    if (dbJ) {
      if (!(await keDb((a) => a.batalkanPindah(slotId, tanggalAsal)))) return;
      simpanPindah(h.pindah); simpanTukar(h.pengajuan);
      setToast({ teks: `${h.pesan} ${await simpanKabar(kabarBatalPindah(h.dibatalkan, `bp-${Date.now()}`, { hariIni, jadwal, ganti: gantiList, pesertaTetap }), slotId)}`.trim(), galat: false });
      return;
    }
    simpanPindah(h.pindah); simpanTukar(h.pengajuan);
    setToast({ teks: `${h.pesan} ${await simpanKabar(kabarBatalPindah(h.dibatalkan, `bp-${Date.now()}`, { hariIni, jadwal, ganti: gantiList, pesertaTetap }), slotId)}`, galat: false });
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
          const ada = sesiPadaTanggal(jadwal, pesertaTetap, kead.pengganti, h.tgl, gantiList, pindah).some((s) => pid === "semua" || s.pelatihId === pid);
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
                  <button type="button" className="btn btn-sm" onClick={() => void putuskan(m.id, true)}>Setujui</button>
                  <button type="button" className="btn btn-2 btn-sm" onClick={() => void putuskan(m.id, false)}>Tolak</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {tukarMenunggu.length > 0 && (
        <section className="panel hero-usaha" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Permintaan tukar jadwal">
          <h2 className="h2" style={{ color: "var(--panel-text)", fontSize: 15 }}>Permintaan tukar jadwal · {tukarMenunggu.length}</h2>
          {tukarMenunggu.map((t) => {
            const slot = jadwal.find((x) => x.id === t.slotId);
            const cek = setujuiTukar(kTukar, t.id);
            const nMurid = (pesertaTetap[t.slotId] ?? []).length;
            return (
              <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--panel-border)" }}>
                <span><b>{namaPengajar(pemohonTukar(t, kTukar))}</b> minta memindahkan <b>{labelTanggal(t.tanggalAsal)} · {slot?.jam} {slot?.nama}</b> ke <b>{labelTanggal(t.tanggalBaru)} · {t.jamBaru}</b>.</span>
                <span className="meta">Alasan: {t.alasan}</span>
                <span className="meta">Hanya sekali ini. {nMurid > 0 ? `${nMurid} ${istilah.murid} akan diberi tahu bila disetujui.` : `Belum ada ${istilah.murid} tetap di sesi ini.`}</span>
                {!cek.ok && <span className="meta" role="status" style={{ color: "var(--panel-text)", fontWeight: 600 }}>Belum bisa disetujui: {cek.galat}</span>}
                <div className="aksi">
                  <button type="button" className="btn btn-sm" disabled={!cek.ok} onClick={() => void putuskanTukar(t.id, true)}>Setujui</button>
                  <button type="button" className="btn btn-2 btn-sm" onClick={() => void putuskanTukar(t.id, false)}>Tolak</button>
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
                  <span className="meta">{s.slot.durasi} mnt{s.slot.lokasi ? ` · ${s.slot.lokasi}` : ""} · {namaPengajar(s.pelatihId)}{s.diganti ? <b style={{ color: "var(--accent-text)" }}> · ganti sekali ini</b> : null}{s.dipindahDari ? <b style={{ color: "var(--accent-text)" }}> · pindahan dari {labelTanggal(s.dipindahDari)} {jadwal.find((x) => x.id === s.slot.id)?.jam}</b> : null}</span>
                </span>
                {selesai ? <span className="st st-ok">Selesai</span>
                  : sudahLewat && belum > 0 ? <span className="st st-few">{belum} belum</span>
                  : <span className="st st-free">{terisi}/{s.slot.kuota}</span>}
              </div>

              {s.dipindahDari && s.dipindahDari >= hariIni && (
                <div className="sesi-aksi">
                  <button type="button" className="btn btn-2 btn-sm" onClick={() => void batalkanPindahSesi(s.slot.id, s.dipindahDari!)}>Kembalikan ke {labelTanggal(s.dipindahDari)} {jadwal.find((x) => x.id === s.slot.id)?.jam}</button>
                </div>
              )}
              {pengajar.length > 1 && tanggal >= hariIni && !s.dipindahDari && (
                <div className="sesi-aksi">
                  <button type="button" className="btn btn-2 btn-sm" aria-expanded={bukaGanti === s.slot.id} onClick={() => setBukaGanti(bukaGanti === s.slot.id ? null : s.slot.id)}>Ganti pelatih (sekali ini)</button>
                  {s.diganti && <button type="button" className="btn btn-2 btn-sm" onClick={() => void ubahGantiLangsung(s.slot.id, tanggal, s.pelatihId, s.slot.pengajarId, batalkanGanti(gantiList, s.slot.id, tanggal), `Sesi ${s.slot.jam} dikembalikan ke ${namaPengajar(s.slot.pengajarId)}.`)}>Kembalikan ke {namaPengajar(s.slot.pengajarId)}</button>}
                </div>
              )}
              {bukaGanti === s.slot.id && !s.dipindahDari && (
                <div className="opsi-pengganti" style={{ margin: "0 12px 12px" }}>
                  <span className="meta">Hanya untuk {labelTanggal(tanggal)} · {s.slot.jam}. Minggu berikutnya kembali ke {namaPengajar(s.slot.pengajarId)}.</span>
                  {pengajar.filter((x) => x.id !== s.pelatihId).map((x) => (
                    <button key={x.id} type="button" className="opt" onClick={() => void pilihGanti(s.slot.id, x.id)}>
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
                            <button type="button" className="btn btn-2 btn-sm" onClick={() => void batalPengganti(terkait.id)}>Batalkan</button>
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
                                <button key={`${o.slot.id}${o.tanggal}`} type="button" className="opt" onClick={() => void pilihPengganti(p.kunci, o.slot.id, o.tanggal)}>
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

      {(() => {
        const keluar = sesiDipindahKeluar(jadwal, gantiList, pindah, tanggal).filter((x) => pid === "semua" || x.pelatihId === pid);
        return keluar.length > 0 ? (
          <p className="meta" style={{ margin: 0 }}>
            Dipindah ke tanggal lain sekali ini: {keluar.map((x) => `${x.slot.jam} ${x.slot.nama} → ${labelTanggal(x.ke.tanggalBaru)} ${x.ke.jamBaru}`).join(", ")}.
          </p>
        ) : null;
      })()}

      <p className="meta" style={{ margin: 0 }}>
        Hadir dan alpa memotong sisa sesi. Izin tidak memotong{aturanPengganti ? " dan memberi hak 1 sesi pengganti" : ", tapi aturan usaha ini tanpa sesi pengganti jadi izin tetap terhitung"}. Masa berlaku paket diatur per paket di menu Paket dan harga. Ketuk tanda yang sama sekali lagi untuk membatalkan.
      </p>

      {toast && <div className="toast" role={toast.galat ? "alert" : "status"}>{toast.teks}</div>}
    </>
  );
}
