import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { linkWa } from "@/lib/beranda";
import { slotPadaTanggal } from "@/lib/berandaDb";
import { inisial } from "@/lib/format";
import { nomorHari, tambahHari } from "@/lib/sesi";
import { hitungSlot, kelasStatusSlot } from "@/lib/slot";
import { muatUsahaPublik } from "@/lib/supabase/publikData";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const HARI_PANJANG = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const RENTANG = 14;

export default async function SlotTersedia({ params, searchParams }: { params: { slug: string }; searchParams: { pengajar?: string; hari?: string; slot?: string } }) {
  const u = await muatUsahaPublik(params.slug);
  if (!u) notFound();

  const hariAda = Array.from({ length: RENTANG }, (_, i) => tambahHari(u.hariIni, i));
  const punyaSlot = (pengajarId: string, tgl: string) =>
    slotPadaTanggal(u.jadwal.filter((s) => s.pengajarId === pengajarId), u.terisi, u.tutup, tgl, tgl === u.hariIni ? u.jamSekarang : undefined).length > 0;

  const pengajarAktif = u.pengajar.find((p) => p.id === searchParams.pengajar) ?? u.pengajar.find((p) => hariAda.some((h) => punyaSlot(p.id, h))) ?? u.pengajar[0];
  const hariAktif = (searchParams.hari && TANGGAL.test(searchParams.hari) && hariAda.includes(searchParams.hari) ? searchParams.hari : undefined)
    ?? (pengajarAktif ? hariAda.find((h) => punyaSlot(pengajarAktif.id, h)) : undefined) ?? hariAda[0]!;
  const buat = (p: string, h: string, s?: string) => `?pengajar=${p}&hari=${h}${s ? `&slot=${s}` : ""}`;

  const slotHari = pengajarAktif
    ? slotPadaTanggal(u.jadwal.filter((s) => s.pengajarId === pengajarAktif.id), u.terisi, u.tutup, hariAktif, hariAktif === u.hariIni ? u.jamSekarang : undefined)
    : [];
  const terpilih = u.bolehDaftar ? slotHari.find((s) => s.slot.id === searchParams.slot && s.sisa > 0) : undefined;
  const wa = u.noWa ? linkWa(u.noWa, `Halo ${u.nama}, saya mau tanya jadwal.`) : null;
  const namaHari = (tgl: string) => HARI_PANJANG[nomorHari(tgl) - 1];
  const tglNomor = (tgl: string) => String(Number(tgl.slice(8)));

  return (
    <div className="shell">
      <main className="scroll" style={{ paddingTop: 28 }}>
        <div className="hrow">
          <span className="avatar">{inisial(u.nama)}</span>
          <div className="t">
            <div style={{ fontWeight: 600 }}>{u.nama}</div>
            <div className="label" style={{ fontSize: 12 }}>{[u.kota, u.kategori].filter(Boolean).join(" · ")}</div>
          </div>
          <ThemeToggle />
          {wa && <a className="circ" href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp"><Icon name="wa" /></a>}
        </div>

        <h1 className="title">Pilih slot latihan</h1>
        {!u.bolehDaftar && <div className="surface kosong" role="status"><h2 className="h2">Pendaftaran sedang ditutup</h2><p className="sub" style={{ margin: 0, fontSize: 13 }}>Usaha ini belum menerima pendaftaran baru untuk sementara. Hubungi lewat WhatsApp untuk tanya jadwal.</p></div>}

        {u.pengajar.length === 0 || u.jadwal.length === 0 ? (
          <div className="surface kosong">
            <h2 className="h2">Jadwal belum tersedia</h2>
            <p className="sub" style={{ margin: 0, fontSize: 13 }}>Hubungi lewat WhatsApp untuk tanya jadwal.</p>
          </div>
        ) : (
          <>
            {u.pengajar.length > 1 && (
              <div className="seg">
                {u.pengajar.map((p) => (
                  <Link key={p.id} href={buat(p.id, hariAktif)} className={p.id === pengajarAktif?.id ? "on" : ""}>{p.nama}</Link>
                ))}
              </div>
            )}

            <div className="days">
              {hariAda.map((h) => {
                const ada = pengajarAktif ? punyaSlot(pengajarAktif.id, h) : false;
                return (
                  <Link key={h} href={buat(pengajarAktif!.id, h)} className={h === hariAktif ? "on" : ""} style={ada ? undefined : { opacity: 0.4 }}>
                    <small>{HARI[nomorHari(h) - 1]}</small>
                    <b>{tglNomor(h)}</b>
                  </Link>
                );
              })}
            </div>

            {slotHari.length === 0 ? (
              <div className="surface kosong"><p className="sub" style={{ margin: 0, fontSize: 13 }}>Tidak ada slot di hari ini. Pilih hari lain.</p></div>
            ) : (
              <div className="surface">
                {slotHari.map(({ slot: s, terisi, ditutup }) => {
                  const h = hitungSlot(s.kuota, terisi, ditutup);
                  const penuh = h.status === "penuh" || h.status === "tutup";
                  const aktif = terpilih?.slot.id === s.id;
                  const isi = (
                    <>
                      <span className="time">{s.jam}</span>
                      <div className="grow">
                        <div className="name">{s.nama}</div>
                        <div className="meta">{s.durasi} mnt · {s.kuota === 1 ? "1 murid" : `maks ${s.kuota}`}</div>
                      </div>
                      <span className={kelasStatusSlot[h.status]}>{h.label}</span>
                    </>
                  );
                  return penuh ? (
                    <div key={s.id} className="item item-off">{isi}</div>
                  ) : (
                    <Link key={s.id} href={buat(pengajarAktif!.id, hariAktif, s.id)} replace scroll={false} className={aktif ? "item item-on" : "item"} aria-current={aktif ? "true" : undefined}>{isi}</Link>
                  );
                })}
              </div>
            )}
          </>
        )}
        <p className="meta" style={{ margin: 0, textAlign: "center" }}>Slot penuh belum bisa dipilih. Daftar tunggu menyusul.</p>
        <Link href={`/u/${params.slug}/status`} className="link" style={{ alignSelf: "center" }}>Sudah mendaftar? Cek status</Link>
      </main>
      <div className="foot">
        {terpilih && pengajarAktif ? (
          <Link className="btn" style={{ width: "100%" }} href={`/u/${params.slug}/daftar${buat(pengajarAktif.id, hariAktif, terpilih.slot.id)}`}>Daftar {namaHari(hariAktif)} {terpilih.slot.jam}</Link>
        ) : (
          <span className="btn btn-2" style={{ width: "100%", opacity: 0.7 }} aria-disabled="true">Pilih satu slot</span>
        )}
      </div>
    </div>
  );
}
