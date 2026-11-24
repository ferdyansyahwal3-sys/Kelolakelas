-- KelolaKelas 0007: jenis usaha (Guru Les / Agensi) + enam kunci paket langganan (keputusan Ferdy 2026-11-23, lihat PAKET-DRAFT.md).
--   guru_les: guru_mulai, guru_tumbuh, guru_penuh     agensi: agensi_tim, agensi_klub, agensi_jaringan
-- Belum ada data nyata; baris uji lama dipetakan starter -> guru_tumbuh, pro -> agensi_klub.

alter table tenants add column if not exists jenis text not null default 'guru_les' check (jenis in ('guru_les', 'agensi'));

alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscription_invoices drop constraint if exists subscription_invoices_plan_check;

update subscriptions set plan = case plan when 'starter' then 'guru_tumbuh' when 'pro' then 'agensi_klub' else plan end where plan in ('starter', 'pro');
update subscription_invoices set plan = case plan when 'starter' then 'guru_tumbuh' when 'pro' then 'agensi_klub' else plan end where plan in ('starter', 'pro');
update platform_transactions set plan = case plan when 'starter' then 'guru_tumbuh' when 'pro' then 'agensi_klub' else plan end where plan in ('starter', 'pro');

alter table subscriptions alter column plan set default 'guru_mulai';
alter table subscriptions add constraint subscriptions_plan_check
  check (plan in ('guru_mulai', 'guru_tumbuh', 'guru_penuh', 'agensi_tim', 'agensi_klub', 'agensi_jaringan'));
alter table subscription_invoices add constraint subscription_invoices_plan_check
  check (plan in ('guru_mulai', 'guru_tumbuh', 'guru_penuh', 'agensi_tim', 'agensi_klub', 'agensi_jaringan'));

-- daftar_usaha sekarang menerima jenis. Trial 7 hari dimulai di paket terendah jenisnya (guru_mulai / agensi_tim).
-- Batas paket jual dan slot awal mengikuti paket itu (Mulai: 2 paket, 5 slot; Tim: 10 paket, 30 slot), dicek di sini, bukan hanya di UI.
drop function if exists public.daftar_usaha(text, text, text, text, text, text, jsonb, jsonb, jsonb);

create or replace function public.daftar_usaha(
  p_nama text,
  p_jenis text,
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
  plan_awal text;
  batas_paket int;
  batas_slot int;
begin
  if uid is null then
    raise exception 'Masuk dulu sebelum mendaftarkan usaha' using errcode = '28000';
  end if;
  if exists (select 1 from tenant_members where user_id = uid and role = 'owner') or exists (select 1 from tenants where owner_id = uid) then
    raise exception 'akun_sudah_punya_usaha' using errcode = 'P0001';
  end if;

  if p_jenis = 'guru_les' then plan_awal := 'guru_mulai'; batas_paket := 2; batas_slot := 5;
  elsif p_jenis = 'agensi' then plan_awal := 'agensi_tim'; batas_paket := 10; batas_slot := 30;
  else raise exception 'jenis_tidak_valid' using errcode = 'P0001';
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
  if jsonb_typeof(p_paket) <> 'array' or jsonb_array_length(p_paket) > batas_paket then raise exception 'paket_melebihi_batas' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_jadwal) <> 'array' or jsonb_array_length(p_jadwal) > batas_slot then raise exception 'jadwal_melebihi_batas' using errcode = 'P0001'; end if;

  insert into tenants (nama, slug, kategori, jenis, tema, istilah, owner_id, trial_ends_at, trial_used, pengaturan)
  values (p_nama, p_slug, p_kategori, p_jenis, p_tema,
          jsonb_build_object('murid', btrim(p_istilah->>'murid'), 'sesi', btrim(p_istilah->>'sesi'), 'pengajar', btrim(p_istilah->>'pengajar')),
          uid, now() + interval '7 days', true, jsonb_build_object('profil', jsonb_build_object('kota', p_kota)))
  returning id into tid;

  insert into tenant_members (tenant_id, user_id, role) values (tid, uid, 'owner');
  insert into subscriptions (tenant_id, plan) values (tid, plan_awal);
  -- Pemilik tercatat sebagai pengajar (jadwal awal butuh pengajar). Di Agensi pemilik bisa dinonaktifkan nanti bila tidak mengajar.
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
revoke all on function public.daftar_usaha(text, text, text, text, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.daftar_usaha(text, text, text, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;
