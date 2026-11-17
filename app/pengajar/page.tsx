import { PageHeader } from "@/components/PageHeader";
import { PemberitahuanPanel } from "@/components/PemberitahuanPanel";
import { HARI_INI, muridContoh, pemberitahuanContoh, pengajarContoh } from "@/lib/contoh";
import { labelBayar } from "@/lib/murid";

const SAYA = { id: "riska", nama: "Coach Riska" };

export default function HalamanPelatih() {
  const murid = muridContoh.filter((m) => m.aktif && m.pengajar === SAYA.nama);
  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 20 }}>
        <PageHeader title="Halaman pelatih" icon="coach" chip={SAYA.nama} />
        <section className="grp">
          <h2 className="h2">Pembayaran murid saya</h2>
          <div className="surface">
            {murid.length === 0 ? <div className="item"><span className="sub">Belum ada murid.</span></div> : murid.map((m) => {
              const b = labelBayar(m.bayar);
              return <div key={m.id} className="item"><div className="grow"><div className="name">{m.nama}</div><div className="meta">Sisa {m.sisaSesi} dari {m.totalSesi} sesi</div></div><span className={b.kelas}>{b.pendek}</span></div>;
            })}
          </div>
          <p className="meta" style={{ margin: 0 }}>Bukti bayar diperiksa pemilik. Pelatih hanya bisa melihat statusnya.</p>
        </section>
        <PemberitahuanPanel awal={pemberitahuanContoh} pengajar={pengajarContoh} peran="pelatih" saya={SAYA} hariIni={HARI_INI} />
      </main>
    </div>
  );
}
