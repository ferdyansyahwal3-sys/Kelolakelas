"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Fase } from "@/lib/langganan";
import {
  aktivasiManual, aturStatusManual, bisaKirimPengingat, kembalikanKeOtomatis, mulaiModeLihat, validasiPromo, CATATAN_USAHA_MAKS,
  type Audit, type AksiAudit, type GalatPromo, type HasilAktivasi, type HasilStatus, type InputPromo, type LogPengingat, type PromoPlatform, type TagihanPlatform, type Usaha,
} from "@/lib/platform";
import { auditContoh, HARI_PLATFORM, logPengingatContoh, promoPlatformContoh, tagihanPlatformContoh, usahaContoh } from "@/lib/platformContoh";

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
  aktifkanManual: (tagihanId: string, input: { tanggal: string; referensi: string; alasan: string }) => HasilAktivasi;
  simpanCatatan: (usahaId: string, teks: string) => Hasil;
  catatPengingat: (tagihanId: string, kanal: "wa" | "email") => Hasil;
  buatPromo: (i: InputPromo) => { ok: true } | { ok: false; galat: GalatPromo };
  alihPromo: (id: string) => void;
  hapusPromo: (id: string) => void;
  aturStatus: (usahaId: string, input: { fase: Fase; alasan: string; sampai: string | null }) => HasilStatus;
  kembalikanStatus: (usahaId: string) => Hasil;
  mulaiLihat: (usahaId: string, alasan: string) => Hasil;
  akhiriLihat: (usahaId: string) => void;
}

const PlatformCtx = createContext<Ctx | null>(null);
export const usePlatform = () => {
  const c = useContext(PlatformCtx);
  if (!c) throw new Error("usePlatform harus di dalam PlatformProvider");
  return c;
};

/**
 * Seluruh data di sini FIKTIF dan hidup di memori browser (hilang saat reload). Semua aturan ada di lib/platform.ts.
 * Nanti diganti query ke database lewat server dengan RLS is_platform_admin(); bentuk fungsi ini yang dipertahankan.
 */
