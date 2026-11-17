import Link from "next/link";
import { Icon } from "@/components/Icon";
import { hariContoh, pengajarContoh, slotContoh, tenantContoh } from "@/lib/contoh";
import { inisial } from "@/lib/format";
import { hitungSlot, kelasStatusSlot } from "@/lib/slot";

export default function SlotTersedia({ params, searchParams }: { params: { slug: string }; searchParams: { pengajar?: string; hari?: string; slot?: string } }) {
  const pengajarAktif = pengajarContoh.find((p) => p.id === searchParams.pengajar) ?? pengajarContoh[0]!;
  const hariAktif = hariContoh.find((h) => h.id === searchParams.hari) ?? hariContoh[2]!;
  const buat = (p: string, h: string, s?: string) => `?pengajar=${p}&hari=${h}${s ? `&slot=${s}` : ""}`;
  const terpilih = slotContoh.find((s) => s.id === searchParams.slot && hitungSlot(s.kuota, s.terisi).status !== "penuh");

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 28 }}>
        <div className="hrow">
          <span className="avatar">{inisial(tenantContoh.nama)}</span>
          <div className="t">
            <div style={{ fontWeight: 600 }}>{tenantContoh.nama}</div>
            <div className="label" style={{ fontSize: 12 }}>{tenantContoh.kota} · {tenantContoh.kategori}</div>
          </div>
          <a className="circ" href="https://wa.me/" aria-label="Chat WhatsApp"><Icon name="wa" /></a>
        </div>

        <h1 className="title">Pilih slot latihan</h1>

        <div className="seg">
          {pengajarContoh.map((p) => (
            <Link key={p.id} href={buat(p.id, hariAktif.id)} className={p.id === pengajarAktif.id ? "on" : ""}>{p.nama}</Link>
          ))}
        </div>

        <div className="days">
          {hariContoh.map((h) => (
            <Link key={h.id} href={buat(pengajarAktif.id, h.id)} className={h.id === hariAktif.id ? "on" : ""} style={h.lewat ? { opacity: 0.4 } : undefined}>
              <small>{h.hari}</small>
              <b>{h.tgl}</b>
            </Link>
          ))}
        </div>

        <div className="surface">
          {slotContoh.map((s) => {
            const h = hitungSlot(s.kuota, s.terisi);
            const penuh = h.status === "penuh" || h.status === "tutup";
            const aktif = terpilih?.id === s.id;
            const isi = (
              <>
                <span className="time">{s.jam}</span>
                <div className="grow">
                  <div className="name">{s.nama}</div>
                  <div className="meta">60 mnt · {s.kuota === 1 ? "1 murid" : `maks ${s.kuota}`}</div>
                </div>
                <span className={kelasStatusSlot[h.status]}>{h.label}</span>
              </>
            );
            return penuh ? (
              <div key={s.id} className="item item-off">{isi}</div>
            ) : (
              <Link key={s.id} href={buat(pengajarAktif.id, hariAktif.id, s.id)} replace scroll={false} className={aktif ? "item item-on" : "item"} aria-current={aktif ? "true" : undefined}>{isi}</Link>
            );
          })}
        </div>
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Slot penuh belum bisa dipilih. Daftar tunggu menyusul.</p>
      </main>
      <div className="foot">
        {terpilih ? (
          <Link className="btn" style={{ width: "100%" }} href={`/u/${params.slug}/daftar${buat(pengajarAktif.id, hariAktif.id, terpilih.id)}`}>Daftar {hariAktif.hari} {terpilih.jam}</Link>
        ) : (
          <span className="btn btn-2" style={{ width: "100%", opacity: 0.7 }} aria-disabled="true">Pilih satu slot</span>
        )}
      </div>
    </div>
  );
}
