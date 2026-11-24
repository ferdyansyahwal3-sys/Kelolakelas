"use client";
import { useState, useTransition } from "react";
import { Icon } from "./Icon";
import { pecahRupiah } from "@/lib/format";
import { bisaHapus, hargaPerSesi, labelJenis, validasiPaket, type InputPaket, type JenisPaket, type KategoriPaket, type PaketOwner as Paket } from "@/lib/paket";

/** Aksi server (panel asli). Tanpa `aksi` (mode demo) perubahan hanya hidup di halaman. */
export interface AksiPaket {
  simpan: (id: string | null, i: InputPaket) => Promise<{ ok: true; paket: Paket } | { ok: false; galat: Record<string, string>; pesan?: string }>;
  ubahAktif: (id: string, aktif: boolean) => Promise<{ ok: true; paket: Paket } | { ok: false; galat: Record<string, string>; pesan?: string }>;
  hapus: (id: string) => Promise<{ ok: true } | { ok: false; pesan: string }>;
}
interface Props { awal: Paket[]; dipakai: Record<string, number>; aksi?: AksiPaket; batasJual?: number | null; namaLangganan?: string; bolehUbah?: boolean }
const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const ribuan = (digit: string) => (digit === "" ? "" : new Intl.NumberFormat("id-ID").format(Number(digit)));
const kosong = { nama: "", kategori: "anak" as KategoriPaket, jenis: "privat" as JenisPaket, jumlahSesi: "8", masa: "35", harga: "", anggota: "2" };

