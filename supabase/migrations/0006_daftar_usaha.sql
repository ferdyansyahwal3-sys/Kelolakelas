-- KelolaKelas 0006: pendaftaran usaha baru lewat SATU fungsi database (atomik), tanpa service role.
-- Pengguna yang sudah masuk (Supabase Auth) memanggil daftar_usaha(); fungsi memakai auth.uid() sebagai pemilik,
-- jadi tidak ada cara mendaftarkan usaha atas nama orang lain. Semua masukan divalidasi ULANG di sini.

create or replace function public.alamat_tersedia(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9-]{3,40}$'
    and p_slug not in ('app','u','api','admin','platform','pengajar','masuk','daftar-usaha','harga','login','static',
                       'daftar','syarat','privasi','undang','support','bantuan','kelolakelas','www','auth','_next')
    and not exists (select 1 from tenants where slug = p_slug);
$$;
revoke all on function public.alamat_tersedia(text) from public, anon;
grant execute on function public.alamat_tersedia(text) to authenticated;

create or replace function public.daftar_usaha(
  p_nama text,
  p_slug text,
  p_kategori text,
  p_kota text,
  p_tema text,
  p_nama_pemilik text,
  p_istilah jsonb,
  p_paket jsonb,
  p_jadwal jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  tid uuid;
  pid uuid;
  r jsonb;
  kategori_sah text[] := array['Renang','Yoga','Pilates','Gym','Badminton','Tenis','Bela diri','Musik','Bimbel','Tari','Olahraga','Lainnya'];
begin
  if uid is null then
    raise exception 'Masuk dulu sebelum mendaftarkan usaha' using errcode = '28000';
  end if;
  -- Satu akun satu usaha pada tahap ini (juga mencegah trial diulang dengan akun yang sama).
  if exists (select 1 from tenant_members where user_id = uid and role = 'owner') or exists (select 1 from tenants where owner_id = uid) then
    raise exception 'akun_sudah_punya_usaha' using errcode = 'P0001';
  end if;

  p_nama := btrim(coalesce(p_nama, ''));
  p_nama_pemilik := btrim(coalesce(p_nama_pemilik, ''));
  p_kota := btrim(coalesce(p_kota, ''));
  if char_length(p_nama) not between 3 and 60 then raise exception 'nama_usaha_tidak_valid' using errcode = 'P0001'; end if;
  if char_length(p_nama_pemilik) not between 2 and 60 then raise exception 'nama_pemilik_tidak_valid' using errcode = 'P0001'; end if;
  if char_length(p_kota) > 60 then raise exception 'kota_tidak_valid' using errcode = 'P0001'; end if;
  if p_kategori is null or not (p_kategori = any (kategori_sah)) then raise exception 'kategori_tidak_valid' using errcode = 'P0001'; end if;
  if p_tema not in ('gelap', 'terang') then raise exception 'tema_tidak_valid' using errcode = 'P0001'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or not alamat_tersedia(p_slug) then
    raise exception 'alamat_tidak_tersedia' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_istilah) <> 'object'
     or char_length(coalesce(p_istilah->>'murid', '')) not between 2 and 20
     or char_length(coalesce(p_istilah->>'sesi', '')) not between 2 and 20
     or char_length(coalesce(p_istilah->>'pengajar', '')) not between 2 and 20 then
    raise exception 'istilah_tidak_valid' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_paket) <> 'array' or jsonb_array_length(p_paket) > 12 then raise exception 'paket_tidak_valid' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_jadwal) <> 'array' or jsonb_array_length(p_jadwal) > 20 then raise exception 'jadwal_tidak_valid' using errcode = 'P0001'; end if;

  insert into tenants (nama, slug, kategori, tema, istilah, owner_id, trial_ends_at, trial_used, pengaturan)
  values (p_nama, p_slug, p_kategori, p_tema,
          jsonb_build_object('murid', btrim(p_istilah->>'murid'), 'sesi', btrim(p_istilah->>'sesi'), 'pengajar', btrim(p_istilah->>'pengajar')),
          uid, now() + interval '7 days', true, jsonb_build_object('profil', jsonb_build_object('kota', p_kota)))
  returning id into tid;

  insert into tenant_members (tenant_id, user_id, role) values (tid, uid, 'owner');
  -- Trial 7 hari tanpa kartu (keputusan Ferdy 2026-11-23): masa aktif dibaca dari tenants.trial_ends_at; plan memakai bawaan tabel sementara (belum diputuskan).
  insert into subscriptions (tenant_id) values (tid);
  -- Mode Solo: pemilik juga tampil sebagai pengajar ("Jadwal saya").
  insert into pengajar (tenant_id, user_id, nama) values (tid, uid, p_nama_pemilik) returning id into pid;

  for r in select * from jsonb_array_elements(p_paket) loop
    insert into paket (tenant_id, nama, kategori, jenis, jumlah_sesi, masa_berlaku_hari, harga)
    values (tid, btrim(r->>'nama'), r->>'kategori', r->>'jenis', (r->>'jumlahSesi')::int, (r->>'masaHari')::int, (r->>'harga')::int);
  end loop;

  for r in select * from jsonb_array_elements(p_jadwal) loop
    insert into jadwal_template (tenant_id, pengajar_id, hari, jam_mulai, durasi_menit, nama, kuota, lokasi)
    values (tid, pid, (r->>'hari')::smallint, replace(r->>'jam', '.', ':')::time, (r->>'durasi')::int,
            btrim(r->>'nama'), (r->>'kuota')::int, nullif(btrim(coalesce(r->>'lokasi', '')), ''));
  end loop;

  return tid;
exception
  when unique_violation then
    raise exception 'alamat_tidak_tersedia' using errcode = 'P0001';
  when check_violation or invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range or not_null_violation then
    raise exception 'data_awal_tidak_valid' using errcode = 'P0001';
end $$;
revoke all on function public.daftar_usaha(text, text, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.daftar_usaha(text, text, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;
