// Murni: pemetaan baris `subscription_invoices` ke tampilan Langganan.
import { tanggalJakarta } from "./langgananData";
import { adalahPlan } from "./paketLangganan";
import type { TagihanLangganan } from "./bayarLangganan";

export interface BarisInvoiceDb { id: string; order_id: string; plan: string; period_months: number; amount: number; status: string; due_at: string; paid_at: string | null }
export const KOLOM_INVOICE = "id, order_id, plan, period_months, amount, status, due_at, paid_at";

export type StatusInvoice = "lunas" | "belum_bayar" | "kedaluwarsa" | "batal";
export interface InvoiceTampil { id: string; periode: string; nominal: number; status: StatusInvoice; tempo: string }
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const STATUS: StatusInvoice[] = ["lunas", "belum_bayar", "kedaluwarsa", "batal"];

/** Periode = bulan jatuh tempo (WIB), mis. "Des 2026". Baris dengan status tak dikenal dibuang. */
export function dariBarisInvoice(b: BarisInvoiceDb): InvoiceTampil | null {
  if (!STATUS.includes(b.status as StatusInvoice)) return null;
  const tempo = tanggalJakarta(b.due_at);
  return { id: b.id, periode: `${BULAN[Number(tempo.slice(5, 7)) - 1]} ${tempo.slice(0, 4)}`, nominal: b.amount, status: b.status as StatusInvoice, tempo };
}

/** Untuk halaman hasil bayar. Plan di luar enam kunci dibuang (null). `akhirLama` = akhir periode langganan saat ini. */
export function dariBarisInvoiceLangganan(b: BarisInvoiceDb, akhirLama: string | null): TagihanLangganan | null {
  if (!adalahPlan(b.plan)) return null;
  return { orderId: b.order_id, plan: b.plan, bulan: b.period_months, nominal: b.amount, akhirLama };
}