export function PaketOwnerList({ awal, dipakai, aksi, batasJual = null, namaLangganan, bolehUbah = true }: Props) {
  const [daftar, setDaftar] = useState(awal);
  const [saring, setSaring] = useState<"semua" | KategoriPaket>("semua");
  const [buka, setBuka] = useState<string | null>(null);
  const [hapus, setHapus] = useState<string | null>(null);
  const [formBuka, setFormBuka] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(kosong);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [sibuk, mulai] = useTransition();
  const aktifJumlah = daftar.filter((p) => p.aktif).length;
  const penuh = batasJual !== null && aktifJumlah >= batasJual;

  const tampil = daftar.filter((p) => saring === "semua" || p.kategori === saring);
  const info = (t: string) => { setToast(t); setTimeout(() => setToast(""), 3500); };
  const bersih = (k: string) => setGalat((g) => { const n = { ...g }; delete n[k]; return n; });
  const angka = (s: string) => Number(s.replace(/\D/g, ""));

  const input: InputPaket = { nama: form.nama, kategori: form.kategori, jenis: form.jenis, jumlahSesi: angka(form.jumlahSesi), masaBerlakuHari: angka(form.masa), harga: angka(form.harga), anggota: form.jenis === "keluarga" ? angka(form.anggota) : null };
  const perSesi = input.harga > 0 && input.jumlahSesi > 0 ? hargaPerSesi(input) : 0;

  function mulaiBaru() { setEditId(null); setForm(kosong); setGalat({}); setFormBuka(true); }
  function mulaiUbah(p: Paket) {
    setEditId(p.id);
    setForm({ nama: p.nama, kategori: p.kategori, jenis: p.jenis, jumlahSesi: String(p.jumlahSesi), masa: String(p.masaBerlakuHari), harga: ribuan(String(p.harga)), anggota: String(p.anggota ?? 2) });
    setGalat({}); setFormBuka(true);
  }

  function simpan() {
    const g = validasiPaket(input, daftar.filter((p) => p.id !== editId));
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    const baru = { nama: input.nama.trim(), kategori: input.kategori, jenis: input.jenis, jumlahSesi: input.jumlahSesi, masaBerlakuHari: input.masaBerlakuHari, harga: input.harga, anggota: input.anggota };
    const selesai = (p: Paket) => {
      setDaftar((d) => (editId ? d.map((x) => (x.id === editId ? p : x)) : [...d, p]));
      info(editId ? `Paket ${p.nama} diperbarui.` : `Paket ${p.nama} dibuat.`);
      setFormBuka(false); setEditId(null);
    };
    if (!aksi) { selesai({ id: editId ?? `baru-${Date.now()}`, aktif: editId ? (daftar.find((x) => x.id === editId)?.aktif ?? true) : true, ...baru }); return; }
    mulai(async () => {
      const r = await aksi.simpan(editId, input);
      if (r.ok) selesai(r.paket);
      else { setGalat(r.galat); if (r.pesan) info(r.pesan); }
    });
  }

  function ubahAktif(p: Paket) {
    if (!aksi) { setDaftar((d) => d.map((x) => (x.id === p.id ? { ...x, aktif: !x.aktif } : x))); info(p.aktif ? `${p.nama} dinonaktifkan.` : `${p.nama} diaktifkan.`); return; }
    mulai(async () => {
      const r = await aksi.ubahAktif(p.id, !p.aktif);
      if (r.ok) { setDaftar((d) => d.map((x) => (x.id === p.id ? r.paket : x))); info(r.paket.aktif ? `${p.nama} diaktifkan.` : `${p.nama} dinonaktifkan.`); }
      else info(r.pesan ?? "Belum bisa diubah.");
    });
  }

  function hapusPaket(p: Paket) {
    const selesai = () => { setDaftar((d) => d.filter((x) => x.id !== p.id)); setBuka(null); setHapus(null); info(`${p.nama} dihapus.`); };
    if (!aksi) { selesai(); return; }
    mulai(async () => {
      const r = await aksi.hapus(p.id);
      if (r.ok) selesai(); else { setHapus(null); info(r.pesan); }
    });
  }

  const E = ({ k }: { k: string }) => (galat[k] ? <span className="galat" role="alert">{galat[k]}</span> : null);

  return (
    <>
      <div className="seg" role="tablist" aria-label="Kategori">
        {(["semua", "anak", "dewasa"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={saring === k} className={saring === k ? "on" : ""} onClick={() => { setSaring(k); setBuka(null); }}>{k === "semua" ? "Semua" : k === "anak" ? "Anak" : "Dewasa"}</button>
        ))}
      </div>
      <p className="meta" style={{ margin: 0 }}>{batasJual !== null ? `Paket jual aktif: ${aktifJumlah} dari ${batasJual} (${namaLangganan}). ` : ""}Paket yang dinonaktifkan tidak muncul di form pendaftaran, tapi murid yang sudah memakainya tidak terganggu.</p>

      {tampil.length === 0 ? (
        <div className="surface kosong"><span className="circ"><Icon name="doc" /></span><h2 className="h2">Belum ada paket</h2><p className="sub" style={{ margin: 0, fontSize: 13 }}>Buat paket supaya murid bisa memilih saat mendaftar.</p></div>
      ) : (
        <div className="surface batas batas-tinggi">
          {tampil.map((p) => {
            const terbuka = buka === p.id;
            const pakai = dipakai[p.id] ?? 0;
            return (
              <div key={p.id} className="baris">
                <button type="button" className="item buka" style={{ padding: "14px 16px", width: "100%" }} aria-expanded={terbuka} onClick={() => { setBuka(terbuka ? null : p.id); setHapus(null); }}>
                  <span className="grow" style={{ textAlign: "left" }}>
                    <span className="name" style={{ display: "block" }}>{p.nama}</span>
                    <span className="meta">{labelJenis[p.jenis]} · {p.jumlahSesi} sesi · {p.masaBerlakuHari} hari</span>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <b style={{ display: "block" }}>{rp(p.harga)}</b>
                    {!p.aktif && <span className="st st-free" style={{ marginTop: 4 }}>Nonaktif</span>}
                  </span>
                </button>
                {terbuka && (
                  <div className="detail">
                    <dl>
                      <dt>Kategori</dt><dd>{p.kategori === "anak" ? "Anak" : "Dewasa"}</dd>
                      {p.anggota && <><dt>Anggota</dt><dd>{p.anggota} orang</dd></>}
                      <dt>Per sesi</dt><dd>≈ {rp(hargaPerSesi(p))}</dd>
                      <dt>Murid aktif</dt><dd>{pakai}</dd>
                    </dl>
                    <div className="aksi">
                      <button type="button" className="btn btn-sm" disabled={!bolehUbah} onClick={() => mulaiUbah(p)}>Ubah</button>
                      <button type="button" className="btn btn-2 btn-sm" disabled={sibuk || !bolehUbah || (!p.aktif && penuh)} onClick={() => ubahAktif(p)}>{p.aktif ? "Nonaktifkan" : "Aktifkan"}</button>
                      {hapus === p.id ? (
                        <>
                          <button type="button" className="btn btn-2 btn-sm" disabled={sibuk} onClick={() => hapusPaket(p)}>Ya, hapus</button>
                          <button type="button" className="btn btn-2 btn-sm" onClick={() => setHapus(null)}>Batal</button>
                        </>
                      ) : <button type="button" className="btn btn-2 btn-sm" disabled={!bisaHapus(pakai) || !bolehUbah} onClick={() => setHapus(p.id)}>Hapus</button>}
                    </div>
                    {!bisaHapus(pakai) && <p className="meta" style={{ margin: 0 }}>Dipakai {pakai} murid aktif, jadi tidak bisa dihapus. Nonaktifkan saja supaya tidak muncul di pendaftaran baru.</p>}
                    <p className="meta" style={{ margin: 0 }}>Mengubah harga tidak mengubah tagihan yang sudah dibuat.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formBuka ? (
        <form className="surface kartu-form" onSubmit={(e) => { e.preventDefault(); simpan(); }} noValidate>
          <h2 className="h2">{editId ? "Ubah paket" : "Paket baru"}</h2>
          <label className="field"><span className="label l2">Nama paket</span>
            <input value={form.nama} onChange={(e) => { setForm({ ...form, nama: e.target.value }); bersih("nama"); }} placeholder="8x per bulan" /><E k="nama" /></label>
          <div className="seg" role="radiogroup" aria-label="Kategori">
            {(["anak", "dewasa"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={form.kategori === k} className={form.kategori === k ? "on" : ""} onClick={() => { setForm({ ...form, kategori: k }); bersih("nama"); }}>{k === "anak" ? "Anak" : "Dewasa"}</button>)}
          </div>
          <div className="seg" role="radiogroup" aria-label="Jenis">
            {(["privat", "grup", "keluarga"] as const).map((j) => <button key={j} type="button" role="radio" aria-checked={form.jenis === j} className={form.jenis === j ? "on" : ""} onClick={() => setForm({ ...form, jenis: j })}>{labelJenis[j]}</button>)}
          </div>
          {form.jenis === "keluarga" && (
            <label className="field"><span className="label l2">Jumlah anggota keluarga</span>
              <input inputMode="numeric" value={form.anggota} onChange={(e) => { setForm({ ...form, anggota: e.target.value.replace(/\D/g, "") }); bersih("anggota"); }} /><E k="anggota" /></label>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <label className="field" style={{ flex: 1 }}><span className="label l2">Jumlah sesi</span>
              <input inputMode="numeric" value={form.jumlahSesi} onChange={(e) => { setForm({ ...form, jumlahSesi: e.target.value.replace(/\D/g, "") }); bersih("jumlahSesi"); }} /><E k="jumlahSesi" /></label>
            <label className="field" style={{ flex: 1 }}><span className="label l2">Berlaku (hari)</span>
              <input inputMode="numeric" value={form.masa} onChange={(e) => { setForm({ ...form, masa: e.target.value.replace(/\D/g, "") }); bersih("masaBerlakuHari"); }} /><E k="masaBerlakuHari" /></label>
          </div>
          <label className="field"><span className="label l2">Harga (Rp)</span>
            <input inputMode="numeric" value={form.harga} onChange={(e) => { setForm({ ...form, harga: ribuan(e.target.value.replace(/\D/g, "")) }); bersih("harga"); }} placeholder="720.000" /><E k="harga" /></label>
          {perSesi > 0 && <p className="meta pratinjau" style={{ margin: 0 }}>≈ {rp(perSesi)} per sesi</p>}
          <div className="aksi"><button type="submit" className="btn" disabled={sibuk}>{sibuk ? "Menyimpan…" : editId ? "Simpan perubahan" : "Simpan paket"}</button><button type="button" className="btn btn-2" onClick={() => { setFormBuka(false); setEditId(null); setGalat({}); }}>Batal</button></div>
        </form>
      ) : <button type="button" className="btn" disabled={penuh || !bolehUbah} onClick={mulaiBaru}>Buat paket baru</button>}
      {penuh && !formBuka && <p className="meta" style={{ margin: 0 }}>Paket jual aktif sudah {aktifJumlah} dari {batasJual} untuk langganan {namaLangganan}. Nonaktifkan paket lain atau naikkan paket langgananmu.</p>}
      {!bolehUbah && <p className="meta" style={{ margin: 0 }}>Langgananmu belum aktif, jadi paket hanya bisa dilihat. Perpanjang di halaman Langganan.</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
