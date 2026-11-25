import { redirect } from "next/navigation";
import { ChecklistOnboarding } from "@/components/ChecklistOnboarding";
import { JadwalHariIni, PerluTindakan, TrenPemasukan } from "@/components/DashboardLebar";
import { Tautan as Link } from "@/components/BasisApp";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { dariBarisJadwal, hitungTerisi, type BarisJadwalDb } from "@/lib/berandaDb";
import { inisial, pecahRupiah } from "@/lib/format";
import { getIstilah, kapital } from "@/lib/istilah";
import { hariIniJakarta } from "@/lib/langgananData";
import { KOLOM_PENDAFTARAN, dariBarisPendaftaran, type BarisPendaftaranDb } from "@/lib/pendaftaranDb";
import { ringkasBulan } from "@/lib/rekap";
import { ringkasanPagi } from "@/lib/ringkasan";
import { sesiPadaTanggal } from "@/lib/sesi";
import { KOLOM_TAGIHAN, dariBarisTagihan, pembayaranDariTagihan, type BarisTagihanDb, type PaketMurid } from "@/lib/tagihanDb";
import { ambilKonteksOwner } from "@/lib/supabase/konteks";
import { muatDaftarMurid } from "@/lib/supabase/muridData";

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default async function DashboardOwner() {
  const k = await ambilKonteksOwner();
  if (!k) redirect("/masuk?lanjut=/app");

  const hariIni = hariIniJakarta();
  const bulan = hariIni.slice(0, 7);
  const [{ data: menunggu }, { data: tagihanRaw }, { data: jadwalRaw }, { data: peserta }, { data: paketMurid }, { data: pengajar }, { data: paket }, { count: nRekening }, { data: t }, murid] = await Promise.all([
    k.db.from("pendaftaran").select(KOLOM_PENDAFTARAN).eq("tenant_id", k.tenant.id).eq("status", "menunggu").order("dibuat_pada", { ascending: false }).limit(20),
    k.db.from("tagihan").select(KOLOM_TAGIHAN).eq("tenant_id", k.tenant.id).limit(2000),
    k.db.from("jadwal_template").select("id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi").eq("tenant_id", k.tenant.id),
    k.db.from("peserta_tetap").select("jadwal_id, murid_id").eq("tenant_id", k.tenant.id),
    k.db.from("murid_paket").select("murid_id, paket_id, pengajar_id, dibuat_pada").eq("tenant_id", k.tenant.id),
    k.db.from("pengajar").select("id, nama, user_id").eq("tenant_id", k.tenant.id).eq("aktif", true).order("nama"),
    k.db.from("paket").select("id").eq("tenant_id", k.tenant.id).eq("aktif", true),
    k.db.from("rekening_usaha").select("id", { count: "exact", head: true }).eq("tenant_id", k.tenant.id),
    k.db.from("tenants").select("pengaturan").eq("id", k.tenant.id).maybeSingle(),
    muatDaftarMurid(k),
  ]);

  const baris = (tagihanRaw ?? []) as unknown as BarisTagihanDb[];
  const tagihan = baris.map(dariBarisTagihan).filter((x) => x !== null);
  const daftarPengajar = (pengajar ?? []) as { id: string; nama: string; user_id: string | null }[];
  const cadangan = (daftarPengajar.find((p) => p.user_id === k.userId) ?? daftarPengajar[0])?.id ?? "";
  const pembayaran = pembayaranDariTagihan(baris, (paketMurid ?? []) as PaketMurid[], cadangan);
  const pemasukan = ringkasBulan(pembayaran, bulan).total;
  const total = pecahRupiah(pemasukan);

  const pesertaRows = (peserta ?? []) as { jadwal_id: string; murid_id: string }[];
  const terisi = hitungTerisi(pesertaRows);
  const jadwal = ((jadwalRaw ?? []) as unknown as BarisJadwalDb[]).map(dariBarisJadwal).map((s) => ({ ...s, terisi: terisi.get(s.id) ?? 0 }));
  const pesertaTetap: Record<string, string[]> = {};
  for (const s of jadwal) pesertaTetap[s.id] = [];
  for (const p of pesertaRows) (pesertaTetap[p.jadwal_id] ??= []).push(p.murid_id);
  const sesiHariIni = sesiPadaTanggal(jadwal, pesertaTetap, [], hariIni);

  const antrean = ((menunggu ?? []) as unknown as BarisPendaftaranDb[]).map(dariBarisPendaftaran);
  const istilah = getIstilah(k.tenant.istilah);
  const ringkas = ringkasanPagi(
    sesiHariIni,
    { pendaftaranMenunggu: antrean.length, buktiPerluDicek: tagihan.filter((x) => x.status === "menunggu_verifikasi").length, tagihanTelat: tagihan.filter((x) => x.status === "belum" && x.tempo < hariIni).length },
    { sesi: istilah.sesi, murid: istilah.murid },
  );
  const profil = ((t?.pengaturan ?? {}) as { profil?: { kota?: string } }).profil ?? {};
  const namaBulanIni = NAMA_BULAN[Number(bulan.slice(5)) - 1];

  return (
    <main className="scroll dash" style={{ paddingTop: 28 }}>
      <div className="hrow">
        <span className="avatar">{inisial(k.namaPengguna.replace(/^Coach /, ""))}</span>
        <div className="t hi">Halo <b>{k.namaPengguna}!</b></div>
        <ThemeToggle />
        <Link href="/app/pendaftaran" className="circ" aria-label="Pendaftaran masuk">
          <Icon name="bell" />
          {antrean.length > 0 && <span className="badge" />}
        </Link>
      </div>

      <div className="kol">
      <div className="grp" style={{ gap: 15, marginBottom: -11 }}>
        <div className="label">Pemasukan {namaBulanIni}</div>
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
      <JadwalHariIni sesi={sesiHariIni} pengajar={daftarPengajar} />
      <TrenPemasukan pembayaran={pembayaran} bulanAwal={bulan} />
      </div>

      <div className="kol">
      <nav className="panel qa" aria-label="Aksi cepat">
        <Link href="/app/pendaftaran">
          {antrean.length > 0 && <span className="n">{antrean.length}</span>}
          <Icon name="inbox" />Pendaftaran
        </Link>
        <Link href="/app/murid"><Icon name="users" />{kapital(istilah.murid)}</Link>
        <Link href="/app/tagihan"><Icon name="bill" />Tagihan</Link>
        <Link href="/app/lainnya"><Icon name="grid" />Lainnya</Link>
      </nav>

      <ChecklistOnboarding dariServer awal={{
        profil: { nama: k.tenant.nama, kategori: k.tenant.kategori, kota: profil.kota ?? "", slug: k.tenant.slug },
        paketAktif: (paket ?? []).length, slot: jadwal.length, rekening: nRekening ?? 0, murid: murid.filter((m) => m.aktif).length,
      }} />

      <section className="grp">
        <div className="sec-head">
          <h2 className="h2">Menunggu ACC</h2>
          <Link href="/app/pendaftaran" className="link">Semua <Icon name="ne" className="ic" /></Link>
        </div>
        <div className="surface batas">
          {antrean.length === 0 ? (
            <div className="item"><span className="sub">Belum ada pendaftaran. Bagikan link pendaftaran ke grup WA.</span></div>
          ) : (
            antrean.slice(0, 5).map((p) => (
              <div key={p.id} className="item">
                <span className="avatar s">{inisial(p.nama)}</span>
                <div className="grow">
                  <div className="name">{p.nama}</div>
                  <div className="meta">{p.kategori === "anak" ? "Anak" : "Dewasa"} · {p.slotLabel}</div>
                </div>
                <Link href="/app/pendaftaran" className="btn btn-sm">Tinjau</Link>
              </div>
            ))
          )}
        </div>
      </section>
      <PerluTindakan murid={murid} tagihan={tagihan} />
      </div>

    </main>
  );
}
