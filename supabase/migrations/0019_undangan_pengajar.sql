-- KelolaKelas 0019: undangan pelatih. Kode undangan HANYA disimpan sebagai hash SHA-256; berlaku 14 hari; email akun penerima harus sama dengan email yang diundang.
alter table pengajar add column if not exists email text;
alter table pengajar drop constraint if exists pengajar_nilai_sah;
alter table pengajar add constraint pengajar_nilai_sah check (char_length(btrim(nama)) between 2 and 60 and (email is null or char_length(email) <= 120));

create table if not exists undangan_pengajar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pengajar_id uuid not null,
  email text not null check (char_length(email) <= 120),
  kode_hash text not null unique,
  dibuat_pada timestamptz not null default now(),
  kedaluwarsa timestamptz not null default now() + interval '14 days',
  diterima_pada timestamptz,
  foreign key (pengajar_id, tenant_id) references pengajar (id, tenant_id) on delete cascade
);
alter table undangan_pengajar enable row level security;
create policy undangan_owner on undangan_pengajar for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));

-- Batas pelatih per paket langganan (plan_batas.pelatih), dijaga di database: pelatih aktif baru atau aktivasi ulang.
create or replace function public.batasi_pelatih() returns trigger
language plpgsql security definer set search_path = public as $$
declare batas int; ditemukan boolean; jumlah int;
begin
  if new.aktif is not true then return new; end if;
  if tg_op = 'UPDATE' and old.aktif is true then return new; end if;
  perform pg_advisory_xact_lock(hashtext('pelatih:' || new.tenant_id::text));
  select true, b.pelatih into ditemukan, batas from subscriptions s join plan_batas b on b.plan = s.plan where s.tenant_id = new.tenant_id;
  if ditemukan is not true then raise exception 'langganan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if batas is null then return new; end if;
  select count(*) into jumlah from pengajar where tenant_id = new.tenant_id and aktif and id is distinct from new.id;
  if jumlah >= batas then raise exception 'batas_pelatih' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.batasi_pelatih() from public, anon, authenticated;
drop trigger if exists pengajar_batas_pelatih on pengajar;
create trigger pengajar_batas_pelatih before insert or update of aktif on pengajar for each row execute function public.batasi_pelatih();

-- Empat fungsi undangan (security definer). Sama persis dengan database.
create or replace function public.buat_undangan(p_nama text, p_email text, p_hash text) returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid; pid uuid; em text := lower(btrim(p_email));
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select tenant_id into tid from tenant_members where user_id = auth.uid() and role = 'owner' limit 1;
  if tid is null then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'data_tidak_valid' using errcode = 'P0001'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'data_tidak_valid' using errcode = 'P0001'; end if;
  if exists (select 1 from pengajar where tenant_id = tid and lower(email) = em and aktif) then raise exception 'email_sudah_ada' using errcode = 'P0001'; end if;
  insert into pengajar (tenant_id, nama, email, aktif) values (tid, btrim(p_nama), em, true) returning id into pid;
  insert into undangan_pengajar (tenant_id, pengajar_id, email, kode_hash) values (tid, pid, em, p_hash);
  return pid;
exception when check_violation or not_null_violation then raise exception 'data_tidak_valid' using errcode = 'P0001';
end $$;

create or replace function public.batalkan_undangan(p_pengajar uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into p from pengajar where id = p_pengajar for update;
  if not found then raise exception 'pengajar_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(p.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if p.user_id is not null then raise exception 'sudah_diterima' using errcode = 'P0001'; end if;
  delete from undangan_pengajar where pengajar_id = p_pengajar and tenant_id = p.tenant_id;
  if exists (select 1 from jadwal_template where pengajar_id = p_pengajar) then
    update pengajar set aktif = false where id = p_pengajar;
  else
    delete from pengajar where id = p_pengajar;
  end if;
end $$;

create or replace function public.ubah_aktif_pengajar(p_pengajar uuid, p_aktif boolean) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into p from pengajar where id = p_pengajar for update;
  if not found then raise exception 'pengajar_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(p.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if p.user_id = auth.uid() and p_aktif is not true then raise exception 'pemilik_tidak_bisa_nonaktif' using errcode = 'P0001'; end if;
  update pengajar set aktif = (p_aktif is true) where id = p_pengajar;
end $$;

create or replace function public.terima_undangan(p_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare u record; mail text := lower(coalesce(auth.jwt() ->> 'email', '')); usaha text;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into u from undangan_pengajar where kode_hash = p_hash for update;
  if not found or u.diterima_pada is not null or u.kedaluwarsa < now() then raise exception 'undangan_tidak_berlaku' using errcode = 'P0001'; end if;
  if mail = '' or mail <> lower(u.email) then raise exception 'email_tidak_cocok' using errcode = 'P0001'; end if;
  if exists (select 1 from tenant_members where user_id = auth.uid() and role = 'owner') then raise exception 'akun_pemilik' using errcode = 'P0001'; end if;
  update pengajar set user_id = auth.uid() where id = u.pengajar_id and tenant_id = u.tenant_id and user_id is null;
  if not found then raise exception 'undangan_tidak_berlaku' using errcode = 'P0001'; end if;
  insert into tenant_members (tenant_id, user_id, role) values (u.tenant_id, auth.uid(), 'pengajar') on conflict do nothing;
  update undangan_pengajar set diterima_pada = now() where id = u.id;
  select nama into usaha from tenants where id = u.tenant_id;
  return usaha;
end $$;

revoke all on function public.buat_undangan(text, text, text) from public, anon;
grant execute on function public.buat_undangan(text, text, text) to authenticated, service_role;
revoke all on function public.batalkan_undangan(uuid) from public, anon;
grant execute on function public.batalkan_undangan(uuid) to authenticated, service_role;
revoke all on function public.ubah_aktif_pengajar(uuid, boolean) from public, anon;
grant execute on function public.ubah_aktif_pengajar(uuid, boolean) to authenticated, service_role;
revoke all on function public.terima_undangan(text) from public, anon;
grant execute on function public.terima_undangan(text) to authenticated, service_role;
