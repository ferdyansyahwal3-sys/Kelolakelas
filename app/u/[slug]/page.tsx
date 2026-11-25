import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AturanBeranda } from "@/components/AturanBeranda";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { kelompokPaket, linkWa } from "@/lib/beranda";
import { slotTerdekatDb } from "@/lib/berandaDb";
import { muatUsahaPublik } from "@/lib/supabase/publikData";
import { inisial, pecahRupiah } from "@/lib/format";
import { getIstilah, kapital } from "@/lib/istilah";
import { aturanUntuk } from "@/lib/pengaturan";
import { labelTanggal } from "@/lib/sesi";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const u = await muatUsahaPublik(params.slug, 0);
  if (!u) return { title: "Tidak ditemukan" };
  return { title: `${u.nama} · Daftar ${u.kategori.toLowerCase()}`, description: u.deskripsi || `Daftar ${u.kategori.toLowerCase()} di ${u.nama}.` };
}

const rp = (n: number) => { const p = pecahRupiah(n); return `Rp ${p.depan}${p.belakang}`; };

export default async function BerandaUsaha({ params }: { params: { slug: string } }) {
  const u = await muatUsahaPublik(params.slug);
  if (!u) notFound();
  const t = { nama: u.nama, slug: u.slug, kota: u.kota, kategori: u.kategori, deskripsi: u.deskripsi, area: u.area, noWa: u.noWa, kategoriUsaha: u.kategori };
  const istilah = getIstilah(u.istilah);
  const wa = u.noWa ? linkWa(u.noWa, `Halo ${t.nama}, saya mau tanya soal ${istilah.sesi}.`) : null;
  const dekat = slotTerdekatDb(u.jadwal, u.terisi, u.tutup, u.hariIni, u.jamSekarang, 3);
  const paket = kelompokPaket(u.paket);
  const namaPengajar = (id: string) => u.pengajar.find((p) => p.id === id)?.nama ?? "";
  const pelatih = u.pengajar.map((p) => ({ ...p, kelas: Array.from(new Set(u.jadwal.filter((s) => s.pengajarId === p.id).map((s) => s.nama))) }));

  return (
    <div className="shell">
      <main className="scroll kolom2" style={{ paddingTop: 28 }}>
        <div className="hrow">
          <span className="avatar" aria-hidden="true">{inisial(t.nama)}</span>
          <div className="t">
            <div style={{ fontWeight: 600 }}>{t.nama}</div>
            <div className="label" style={{ fontSize: 12 }}>{[t.kota, t.kategori].filter(Boolean).join(" · ")}</div>
          </div>
          <ThemeToggle />
        </div>

        <section className="panel hero-usaha" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 className="title" style={{ color: "var(--panel-text)" }}>{t.nama}</h1>
          {t.deskripsi && <p style={{ margin: 0, color: "var(--panel-text-2)", lineHeight: 1.55 }}>{t.deskripsi}</p>}
          {t.area && <span className="pill" style={{ alignSelf: "flex-start" }}><span className="dot" />{t.area}</span>}
          <div className="aksi">
            <Link href={`/u/${t.slug}/slot`} className="btn btn-sm">Lihat slot</Link>
            {wa && <a href={wa} className="btn btn-2 btn-sm" target="_blank" rel="noopener noreferrer"><Icon name="wa" />Chat WA</a>}
          </div>
        </section>

        <section className="grp">
          <div className="sec-head" style={{ color: "var(--head-text)" }}>
            <h2 className="h2">Slot terdekat</h2>
            <Link href={`/u/${t.slug}/slot`} className="link" style={{ color: "var(--head-text-2)" }}>Semua slot</Link>
          </div>
          {dekat.length === 0 ? (
            <div className="surface kosong">
              <h2 className="h2">Semua slot sedang penuh</h2>
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Hubungi {istilah.pengajar} lewat WhatsApp untuk tanya jadwal berikutnya.</p>
            </div>
          ) : (
            <div className="surface">
              {dekat.map((d) => (
                <Link key={`${d.tanggal}${d.slot.id}`} href={`/u/${t.slug}/slot`} className="item">
                  <span className="time" style={{ width: 'auto', minWidth: 46 }}>{d.slot.jam}</span>
                  <span className="grow">
                    <span className="name" style={{ display: "block" }}>{labelTanggal(d.tanggal)} · {d.slot.nama}</span>
                    <span className="meta">{namaPengajar(d.slot.pengajarId)}</span>
                  </span>
                  <span className={d.sisa === d.slot.kuota ? "st st-free" : "st st-few"}>{d.sisa === d.slot.kuota ? "Tersedia" : `Sisa ${d.sisa}`}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>{kapital(istilah.pengajar)}</h2>
          <div className="surface">
            {pelatih.map((p) => (
              <div key={p.id} className="item">
                <span className="avatar s" aria-hidden="true">{inisial(p.nama.replace(/^Coach /, ""))}</span>
                <span className="grow">
                  <span className="name" style={{ display: "block" }}>{p.nama}</span>
                  <span className="meta">{p.kelas.join(" · ")}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Paket dan harga</h2>
          {paket.length === 0 ? (
            <div className="surface kosong"><p className="sub" style={{ margin: 0, fontSize: 13 }}>Paket belum diatur. Hubungi lewat WhatsApp.</p></div>
          ) : paket.map((k) => (
            <div key={k.kategori} className="grp" style={{ gap: 8 }}>
              {paket.length > 1 && <span className="label" style={{ fontWeight: 600 }}>{k.judul}</span>}
              <div className="surface">
                {k.paket.map((p) => (
                  <div key={p.id} className="item">
                    <span className="grow">
                      <span className="name" style={{ display: "block" }}>{p.nama}</span>
                      <span className="meta">{p.label}</span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <b style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>{rp(p.harga)}</b>
                      <span className="meta">≈ {rp(p.perSesi)}/{istilah.sesi}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="grp">
          <h2 className="h2" style={{ color: "var(--head-text)" }}>Aturan {istilah.sesi}</h2>
          <div className="surface" style={{ padding: 16 }}>
            <AturanBeranda bawaan={aturanUntuk(t.kategoriUsaha)} sebutSesi={istilah.sesi} />
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <Link href={`/u/${t.slug}/status`} className="link">Sudah mendaftar? Cek status</Link>
          <span className="meta">Halaman ini dibuat dengan KelolaKelas</span>
        </div>
      </main>
      <div className="foot">
        <Link className="btn" style={{ width: "100%" }} href={`/u/${t.slug}/slot`}>Daftar sekarang</Link>
      </div>
    </div>
  );
}
