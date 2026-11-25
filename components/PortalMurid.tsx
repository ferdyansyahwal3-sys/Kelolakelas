"use client";
import { useEffect, useState, useTransition } from "react";
import { KUNCI_INFO } from "./PemberitahuanPanel";
import { labelInfo, untukMurid, type JenisInfo, type Pemberitahuan } from "@/lib/pemberitahuan";
import { PageHeader } from "./PageHeader";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { bisaAjukanIzin, ringkasKuota } from "@/lib/portal";

interface Data {
  nama: string; pengajar: string; paket: string; sisa: number; total: number; berlakuSampai: string; aktif: boolean;
  riwayat: { tgl: string; status: "hadir" | "izin" | "alpa" }[];
  tagihan: { id: string; nominal: number; status: "lunas" | "belum" | "menunggu_verifikasi"; tempo: string }[];
  catatan: { tgl: string; teks: string }[];
  berikutnya: { label: string; mulai: string; nama: string; slotId?: string; tanggal?: string } | null;
}
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const kelasSesi = { hadir: "st st-ok", izin: "st st-few", alpa: "st st-full" } as const;
const namaSesi = { hadir: "Hadir", izin: "Izin", alpa: "Alpa" } as const;
const tagihanLabel = { lunas: { t: "Lunas", k: "st st-ok" }, belum: { t: "Belum bayar", k: "st st-free" }, menunggu_verifikasi: { t: "Dicek pemilik", k: "st st-few" } } as const;

type Izin = { slug: string; token: string; kirim: (slug: string, token: string, slotId: string, tanggal: string) => Promise<{ ok: true } | { ok: false; pesan: string }> };

export function PortalMurid({ usaha, data, sekarang, batasIzinJam, pengajarId, slotIds, info, izin: izinServer }: { usaha: string; data: Data; sekarang: string; batasIzinJam: number; pengajarId: string; slotIds: string[]; info: Pemberitahuan[]; /** Portal asli: izin disimpan ke database. Tanpa ini = hanya contoh. */ izin?: Izin }) {
  const [izin, setIzin] = useState(false);
  const [galatIzin, setGalatIzin] = useState("");
  const [kirimIzin, mulaiIzin] = useTransition();
  const [kabar, setKabar] = useState(info);
  useEffect(() => {
    if (izinServer) return; // portal asli: info dari database
    try { const d = JSON.parse(localStorage.getItem(KUNCI_INFO) ?? "null") as Pemberitahuan[] | null; if (Array.isArray(d)) setKabar(untukMurid(d, pengajarId, slotIds, sekarang.slice(0, 10))); } catch {}
  }, [pengajarId, slotIds, sekarang, izinServer]);
  const k = ringkasKuota(data.sisa, data.total);
  const b = data.berikutnya;
  const boleh = b ? bisaAjukanIzin(b.mulai, sekarang, batasIzinJam) : false;
  const belum = data.tagihan.find((t) => t.status === "belum");

  return (
    <div className="shell">
      <main className="scroll kolom2" style={{ paddingTop: 20 }}>
        <PageHeader title={`Halo, ${data.nama}`} eyebrow={usaha} chip={data.aktif ? `Pelatih: ${data.pengajar}` : "Paket tidak aktif"} />

        {kabar.length > 0 && (
          <section className="grp" aria-label="Info dari pelatih">
            <h2 className="h2">Info dari pelatih</h2>
            <div className="surface batas">
              {kabar.slice(0, 5).map((k) => (
                <div key={k.id} className="item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className={k.jenis === "tidak_hadir" ? "st st-full" : k.jenis === "aturan" ? "st st-few" : "st st-ok"}>{labelInfo[k.jenis as JenisInfo]}</span><span className="meta">{tglPendek(k.tgl)} · {k.penulis}</span></div>
                  <div className="name" style={{ whiteSpace: "normal" }}>{k.judul}</div>
                  <div className="sub" style={{ fontSize: 13 }}>{k.isi}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="meta">{data.paket}</span>
          <div className="big" style={{ color: "var(--panel-text)" }}>Sisa {k.sisa}<span className="dim" style={{ fontSize: 18 }}> dari {data.total} sesi</span></div>
          <div className="bar" aria-hidden="true"><i style={{ width: `${k.persenSisa}%` }} /></div>
          <span className="sub" style={{ fontSize: 13 }}>Terpakai {k.terpakai} sesi · berlaku sampai {tglPendek(data.berlakuSampai)} {data.berlakuSampai.slice(0, 4)}</span>
        </div>

        {b && (
          <section className="grp">
            <h2 className="h2">Sesi berikutnya</h2>
            <div className="surface kartu-form">
              <div><div className="name">{b.label}</div><div className="meta">{b.nama}</div></div>
              {izin ? <span className="st st-few" role="status" style={{ alignSelf: "flex-start" }}>Izin tercatat, pemilik akan melihatnya</span> : (
                <>
                  <button type="button" className="btn btn-2" onClick={() => {
                    if (!izinServer || !b?.slotId || !b.tanggal) { setIzin(true); return; }
                    setGalatIzin("");
                    mulaiIzin(async () => { const r = await izinServer.kirim(izinServer.slug, izinServer.token, b.slotId!, b.tanggal!); if (r.ok) setIzin(true); else setGalatIzin(r.pesan); });
                  }} disabled={!boleh || kirimIzin}>{kirimIzin ? "Mengirim…" : "Ajukan izin"}</button>
                  {galatIzin && <p className="galat" role="alert" style={{ margin: 0 }}>{galatIzin}</p>}
                  {!boleh && <p className="meta" style={{ margin: 0 }}>Izin paling lambat {batasIzinJam} jam sebelum sesi dimulai. Hubungi pelatih bila mendesak.</p>}
                </>
              )}
            </div>
          </section>
        )}

        <section className="grp">
          <h2 className="h2">Pembayaran</h2>
          <div className="surface batas">
            {data.tagihan.map((t) => (
              <div key={t.id} className="item"><div className="grow"><div className="name">{rp(t.nominal)}</div><div className="meta">Tempo {tglPendek(t.tempo)}</div></div><span className={tagihanLabel[t.status].k}>{tagihanLabel[t.status].t}</span></div>
            ))}
          </div>
          {belum && <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(`Halo, ini bukti bayar tagihan ${rp(belum.nominal)} atas nama ${data.nama}.`)}`} target="_blank" rel="noopener noreferrer">Kirim bukti bayar lewat WA</a>}
        </section>

        <section className="grp">
          <h2 className="h2">Riwayat kehadiran</h2>
          {data.riwayat.length === 0 ? <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada sesi.</p> : (
            <div className="surface batas">{data.riwayat.map((r) => <div key={r.tgl} className="item"><span className="grow">{r.tgl}</span><span className={kelasSesi[r.status]}>{namaSesi[r.status]}</span></div>)}</div>
          )}
        </section>

        {data.catatan.length > 0 && (
          <section className="grp">
            <h2 className="h2">Catatan dari pelatih</h2>
            <div className="surface batas">{data.catatan.map((c) => <div key={c.tgl} className="item" style={{ alignItems: "flex-start" }}><span className="meta" style={{ width: 46, paddingTop: 2 }}>{c.tgl}</span><span className="grow">{c.teks}</span></div>)}</div>
          </section>
        )}
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Link ini pribadi. Jangan dibagikan ke orang lain.</p>
      </main>
    </div>
  );
}