export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [usaha, setUsaha] = useState(usahaContoh);
  const [tagihan, setTagihan] = useState(tagihanPlatformContoh);
  const [promo, setPromo] = useState(promoPlatformContoh);
  const [audit, setAudit] = useState(auditContoh);
  const [logPengingat, setLog] = useState(logPengingatContoh);
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  const [modeLihat, setModeLihat] = useState<Record<string, string>>({});
  const [sembunyi, setSembunyiState] = useState(false);

  useEffect(() => { try { setSembunyiState(localStorage.getItem("kk-plat-sembunyi") === "1"); } catch {} }, []);
  const setSembunyi = (v: boolean) => { setSembunyiState(v); try { localStorage.setItem("kk-plat-sembunyi", v ? "1" : "0"); } catch {} };

  const sekarang = useCallback(() => `${HARI_PLATFORM}T${new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta" })}+07:00`, []);
  const tulisAudit = useCallback((a: { aksi: AksiAudit; usahaId: string | null; ringkas: string; alasan: string | null }) => {
    setAudit((d) => [{ id: `a${Date.now()}${d.length}`, waktu: sekarang(), ...a }, ...d]);
  }, [sekarang]);

  const aktifkanManual: Ctx["aktifkanManual"] = (tagihanId, input) => {
    const t = tagihan.find((x) => x.id === tagihanId);
    const u = usaha.find((x) => x.id === t?.usahaId);
    if (!t || !u) return { ok: false, galat: { umum: "Tagihan tidak ditemukan." } };
    const h = aktivasiManual(t, u, input, HARI_PLATFORM);
    if (h.ok) {
      setTagihan((d) => d.map((x) => (x.id === t.id ? h.tagihan : x)));
      setUsaha((d) => d.map((x) => (x.id === u.id ? h.usaha : x)));
      tulisAudit(h.audit);
    }
    return h;
  };

  const simpanCatatan: Ctx["simpanCatatan"] = (usahaId, teks) => {
    if (teks.length > CATATAN_USAHA_MAKS) return { ok: false, galat: `Catatan maksimal ${CATATAN_USAHA_MAKS} karakter.` };
    setCatatan((c) => ({ ...c, [usahaId]: teks }));
    tulisAudit({ aksi: "ubah_catatan", usahaId, ringkas: "Catatan pribadi diperbarui", alasan: null });
    return { ok: true, pesan: "Catatan disimpan." };
  };

  const catatPengingat: Ctx["catatPengingat"] = (tagihanId, kanal) => {
    const t = tagihan.find((x) => x.id === tagihanId);
    if (!t) return { ok: false, galat: "Tagihan tidak ditemukan." };
    const cek = bisaKirimPengingat(logPengingat, tagihanId, kanal, sekarang());
    if (!cek.ok) return { ok: false, galat: cek.alasan };
    setLog((d) => [...d, { tagihanId, kanal, waktu: sekarang() }]);
    tulisAudit({ aksi: "kirim_pengingat", usahaId: t.usahaId, ringkas: `Pengingat ${kanal === "wa" ? "WA" : "email"} untuk ${t.orderId}`, alasan: null });
    return { ok: true, pesan: "Pengingat dicatat." };
  };

  const buatPromo: Ctx["buatPromo"] = (i) => {
    const g = validasiPromo(i, promo, HARI_PLATFORM);
    if (Object.keys(g).length > 0) return { ok: false, galat: g };
    const kode = i.kode.trim().toUpperCase();
    setPromo((d) => [{ id: `pp${Date.now()}`, kode, jenis: i.jenis, nilai: i.nilai, kuota: i.kuota, kedaluwarsa: i.kedaluwarsa, berlakuBulan: i.berlakuBulan, aktif: true, dibuat: HARI_PLATFORM }, ...d]);
    tulisAudit({ aksi: "buat_promo", usahaId: null, ringkas: `Promo ${kode} dibuat`, alasan: null });
    return { ok: true };
  };
  const alihPromo = (id: string) => {
    const p = promo.find((x) => x.id === id);
    if (!p) return;
    setPromo((d) => d.map((x) => (x.id === id ? { ...x, aktif: !x.aktif } : x)));
    tulisAudit({ aksi: "ubah_promo", usahaId: null, ringkas: `Promo ${p.kode} ${p.aktif ? "dinonaktifkan" : "diaktifkan"}`, alasan: null });
  };
  const hapusPromo = (id: string) => {
    const p = promo.find((x) => x.id === id);
    if (!p) return;
    setPromo((d) => d.filter((x) => x.id !== id));
    tulisAudit({ aksi: "hapus_promo", usahaId: null, ringkas: `Promo ${p.kode} dihapus`, alasan: null });
  };

  const aturStatus: Ctx["aturStatus"] = (usahaId, input) => {
    const u = usaha.find((x) => x.id === usahaId);
    if (!u) return { ok: false, galat: { umum: "Usaha tidak ditemukan." } };
    const h = aturStatusManual(u, input, HARI_PLATFORM);
    if (h.ok) { setUsaha((d) => d.map((x) => (x.id === u.id ? h.usaha : x))); tulisAudit(h.audit); }
    return h;
  };
  const kembalikanStatus: Ctx["kembalikanStatus"] = (usahaId) => {
    const u = usaha.find((x) => x.id === usahaId);
    if (!u) return { ok: false, galat: "Usaha tidak ditemukan." };
    const h = kembalikanKeOtomatis(u, HARI_PLATFORM);
    if (!h.ok) return { ok: false, galat: h.galat.umum ?? "Gagal." };
    setUsaha((d) => d.map((x) => (x.id === u.id ? h.usaha : x)));
    tulisAudit(h.audit);
    return { ok: true, pesan: "Status kembali otomatis (dihitung dari tanggal)." };
  };

  const mulaiLihat: Ctx["mulaiLihat"] = (usahaId, alasan) => {
    const u = usaha.find((x) => x.id === usahaId);
    if (!u) return { ok: false, galat: "Usaha tidak ditemukan." };
    const h = mulaiModeLihat(u, alasan, sekarang());
    if (!h.ok) return h;
    tulisAudit(h.audit); // dicatat SEBELUM data usaha ditampilkan
    setModeLihat((m) => ({ ...m, [usahaId]: h.berakhir }));
    return { ok: true, pesan: "Mode lihat dibuka dan tercatat di audit log." };
  };
  const akhiriLihat = (usahaId: string) => setModeLihat((m) => { const n = { ...m }; delete n[usahaId]; return n; });

  const nilai = useMemo<Ctx>(() => ({
    hari: HARI_PLATFORM, usaha, tagihan, promo, audit, logPengingat, catatan, modeLihat, sembunyi, setSembunyi, sekarang,
    aktifkanManual, simpanCatatan, catatPengingat, buatPromo, alihPromo, hapusPromo, aturStatus, kembalikanStatus, mulaiLihat, akhiriLihat,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [usaha, tagihan, promo, audit, logPengingat, catatan, modeLihat, sembunyi]);

  return <PlatformCtx.Provider value={nilai}>{children}</PlatformCtx.Provider>;
}
