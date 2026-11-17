-- KelolaKelas: skema awal multi-usaha. Semua tabel data usaha punya tenant_id + RLS.
-- Status slot TIDAK disimpan: dihitung dari kuota (lihat lib/slot.ts).

create extension if not exists "pgcrypto";

-- ===== Usaha & keanggotaan =====
create table tenants (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  kategori text not null default 'lainnya',
  tema text not null default 'gelap' check (tema in ('gelap', 'terang')),
  istilah jsonb not null default '{"murid":"murid","sesi":"sesi","pengajar":"pengajar"}',
  owner_id uuid not null references auth.users (id),
  trial_ends_at timestamptz,
  trial_used boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

create table tenant_members (
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'pengajar')),
  primary key (tenant_id, user_id)
);

create or replace function is_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_members where tenant_id = t and user_id = auth.uid());
$$;

create or replace function is_owner(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_members where tenant_id = t and user_id = auth.uid() and role = 'owner');
$$;

-- ===== Data les =====
create table pengajar (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid references auth.users (id),
  nama text not null,
  bagi_hasil_persen numeric(5, 2) not null default 0 check (bagi_hasil_persen between 0 and 100),
  aktif boolean not null default true
);

create table paket (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nama text not null,
  kategori text not null default 'anak' check (kategori in ('anak', 'dewasa')),
  jenis text not null default 'privat' check (jenis in ('privat', 'grup', 'keluarga')),
  jumlah_sesi int not null check (jumlah_sesi > 0),
  masa_berlaku_hari int not null default 35,
  harga int not null check (harga >= 0),
  aktif boolean not null default true
);

create table murid (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nama text not null,
  kategori text not null default 'anak' check (kategori in ('anak', 'dewasa')),
  no_wa text,
  nama_ortu text,
  catatan text,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

create table jadwal_template (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pengajar_id uuid not null references pengajar (id) on delete cascade,
  hari smallint not null check (hari between 0 and 6),
  jam_mulai time not null,
  durasi_menit int not null default 60,
  nama text not null,
  kuota int not null check (kuota >= 0),
  lokasi text
);

-- Penutupan slot / libur untuk tanggal tertentu. Tidak menyimpan status; terisi dihitung dari sesi.
create table slot_tutup (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null references jadwal_template (id) on delete cascade,
  tanggal date not null,
  alasan text,
  unique (jadwal_id, tanggal)
);

create table pendaftaran (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  kode text not null,
  nama text not null,
  kategori text not null default 'anak',
  no_wa text not null,
  paket_id uuid references paket (id),
  jadwal_id uuid references jadwal_template (id),
  tanggal_mulai date,
  kode_promo text,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  dibuat_pada timestamptz not null default now(),
  unique (tenant_id, kode)
);

create table sesi (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  murid_id uuid not null references murid (id) on delete cascade,
  jadwal_id uuid references jadwal_template (id),
  pengajar_id uuid references pengajar (id),
  tanggal date not null,
  jam_mulai time not null,
  status text not null default 'terjadwal' check (status in ('terjadwal', 'hadir', 'izin', 'alpa', 'dibatalkan')),
  catatan text
);
create index on sesi (tenant_id, tanggal);
create index on sesi (jadwal_id, tanggal);

create table tagihan (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  murid_id uuid not null references murid (id) on delete cascade,
  paket_id uuid references paket (id),
  nominal int not null check (nominal >= 0),
  status text not null default 'belum' check (status in ('belum', 'menunggu_verifikasi', 'lunas', 'batal')),
  jatuh_tempo date,
  bukti_url text,
  dibayar_pada timestamptz,
  dibuat_pada timestamptz not null default now()
);

create table promo (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  kode text not null,
  jenis text not null check (jenis in ('persen', 'nominal')),
  nilai int not null check (nilai > 0),
  kuota int,
  terpakai int not null default 0,
  kedaluwarsa date,
  unique (tenant_id, kode)
);

-- ===== Langganan platform (dibayar owner ke KelolaKelas lewat DuitKu) =====
create table subscriptions (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'pro')),
  current_period_end timestamptz,
  grace_until timestamptz,
  auto_renew boolean not null default false
);

create table subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  order_id text not null unique,
  plan text not null check (plan in ('starter', 'pro')),
  period_months int not null default 1,
  amount int not null,
  promo_code text,
  status text not null default 'belum_bayar' check (status in ('belum_bayar', 'lunas', 'kedaluwarsa', 'batal')),
  due_at timestamptz not null,
  paid_at timestamptz
);

create table payment_events (
  id bigint generated always as identity primary key,
  order_id text not null,
  payload jsonb not null,
  diterima_pada timestamptz not null default now()
);

create table platform_transactions (
  order_id text primary key,
  tenant_id uuid not null references tenants (id),
  nominal int not null,
  plan text not null,
  promo_code text,
  paid_at timestamptz not null
);

create table platform_promo_codes (
  kode text primary key,
  jenis text not null check (jenis in ('persen', 'nominal')),
  nilai int not null,
  kuota int,
  used_count int not null default 0,
  kedaluwarsa date,
  berlaku_bulan int not null default 1
);

create table reminder_logs (
  invoice_id uuid not null references subscription_invoices (id) on delete cascade,
  kanal text not null check (kanal in ('email', 'wa')),
  tipe text not null,
  dikirim_pada timestamptz not null default now(),
  primary key (invoice_id, kanal, tipe)
);

-- ===== RLS =====
alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table pengajar enable row level security;
alter table paket enable row level security;
alter table murid enable row level security;
alter table jadwal_template enable row level security;
alter table slot_tutup enable row level security;
alter table pendaftaran enable row level security;
alter table sesi enable row level security;
alter table tagihan enable row level security;
alter table promo enable row level security;
alter table subscriptions enable row level security;
alter table subscription_invoices enable row level security;
-- payment_events, platform_*, reminder_logs: tanpa policy = hanya service role (server), tidak pernah dari browser.
alter table payment_events enable row level security;
alter table platform_transactions enable row level security;
alter table platform_promo_codes enable row level security;
alter table reminder_logs enable row level security;

create policy tenants_baca on tenants for select using (is_member(id));
create policy tenants_ubah on tenants for update using (is_owner(id));
create policy members_baca on tenant_members for select using (is_member(tenant_id));
create policy members_kelola on tenant_members for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));

-- Tabel data usaha: anggota baca, owner tulis. Pengajar boleh menandai absen (sesi) lewat policy terpisah.
do $$
declare t text;
begin
  foreach t in array array['pengajar', 'paket', 'murid', 'jadwal_template', 'slot_tutup', 'pendaftaran', 'tagihan', 'promo'] loop
    execute format('create policy %I on %I for select using (is_member(tenant_id))', t || '_baca', t);
    execute format('create policy %I on %I for all using (is_owner(tenant_id)) with check (is_owner(tenant_id))', t || '_owner', t);
  end loop;
end $$;

create policy sesi_baca on sesi for select using (is_member(tenant_id));
create policy sesi_owner on sesi for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));
create policy sesi_pengajar_absen on sesi for update using (
  is_member(tenant_id) and pengajar_id in (select id from pengajar where user_id = auth.uid())
);

create policy sub_baca on subscriptions for select using (is_member(tenant_id));
create policy inv_baca on subscription_invoices for select using (is_owner(tenant_id));

-- Halaman publik murid (/u/[slug]) membaca lewat fungsi server dengan kolom terbatas, bukan policy terbuka.
