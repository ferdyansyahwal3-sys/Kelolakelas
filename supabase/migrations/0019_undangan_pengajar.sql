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

-- Fungsi: buat_undangan(nama, email, hash), batalkan_undangan(pengajar), ubah_aktif_pengajar(pengajar, aktif), terima_undangan(hash).
-- Badan lengkapnya diterapkan lewat migrasi "undangan_pengajar" di database; salin dari sana bila perlu membuat ulang
-- (semua security definer, pemilik saja kecuali terima_undangan yang butuh login + email cocok + belum dipakai + belum kedaluwarsa + bukan akun pemilik).
