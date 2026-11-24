import { PROMO, TRIAL_HARI, type KonfigPromo } from "./paketLangganan";
import { GRACE_HARI, TANGGUH_HARI } from "./langganan";

export interface Tanya { t: string; j: string }

/** Konfigurasi promo untuk halaman. Hanya di pengembangan: ?promo=15j memulai jendela promo sekarang, ?promo=jeda menaruh halaman di tengah masa harga normal, ?promo=off mematikan promo. Diabaikan di production. */
export function konfigUntukHalaman(param: string | undefined, sekarangMs: number, dev: boolean): KonfigPromo | null {
  const dasar = PROMO;
  if (dev && param === "off") return null;
  if (dev && param === "15j") return { awal: new Date(sekarangMs).toISOString(), durasiJam: dasar?.durasiJam ?? 15, jedaJam: dasar?.jedaJam ?? 24 };
  if (dev && param === "jeda") return { awal: new Date(sekarangMs - ((dasar?.durasiJam ?? 15) + 2) * 3600_000).toISOString(), durasiJam: dasar?.durasiJam ?? 15, jedaJam: dasar?.jedaJam ?? 24 };
  return dasar;
}

export const FAQ_LANDING: Tanya[] = [
  { t: `Benarkah coba gratis ${TRIAL_HARI} hari tanpa kartu?`, j: `Benar. Daftar, isi jadwal, dan pakai semua fitur selama ${TRIAL_HARI} hari tanpa memasukkan kartu. Kalau tidak lanjut, tidak ada tagihan yang terbit sendiri.` },
  { t: "Cocok untuk usaha apa saja?", j: "Pelatih dan pengajar yang mengatur jadwal, kuota, dan pembayaran sendiri: renang, yoga, pilates, gym PT, badminton, tenis, bela diri, musik, bimbel, tari, dan sejenisnya. KelolaKelas bukan untuk sewa lapangan dan tidak memakai sistem membership." },
  { t: "Apakah murid harus membuat akun?", j: "Tidak. Murid atau orang tua cukup membuka link usahamu, memilih slot, dan mendaftar. Setelah kamu ACC, mereka mendapat link pribadi untuk melihat sisa sesi, jadwal, dan pemberitahuan." },
  { t: "Uang murid lewat mana?", j: "Langsung ke rekening kamu. Murid transfer, lalu mengunggah bukti bayar; kamu cek dan ACC. KelolaKelas tidak menahan uang les kamu." },
  { t: "Bagaimana dengan data anak-anak?", j: "Data murid hanya dipakai untuk menjalankan les kamu dan dibatasi seperlunya (nama, usia, kehadiran, catatan). Detailnya ada di Kebijakan Privasi, termasuk bagian khusus data anak." },
  { t: "Kalau saya berhenti berlangganan, data saya bagaimana?", j: `Data bisa diekspor kapan saja. Setelah masa aktif habis ada masa tenggang ${GRACE_HARI} hari dengan akses penuh, lalu ${TANGGUH_HARI} hari hanya bisa melihat dan mengekspor data.` },
  { t: "Saya mengajar sendiri, lalu nanti punya pelatih lain. Bisa pindah?", j: "Bisa. Naik dari paket Guru Les ke Agensi/Club kapan saja, dan datamu ikut." },
];

export const FAQ_HARGA: Tanya[] = [
  { t: "Apa bedanya Guru Les dan Agensi/Club?", j: "Guru Les untuk kamu yang mengajar sendiri. Agensi/Club untuk pemilik yang punya pelatih lain: ada undangan pelatih, halaman jadwal pelatih, bagi hasil atau gaji, ganti pelatih sekali jadwal, dan pemberitahuan per pelatih." },
  { t: "Apa yang terjadi saat promo berakhir?", j: "Harga kembali ke harga normal (harga yang tercoret) selama masa jeda, lalu promo mulai lagi. Jadwalnya sama untuk semua orang di semua perangkat, dan harga yang tampil adalah harga yang ditagih. Harga coret adalah harga normal yang benar-benar berlaku di luar jendela promo." },
  { t: "Bayar tahunan lebih hemat berapa?", j: "Bayar 10 bulan untuk 12 bulan, atau gratis 2 bulan, untuk paket mana pun." },
  { t: "Apa yang dihitung sebagai murid aktif?", j: "Murid yang masih punya paket berjalan. Murid yang sudah nonaktif tidak menghabiskan jatah." },
  { t: "Bagaimana cara bayar langganan?", j: "Lewat tagihan di menu Langganan. Pembayaran online lewat DuitKu sedang disiapkan; sementara itu pembayaran bisa lewat transfer bank dan diaktifkan manual oleh kami." },
  { t: "Apa yang terjadi kalau muridku melewati batas paket?", j: "Kamu tetap bisa melihat dan mengelola data yang ada, tetapi tidak bisa menambah murid baru sampai naik paket atau ada murid yang dinonaktifkan." },
  { t: `Apakah trial ${TRIAL_HARI} hari memotong masa langganan?`, j: `Tidak. Trial gratis dan terpisah. Masa langganan baru dihitung setelah kamu membayar.` },
];
