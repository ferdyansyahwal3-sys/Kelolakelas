"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { buatMuridDanTagihan, linkWa, pesanWa } from "@/lib/acc";
import { cariPromo } from "@/lib/harga";
import { pecahRupiah, inisial } from "@/lib/format";
import type { PendaftaranContoh, StatusPendaftaran } from "@/lib/contoh";

interface Paket { id: string; nama: string; harga: number; jumlahSesi: number }
interface Promo { kode: string; jenis: "persen" | "nominal"; nilai: number }
interface Props { awal: PendaftaranContoh[]; paket: Paket[]; promo: Promo[]; usaha: string; linkDaftar: string }

const rp = (n: number) => `Rp ${pecahRupiah(n).depan}${pecahRupiah(n).belakang}`;
const tab: { id: StatusPendaftaran; nama: string }[] = [
  { id: "menunggu", nama: "Menunggu" },
  { id: "disetujui", nama: "Disetujui" },
  { id: "ditolak", nama: "Ditolak" },
];

export function PendaftaranList({ awal, paket, promo, usaha, linkDaftar }: Props) {
  const [daftar, setDaftar] = useState(awal);
  const [aktif, setAktif] = useState<StatusPendaftaran>("menunggu");
  const [buka, setBuka] = useState<string | null>(null);
  const [konfirmasiTolak, setKonfirmasiTolak] = useState<string | null>(null);
  const [tagihan, setTagihan] = useState<Record<string, { nominal: number; tempo: string }>>({});
  const [toast, setToast] = useState("");
  const [tersalin, setTersalin] = useState(false);

  const tampil = daftar.filter((p) => p.status === aktif);
  const hitung = (s: StatusPendaftaran) => daftar.filter((p) => p.status === s).length;
  const infoPaket = (p: PendaftaranContoh) => paket.find((x) => x.id === p.paketId)!;
  const total = (p: PendaftaranContoh) => buatMuridDanTagihan(p, infoPaket(p), cariPromo(p.kodePromo ?? "", promo), new Date()).tagihan.nominal;

  function ubahStatus(id: string, status: StatusPendaftaran) {
    setDaftar((d) => d.map((p) => (p.id === id ? { ...p, status } : p)));
    setBuka(null);
    setKonfirmasiTolak(null);
  }

  function acc(p: PendaftaranContoh) {
    const h = buatMuridDanTagihan(p, infoPaket(p), cariPromo(p.kodePromo ?? "", promo), new Date());
    setTagihan((t) => ({ ...t, [p.id]: { nominal: h.tagihan.nominal, tempo: h.tagihan.jatuhTempo } }));
    ubahStatus(p.id, "disetujui");
    setToast(`${p.nama} disetujui. Murid dan tagihan dibuat.`);
    setTimeout(() => setToast(""), 3500);
  }

  async function salin() {
    try { await navigator.clipboard.writeText(linkDaftar); setTersalin(true); setTimeout(() => setTersalin(false), 2000); } catch {}
  }

  return (
    <>
      <div className="seg" role="tablist" aria-label="Status pendaftaran">
        {tab.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={aktif === t.id} className={aktif === t.id ? "on" : ""} onClick={() => { setAktif(t.id); setBuka(null); }}>
            {t.nama}{hitung(t.id) > 0 ? ` ${hitung(t.id)}` : ""}
          </button>
        ))}
      </div>

      {tampil.length === 0 ? (
        <div className="surface kosong">
          <span className="circ"><Icon name="inbox" /></span>
          <h2 className="h2">{aktif === "menunggu" ? "Belum ada pendaftaran" : "Belum ada yang " + aktif}</h2>
          {aktif === "menunggu" && (
            <>
              <p className="sub" style={{ margin: 0, fontSize: 13 }}>Bagikan link pendaftaran ke grup WA. Murid isi sendiri dan langsung muncul di sini.</p>
              <button type="button" className="btn" onClick={salin}><Icon name="link" />{tersalin ? "Link tersalin" : "Salin link pendaftaran"}</button>
            </>
          )}
        </div>
      ) : (
        <div className="surface">
          {tampil.map((p) => {
            const terbuka = buka === p.id;
            const pk = infoPaket(p);
            const tag = tagihan[p.id];
            return (
              <div key={p.id} className="baris">
                <div className="item">
                  <button type="button" className="buka" aria-expanded={terbuka} onClick={() => setBuka(terbuka ? null : p.id)}>
                    <span className="avatar s">{inisial(p.nama)}</span>
                    <span className="grow" style={{ textAlign: "left" }}>
                      <span className="name" style={{ display: "block" }}>{p.nama}</span>
                      <span className="meta">{p.kategori === "anak" ? "Anak" : "Dewasa"} · {p.slotLabel}</span>
                    </span>
                  </button>
                  {p.status === "menunggu" && <button type="button" className="btn btn-sm" onClick={() => acc(p)}>ACC</button>}
                  {p.status === "disetujui" && <span className="st st-ok">Disetujui</span>}
                  {p.status === "ditolak" && <span className="st st-full">Ditolak</span>}
                </div>
                {terbuka && (
                  <div className="detail">
                    <dl>
                      <dt>Kode</dt><dd>{p.kode}</dd>
                      <dt>Paket</dt><dd>{pk.nama}</dd>
                      {p.kategori === "anak" && <><dt>Usia</dt><dd>{p.usia} tahun</dd><dt>Orang tua</dt><dd>{p.namaOrtu}</dd></>}
                      <dt>WhatsApp</dt><dd>{p.noWa}</dd>
                      {p.kodePromo && <><dt>Promo</dt><dd>{p.kodePromo}</dd></>}
                      <dt>{p.status === "disetujui" && tag ? "Tagihan" : "Total"}</dt><dd><b>{rp(tag ? tag.nominal : total(p))}</b></dd>
                      {tag && <><dt>Jatuh tempo</dt><dd>{tag.tempo}</dd></>}
                    </dl>
                    <div className="aksi">
                      {p.status === "menunggu" && (
                        konfirmasiTolak === p.id ? (
                          <>
                            <button type="button" className="btn btn-2 btn-sm" onClick={() => ubahStatus(p.id, "ditolak")}>Ya, tolak</button>
                            <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasiTolak(null)}>Batal</button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-2 btn-sm" onClick={() => setKonfirmasiTolak(p.id)}>Tolak</button>
                        )
                      )}
                      <a className="btn btn-2 btn-sm" target="_blank" rel="noopener noreferrer"
                        href={linkWa(p.noWa, pesanWa(p.status === "ditolak" ? "tolak" : "acc", { nama: p.nama, usaha, slot: p.slotLabel, total: tag ? tag.nominal : total(p) }))}>
                        <Icon name="wa" />{p.status === "menunggu" ? "Chat WA" : "Kirim WA"}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
