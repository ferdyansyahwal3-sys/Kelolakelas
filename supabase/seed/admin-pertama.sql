-- Jadikan SATU akun sebagai admin platform. Jalankan SENDIRI di SQL editor Supabase (jangan simpan email di kode).
-- 1) Akun harus sudah ada (daftar/masuk dulu). 2) Ganti EMAIL-ANDA di bawah, lalu Run.
insert into platform_admins (user_id)
select id from auth.users where email = 'EMAIL-ANDA'
on conflict do nothing;
-- Cek: select * from platform_admins;  (harus 1 baris)
