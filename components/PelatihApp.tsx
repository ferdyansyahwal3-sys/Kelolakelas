"use client";
import { useState } from "react";
import { GajiPelatih } from "./GajiPelatih";
import { JadwalPelatih } from "./JadwalPelatih";
import { NavMelayang } from "./NavMelayang";
import { PemberitahuanPanel } from "./PemberitahuanPanel";
import type { SlotJadwal } from "@/lib/jadwal";
import type { Pemberitahuan } from "@/lib/pemberitahuan";
import type { Pembayaran } from "@/lib/rekap";
import type { Absensi, MuridSesi } from "@/lib/sesi";

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
}

const TAB = [{ id: "jadwal", label: "Jadwal", icon: "cal" }, { id: "gaji", label: "Gaji", icon: "bill" }, { id: "info", label: "Info", icon: "bell" }];

export function PelatihApp({ saya, hariIni, jadwal, pesertaTetap, murid, catatanAwal, absensiAwal, pemberitahuan, pengajar, pembayaran, persenAwal, nominalAwal, dibayarAwal }: Props) {
  const [tab, setTab] = useState("jadwal");
  return (
    <>
      {tab === "jadwal" && <JadwalPelatih jadwal={jadwal} pesertaTetap={pesertaTetap} murid={murid} catatanAwal={catatanAwal} saya={saya} hariIni={hariIni} absensiAwal={absensiAwal} pengajar={pengajar} />}
      {tab === "gaji" && <GajiPelatih pembayaran={pembayaran} pengajarId={saya.id} bulanBerjalan={hariIni.slice(0, 7)} persenAwal={persenAwal} nominalAwal={nominalAwal} dibayarAwal={dibayarAwal} />}
      {tab === "info" && <PemberitahuanPanel awal={pemberitahuan} pengajar={pengajar} peran="pelatih" saya={saya} hariIni={hariIni} jadwal={jadwal} />}
      <NavMelayang items={TAB} aktifId={tab} onPilih={setTab} label="Halaman pelatih" />
    </>
  );
}
