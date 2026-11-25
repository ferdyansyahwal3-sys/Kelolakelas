import { Tautan as Link } from "@/components/BasisApp";
import type { SesiHari } from "@/lib/sesi";
import { namaBulan, tren6, type Pembayaran } from "@/lib/rekap";
import type { TagihanOwner } from "@/lib/tagihan";
import { inisial, pecahRupiah, ringkasRupiah } from "@/lib/format";

const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;

/** Blok tambahan dashboard yang hanya tampil di tablet/laptop (kelas `.hanya-lebar`, disembunyikan di HP). */

export function JadwalHariIni({ sesi: sesiAwal, pengajar }: { sesi: SesiHari[]; pengajar: { id: string; nama: string }[] }) {
  const sesi = [...sesiAwal].sort((a, b) => a.slot.jam.localeCompare(b.slot.jam));
  const nama = (id: string) => pengajar.find((p) => p.id === id)?.nama ?? "";
  return (
    <section className="grp hanya-lebar">
      <div className="sec-head">
        <h2 className="h2">Jadwal hari ini</h2>
        <Link href="/app/sesi" className="link">Buka absensi</Link>
      </div>
      <div className="surface">
        {sesi.length === 0 ? <div className="item"><span className="sub">Tidak ada sesi hari ini.</span></div> : sesi.map((s) => (
          <div key={s.slot.id} className="item">
            <span className="time">{s.slot.jam}</span>
            <span className="grow"><span className="name" style={{ display: "block" }}>{s.slot.nama}</span><span className="meta">{nama(s.pelatihId)} · {s.peserta.length}/{s.slot.kuota} murid</span></span>
            <span className={s.peserta.length >= s.slot.kuota ? "st st-full" : s.peserta.length === 0 ? "st st-free" : "st st-few"}>{s.peserta.length >= s.slot.kuota ? "Penuh" : s.peserta.length === 0 ? "Kosong" : `Sisa ${s.slot.kuota - s.peserta.length}`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TrenPemasukan({ pembayaran, bulanAwal }: { pembayaran: Pembayaran[]; bulanAwal: string }) {
  const tren = tren6(pembayaran, bulanAwal);
  const maks = Math.max(1, ...tren.map((t) => t.total));
  return (
    <section className="grp hanya-lebar">
      <div className="sec-head">
        <h2 className="h2">Pemasukan 6 bulan</h2>
        <Link href="/app/rekap" className="link">Rekap</Link>
      </div>
      <div className="surface mini-tren" role="img" aria-label={`Pemasukan 6 bulan: ${tren.map((t) => `${namaBulan(t.bulan)} ${ringkasRupiah(t.total)}`).join(", ")}`}>
        {tren.map((t, i) => (
          <div key={t.bulan} className="mini-kol">
            <span className="meta">{ringkasRupiah(t.total)}</span>
            <i className={i === tren.length - 1 ? "on" : ""} style={{ height: `${Math.max(6, Math.round((t.total / maks) * 100))}%` }} />
            <span className="meta">{namaBulan(t.bulan).slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PerluTindakan({ murid, tagihan }: { murid: { id: string; nama: string; aktif: boolean; sisaSesi: number; totalSesi: number }[]; tagihan: TagihanOwner[] }) {
  const habis = murid.filter((m) => m.aktif && m.sisaSesi <= 2).sort((a, b) => a.sisaSesi - b.sisaSesi);
  const tagih = tagihan.filter((t) => t.status === "belum").sort((a, b) => a.tempo.localeCompare(b.tempo));
  return (
    <>
      <section className="grp hanya-lebar">
        <div className="sec-head"><h2 className="h2">Paket hampir habis</h2><Link href="/app/murid" className="link">Murid</Link></div>
        <div className="surface">
          {habis.length === 0 ? <div className="item"><span className="sub">Semua paket masih aman.</span></div> : habis.map((m) => (
            <Link key={m.id} href={`/app/murid/${m.id}`} className="item">
              <span className="avatar s">{inisial(m.nama)}</span>
              <span className="grow"><span className="name" style={{ display: "block" }}>{m.nama}</span><span className="meta">Sisa {m.sisaSesi} dari {m.totalSesi} sesi</span></span>
              <span className={m.sisaSesi === 0 ? "st st-full" : "st st-few"}>{m.sisaSesi === 0 ? "Habis" : `Sisa ${m.sisaSesi}`}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="grp hanya-lebar">
        <div className="sec-head"><h2 className="h2">Belum bayar</h2><Link href="/app/tagihan" className="link">Tagihan</Link></div>
        <div className="surface">
          {tagih.length === 0 ? <div className="item"><span className="sub">Tidak ada tagihan tertunggak.</span></div> : tagih.map((t) => (
            <div key={t.id} className="item">
              <span className="grow"><span className="name" style={{ display: "block" }}>{t.nama}</span><span className="meta">{t.paket} · tempo {t.tempo.slice(8)}/{t.tempo.slice(5, 7)}</span></span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{rp(t.nominal)}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
