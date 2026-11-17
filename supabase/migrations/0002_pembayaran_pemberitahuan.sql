-- KelolaKelas 0002: pengaturan usaha, rekening, bukti bayar, pemberitahuan, token portal murid.
-- Jalankan SETELAH 0001_init.sql (SQL Editor Supabase, atau `supabase db push`).

alter table tenants add column if not exists pengaturan jsonb not null default '{}';
alter table pendaftaran add column if not exists pengajar_id uuid references pengajar (id);
alter table paket add column if not exists anggota int check (anggota is null or anggota between 2 and 6);

-- ===== Rekening pembayaran (maks 5 per usaha, dijaga trigger) =====
create table rekening_usaha (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  bank text not null check (char_length(bank) between 2 and 30),
  nomor text not null check (nomor ~ '^[0-9]{6,20}$'),
  atas_nama text not null check (char_length(atas_nama) between 3 and 60),
  unique (tenant_id, bank, nomor)
);

create or replace function batasi_rekening() returns trigger language plpgsql as $$
begin
  if (select count(*) from rekening_usaha where tenant_id = new.tenant_id) >= 5 then
    raise exception 'Maksimal 5 rekening per usaha';
  end if;
  return new;
end $$;
create trigger rekening_maks before insert on rekening_usaha for each row execute function batasi_rekening();

alter table rekening_usaha enable row level security;
create policy rekening_baca on rekening_usaha for select using (is_member(tenant_id));
create policy rekening_owner on rekening_usaha for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));

-- Murid (tanpa login) melihat rekening lewat fungsi ini saja: hanya kolom yang perlu, hanya untuk usaha berlangganan aktif.
create or replace function rekening_publik(p_slug text)
returns table (id uuid, bank text, nomor text, atas_nama text)
language sql stable security definer set search_path = public as $$
  select r.id, r.bank, r.nomor, r.atas_nama
  from rekening_usaha r join tenants t on t.id = r.tenant_id
  where t.slug = p_slug;
$$;
revoke all on function rekening_publik(text) from public;
grant execute on function rekening_publik(text) to anon, authenticated;

-- ===== Bukti bayar pendaftaran =====
-- Berkas disimpan di bucket Storage PRIVAT "bukti-bayar" (dibuat di dashboard, public = off).
-- Path: <tenant_id>/<pendaftaran_id>/<uuid>.<ext>. Murid mengunggah lewat server action (service role), bukan langsung.
create table pendaftaran_bukti (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pendaftaran_id uuid not null references pendaftaran (id) on delete cascade,
  rekening_id uuid references rekening_usaha (id) on delete set null,
  berkas_path text not null,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  ukuran int not null check (ukuran > 0 and ukuran <= 5242880),
  diunggah_pada timestamptz not null default now(),
  status text not null default 'menunggu' check (status in ('menunggu', 'diterima', 'ditolak'))
);
create index on pendaftaran_bukti (tenant_id, pendaftaran_id);
alter table pendaftaran_bukti enable row level security;
create policy bukti_baca on pendaftaran_bukti for select using (is_member(tenant_id));
create policy bukti_owner on pendaftaran_bukti for update using (is_owner(tenant_id)) with check (is_owner(tenant_id));
-- insert: hanya service role (server action) setelah memeriksa kode pendaftaran, jenis, dan ukuran berkas.

-- ===== Pemberitahuan =====
create table pemberitahuan (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jenis text not null check (jenis in ('umum', 'tidak_hadir', 'aturan')),
  judul text not null check (char_length(judul) between 3 and 80),
  isi text not null check (char_length(isi) between 5 and 500),
  penulis_user_id uuid not null references auth.users (id),
  penulis_nama text not null,
  untuk_pengajar_id uuid references pengajar (id), -- null = semua murid
  dibuat_pada timestamptz not null default now()
);
create index on pemberitahuan (tenant_id, dibuat_pada desc);
alter table pemberitahuan enable row level security;
create policy info_baca on pemberitahuan for select using (is_member(tenant_id));
create policy info_owner on pemberitahuan for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));
-- Pelatih hanya boleh menulis untuk muridnya sendiri, dan hanya menghapus tulisannya sendiri.
create policy info_pelatih_tulis on pemberitahuan for insert with check (
  is_member(tenant_id) and penulis_user_id = auth.uid()
  and untuk_pengajar_id in (select id from pengajar where user_id = auth.uid() and tenant_id = pemberitahuan.tenant_id)
);
create policy info_pelatih_hapus on pemberitahuan for delete using (is_member(tenant_id) and penulis_user_id = auth.uid());

-- ===== Token portal murid =====
-- Yang disimpan HANYA hash SHA-256 token. Token asli dikirim ke murid sekali (lewat WA) dan tidak bisa dipulihkan.
create table portal_token (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  murid_id uuid not null references murid (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  dibuat_pada timestamptz not null default now(),
  dicabut_pada timestamptz
);
create index on portal_token (murid_id);
alter table portal_token enable row level security;
create policy token_baca on portal_token for select using (is_owner(tenant_id)); -- hanya metadata, bukan token
-- insert/cabut: server action owner (service role). Cek token murid: server membandingkan hash, lalu 404 yang sama bila tidak cocok / dicabut.
