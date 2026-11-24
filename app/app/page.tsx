import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { pecahRupiah, inisial } from "@/lib/format";
import { getIstilah, kapital } from "@/lib/istilah";
import { ChecklistOnboarding } from "@/components/ChecklistOnboarding";
import { HARI_INI, jadwalContoh, muridContoh, paketOwnerContoh, pesertaTetapContoh, rekeningContoh, ringkasanContoh, tagihanContoh, tenantContoh } from "@/lib/contoh";
import { ringkasanPagi } from "@/lib/ringkasan";
import { sesiPadaTanggal } from "@/lib/sesi";
import { Tautan as Link } from "@/components/BasisApp";

export default function DashboardOwner() {
  const { pemasukanBulanIni, pendaftaranMenunggu } = ringkasanContoh;
  const total = pecahRupiah(pemasukanBulanIni);
  const istilah = getIstilah(tenantContoh.istilah);
  const ringkas = ringkasanPagi(
    sesiPadaTanggal(jadwalContoh, pesertaTetapContoh, [], HARI_INI),
    { pendaftaranMenunggu: pendaftaranMenunggu.length, buktiPerluDicek: tagihanContoh.filter((t) => t.status === "menunggu_verifikasi").length, tagihanTelat: tagihanContoh.filter((t) => t.status === "belum" && t.tempo < HARI_INI).length },
    { sesi: istilah.sesi, murid: istilah.murid },
  );

  return (
    <main className="scroll" style={{ paddingTop: 28 }}>
      <div className="hrow">
        <span className="avatar">{inisial(tenantContoh.pemilik.replace(/^Coach /, ""))}</span>
        <div className="t hi">Halo <b>{tenantContoh.pemilik}!</b></div>
        <ThemeToggle />
        <Link href="/app/pendaftaran" className="circ" aria-label="Pendaftaran masuk">
          <Icon name="bell" />
          {pendaftaranMenunggu.length > 0 && <span className="badge" />}
        </Link>
      </div>

      <div className="grp" style={{ gap: 15, marginBottom: -11 }}>
        <div className="label">Pemasukan November</div>
        <div className="big">Rp {total.depan}<span className="dim">{total.belakang}</span></div>
      </div>

      <section className="grp">
        <div className="sec-head" style={{ color: "var(--head-text)" }}>
          <h2 className="h2">Ringkasan pagi</h2>
          <Link href="/app/sesi" className="link" style={{ color: "var(--head-text-2)" }}>Absen</Link>
        </div>
        <p className="ringkasan-judul">{ringkas.ringkas}</p>
        {ringkas.perhatian.length > 0 ? (
          <div className="perhatian" role="list" aria-label="Perlu perhatian">
            {ringkas.perhatian.map((p) => <Link key={p.id} href={p.href} className="chip-perhatian" role="listitem">{p.teks}</Link>)}
          </div>
        ) : <p className="meta" style={{ margin: 0, color: "var(--head-text-2)" }}>Tidak ada yang perlu perhatian.</p>}
        <div className="glasscards">
          {ringkas.kartu.map((h) => (
            <div key={h.id} className={h.sesi === 0 ? "gcard empty" : "gcard"}>
              <span className="k">{h.label}</span>
              <div>
                <div className="v">{h.sesi === 0 ? "Kosong" : `${h.sesi} ${istilah.sesi}`}</div>
                {h.sesi > 0 && <div className="m">{h.rentang} · {h.murid} {istilah.murid}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <nav className="panel qa" aria-label="Aksi cepat">
        <Link href="/app/pendaftaran">
          {pendaftaranMenunggu.length > 0 && <span className="n">{pendaftaranMenunggu.length}</span>}
          <Icon name="inbox" />Pendaftaran
        </Link>
        <Link href="/app/murid"><Icon name="users" />{kapital(istilah.murid)}</Link>
        <Link href="/app/tagihan"><Icon name="bill" />Tagihan</Link>
        <Link href="/app/lainnya"><Icon name="grid" />Lainnya</Link>
      </nav>

      <ChecklistOnboarding awal={{
        profil: { nama: tenantContoh.nama, kategori: tenantContoh.kategoriUsaha, kota: tenantContoh.kota, slug: tenantContoh.slug },
        paketAktif: paketOwnerContoh.filter((p) => p.aktif).length, slot: jadwalContoh.length, rekening: rekeningContoh.length, murid: muridContoh.filter((m) => m.aktif).length,
      }} />

      <section className="grp">
        <div className="sec-head">
          <h2 className="h2">Menunggu ACC</h2>
          <Link href="/app/pendaftaran" className="link">Semua <Icon name="ne" className="ic" /></Link>
        </div>
        <div className="surface batas">
          {pendaftaranMenunggu.length === 0 ? (
            <div className="item"><span className="sub">Belum ada pendaftaran. Bagikan link pendaftaran ke grup WA.</span></div>
          ) : (
            pendaftaranMenunggu.map((p) => (
              <div key={p.id} className="item">
                <span className="avatar s">{inisial(p.nama)}</span>
                <div className="grow">
                  <div className="name">{p.nama}</div>
                  <div className="meta">{p.kategori} · {p.slot}</div>
                </div>
                <Link href="/app/pendaftaran" className="btn btn-sm">Tinjau</Link>
              </div>
            ))
          )}
        </div>
      </section>

    </main>
  );
}
