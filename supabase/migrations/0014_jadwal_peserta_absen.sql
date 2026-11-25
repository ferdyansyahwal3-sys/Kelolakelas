-- KelolaKelas 0014: jadwal tetap, peserta tetap per slot, absensi.
-- 1) jadwal_template: CHECK nilai + batas slot per paket langganan (trigger) + kuota tidak boleh di bawah peserta;
-- 2) peserta_tetap: murid yang terdaftar tetap di satu slot (kuota dijaga trigger, hapus slot berpeserta ditolak FK);
-- 3) sesi: satu baris per (slot, tanggal, murid) + fungsi absen() atomik;
-- 4) setujui_pendaftaran() ikut mendaftarkan murid ke slot pilihannya (ditolak 'slot_penuh' bila sudah penuh).

alter table jadwal_template drop constraint if exists jadwal_nilai_sah;
alter table jadwal_template add constraint jadwal_nilai_sah check (
  kuota between 1 and 30 and durasi_menit between 15 and 240
  and char_length(btrim(nama)) between 2 and 60 and (lokasi is null or char_length(lokasi) <= 60)
);
alter table jadwal_template add constraint jadwal_id_tenant_unik unique (id, tenant_id);

create or replace function public.batasi_slot() returns trigger
language plpgsql security definer set search_path = public as $$
declare batas int; ditemukan boolean; jumlah int;
begin
  perform pg_advisory_xact_lock(hashtext('slot:' || new.tenant_id::text));
  select true, b.slot into ditemukan, batas from subscriptions s join plan_batas b on b.plan = s.plan where s.tenant_id = new.tenant_id;
  if ditemukan is not true then raise exception 'langganan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if batas is null then return new; end if;
  select count(*) into jumlah from jadwal_template where tenant_id = new.tenant_id;
  if jumlah >= batas then raise exception 'batas_slot' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.batasi_slot() from public, anon, authenticated;
drop trigger if exists jadwal_batas_slot on jadwal_template;
create trigger jadwal_batas_slot before insert on jadwal_template for each row execute function public.batasi_slot();

create table if not exists peserta_tetap (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null,
  murid_id uuid not null,
  dibuat_pada timestamptz not null default now(),
  unique (jadwal_id, murid_id),
  foreign key (jadwal_id, tenant_id) references jadwal_template (id, tenant_id), -- tanpa cascade: slot berpeserta tidak bisa dihapus
  foreign key (murid_id, tenant_id) references murid (id, tenant_id) on delete cascade
);
create index if not exists peserta_tetap_jadwal on peserta_tetap (tenant_id, jadwal_id);
alter table peserta_tetap enable row level security;
create policy peserta_baca on peserta_tetap for select using (is_member(tenant_id));
create policy peserta_owner on peserta_tetap for all using (is_owner(tenant_id)) with check (is_owner(tenant_id));

create or replace function public.jaga_kuota_peserta() returns trigger
language plpgsql security definer set search_path = public as $$
declare kuota_slot int; jumlah int;
begin
  select kuota into kuota_slot from jadwal_template where id = new.jadwal_id for update; -- serialkan pendaftar bersamaan
  select count(*) into jumlah from peserta_tetap where jadwal_id = new.jadwal_id;
  if jumlah >= kuota_slot then raise exception 'slot_penuh' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.jaga_kuota_peserta() from public, anon, authenticated;
drop trigger if exists peserta_jaga_kuota on peserta_tetap;
create trigger peserta_jaga_kuota before insert on peserta_tetap for each row execute function public.jaga_kuota_peserta();

create or replace function public.jaga_kuota_turun() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kuota < (select count(*) from peserta_tetap where jadwal_id = new.id) then raise exception 'kuota_di_bawah_peserta' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.jaga_kuota_turun() from public, anon, authenticated;
drop trigger if exists jadwal_kuota_turun on jadwal_template;
create trigger jadwal_kuota_turun before update of kuota on jadwal_template for each row execute function public.jaga_kuota_turun();

-- sesi: satu baris per (slot, tanggal, murid)
alter table sesi drop constraint if exists sesi_unik;
alter table sesi add constraint sesi_unik unique (jadwal_id, tanggal, murid_id);

-- Absen atomik (pemilik). p_status null = batalkan absen (baris dihapus). Murid harus peserta tetap slot itu; tanggal harus jatuh di hari slot.
create or replace function public.absen(p_jadwal uuid, p_tanggal date, p_murid uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare j record;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(j.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if p_tanggal is null or (extract(isodow from p_tanggal)::int - 1) <> j.hari then raise exception 'tanggal_tidak_sesuai' using errcode = 'P0001'; end if;
  if not exists (select 1 from peserta_tetap where jadwal_id = p_jadwal and murid_id = p_murid and tenant_id = j.tenant_id) then raise exception 'bukan_peserta' using errcode = 'P0001'; end if;
  if p_status is null then
    delete from sesi where jadwal_id = p_jadwal and tanggal = p_tanggal and murid_id = p_murid and tenant_id = j.tenant_id;
    return;
  end if;
  if p_status not in ('hadir', 'izin', 'alpa') then raise exception 'status_tidak_valid' using errcode = 'P0001'; end if;
  insert into sesi (tenant_id, murid_id, jadwal_id, pengajar_id, tanggal, jam_mulai, status)
  values (j.tenant_id, p_murid, p_jadwal, j.pengajar_id, p_tanggal, j.jam_mulai, p_status)
  on conflict (jadwal_id, tanggal, murid_id) do update set status = excluded.status;
end $$;
revoke all on function public.absen(uuid, date, uuid, text) from public, anon;
grant execute on function public.absen(uuid, date, uuid, text) to authenticated;

-- ACC juga mendaftarkan murid ke slot pilihannya
create or replace function public.setujui_pendaftaran(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare d record; pk record; mid uuid; hari_ini date := (now() at time zone 'Asia/Jakarta')::date; mulai date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into d from pendaftaran where id = p_id for update;
  if not found then raise exception 'pendaftaran_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(d.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if d.status <> 'menunggu' then raise exception 'sudah_diputuskan' using errcode = 'P0001'; end if;
  if d.paket_id is null then raise exception 'paket_tidak_ditemukan' using errcode = 'P0001'; end if;
  select * into pk from paket where id = d.paket_id and tenant_id = d.tenant_id;
  if not found then raise exception 'paket_tidak_ditemukan' using errcode = 'P0001'; end if;

  mulai := least(greatest(coalesce(d.tanggal_mulai, hari_ini), hari_ini), hari_ini + 180);
  mid := public.tambah_murid(d.nama, d.kategori, d.usia, d.nama_ortu, d.no_wa, d.paket_id, mulai, d.pengajar_id);
  if d.total is not null then
    update tagihan set nominal = d.total where murid_id = mid and tenant_id = d.tenant_id and status = 'belum';
  end if;
  if d.jadwal_id is not null then
    insert into peserta_tetap (tenant_id, jadwal_id, murid_id) values (d.tenant_id, d.jadwal_id, mid);
  end if;
  update pendaftaran set status = 'disetujui', murid_id = mid, diputuskan_pada = now() where id = p_id;
  return mid;
end $$;
