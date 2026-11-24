-- KelolaKelas 0008: perubahan keputusan Ferdy 2026-11-23 pada wizard /daftar-usaha.
--   1. Langkah "paket dan jadwal awal" DIHAPUS: daftar_usaha tidak lagi membuat paket/jadwal. Pemilik membuatnya sendiri dari dashboard.
--   2. Jenis kelas "Lainnya" wajib diisi manual (3-30 karakter), disimpan di tenants.pengaturan.profil.kategoriLain.
--   3. Kota (opsional) divalidasi 2-60 karakter, huruf/angka/tanda baca biasa.
-- Tidak mengubah tabel; hanya mengganti fungsi (versi 0007 yang menerima p_paket/p_jadwal dihapus).

drop function if exists public.daftar_usaha(text, text, text, text, text, text, text, jsonb, jsonb, jsonb);

create or replace function public.daftar_usaha(
  p_nama text,
  p_jenis text,
  p_slug text,
  p_kategori text,
  p_kategori_lain text,
  p_kota text,
  p_tema text,
  p_nama_pemilik text,
  p_istilah jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  tid uuid;
  kategori_sah text[] := array['Renang','Yoga','Pilates','Gym','Badminton','Tenis','Bela diri','Musik','Bimbel','Tari','Olahraga','Lainnya'];
  plan_awal text;
  profil jsonb;
begin
  if uid is null then
    raise exception 'Masuk dulu sebelum mendaftarkan usaha' using errcode = '28000';
  end if;
  if exists (select 1 from tenant_members where user_id = uid and role = 'owner') or exists (select 1 from tenants where owner_id = uid) then
    raise exception 'akun_sudah_punya_usaha' using errcode = 'P0001';
  end if;

  -- Trial 7 hari tanpa kartu dimulai di paket terendah jenisnya.
  if p_jenis = 'guru_les' then plan_awal := 'guru_mulai';
  elsif p_jenis = 'agensi' then plan_awal := 'agensi_tim';
  else raise exception 'jenis_tidak_valid' using errcode = 'P0001';
  end if;

  p_nama := btrim(coalesce(p_nama, ''));
  p_nama_pemilik := btrim(coalesce(p_nama_pemilik, ''));
  p_kota := btrim(coalesce(p_kota, ''));
  p_kategori_lain := btrim(coalesce(p_kategori_lain, ''));
  if char_length(p_nama) not between 3 and 60 then raise exception 'nama_usaha_tidak_valid' using errcode = 'P0001'; end if;
  if char_length(p_nama_pemilik) not between 2 and 60 then raise exception 'nama_pemilik_tidak_valid' using errcode = 'P0001'; end if;
  if p_kota <> '' and (char_length(p_kota) not between 2 and 60 or p_kota !~ '^[[:alnum:] &''.,()/-]+$') then raise exception 'kota_tidak_valid' using errcode = 'P0001'; end if;
  if p_kategori is null or not (p_kategori = any (kategori_sah)) then raise exception 'kategori_tidak_valid' using errcode = 'P0001'; end if;
  if p_kategori = 'Lainnya' then
    if char_length(p_kategori_lain) not between 3 and 30 or p_kategori_lain !~ '^[[:alnum:] &''.,()/-]+$' then raise exception 'kategori_lain_tidak_valid' using errcode = 'P0001'; end if;
  else
    p_kategori_lain := '';
  end if;
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

  profil := jsonb_build_object('kota', p_kota);
  if p_kategori_lain <> '' then profil := profil || jsonb_build_object('kategoriLain', p_kategori_lain); end if;

  insert into tenants (nama, slug, kategori, jenis, tema, istilah, owner_id, trial_ends_at, trial_used, pengaturan)
  values (p_nama, p_slug, p_kategori, p_jenis, p_tema,
          jsonb_build_object('murid', btrim(p_istilah->>'murid'), 'sesi', btrim(p_istilah->>'sesi'), 'pengajar', btrim(p_istilah->>'pengajar')),
          uid, now() + interval '7 days', true, jsonb_build_object('profil', profil))
  returning id into tid;

  insert into tenant_members (tenant_id, user_id, role) values (tid, uid, 'owner');
  insert into subscriptions (tenant_id, plan) values (tid, plan_awal);
  -- Pemilik tercatat sebagai pengajar (mode Solo, dan jadwal pertama butuh pengajar). Di Agensi bisa dinonaktifkan bila tidak mengajar.
  insert into pengajar (tenant_id, user_id, nama) values (tid, uid, p_nama_pemilik);

  return tid;
exception
  when unique_violation then
    raise exception 'alamat_tidak_tersedia' using errcode = 'P0001';
  when check_violation or invalid_text_representation or not_null_violation then
    raise exception 'data_awal_tidak_valid' using errcode = 'P0001';
end $$;
revoke all on function public.daftar_usaha(text, text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.daftar_usaha(text, text, text, text, text, text, text, text, jsonb) to authenticated;
