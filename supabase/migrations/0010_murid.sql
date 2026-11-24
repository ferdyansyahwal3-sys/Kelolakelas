-- KelolaKelas 0010: fitur Murid tersambung database.
--   1. murid: kolom usia + nilai dijaga CHECK.
--   2. murid_paket: paket yang sedang/pernah diikuti murid (jumlah sesi dibekukan saat dibeli, masa berlaku dihitung).
--   3. catatan_murid: catatan perkembangan dari pemilik.
--   4. Batas MURID AKTIF per paket langganan ditegakkan di database (trigger), memakai plan_batas dari 0009.
--   5. tambah_murid(): satu fungsi atomik = murid + paket murid + tagihan pertama (nanti dipakai juga oleh ACC pendaftaran).
-- Tidak mengubah data yang ada (tabel murid masih kosong).

alter table murid add column if not exists usia int;
alter table murid drop constraint if exists murid_nilai_sah;
alter table murid add constraint murid_nilai_sah check (
  char_length(btrim(nama)) between 2 and 60
  and (usia is null or usia between 1 and 99)
  and (nama_ortu is null or char_length(nama_ortu) <= 60)
  and (no_wa is null or no_wa ~ '^[0-9+]{8,16}$')
  and (catatan is null or char_length(catatan) <= 500)
);

-- Kunci gabungan (id, tenant_id): baris anak tidak bisa menunjuk murid/paket/pengajar milik usaha LAIN walau RLS lolos.
alter table murid add constraint murid_id_tenant_unik unique (id, tenant_id);
alter table paket add constraint paket_id_tenant_unik unique (id, tenant_id);
alter table pengajar add constraint pengajar_id_tenant_unik unique (id, tenant_id);

create table if not exists murid_paket (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  murid_id uuid not null,
  paket_id uuid not null,
  jumlah_sesi int not null check (jumlah_sesi between 1 and 100),
  mulai date not null,
  berlaku_sampai date not null,
  pengajar_id uuid,
  dibuat_pada timestamptz not null default now(),
  check (berlaku_sampai >= mulai),
  foreign key (murid_id, tenant_id) references murid (id, tenant_id) on delete cascade,
  foreign key (paket_id, tenant_id) references paket (id, tenant_id), -- tanpa cascade: paket yang masih dipakai tidak bisa dihapus
  foreign key (pengajar_id, tenant_id) references pengajar (id, tenant_id)
);
create index if not exists murid_paket_murid on murid_paket (tenant_id, murid_id, berlaku_sampai desc);

create table if not exists catatan_murid (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  murid_id uuid not null,
  teks text not null check (char_length(btrim(teks)) between 1 and 500),
  penulis_user_id uuid not null references auth.users (id),
  penulis_nama text not null,
  dibuat_pada timestamptz not null default now(),
  foreign key (murid_id, tenant_id) references murid (id, tenant_id) on delete cascade
);
create index if not exists catatan_murid_murid on catatan_murid (tenant_id, murid_id, dibuat_pada desc);

alter table murid_paket enable row level security;
alter table catatan_murid enable row level security;
create policy murid_paket_baca on murid_paket for select using (is_member(tenant_id));
create policy murid_paket_owner on murid_paket for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));
create policy catatan_baca on catatan_murid for select using (is_member(tenant_id));
create policy catatan_tulis on catatan_murid for insert with check (is_owner(tenant_id) and penulis_user_id = auth.uid());
create policy catatan_hapus on catatan_murid for delete using (is_owner(tenant_id));

-- Batas murid aktif: murid baru yang aktif, atau murid nonaktif diaktifkan lagi.
create or replace function public.batasi_murid_aktif() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  batas int;
  ditemukan boolean;
  jumlah int;
begin
  if new.aktif is not true then return new; end if;
  if tg_op = 'UPDATE' and old.aktif is true then return new; end if;

  perform pg_advisory_xact_lock(hashtext('murid_aktif:' || new.tenant_id::text));

  select true, b.murid into ditemukan, batas
  from subscriptions s join plan_batas b on b.plan = s.plan
  where s.tenant_id = new.tenant_id;
  if ditemukan is not true then raise exception 'langganan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if batas is null then return new; end if;

  select count(*) into jumlah from murid where tenant_id = new.tenant_id and aktif and id is distinct from new.id;
  if jumlah >= batas then raise exception 'batas_murid' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.batasi_murid_aktif() from public, anon, authenticated;

drop trigger if exists murid_batas_aktif on murid;
create trigger murid_batas_aktif before insert or update of aktif on murid for each row execute function public.batasi_murid_aktif();

-- Tambah murid + paketnya + tagihan pertama dalam satu transaksi. Pemanggil harus pemilik usaha dari paket itu.
create or replace function public.tambah_murid(
  p_nama text, p_kategori text, p_usia int, p_nama_ortu text, p_no_wa text,
  p_paket_id uuid, p_mulai date, p_pengajar_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pk record;
  tid uuid;
  mid uuid;
  hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into pk from paket where id = p_paket_id;
  if not found then raise exception 'paket_tidak_ditemukan' using errcode = 'P0001'; end if;
  tid := pk.tenant_id;
  if not is_owner(tid) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if pk.aktif is not true then raise exception 'paket_nonaktif' using errcode = 'P0001'; end if;
  if p_kategori not in ('anak', 'dewasa') or pk.kategori <> p_kategori then raise exception 'kategori_tidak_cocok' using errcode = 'P0001'; end if;
  if p_pengajar_id is not null and not exists (select 1 from pengajar where id = p_pengajar_id and tenant_id = tid and aktif) then raise exception 'pengajar_tidak_valid' using errcode = 'P0001'; end if;
  if p_mulai is null or p_mulai < hari_ini - 60 or p_mulai > hari_ini + 180 then raise exception 'tanggal_mulai_tidak_valid' using errcode = 'P0001'; end if;
  if p_kategori = 'anak' and (p_usia is null or p_usia not between 1 and 17) then raise exception 'usia_tidak_valid' using errcode = 'P0001'; end if;

  insert into murid (tenant_id, nama, kategori, usia, nama_ortu, no_wa)
  values (tid, btrim(p_nama), p_kategori, case when p_kategori = 'anak' then p_usia end,
          nullif(btrim(coalesce(p_nama_ortu, '')), ''), nullif(btrim(coalesce(p_no_wa, '')), ''))
  returning id into mid;

  insert into murid_paket (tenant_id, murid_id, paket_id, jumlah_sesi, mulai, berlaku_sampai, pengajar_id)
  values (tid, mid, pk.id, pk.jumlah_sesi, p_mulai, p_mulai + pk.masa_berlaku_hari, p_pengajar_id);

  insert into tagihan (tenant_id, murid_id, paket_id, nominal, status, jatuh_tempo)
  values (tid, mid, pk.id, pk.harga, 'belum', hari_ini + 7);

  return mid;
exception
  when check_violation or invalid_text_representation or not_null_violation then
    raise exception 'data_murid_tidak_valid' using errcode = 'P0001';
end $$;
revoke all on function public.tambah_murid(text, text, int, text, text, uuid, date, uuid) from public, anon;
grant execute on function public.tambah_murid(text, text, int, text, text, uuid, date, uuid) to authenticated;
