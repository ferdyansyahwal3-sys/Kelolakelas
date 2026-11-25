// Murni: pemetaan baris `pemberitahuan` ke tipe tampilan.
import { tanggalJakarta } from "./langgananData";
import type { JenisInfo, Pemberitahuan } from "./pemberitahuan";

export interface BarisInfoDb { id: string; jenis: string; judul: string; isi: string; penulis_nama: string; untuk_pengajar_id: string | null; untuk_slot_id: string | null; sampai_tgl: string | null; dibuat_pada: string }
export const KOLOM_INFO = "id, jenis, judul, isi, penulis_nama, untuk_pengajar_id, untuk_slot_id, sampai_tgl, dibuat_pada";
const JENIS: JenisInfo[] = ["umum", "tidak_hadir", "aturan"];

export function dariBarisInfo(b: BarisInfoDb): Pemberitahuan | null {
  if (!JENIS.includes(b.jenis as JenisInfo)) return null;
  return { id: b.id, jenis: b.jenis as JenisInfo, judul: b.judul, isi: b.isi, penulis: b.penulis_nama, untukPengajarId: b.untuk_pengajar_id, ...(b.untuk_slot_id ? { untukSlotId: b.untuk_slot_id } : {}), ...(b.sampai_tgl ? { sampaiTgl: b.sampai_tgl } : {}), tgl: tanggalJakarta(b.dibuat_pada) };
}
