// Murni: pesan galat database untuk jadwal tetap.
export function pesanGalatJadwal(e: { code?: string; message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  if (m.includes("batas_slot")) return "Batas slot paketmu sudah penuh. Naikkan paket di halaman Langganan.";
  if (m.includes("kuota_di_bawah_peserta")) return "Kuota tidak bisa di bawah jumlah murid yang sudah terdaftar di slot ini.";
  if (m.includes("slot_penuh")) return "Slot ini sudah penuh.";
  if (e?.code === "23503" || m.includes("foreign key")) return "Masih ada murid di slot ini. Pindahkan murid dulu, baru slot bisa dihapus.";
  if (e?.code === "23514") return "Isian slot belum sah (cek kuota, durasi, nama).";
  if (e?.code === "23505") return "Data ini sudah ada.";
  return "Gagal menyimpan. Coba lagi sebentar.";
}
