"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Fase } from "@/lib/langganan";
import {
  aktivasiManual, bisaKirimPengingat,
  type Audit, type GalatPromo, type HasilAktivasi, type HasilStatus, type InputPromo, type LogPengingat, type PromoPlatform, type TagihanPlatform, type Usaha,
} from "@/lib/platform";
import type { DataPlatform } from "@/lib/supabase/platformData";
import { aktivasiAksi, alihPromoAksi, buatPromoAksi, catatanAksi, hapusPromoAksi, lihatAksi, pengingatAksi } from "@/app/(umum)/platform/aksi";

type Hasil = { ok: true; pesan: string } | { ok: false; galat: string };

interface Ctx {
  hari: string;
  usaha: Usaha[];
  tagihan: TagihanPlatform[];
  promo: PromoPlatform[];
  audit: Audit[];
  logPengingat: LogPengingat[];
  catatan: Record<string, string>;
  modeLihat: Record<string, string>; // usahaId -> berakhir (ISO)
  sembunyi: boolean;
  setSembunyi: (v: boolean) => void;
  sekarang: () => string;
  aktifkanManual: (tagihanId: string, input: { tanggal: string; referensi: string; alasan: string }) => Promise<HasilAktivasi>;
  simpanCatatan: (usahaId: string, teks: string) => Promise<Hasil>;
  catatPengingat: (tagihanId: string, kanal: "wa" | "email") => Hasil;
  buatPromo: (i: InputPromo) => Promise<{ ok: true } | { ok: false; galat: GalatPromo }>;
  alihPromo: (id: string) => Promise<Hasil>;
  hapusPromo: (id: string) => Promise<Hasil>;
  aturStatus: (usahaId: string, input: { fase: Fase; alasan: string; sampai: string | null }) => HasilStatus;
  kembalikanStatus: (usahaId: string) => Hasil;
  mulaiLihat: (usahaId: string, alasan: string) => Promise<Hasil>;
  akhiriLihat: (usahaId: string) => void;
}

const PlatformCtx = createContext<Ctx | null>(null);
export const usePlatform = () => {
  const c = useContext(PlatformCtx);
  if (!c) throw new Error("usePlatform harus di dalam PlatformProvider");
  return c;
};

/**
 * Data berasal dari database (fungsi platform_data, dibaca atas nama akun admin dengan RLS). Setiap perubahan dikirim ke server;
 * bila berhasil, seluruh data diganti dengan data terbaru dari server. Aturan murni tetap di lib/platform.ts.
 * BELUM tersambung database: ubah status manual usaha, dan log pengingat (hanya audit yang tercatat).
 */
export function PlatformProvider({ children, awal }: { children: React.ReactNode; awal: DataPlatform }) {
  const [d, setD] = useState<DataPlatform>(awal);
  const [logLokal, setLogLokal] = useState<LogPengingat[]>([]);
  const [sembunyi, setSembunyiState] = useState(false);

  useEffect(() => { try { setSembunyiState(localStorage.getItem("kk-plat-sembunyi") === "1"); } catch {} }, []);
  const setSembunyi = (v: boolean) => { setSembunyiState(v); try { localStorage.setItem("kk-plat-sembunyi", v ? "1" : "0"); } catch {} };

  const sekarang = useCallback(() => new Date().toISOString(), []);
  const logPengingat = useMemo(() => [...d.logPengingat, ...logLokal], [d.logPengingat, logLokal]);

  const aktifkanManual: Ctx["aktifkanManual"] = async (tagihanId, input) => {
    const t = d.tagihan.find((x) => x.id === tagihanId);
    const u = d.usaha.find((x) => x.id === t?.usahaId);
    if (!t || !u) return { ok: false, galat: { umum: "Tagihan tidak ditemukan." } };
    const lokal = aktivasiManual(t, u, input, d.hari); // validasi cepat; server tetap memeriksa ulang
    if (!lokal.ok) return lokal;
    const h = await aktivasiAksi(tagihanId, input);
    if (!h.ok) return h;
    setD(h.data);
    const baru = h.data.usaha.find((x) => x.id === u.id) ?? lokal.usaha;
    return { ...lokal, usaha: baru, tagihan: h.data.tagihan.find((x) => x.id === t.id) ?? lokal.tagihan };
  };

  const simpanCatatan: Ctx["simpanCatatan"] = async (usahaId, teks) => {
    const h = await catatanAksi(usahaId, teks);
    if (!h.ok) return h;
    setD(h.data);
    return { ok: true, pesan: h.pesan };
  };

  const catatPengingat: Ctx["catatPengingat"] = (tagihanId, kanal) => {
    const t = d.tagihan.find((x) => x.id === tagihanId);
    if (!t) return { ok: false, galat: "Tagihan tidak ditemukan." };
    const cek = bisaKirimPengingat(logPengingat, tagihanId, kanal, sekarang());
    if (!cek.ok) return { ok: false, galat: cek.alasan };
    setLogLokal((x) => [...x, { tagihanId, kanal, waktu: sekarang() }]);
    void pengingatAksi(t.usahaId, t.orderId, kanal);
    return { ok: true, pesan: "Pengingat dicatat." };
  };

  const buatPromo: Ctx["buatPromo"] = async (i) => {
    const h = await buatPromoAksi(i);
    if (h.ok) setD(h.data);
    return h.ok ? { ok: true } : h;
  };
  const alihPromo: Ctx["alihPromo"] = async (id) => { const h = await alihPromoAksi(id); if (h.ok) setD(h.data); return h.ok ? { ok: true, pesan: h.pesan } : h; };
  const hapusPromo: Ctx["hapusPromo"] = async (id) => { const h = await hapusPromoAksi(id); if (h.ok) setD(h.data); return h.ok ? { ok: true, pesan: h.pesan } : h; };

  const TIDAK_TERSAMBUNG = "Mengubah status manual belum tersambung ke database.";
  const aturStatus: Ctx["aturStatus"] = () => ({ ok: false, galat: { umum: TIDAK_TERSAMBUNG } });
  const kembalikanStatus: Ctx["kembalikanStatus"] = () => ({ ok: false, galat: TIDAK_TERSAMBUNG });

  const mulaiLihat: Ctx["mulaiLihat"] = async (usahaId, alasan) => {
    const h = await lihatAksi(usahaId, alasan);
    if (!h.ok) return h;
    setD(h.data); // dicatat di database SEBELUM mode lihat dianggap aktif
    return { ok: true, pesan: h.pesan };
  };
  const akhiriLihat = (usahaId: string) => setD((x) => { const m = { ...x.modeLihat }; delete m[usahaId]; return { ...x, modeLihat: m }; });

  const nilai = useMemo<Ctx>(() => ({
    hari: d.hari, usaha: d.usaha, tagihan: d.tagihan, promo: d.promo, audit: d.audit, logPengingat, catatan: d.catatan, modeLihat: d.modeLihat, sembunyi, setSembunyi, sekarang,
    aktifkanManual, simpanCatatan, catatPengingat, buatPromo, alihPromo, hapusPromo, aturStatus, kembalikanStatus, mulaiLihat, akhiriLihat,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [d, logPengingat, sembunyi]);

  return <PlatformCtx.Provider value={nilai}>{children}</PlatformCtx.Provider>;
}
