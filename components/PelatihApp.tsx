"use client";
import { useEffect, useState } from "react";
import { GajiPelatih } from "./GajiPelatih";
import { JadwalPelatih } from "./JadwalPelatih";
import { NavMelayang } from "./NavMelayang";
import { bacaKabar, PemberitahuanPanel } from "./PemberitahuanPanel";
import type { SlotJadwal } from "@/lib/jadwal";
import { belumDibaca, type Pemberitahuan } from "@/lib/pemberitahuan";
import type { Pembayaran } from "@/lib/rekap";
import type { Absensi, MuridSesi, StatusAbsen } from "@/lib/sesi";
import type { AksiInfo } from "./PemberitahuanPanel";

interface Props {
  saya: { id: string; nama: string };
  hariIni: string;
  jadwal: SlotJadwal[];
  pesertaTetap: Record<string, string[]>;
  murid: (MuridSesi & { bayar: "lunas" | "belum" | "menunggu_verifikasi" })[];
  catatanAwal: Record<string, { tgl: string; teks: string }[]>;
  absensiAwal: Absensi;
  pemberitahuan: Pemberitahuan[];
  pengajar: { id: string; nama: string }[];
  pembayaran: Pembayaran[];
  persenAwal: number;
  nominalAwal: number;
  dibayarAwal: Record<string, string>;
  modeBagi?: "persen" | "nominal";
  aksi?: {
    absen: (jadwalId: string, tanggal: string, muridId: string, status: StatusAbsen | null) => Promise<{ ok: true } | { ok: false; pesan: string }>;
    catatan: (muridId: string, teks: string) => Promise<{ ok: true } | { ok: false; pesan: string }>;
    kirimInfo: AksiInfo["kirim"];
    hapusInfo: AksiInfo["hapus"];
  };
}

const TAB = [{ id: "jadwal", label: "Jadwal", icon: "cal" }, { id: "gaji", label: "Gaji", icon: "bill" }, { id: "info", label: "Info", icon: "bell" }];

export function PelatihApp({ saya, hariIni, jadwal, pesertaTetap, murid, catatanAwal, absensiAwal, pemberitahuan, pengajar, pembayaran, persenAwal, nominalAwal, dibayarAwal, modeBagi, aksi }: Props) {
  const [tab, setTab] = useState("jadwal");
  const [kabarBaru, setKabarBaru] = useState(0);
  useEffect(() => { setKabarBaru(belumDibaca(bacaKabar(), saya.id)); }, [saya.id]);
  const items = TAB.map((t) => (t.id === "info" ? { ...t, titik: kabarBaru > 0 } : t));
  return (
    <>
      {tab === "jadwal" && <JadwalPelatih jadwal={jadwal} pesertaTetap={pesertaTetap} murid={murid} catatanAwal={catatanAwal} saya={saya} hariIni={hariIni} absensiAwal={absensiAwal} pengajar={pengajar} aksiAbsen={aksi?.absen} aksiCatatan={aksi?.catatan} />}
      {tab === "gaji" && <GajiPelatih pembayaran={pembayaran} pengajarId={saya.id} bulanBerjalan={hariIni.slice(0, 7)} persenAwal={persenAwal} nominalAwal={nominalAwal} dibayarAwal={dibayarAwal} modeAwal={modeBagi} dariServer={!!aksi} />}
      {tab === "info" && <PemberitahuanPanel awal={pemberitahuan} pengajar={pengajar} peran="pelatih" saya={saya} hariIni={hariIni} jadwal={jadwal} onKabarUbah={setKabarBaru} aksi={aksi ? { kirim: aksi.kirimInfo, hapus: aksi.hapusInfo } : undefined} />}
      <NavMelayang items={items} aktifId={tab} onPilih={setTab} label="Halaman pelatih" />
    </>
  );
}
