-- KelolaKelas seed UJI: akun + usaha "Uji Renang" dengan data buatan. BUKAN data nyata.
-- Ganti __SANDI__ dengan sandi di supabase/seed/akun-uji.local (file itu tidak masuk git). Aman dijalankan ulang (reset).
do $$
declare
  uid uuid := gen_random_uuid(); tid uuid; p1 uuid; p2 uuid; j1 uuid; j2 uuid; j3 uuid; j4 uuid;
  pk4 uuid; pk8 uuid; pkd uuid; r1 uuid; m uuid; pd uuid;
  hari date := (now() at time zone 'Asia/Jakarta')::date;
  sabtu date; minggu date; rabu date;
begin
  delete from tenants where slug = 'uji-renang';
  delete from auth.users where email = 'uji-owner@kelolakelas.test';

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'uji-owner@kelolakelas.test', crypt('__SANDI__', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{"nama":"Ilham (uji)"}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, 'email', jsonb_build_object('sub', uid::text, 'email', 'uji-owner@kelolakelas.test', 'email_verified', true), now(), now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);

  insert into tenants (nama, slug, kategori, jenis, tema, istilah, owner_id, trial_ends_at, trial_used, pengaturan)
  values ('Renang Uji Ilham', 'uji-renang', 'Renang', 'agensi', 'terang',
          '{"murid":"murid","sesi":"sesi","pengajar":"pelatih"}', uid, now() + interval '7 days', true,
          '{"profil":{"kota":"Kota Bandung","deskripsi":"Les renang untuk anak dan dewasa (data uji). Kelas kecil, pelatih sabar.","area":"Kolam Uji, Bandung","noWa":"081234567890"}}') returning id into tid;
  insert into tenant_members (tenant_id, user_id, role) values (tid, uid, 'owner');
  insert into subscriptions (tenant_id, plan, current_period_end) values (tid, 'agensi_klub', now() + interval '30 days');

  insert into pengajar (tenant_id, user_id, nama) values (tid, uid, 'Ilham (uji)') returning id into p1;
  insert into pengajar (tenant_id, nama) values (tid, 'Kak Rina (uji)') returning id into p2;

  insert into rekening_usaha (tenant_id, bank, nomor, atas_nama) values (tid, 'BCA', '1234567890', 'Ilham Uji') returning id into r1;
  insert into rekening_usaha (tenant_id, bank, nomor, atas_nama) values (tid, 'Mandiri', '9876543210', 'Ilham Uji');

  insert into jadwal_template (tenant_id, pengajar_id, hari, jam_mulai, nama, kuota, lokasi) values (tid, p1, 5, '08:30', 'Kelas Anak Sabtu pagi', 6, 'Kolam Uji') returning id into j1;
  insert into jadwal_template (tenant_id, pengajar_id, hari, jam_mulai, nama, kuota, lokasi) values (tid, p2, 5, '15:00', 'Kelas Anak Sabtu sore', 4, 'Kolam Uji') returning id into j2;
  insert into jadwal_template (tenant_id, pengajar_id, hari, jam_mulai, nama, kuota, lokasi) values (tid, p1, 6, '17:00', 'Kelas Dewasa Minggu', 3, 'Kolam Uji') returning id into j3;
  insert into jadwal_template (tenant_id, pengajar_id, hari, jam_mulai, nama, kuota, lokasi) values (tid, p2, 2, '16:00', 'Kelas Anak Rabu', 5, 'Kolam Uji') returning id into j4;

  insert into paket (tenant_id, nama, kategori, jumlah_sesi, masa_berlaku_hari, harga) values (tid, 'Anak 4 sesi', 'anak', 4, 35, 400000) returning id into pk4;
  insert into paket (tenant_id, nama, kategori, jumlah_sesi, masa_berlaku_hari, harga) values (tid, 'Anak 8 sesi', 'anak', 8, 56, 720000) returning id into pk8;
  insert into paket (tenant_id, nama, kategori, jumlah_sesi, masa_berlaku_hari, harga) values (tid, 'Dewasa 4 sesi', 'dewasa', 4, 35, 500000) returning id into pkd;
  insert into promo (tenant_id, kode, jenis, nilai, kuota) values (tid, 'UJI10', 'persen', 10, 20);

  sabtu := hari + ((6 - extract(isodow from hari)::int + 7) % 7); if sabtu = hari then sabtu := hari + 7; end if;
  minggu := sabtu + 1; rabu := sabtu + 4;

  -- murid buatan (lewat fungsi yang sama dengan ACC)
  m := tambah_murid('Dika Pratama', 'anak', 8, 'Budi Pratama', '6281234567890', pk8, hari - 14, p1);
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status) values
    (tid, m, j1, p1, hari - 14, '08:30', 'hadir'), (tid, m, j1, p1, hari - 7, '08:30', 'hadir'), (tid, m, j1, p1, sabtu, '08:30', 'terjadwal');
  m := tambah_murid('Laras Anjani', 'anak', 10, 'Rina Anjani', '6281377712345', pk4, hari - 3, p2);
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status) values (tid, m, j1, p1, sabtu, '08:30', 'terjadwal');
  update tagihan set status = 'lunas', dibayar_pada = now() where murid_id = m;
  m := tambah_murid('Raka Wijaya', 'anak', 7, 'Santi Wijaya', '6281211112222', pk4, hari, p2);
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status) values (tid, m, j1, p1, sabtu, '08:30', 'terjadwal'), (tid, m, j2, p2, sabtu, '15:00', 'terjadwal');
  m := tambah_murid('Sari Wulandari', 'dewasa', null, null, '6281298765432', pkd, hari - 10, p1);
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status) values (tid, m, j3, p1, minggu, '17:00', 'terjadwal'), (tid, m, j3, p1, hari - 3, '17:00', 'izin');
  m := tambah_murid('Bima Saputra', 'anak', 9, 'Dewi Saputra', '6281355556666', pk8, hari - 20, p2);
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status) values (tid, m, j2, p2, sabtu, '15:00', 'terjadwal'), (tid, m, j2, p2, hari - 8, '15:00', 'hadir');
  update tagihan set status = 'lunas', dibayar_pada = now() where murid_id = m;

  insert into peserta_tetap (tenant_id, jadwal_id, murid_id) select distinct tenant_id, jadwal_id, murid_id from sesi where tenant_id = tid and jadwal_id is not null;

  -- pendaftaran masuk (belum diputuskan) + satu ditolak
  insert into pendaftaran (tenant_id, kode, nama, kategori, usia, nama_ortu, no_wa, paket_id, jadwal_id, tanggal_mulai, total, pengajar_id)
  values (tid, 'UJI001', 'Nadia Putri', 'anak', 6, 'Hendra Putri', '6281399990001', pk4, j1, sabtu, 400000, p1);
  insert into pendaftaran (tenant_id, kode, nama, kategori, usia, nama_ortu, no_wa, paket_id, jadwal_id, tanggal_mulai, kode_promo, total, pengajar_id)
  values (tid, 'UJI002', 'Fajar Nugroho', 'anak', 11, 'Yuli Nugroho', '6281399990002', pk8, j2, sabtu, 'UJI10', 648000, p2) returning id into pd;
  insert into pendaftaran_bukti (tenant_id, pendaftaran_id, rekening_id, berkas_path, mime, ukuran) values (tid, pd, r1, tid || '/' || pd || '/bukti-fajar.jpg', 'image/jpeg', 120000);
  insert into pendaftaran (tenant_id, kode, nama, kategori, no_wa, paket_id, jadwal_id, tanggal_mulai, status, total)
  values (tid, 'UJI003', 'Tono Wibowo', 'dewasa', '6281399990003', pkd, j3, minggu, 'ditolak', 500000);
end $$;
