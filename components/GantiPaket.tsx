"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Tautan as Link } from "@/components/BasisApp";
import { pecahRupiah } from "@/lib/format";
import { INFO_KELEBIHAN, arahGanti, catatanGanti, hitungKelebihan, kalimatKelebihan, labelArah, type HasilGanti, type Kelebihan, type Pemakaian } from "@/lib/langgananGanti";
import { JENIS, PAKET, PROMO_PELANGGAN, angkaBatas, hargaPeriode, labelPlan, type Jenis, type PlanKey } from "@/lib/paketLangganan";

const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

interface Props {
  planAwal: PlanKey;
  pemakaian: Pemakaian;
  sekarangMs: number;
  /** Panel asli: simpan ke database lewat aksi server. Tanpa ini (demo) pergantian hanya hidup di halaman. */
  aksi?: (plan: PlanKey) => Promise<HasilGanti>;
}

/**
 * Ganti paket, naik/turun, dan pindah jenis. Paket yang pemakaiannya melebihi batas tetap bisa dipilih untuk MELIHAT apa yang harus
 * dikurangi, tapi tombol ganti dimatikan. Tidak ada yang dinonaktifkan atau dihapus dari sini: pemilik mengurangi sendiri lewat tautan.
 */
export function GantiPaket({ planAwal, pemakaian, sekarangMs, aksi }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(planAwal);
  const [jenis, setJenis] = useState<Jenis>(PAKET[planAwal].jenis);
  const [pilih, setPilih] = useState<PlanKey | null>(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string; lanjut?: PlanKey } | null>(null);
  const [kelebihanServer, setKelebihanServer] = useState<Kelebihan[] | null>(null);
  const [sibuk, mulai] = useTransition();

  const kelebihan = pilih ? hitungKelebihan(pemakaian, pilih) : [];
  const tampilKelebihan = kelebihanServer ?? kelebihan;
  const muat = tampilKelebihan.length === 0;

  function konfirmasi() {
    if (!pilih || !muat || sibuk) return;
    const tujuan = pilih;
    mulai(async () => {
      setPesan(null); setKelebihanServer(null);
      const h: HasilGanti = aksi ? await aksi(tujuan) : { ok: true, plan: tujuan, jenis: PAKET[tujuan].jenis, berubahJenis: PAKET[tujuan].jenis !== PAKET[plan].jenis };
      if (h.ok) {
        setPlan(tujuan); setPilih(null);
        setPesan({ ok: true, teks: `Paketmu sekarang ${labelPlan(tujuan)}.${h.berubahJenis ? " Jenis usaha ikut berganti." : ""}`, lanjut: tujuan });
        if (aksi) router.refresh();
      } else if (h.galat === "melebihi_batas") {
        setKelebihanServer(h.kelebihan);
        setPesan({ ok: false, teks: "Pemakaianmu berubah dan sekarang melebihi batas paket itu. Kurangi dulu yang tertera." });
      } else setPesan({ ok: false, teks: h.pesan });
    });
  }

  return (
    <>
      <div className="seg" role="radiogroup" aria-label="Jenis usaha">
        {(Object.keys(JENIS) as Jenis[]).map((j) => (
          <button key={j} type="button" role="radio" aria-checked={jenis === j} className={jenis === j ? "on" : ""} onClick={() => { setJenis(j); setPilih(null); setKelebihanServer(null); setPesan(null); }}>
            {JENIS[j].nama}
          </button>
        ))}
      </div>
      <p className="sub" style={{ margin: 0, fontSize: 13 }}>{JENIS[jenis].untuk}. Datamu ikut kalau pindah jenis; yang tidak muat tidak dihapus, kamu yang memilih apa yang dikurangi.</p>

      <div className="grp" role="group" aria-label="Pilihan paket">
        {JENIS[jenis].paket.map((p) => {
          const def = PAKET[p];
          const k = hitungKelebihan(pemakaian, p);
          const ini = p === plan;
          const dipilih = p === pilih;
          const h = hargaPeriode(p, "bulanan", sekarangMs, PROMO_PELANGGAN);
          return (
            <button key={p} type="button" className="surface kartu-form" disabled={ini} aria-pressed={dipilih}
              onClick={() => { setPilih(p); setKelebihanServer(null); setPesan(null); }}
              style={{ textAlign: "left", cursor: ini ? "default" : "pointer", gap: 8, font: "inherit", color: "inherit", outline: dipilih ? "2px solid var(--accent)" : "none", outlineOffset: -2 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <b>{def.nama}{def.sorot ? " ⭐" : ""}</b>
                <span className={ini ? "st st-ok" : k.length === 0 ? "st st-few" : "st st-full"}>{ini ? "Paket sekarang" : k.length === 0 ? "Muat" : `Perlu dikurangi · ${k.length} hal`}</span>
              </span>
              <span className="sum" style={{ padding: 0 }}><span className="sub">per bulan</span><b>{h.promo && <s className="meta" style={{ marginRight: 8, fontWeight: 400 }}>{rp(def.hargaNormal)}</s>}{rp(h.total)}</b></span>
              <span className="meta">
                {def.jenis === "agensi" ? `${angkaBatas(def.batas.pelatih)} pelatih · ` : ""}{angkaBatas(def.batas.murid)} murid · {angkaBatas(def.batas.slot)} slot · {angkaBatas(def.batas.paketJual)} paket jual · {angkaBatas(def.batas.rekening)} rekening
              </span>
            </button>
          );
        })}
      </div>

      {pilih && (
        <section className="surface kartu-form" aria-label={`Ganti ke ${labelPlan(pilih)}`}>
          <h2 className="h2">{labelArah[arahGanti(plan, pilih)]}: {labelPlan(pilih)}</h2>
          {muat ? (
            <>
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Pemakaianmu muat di paket ini. Tidak ada data yang dikurangi.</p>
              <ul className="meta" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {catatanGanti(plan, pilih).map((c) => <li key={c}>{c}</li>)}
              </ul>
              <button type="button" className="btn" onClick={konfirmasi} disabled={sibuk}>{sibuk ? "Menyimpan..." : `Ganti ke ${labelPlan(pilih)}`}</button>
            </>
          ) : (
            <>
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum bisa ganti ke paket ini. Pemakaianmu melebihi batasnya, jadi kurangi dulu hal berikut. Tidak ada yang dinonaktifkan atau dihapus otomatis.</p>
              <div className="surface batas" role="list">
                {tampilKelebihan.map((x) => {
                  const i = INFO_KELEBIHAN[x.kunci];
                  return (
                    <div key={x.kunci} role="listitem" className="item" style={{ alignItems: "flex-start" }}>
                      <div className="grow"><div className="name">{kalimatKelebihan(x)}</div><div className="meta">{i.catatan}</div></div>
                      <Link href={i.href} className="btn btn-2" style={{ flex: "none" }}>{i.aksi}</Link>
                    </div>
                  );
                })}
              </div>
              <p className="meta" style={{ margin: 0 }}>Setelah dikurangi, kembali ke halaman ini dan pilih lagi paketnya.</p>
              <button type="button" className="btn" disabled aria-disabled="true">Ganti ke {labelPlan(pilih)}</button>
            </>
          )}
        </section>
      )}

      {pesan && (
        <div className="surface kartu-form" role={pesan.ok ? "status" : "alert"}>
          <span className="sub" style={{ fontSize: 13 }}>{pesan.teks}</span>
          {pesan.ok && pesan.lanjut && <Link href={`/app/langganan/checkout?paket=${pesan.lanjut}&periode=bulanan`} className="btn btn-2">Lihat pembayaran paket ini</Link>}
        </div>
      )}
    </>
  );
}
