-- KelolaKelas 0042 (B5): jenis notifikasi baru untuk email langganan (KelolaKelas -> pemilik usaha).
-- Memakai tabel notifikasi_log yang sama (kunci unik per usaha = tak kirim ganda). Tidak ada perubahan RLS.

alter table notifikasi_log drop constraint if exists notifikasi_log_jenis_check;
alter table notifikasi_log add constraint notifikasi_log_jenis_check
  check (jenis in ('pengingat_tagihan', 'konfirmasi_acc', 'undangan_pelatih', 'langganan_pengingat', 'langganan_invoice', 'langganan_lunas'));
