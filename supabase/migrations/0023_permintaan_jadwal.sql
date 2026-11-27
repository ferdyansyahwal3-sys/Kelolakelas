-- KelolaKelas 0023 (B3b): permintaan ganti pelatih, tukar jadwal (pengajuan + pemindahan sekali), sesi pengganti murid.
-- Semua tulis lewat fungsi security definer yang MENGULANG aturan lib/pelatih.ts + lib/sesi.ts (sumber kebenaran logika tampilan).
-- Tanpa policy tulis di tabel. Kode galat = pesan P0001 pendek (dipetakan ke teks di server action).
-- Konvensi: jadwal_template.hari 0=Senin..6=Minggu (isodow - 1). Semua "hari ini" = Asia/Jakarta.

-- ===== Pembantu =====
create or replace function public._hari_ini() returns date
language sql stable set search_path = public as $$ select (now() at time zone 'Asia/Jakarta')::date $$;

-- Pelatih (baris pengajar aktif) milik akun yang sedang masuk di usaha tertentu; null bila bukan pelatih.
create or replace function public._pengajar_saya(p_tenant uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from pengajar where tenant_id = p_tenant and user_id = auth.uid() and aktif limit 1
$$;
revoke all on function public._pengajar_saya(uuid) from public, anon;
grant execute on function public._pengajar_saya(uuid) to authenticated;

-- ===== Tabel =====
create table if not exists minta_ganti (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null,
  tanggal date not null,
  dari_id uuid not null,
  ke_id uuid not null,
  alasan text not null check (char_length(alasan) between 5 and 200),
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
  dibuat date not null default ((now() at time zone 'Asia/Jakarta')::date),
  diputuskan date,
  dibuat_pada timestamptz not null default now(),
  foreign key (jadwal_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade,
  foreign key (dari_id, tenant_id) references pengajar (id, tenant_id) on delete cascade,
  foreign key (ke_id, tenant_id) references pengajar (id, tenant_id) on delete cascade
);
create unique index if not exists minta_ganti_menunggu on minta_ganti (jadwal_id, tanggal) where status = 'menunggu';
create index if not exists minta_ganti_tenant on minta_ganti (tenant_id, status, tanggal);
alter table minta_ganti enable row level security;
drop policy if exists minta_baca on minta_ganti;
create policy minta_baca on minta_ganti for select using (is_owner(tenant_id) or dari_id = _pengajar_saya(tenant_id) or ke_id = _pengajar_saya(tenant_id));

create table if not exists tukar_jadwal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null,
  tanggal_asal date not null,
  tanggal_baru date not null,
  jam_baru time not null,
  alasan text not null check (char_length(alasan) between 5 and 200),
  pelatih_id uuid not null,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
  diputuskan date,
  dibuat_pada timestamptz not null default now(),
  foreign key (jadwal_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade,
  foreign key (pelatih_id, tenant_id) references pengajar (id, tenant_id) on delete cascade
);
create unique index if not exists tukar_menunggu on tukar_jadwal (jadwal_id, tanggal_asal) where status = 'menunggu';
create index if not exists tukar_tenant on tukar_jadwal (tenant_id, status, tanggal_asal);
alter table tukar_jadwal enable row level security;
drop policy if exists tukar_baca on tukar_jadwal;
create policy tukar_baca on tukar_jadwal for select using (is_owner(tenant_id) or pelatih_id = _pengajar_saya(tenant_id));

-- Satu sesi dipindah ke tanggal/jam lain HANYA sekali itu. Jadwal tetap tidak berubah.
create table if not exists pindah_jadwal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null,
  tanggal_asal date not null,
  tanggal_baru date not null,
  jam_baru time not null,
  tukar_id uuid references tukar_jadwal (id) on delete set null,
  dibuat_pada timestamptz not null default now(),
  unique (jadwal_id, tanggal_asal),
  unique (jadwal_id, tanggal_baru),
  foreign key (jadwal_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade
);
create index if not exists pindah_tenant on pindah_jadwal (tenant_id, tanggal_baru);
alter table pindah_jadwal enable row level security;
drop policy if exists pindah_baca on pindah_jadwal;
create policy pindah_baca on pindah_jadwal for select using (is_member(tenant_id));

-- Murid izin diganti sesi di slot/tanggal lain (satu pengganti per sesi izin).
create table if not exists sesi_pengganti (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null,
  tanggal date not null,
  murid_id uuid not null,
  dari_jadwal_id uuid not null,
  dari_tanggal date not null,
  dibuat_pada timestamptz not null default now(),
  unique (jadwal_id, tanggal, murid_id),
  unique (dari_jadwal_id, dari_tanggal, murid_id),
  foreign key (jadwal_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade,
  foreign key (dari_jadwal_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade,
  foreign key (murid_id, tenant_id) references murid (id, tenant_id) on delete cascade
);
create index if not exists sesi_pengganti_tenant on sesi_pengganti (tenant_id, tanggal);
alter table sesi_pengganti enable row level security;
drop policy if exists pengganti_baca on sesi_pengganti;
create policy pengganti_baca on sesi_pengganti for select using (is_member(tenant_id));

-- ===== Sesi pada satu tanggal (cermin lib/sesi.ts sesiPadaTanggal: slot tetap yang tidak dipindah keluar + pindahan yang masuk) =====
create or replace function public._sesi_pada(p_tenant uuid, p_tanggal date)
returns table (jadwal_id uuid, nama text, jam time, durasi int, pelatih uuid, asal date)
language sql stable security definer set search_path = public as $$
  select j.id, j.nama, j.jam_mulai, j.durasi_menit,
         coalesce((select g.pengajar_id from ganti_pelatih g where g.jadwal_id = j.id and g.tanggal = p_tanggal), j.pengajar_id),
         null::date
    from jadwal_template j
   where j.tenant_id = p_tenant and j.hari = extract(isodow from p_tanggal)::int - 1
     and not exists (select 1 from pindah_jadwal p where p.jadwal_id = j.id and p.tanggal_asal = p_tanggal)
  union all
  select j.id, j.nama, p.jam_baru, j.durasi_menit,
         coalesce((select g.pengajar_id from ganti_pelatih g where g.jadwal_id = j.id and g.tanggal = p.tanggal_asal), j.pengajar_id),
         p.tanggal_asal
    from pindah_jadwal p join jadwal_template j on j.id = p.jadwal_id
   where p.tenant_id = p_tenant and p.tanggal_baru = p_tanggal
$$;
revoke all on function public._sesi_pada(uuid, date) from public, anon, authenticated;

-- Pemegang sesi slot pada tanggal asalnya (penggantian sekali, atau pelatih tetap).
create or replace function public._pemegang(p_jadwal uuid, p_tanggal date) returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce((select g.pengajar_id from ganti_pelatih g where g.jadwal_id = p_jadwal and g.tanggal = p_tanggal), (select pengajar_id from jadwal_template where id = p_jadwal))
$$;
revoke all on function public._pemegang(uuid, date) from public, anon, authenticated;

-- Peserta sebuah sesi di sebuah tanggal: peserta tetap + murid pengganti pada tanggal itu.
create or replace function public._peserta_sesi(p_jadwal uuid, p_tanggal date) returns table (murid_id uuid)
language sql stable security definer set search_path = public as $$
  select murid_id from peserta_tetap where jadwal_id = p_jadwal
  union
  select murid_id from sesi_pengganti where jadwal_id = p_jadwal and tanggal = p_tanggal
$$;
revoke all on function public._peserta_sesi(uuid, date) from public, anon, authenticated;

-- Pelatih tujuan harus aktif dan tidak bentrok (cermin lib/sesi.ts gantiPelatih).
create or replace function public._ganti_cek(p_j jadwal_template, p_tanggal date, p_pengajar uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_nama text; v_tabrak text;
begin
  select nama into v_nama from pengajar where id = p_pengajar and tenant_id = p_j.tenant_id and aktif;
  if v_nama is null then raise exception 'pelatih_tidak_ditemukan' using errcode = 'P0001'; end if;
  select s.nama into v_tabrak from public._sesi_pada(p_j.tenant_id, p_tanggal) s
   where s.jadwal_id <> p_j.id and s.pelatih = p_pengajar
     and s.jam < p_j.jam_mulai + make_interval(mins => p_j.durasi_menit)
     and p_j.jam_mulai < s.jam + make_interval(mins => s.durasi)
   limit 1;
  if v_tabrak is not null then raise exception 'pelatih_bentrok' using errcode = 'P0001'; end if;
end $$;
revoke all on function public._ganti_cek(jadwal_template, date, uuid) from public, anon, authenticated;

-- Menerapkan penggantian sekali (tanpa cek akses; dipanggil fungsi yang sudah memeriksa). null / pelatih tetap = hapus.
create or replace function public._ganti_terapkan(p_jadwal uuid, p_tanggal date, p_pengajar uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_j jadwal_template%rowtype;
begin
  select * into v_j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  if p_tanggal is null or (extract(isodow from p_tanggal)::int - 1) <> v_j.hari then raise exception 'tanggal_tidak_sesuai' using errcode = 'P0001'; end if;
  if p_tanggal < public._hari_ini() then raise exception 'sesi_lewat' using errcode = 'P0001'; end if;
  if exists (select 1 from pindah_jadwal where jadwal_id = p_jadwal and tanggal_asal = p_tanggal) then raise exception 'sesi_dipindah' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('ganti:' || v_j.tenant_id::text));
  if p_pengajar is null or p_pengajar = v_j.pengajar_id then
    delete from ganti_pelatih where jadwal_id = p_jadwal and tanggal = p_tanggal and tenant_id = v_j.tenant_id;
    return;
  end if;
  perform public._ganti_cek(v_j, p_tanggal, p_pengajar);
  insert into ganti_pelatih (tenant_id, jadwal_id, tanggal, pengajar_id) values (v_j.tenant_id, p_jadwal, p_tanggal, p_pengajar)
  on conflict (jadwal_id, tanggal) do update set pengajar_id = excluded.pengajar_id;
end $$;
revoke all on function public._ganti_terapkan(uuid, date, uuid) from public, anon, authenticated;

-- ===== Ganti pelatih langsung oleh owner (menggantikan 0022) =====
-- Permintaan ganti / pengajuan tukar yang masih menunggu untuk sesi yang sama ditutup otomatis (status 'dibatalkan');
-- id-nya dikembalikan supaya server bisa memberi kabar ke pemohon (B3c).
drop function if exists public.ganti_pelatih_set(uuid, date, uuid);
create function public.ganti_pelatih_set(p_jadwal uuid, p_tanggal date, p_pengajar uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_j jadwal_template%rowtype; v_minta jsonb; v_tukar jsonb;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v_j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(v_j.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  perform public._ganti_terapkan(p_jadwal, p_tanggal, p_pengajar);
  with m as (update minta_ganti set status = 'dibatalkan', diputuskan = public._hari_ini() where jadwal_id = p_jadwal and tanggal = p_tanggal and status = 'menunggu' returning id)
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_minta from m;
  with t as (update tukar_jadwal set status = 'dibatalkan', diputuskan = public._hari_ini() where jadwal_id = p_jadwal and tanggal_asal = p_tanggal and status = 'menunggu' returning id)
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_tukar from t;
  return jsonb_build_object('minta', v_minta, 'tukar', v_tukar);
end $$;
revoke all on function public.ganti_pelatih_set(uuid, date, uuid) from public, anon;
grant execute on function public.ganti_pelatih_set(uuid, date, uuid) to authenticated;

-- ===== Permintaan ganti pelatih (pelatih mengajukan, owner memutuskan) =====
create or replace function public.minta_ganti_ajukan(p_jadwal uuid, p_tanggal date, p_ke uuid, p_alasan text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_j jadwal_template%rowtype; v_me uuid; v_alasan text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v_j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  v_me := public._pengajar_saya(v_j.tenant_id);
  if v_me is null then raise exception 'bukan_pelatih' using errcode = 'P0001'; end if;
  if p_tanggal is null or (extract(isodow from p_tanggal)::int - 1) <> v_j.hari then raise exception 'tanggal_tidak_sesuai' using errcode = 'P0001'; end if;
  if p_tanggal < public._hari_ini() then raise exception 'sesi_lewat' using errcode = 'P0001'; end if;
  if public._pemegang(p_jadwal, p_tanggal) <> v_me then raise exception 'bukan_pemegang' using errcode = 'P0001'; end if;
  if exists (select 1 from minta_ganti where jadwal_id = p_jadwal and tanggal = p_tanggal and status = 'menunggu') then raise exception 'sudah_ada_permintaan' using errcode = 'P0001'; end if;
  if exists (select 1 from pindah_jadwal where jadwal_id = p_jadwal and tanggal_asal = p_tanggal) then raise exception 'sesi_dipindah' using errcode = 'P0001'; end if;
  v_alasan := btrim(regexp_replace(coalesce(p_alasan, ''), '\s+', ' ', 'g'));
  if char_length(v_alasan) < 5 then raise exception 'alasan_pendek' using errcode = 'P0001'; end if;
  if char_length(v_alasan) > 200 then raise exception 'alasan_panjang' using errcode = 'P0001'; end if;
  if p_ke is null then raise exception 'pelatih_belum_dipilih' using errcode = 'P0001'; end if;
  if p_ke = v_me then raise exception 'pelatih_sama' using errcode = 'P0001'; end if;
  perform public._ganti_cek(v_j, p_tanggal, p_ke);
  insert into minta_ganti (tenant_id, jadwal_id, tanggal, dari_id, ke_id, alasan) values (v_j.tenant_id, p_jadwal, p_tanggal, v_me, p_ke, v_alasan) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.minta_ganti_ajukan(uuid, date, uuid, text) from public, anon;
grant execute on function public.minta_ganti_ajukan(uuid, date, uuid, text) to authenticated;

create or replace function public.minta_ganti_batal(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v minta_ganti%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v from minta_ganti where id = p_id for update;
  if not found then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if v.dari_id is distinct from public._pengajar_saya(v.tenant_id) then raise exception 'bukan_pemohon' using errcode = 'P0001'; end if;
  if v.status <> 'menunggu' then raise exception 'sudah_diputuskan' using errcode = 'P0001'; end if;
  delete from minta_ganti where id = p_id; -- ditarik pemohon = tidak ada yang perlu diingat (status 'dibatalkan' hanya untuk penutupan oleh owner)
end $$;
revoke all on function public.minta_ganti_batal(uuid) from public, anon;
grant execute on function public.minta_ganti_batal(uuid) to authenticated;

-- Setujui menjalankan ulang aturan (keadaan bisa berubah sejak diajukan). Cermin setujuiMinta.
create or replace function public.minta_ganti_putuskan(p_id uuid, p_setuju boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v minta_ganti%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v from minta_ganti where id = p_id for update;
  if not found then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(v.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if v.status <> 'menunggu' then raise exception 'sudah_diputuskan' using errcode = 'P0001'; end if;
  if not coalesce(p_setuju, false) then
    update minta_ganti set status = 'ditolak', diputuskan = public._hari_ini() where id = p_id;
    return;
  end if;
  if exists (select 1 from pindah_jadwal where jadwal_id = v.jadwal_id and tanggal_asal = v.tanggal) then raise exception 'sesi_dipindah' using errcode = 'P0001'; end if;
  if public._pemegang(v.jadwal_id, v.tanggal) = v.ke_id then raise exception 'sudah_memegang' using errcode = 'P0001'; end if;
  perform public._ganti_terapkan(v.jadwal_id, v.tanggal, v.ke_id);
  update minta_ganti set status = 'disetujui', diputuskan = public._hari_ini() where id = p_id;
end $$;
revoke all on function public.minta_ganti_putuskan(uuid, boolean) from public, anon;
grant execute on function public.minta_ganti_putuskan(uuid, boolean) to authenticated;

-- ===== Tukar jadwal (pelatih mengajukan, owner memutuskan; disetujui = sesi pindah sekali) =====
-- Cermin lib/pelatih.ts validasiTukar.
create or replace function public.tukar_ajukan(p_jadwal uuid, p_tanggal_asal date, p_tanggal_baru date, p_jam_baru time, p_alasan text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_j jadwal_template%rowtype; v_me uuid; v_alasan text; v_id uuid; v_hari date := public._hari_ini();
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v_j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  v_me := public._pengajar_saya(v_j.tenant_id);
  if v_me is null then raise exception 'bukan_pelatih' using errcode = 'P0001'; end if;
  if p_tanggal_asal is null or (extract(isodow from p_tanggal_asal)::int - 1) <> v_j.hari then raise exception 'tanggal_tidak_sesuai' using errcode = 'P0001'; end if;
  if p_tanggal_asal < v_hari then raise exception 'sesi_lewat' using errcode = 'P0001'; end if;
  if public._pemegang(p_jadwal, p_tanggal_asal) <> v_me then raise exception 'bukan_pemegang' using errcode = 'P0001'; end if;
  if exists (select 1 from tukar_jadwal where jadwal_id = p_jadwal and tanggal_asal = p_tanggal_asal and status = 'menunggu') then raise exception 'sudah_ada_pengajuan' using errcode = 'P0001'; end if;
  if exists (select 1 from pindah_jadwal where jadwal_id = p_jadwal and tanggal_asal = p_tanggal_asal) then raise exception 'sesi_dipindah' using errcode = 'P0001'; end if;
  if p_jam_baru is null then raise exception 'jam_tidak_valid' using errcode = 'P0001'; end if;
  if p_tanggal_baru is null or p_tanggal_baru < v_hari then raise exception 'tanggal_baru_lewat' using errcode = 'P0001'; end if;
  if p_tanggal_baru > v_hari + 60 then raise exception 'tanggal_baru_jauh' using errcode = 'P0001'; end if;
  v_alasan := btrim(regexp_replace(coalesce(p_alasan, ''), '\s+', ' ', 'g'));
  if char_length(v_alasan) < 5 then raise exception 'alasan_pendek' using errcode = 'P0001'; end if;
  if char_length(v_alasan) > 200 then raise exception 'alasan_panjang' using errcode = 'P0001'; end if;
  if p_tanggal_baru = p_tanggal_asal and p_jam_baru = v_j.jam_mulai then raise exception 'sama_dengan_jadwal' using errcode = 'P0001'; end if;
  if p_tanggal_baru <> p_tanggal_asal and (extract(isodow from p_tanggal_baru)::int - 1) = v_j.hari then raise exception 'hari_slot_sama' using errcode = 'P0001'; end if;
  -- bentrok dengan sesi lain pelatih ini di tanggal baru, atau dengan pengajuan lain yang menunggu
  if exists (select 1 from public._sesi_pada(v_j.tenant_id, p_tanggal_baru) s
              where s.pelatih = v_me and not (s.jadwal_id = v_j.id and p_tanggal_baru = p_tanggal_asal)
                and s.jam < p_jam_baru + make_interval(mins => v_j.durasi_menit) and p_jam_baru < s.jam + make_interval(mins => s.durasi)) then
    raise exception 'pelatih_bentrok' using errcode = 'P0001';
  end if;
  if exists (select 1 from tukar_jadwal t join jadwal_template j2 on j2.id = t.jadwal_id
              where t.tenant_id = v_j.tenant_id and t.status = 'menunggu' and t.pelatih_id = v_me and t.tanggal_baru = p_tanggal_baru and t.jadwal_id <> p_jadwal
                and t.jam_baru < p_jam_baru + make_interval(mins => v_j.durasi_menit) and p_jam_baru < t.jam_baru + make_interval(mins => j2.durasi_menit)) then
    raise exception 'bentrok_pengajuan' using errcode = 'P0001';
  end if;
  insert into tukar_jadwal (tenant_id, jadwal_id, tanggal_asal, tanggal_baru, jam_baru, alasan, pelatih_id)
  values (v_j.tenant_id, p_jadwal, p_tanggal_asal, p_tanggal_baru, p_jam_baru, v_alasan, v_me) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.tukar_ajukan(uuid, date, date, time, text) from public, anon;
grant execute on function public.tukar_ajukan(uuid, date, date, time, text) to authenticated;

create or replace function public.tukar_batal(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v tukar_jadwal%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v from tukar_jadwal where id = p_id for update;
  if not found then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if v.pelatih_id is distinct from public._pengajar_saya(v.tenant_id) then raise exception 'bukan_pemohon' using errcode = 'P0001'; end if;
  if v.status <> 'menunggu' then raise exception 'sudah_diputuskan' using errcode = 'P0001'; end if;
  delete from tukar_jadwal where id = p_id;
end $$;
revoke all on function public.tukar_batal(uuid) from public, anon;
grant execute on function public.tukar_batal(uuid) to authenticated;

-- Cermin lib/pelatih.ts setujuiTukar. Disetujui: baris pindah_jadwal dibuat (sesi pindah hanya sekali itu).
create or replace function public.tukar_putuskan(p_id uuid, p_setuju boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v tukar_jadwal%rowtype; j jadwal_template%rowtype; v_hari date := public._hari_ini(); v_pemegang uuid; v_m record;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v from tukar_jadwal where id = p_id for update;
  if not found then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(v.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if v.status <> 'menunggu' then raise exception 'sudah_diputuskan' using errcode = 'P0001'; end if;
  if not coalesce(p_setuju, false) then
    update tukar_jadwal set status = 'ditolak', diputuskan = v_hari where id = p_id;
    return;
  end if;
  select * into j from jadwal_template where id = v.jadwal_id;
  if not found or (extract(isodow from v.tanggal_asal)::int - 1) <> j.hari then raise exception 'sesi_asal_hilang' using errcode = 'P0001'; end if;
  if v.tanggal_asal < v_hari then raise exception 'sesi_lewat' using errcode = 'P0001'; end if;
  if v.tanggal_baru < v_hari then raise exception 'tanggal_baru_lewat' using errcode = 'P0001'; end if;
  if v.tanggal_baru > v_hari + 60 then raise exception 'tanggal_baru_jauh' using errcode = 'P0001'; end if;
  if v.tanggal_baru = v.tanggal_asal and v.jam_baru = j.jam_mulai then raise exception 'sama_dengan_jadwal' using errcode = 'P0001'; end if;
  if v.tanggal_baru <> v.tanggal_asal and (extract(isodow from v.tanggal_baru)::int - 1) = j.hari then raise exception 'hari_slot_sama' using errcode = 'P0001'; end if;
  if exists (select 1 from pindah_jadwal where jadwal_id = v.jadwal_id and (tanggal_asal = v.tanggal_asal or tanggal_baru = v.tanggal_baru)) then raise exception 'sudah_dipindah' using errcode = 'P0001'; end if;
  if exists (select 1 from minta_ganti where jadwal_id = v.jadwal_id and tanggal = v.tanggal_asal and status = 'menunggu') then raise exception 'ada_permintaan_menunggu' using errcode = 'P0001'; end if;
  v_pemegang := public._pemegang(v.jadwal_id, v.tanggal_asal);
  if v_pemegang <> v.pelatih_id then raise exception 'pemegang_berubah' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('ganti:' || v.tenant_id::text));
  if exists (select 1 from sesi where jadwal_id = v.jadwal_id and tanggal = v.tanggal_asal and status in ('hadir', 'izin', 'alpa')) then raise exception 'sudah_diabsen' using errcode = 'P0001'; end if;
  if exists (select 1 from sesi_pengganti where jadwal_id = v.jadwal_id and tanggal = v.tanggal_asal) then raise exception 'ada_pengganti' using errcode = 'P0001'; end if;
  -- bentrok pelatih pemegang di tanggal baru
  if exists (select 1 from public._sesi_pada(v.tenant_id, v.tanggal_baru) s
              where s.pelatih = v_pemegang and not (s.jadwal_id = v.jadwal_id and v.tanggal_baru = v.tanggal_asal)
                and s.jam < v.jam_baru + make_interval(mins => j.durasi_menit) and v.jam_baru < s.jam + make_interval(mins => s.durasi)) then
    raise exception 'pelatih_bentrok' using errcode = 'P0001';
  end if;
  -- bentrok murid tetap sesi ini dengan sesi lain di tanggal baru
  if exists (select 1 from peserta_tetap pt
              join public._sesi_pada(v.tenant_id, v.tanggal_baru) s on s.jadwal_id <> v.jadwal_id
              where pt.jadwal_id = v.jadwal_id
                and s.jam < v.jam_baru + make_interval(mins => j.durasi_menit) and v.jam_baru < s.jam + make_interval(mins => s.durasi)
                and exists (select 1 from public._peserta_sesi(s.jadwal_id, v.tanggal_baru) ps where ps.murid_id = pt.murid_id)) then
    raise exception 'murid_bentrok' using errcode = 'P0001';
  end if;
  -- paket murid tetap tidak boleh berakhir sebelum tanggal baru
  for v_m in
    select pt.murid_id, (select max(mp.berlaku_sampai) from murid_paket mp where mp.murid_id = pt.murid_id and mp.tenant_id = v.tenant_id) as bs
      from peserta_tetap pt join murid m on m.id = pt.murid_id and m.aktif where pt.jadwal_id = v.jadwal_id
  loop
    if v_m.bs is not null and v.tanggal_asal <= v_m.bs and v.tanggal_baru > v_m.bs then raise exception 'paket_berakhir' using errcode = 'P0001'; end if;
  end loop;
  insert into pindah_jadwal (tenant_id, jadwal_id, tanggal_asal, tanggal_baru, jam_baru, tukar_id) values (v.tenant_id, v.jadwal_id, v.tanggal_asal, v.tanggal_baru, v.jam_baru, v.id);
  update tukar_jadwal set status = 'disetujui', diputuskan = v_hari where id = p_id;
end $$;
revoke all on function public.tukar_putuskan(uuid, boolean) from public, anon;
grant execute on function public.tukar_putuskan(uuid, boolean) to authenticated;

-- Owner membatalkan pemindahan yang sudah disetujui (cermin batalkanPindahan). Sesi kembali ke tanggal/jam semula.
create or replace function public.pindah_batalkan(p_jadwal uuid, p_tanggal_asal date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p pindah_jadwal%rowtype; v_tukar jsonb;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into p from pindah_jadwal where jadwal_id = p_jadwal and tanggal_asal = p_tanggal_asal for update;
  if not found then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(p.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if p.tanggal_asal < public._hari_ini() then raise exception 'tanggal_asal_lewat' using errcode = 'P0001'; end if;
  if exists (select 1 from sesi where jadwal_id = p.jadwal_id and tanggal = p.tanggal_baru and status in ('hadir', 'izin', 'alpa')) then raise exception 'sudah_diabsen' using errcode = 'P0001'; end if;
  if exists (select 1 from sesi_pengganti where jadwal_id = p.jadwal_id and tanggal = p.tanggal_baru) then raise exception 'ada_pengganti' using errcode = 'P0001'; end if;
  delete from pindah_jadwal where id = p.id;
  with t as (update tukar_jadwal set status = 'dibatalkan', diputuskan = public._hari_ini() where id = p.tukar_id and status = 'disetujui' returning id)
  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_tukar from t;
  return jsonb_build_object('tukar', v_tukar);
end $$;
revoke all on function public.pindah_batalkan(uuid, date) from public, anon;
grant execute on function public.pindah_batalkan(uuid, date) to authenticated;

-- ===== Sesi pengganti murid (izin diganti sesi di slot/tanggal lain). Cermin lib/sesi.ts jadwalkanPengganti + galatPengganti =====
create or replace function public.pengganti_set(p_dari_jadwal uuid, p_dari_tanggal date, p_murid uuid, p_ke_jadwal uuid, p_ke_tanggal date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_dari jadwal_template%rowtype; v_ke record; v_m murid%rowtype; v_tenant uuid; v_aturan boolean; v_hari date := public._hari_ini();
  v_bs date; v_kat_slot text; v_terisi int; v_kuota int; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v_dari from jadwal_template where id = p_dari_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  v_tenant := v_dari.tenant_id;
  if not is_owner(v_tenant) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  select coalesce((t.pengaturan -> 'aturan' ->> 'sesiPengganti')::boolean, t.kategori not in ('Yoga', 'Pilates')) into v_aturan from tenants t where t.id = v_tenant;
  if not v_aturan then raise exception 'pengganti_nonaktif' using errcode = 'P0001'; end if;
  select * into v_m from murid where id = p_murid and tenant_id = v_tenant;
  if not found then raise exception 'murid_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not v_m.aktif then raise exception 'murid_nonaktif' using errcode = 'P0001'; end if;
  if not exists (select 1 from sesi where jadwal_id = p_dari_jadwal and tanggal = p_dari_tanggal and murid_id = p_murid and status = 'izin') then raise exception 'bukan_izin' using errcode = 'P0001'; end if;
  if exists (select 1 from sesi_pengganti where dari_jadwal_id = p_dari_jadwal and dari_tanggal = p_dari_tanggal and murid_id = p_murid) then raise exception 'sudah_ada_pengganti' using errcode = 'P0001'; end if;
  -- sesi izin ini sendiri bukan sesi pengganti (izin pada sesi pengganti hangus, tidak diganti lagi)
  if exists (select 1 from sesi_pengganti where jadwal_id = p_dari_jadwal and tanggal = p_dari_tanggal and murid_id = p_murid) then raise exception 'sudah_pengganti' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('pengganti:' || v_tenant::text));
  select * into v_ke from public._sesi_pada(v_tenant, p_ke_tanggal) s where s.jadwal_id = p_ke_jadwal;
  if not found then raise exception 'slot_tidak_di_tanggal' using errcode = 'P0001'; end if;
  if p_ke_tanggal < v_hari then raise exception 'tanggal_lewat' using errcode = 'P0001'; end if;
  select max(berlaku_sampai) into v_bs from murid_paket where murid_id = p_murid and tenant_id = v_tenant;
  if v_bs is null or p_ke_tanggal > v_bs then raise exception 'paket_berakhir' using errcode = 'P0001'; end if;
  v_kat_slot := case when v_ke.nama ~* 'dewasa' then 'dewasa' when v_ke.nama ~* 'anak' then 'anak' else null end;
  if v_kat_slot is not null and v_kat_slot <> v_m.kategori then raise exception 'kategori_beda' using errcode = 'P0001'; end if;
  if exists (select 1 from public._peserta_sesi(p_ke_jadwal, p_ke_tanggal) ps where ps.murid_id = p_murid) then raise exception 'sudah_di_sesi' using errcode = 'P0001'; end if;
  -- bentrok dengan sesi lain murid di hari itu (sesi yang ia izin tidak dihitung)
  if exists (select 1 from public._sesi_pada(v_tenant, p_ke_tanggal) s
              where s.jadwal_id <> p_ke_jadwal
                and s.jam < v_ke.jam + make_interval(mins => v_ke.durasi) and v_ke.jam < s.jam + make_interval(mins => s.durasi)
                and exists (select 1 from public._peserta_sesi(s.jadwal_id, p_ke_tanggal) ps where ps.murid_id = p_murid)
                and not exists (select 1 from sesi z where z.jadwal_id = s.jadwal_id and z.tanggal = p_ke_tanggal and z.murid_id = p_murid and z.status = 'izin')) then
    raise exception 'murid_bentrok' using errcode = 'P0001';
  end if;
  select kuota into v_kuota from jadwal_template where id = p_ke_jadwal;
  select count(*) into v_terisi from public._peserta_sesi(p_ke_jadwal, p_ke_tanggal) ps
   where not exists (select 1 from sesi z where z.jadwal_id = p_ke_jadwal and z.tanggal = p_ke_tanggal and z.murid_id = ps.murid_id and z.status = 'izin');
  if v_kuota - v_terisi < 1 then raise exception 'slot_penuh' using errcode = 'P0001'; end if;
  insert into sesi_pengganti (tenant_id, jadwal_id, tanggal, murid_id, dari_jadwal_id, dari_tanggal)
  values (v_tenant, p_ke_jadwal, p_ke_tanggal, p_murid, p_dari_jadwal, p_dari_tanggal) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.pengganti_set(uuid, date, uuid, uuid, date) from public, anon;
grant execute on function public.pengganti_set(uuid, date, uuid, uuid, date) to authenticated;

create or replace function public.pengganti_batal(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p sesi_pengganti%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into p from sesi_pengganti where id = p_id for update;
  if not found then raise exception 'tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(p.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if exists (select 1 from sesi where jadwal_id = p.jadwal_id and tanggal = p.tanggal and murid_id = p.murid_id) then raise exception 'sudah_diabsen' using errcode = 'P0001'; end if;
  delete from sesi_pengganti where id = p_id;
end $$;
revoke all on function public.pengganti_batal(uuid) from public, anon;
grant execute on function public.pengganti_batal(uuid) to authenticated;

-- ===== Absen (menggantikan 0014): sesi tetap, sesi pindahan, dan sesi pengganti; owner ATAU pemegang sesi =====
-- sesi.pengajar_id diisi PEMEGANG sesi pada tanggal itu (pengganti bila ganti sekali). Gaji tidak membaca kolom ini (bagi hasil dari omzet murid).
create or replace function public.absen(p_jadwal uuid, p_tanggal date, p_murid uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare j jadwal_template%rowtype; pj pindah_jadwal%rowtype; v_jam time; v_pemegang uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  select * into pj from pindah_jadwal where jadwal_id = p_jadwal and tanggal_baru = p_tanggal;
  if found then
    v_jam := pj.jam_baru; v_pemegang := public._pemegang(p_jadwal, pj.tanggal_asal);
  else
    if p_tanggal is null or (extract(isodow from p_tanggal)::int - 1) <> j.hari then raise exception 'tanggal_tidak_sesuai' using errcode = 'P0001'; end if;
    if exists (select 1 from pindah_jadwal where jadwal_id = p_jadwal and tanggal_asal = p_tanggal) then raise exception 'sesi_dipindah' using errcode = 'P0001'; end if;
    v_jam := j.jam_mulai; v_pemegang := public._pemegang(p_jadwal, p_tanggal);
  end if;
  if not (is_owner(j.tenant_id) or coalesce(public._pengajar_saya(j.tenant_id) = v_pemegang, false)) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if not (exists (select 1 from peserta_tetap where jadwal_id = p_jadwal and murid_id = p_murid and tenant_id = j.tenant_id)
          or exists (select 1 from sesi_pengganti where jadwal_id = p_jadwal and tanggal = p_tanggal and murid_id = p_murid and tenant_id = j.tenant_id)) then
    raise exception 'bukan_peserta' using errcode = 'P0001';
  end if;
  if p_status is not null and p_status not in ('hadir', 'izin', 'alpa') then raise exception 'status_tidak_valid' using errcode = 'P0001'; end if;
  -- Izin dicabut atau diganti status lain: sesi pengganti yang terkait ikut dibatalkan, kecuali sudah diabsen (cermin lib/sesi.ts tandai).
  if p_status is distinct from 'izin' then
    if exists (select 1 from sesi_pengganti sp join sesi z on z.jadwal_id = sp.jadwal_id and z.tanggal = sp.tanggal and z.murid_id = sp.murid_id
                where sp.dari_jadwal_id = p_jadwal and sp.dari_tanggal = p_tanggal and sp.murid_id = p_murid) then
      raise exception 'pengganti_sudah_diabsen' using errcode = 'P0001';
    end if;
    delete from sesi_pengganti where dari_jadwal_id = p_jadwal and dari_tanggal = p_tanggal and murid_id = p_murid and tenant_id = j.tenant_id;
  end if;
  if p_status is null then
    delete from sesi where jadwal_id = p_jadwal and tanggal = p_tanggal and murid_id = p_murid and tenant_id = j.tenant_id;
    return;
  end if;
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status)
  values (j.tenant_id, p_murid, p_jadwal, v_pemegang, p_tanggal, v_jam, p_status)
  on conflict (jadwal_id, tanggal, murid_id) do update set status = excluded.status, pengajar_id = excluded.pengajar_id, jam_mulai = excluded.jam_mulai;
end $$;
revoke all on function public.absen(uuid, date, uuid, text) from public, anon;
grant execute on function public.absen(uuid, date, uuid, text) to authenticated;
