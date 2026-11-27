-- KelolaKelas 0041 (B5): status 'mengirim' = klaim sementara sebelum Resend dipanggil (tahan klik ganda / cron ganda).
alter table notifikasi_log drop constraint if exists notifikasi_log_status_check;
alter table notifikasi_log add constraint notifikasi_log_status_check check (status in ('mengirim', 'terkirim', 'gagal', 'dilewati'));
