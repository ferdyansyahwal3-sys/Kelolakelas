-- KelolaKelas 0040 (B5): email opsional murid/pendaftaran + log notifikasi email.
-- Log hanya ditulis server (service role); pemilik boleh membacanya. Kunci unik per usaha = idempotensi (tak kirim ganda).

alter table murid add column if not exists email text;
alter table pendaftaran add column if not exists email text;
alter table murid drop constraint if exists murid_email_cek;
alter table murid add constraint murid_email_cek check (email is null or (length(email) <= 130 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'));
alter table pendaftaran drop constraint if exists pendaftaran_email_cek;
alter table pendaftaran add constraint pendaftaran_email_cek check (email is null or (length(email) <= 130 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'));

create table if not exists notifikasi_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  jenis text not null check (jenis in ('pengingat_tagihan', 'konfirmasi_acc', 'undangan_pelatih')),
  kunci text not null,
  tujuan text not null,
  status text not null check (status in ('terkirim', 'gagal', 'dilewati')),
  galat text,
  tagihan_id uuid,
  pendaftaran_id uuid,
  dibuat_pada timestamptz not null default now(),
  unique (tenant_id, kunci)
);
create index if not exists notifikasi_log_tenant_idx on notifikasi_log (tenant_id, dibuat_pada desc);
alter table notifikasi_log enable row level security;
drop policy if exists notifikasi_log_baca on notifikasi_log;
create policy notifikasi_log_baca on notifikasi_log for select using (is_owner(tenant_id));
revoke all on notifikasi_log from anon;
revoke insert, update, delete on notifikasi_log from authenticated;

-- Pemilik mengisi/mengubah email murid (kosong = hapus).
create or replace function simpan_email_murid(p_murid uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_tenant uuid; v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select tenant_id into v_tenant from murid where id = p_murid;
  if v_tenant is null then raise exception 'murid_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(v_tenant) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  update murid set email = v_email where id = p_murid and tenant_id = v_tenant;
exception when check_violation then raise exception 'email_tidak_valid' using errcode = 'P0001';
end $$;
revoke all on function simpan_email_murid(uuid, text) from public, anon;
grant execute on function simpan_email_murid(uuid, text) to authenticated;

-- ACC menyalin email pendaftar ke murid (satu-satunya perubahan dari versi 0016/0030: baris "update murid set email").
create or replace function setujui_pendaftaran(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare d record; pk record; mid uuid; hari_ini date := (now() at time zone 'Asia/Jakarta')::date; mulai date; lunas boolean := false;
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
  if d.email is not null then
    update murid set email = d.email where id = mid and tenant_id = d.tenant_id;
  end if;
  if d.total is not null then
    update tagihan set nominal = d.total where murid_id = mid and tenant_id = d.tenant_id and status = 'belum';
  end if;
  if exists (select 1 from pendaftaran_bukti where pendaftaran_id = p_id and tenant_id = d.tenant_id) then
    update tagihan set status = 'lunas', metode = 'transfer', dibayar_pada = now() where murid_id = mid and tenant_id = d.tenant_id and status = 'belum';
    update pendaftaran_bukti set status = 'diterima' where pendaftaran_id = p_id and tenant_id = d.tenant_id;
    lunas := true;
  end if;
  if d.jadwal_id is not null then
    insert into peserta_tetap (tenant_id, jadwal_id, murid_id) values (d.tenant_id, d.jadwal_id, mid);
  end if;
  update pendaftaran set status = 'disetujui', murid_id = mid, diputuskan_pada = now() where id = p_id;
  if lunas then perform public.hitung_promo(p_id); end if;
  return mid;
end $$;
revoke all on function setujui_pendaftaran(uuid) from public, anon;
grant execute on function setujui_pendaftaran(uuid) to authenticated;
