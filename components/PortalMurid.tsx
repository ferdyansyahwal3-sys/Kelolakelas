"use client";
import { useState } from "react";
import { PageHeader } from "./PageHeader";
import { pecahRupiah, tglPendek } from "@/lib/format";
import { bisaAjukanIzin, ringkasKuota } from "@/lib/portal";

interface Data {
  nama: string; pengajar: string; paket: string; sisa: number; total: number; berlakuSampai: string; aktif: boolean;
  riwayat: { tgl: string; status: "hadir" | "izin" | "alpa" }[];
  tagihan: { id: string; nominal: number; status: "lunas" | "belum" | "menunggu_verifikasi"; tempo: string }[];
  catatan: { tgl: string; teks: string }[];
  berikutnya: { label: string; mulai: string; nama: string } | null;
}
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const kelasSesi = { hadir: "st st-ok", izin: "st st-few", alpa: "st st-full" } as const;
const namaSesi = { hadir: "Hadir", izin: "Izin", alpa: "Alpa" } as const;
const tagihanLabel = { lunas: { t: "Lunas", k: "st st-ok" }, belum: { t: "Belum bayar", k: "st st-free" }, menunggu_verifikasi: { t: "Dicek pemilik", k: "st st-few" } } as const;

export function PortalMurid({ usaha, data, sekarang, batasIzinJam }: { usaha: string; data: Data; sekarang: string; batasIzinJam: number }) {
  const [izin, setIzin] = useState(false);
  const k = ringkasKuota(data.sisa, data.total);
  const b = data.berikutnya;
  const boleh = b ? bisaAjukanIzin(b.mulai, sekarang, batasIzinJam) : false;
  const belum = data.tagihan.find((t) => t.status === "belum");

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title={`Halo, ${data.nama}`} eyebrow={usaha} chip={data.aktif ? `Pelatih: ${data.pengajar}` : "Paket tidak aktif"} />

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
              {izin ? <span className="st st-few" role="status" style={{ alignSelf: "flex-start" }}>Izin diajukan, menunggu konfirmasi</span> : (
                <>
                  <button type="button" className="btn btn-2" disabled={!boleh} onClick={() => setIzin(true)}>Ajukan izin</button>
                  {!boleh && <p className="meta" style={{ margin: 0 }}>Izin paling lambat {batasIzinJam} jam sebelum sesi dimulai. Hubungi pelatih bila mendesak.</p>}
                </>
              )}
            </div>
          </section>
        )}

        <section className="grp">
          <h2 className="h2">Pembayaran</h2>
          <div className="surface">
            {data.tagihan.map((t) => (
              <div key={t.id} className="item"><div className="grow"><div className="name">{rp(t.nominal)}</div><div className="meta">Tempo {tglPendek(t.tempo)}</div></div><span className={tagihanLabel[t.status].k}>{tagihanLabel[t.status].t}</span></div>
            ))}
          </div>
          {belum && <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(`Halo, ini bukti bayar tagihan ${rp(belum.nominal)} atas nama ${data.nama}.`)}`} target="_blank" rel="noopener noreferrer">Kirim bukti bayar lewat WA</a>}
        </section>

        <section className="grp">
          <h2 className="h2">Riwayat kehadiran</h2>
          {data.riwayat.length === 0 ? <p className="sub" style={{ margin: 0, fontSize: 13 }}>Belum ada sesi.</p> : (
            <div className="surface">{data.riwayat.map((r) => <div key={r.tgl} className="item"><span className="grow">{r.tgl}</span><span className={kelasSesi[r.status]}>{namaSesi[r.status]}</span></div>)}</div>
          )}
        </section>

        {data.catatan.length > 0 && (
          <section className="grp">
            <h2 className="h2">Catatan dari pelatih</h2>
            <div className="surface">{data.catatan.map((c) => <div key={c.tgl} className="item" style={{ alignItems: "flex-start" }}><span className="meta" style={{ width: 46, paddingTop: 2 }}>{c.tgl}</span><span className="grow">{c.teks}</span></div>)}</div>
          </section>
        )}
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Link ini pribadi. Jangan dibagikan ke orang lain.</p>
      </main>
    </div>
  );
}
