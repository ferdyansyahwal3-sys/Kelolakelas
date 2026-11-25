-- KelolaKelas 0013: pendaftaran siap dipakai ACC dari database.
-- 1) kolom data murid yang dibutuhkan ACC (usia, nama orang tua), total yang dihitung server, murid hasil ACC;
-- 2) setujui_pendaftaran(): ACC atomik = murid + paket murid + tagihan (memakai tambah_murid) + status 'disetujui';
-- 3) tolak_pendaftaran().
-- Tidak mengubah data yang ada. Status HANYA berubah lewat dua fungsi ini (pemanggil wajib pemilik usaha).

alter table pendaftaran add column if not exists usia int;
alter table pendaftaran add column if not exists nama_ortu text;
alter table pendaftaran add column if not exists total int;
alter table pendaftaran add column if not exists murid_id uuid references murid (id) on delete set null;
alter table pendaftaran add column if not exists diputuskan_pada timestamptz;

alter table pendaftaran drop constraint if exists pendaftaran_nilai_sah;
alter table pendaftaran add constraint pendaftaran_nilai_sah check (
  kategori in ('anak', 'dewasa')
  and char_length(btrim(nama)) between 2 and 60
  and no_wa ~ '^[0-9+]{8,16}$'
  and (usia is null or usia between 1 and 99)
  and (nama_ortu is null or char_length(nama_ortu) <= 60)
  and (total is null or total between 0 and 50000000)
);

create index if not exists pendaftaran_tenant_status on pendaftaran (tenant_id, status, dibuat_pada desc);

create or replace function public.setujui_pendaftaran(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d record;
  pk record;
  mid uuid;
  hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
  mulai date;
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

  -- tagihan pertama yang baru dibuat memakai nominal yang dihitung server saat pendaftaran (bila ada)
  if d.total is not null then
    update tagihan set nominal = d.total where murid_id = mid and tenant_id = d.tenant_id and status = 'belum';
  end if;

  update pendaftaran set status = 'disetujui', murid_id = mid, diputuskan_pada = now() where id = p_id;
  return mid;
end $$;
revoke all on function public.setujui_pendaftaran(uuid) from public, anon;
grant execute on function public.setujui_pendaftaran(uuid) to authenticated;

create or replace function public.tolak_pendaftaran(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into d from pendaftaran where id = p_id for update;
  if not found then raise exception 'pendaftaran_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(d.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if d.status <> 'menunggu' then raise exception 'sudah_diputuskan' using errcode = 'P0001'; end if;
  update pendaftaran set status = 'ditolak', diputuskan_pada = now() where id = p_id;
end $$;
revoke all on function public.tolak_pendaftaran(uuid) from public, anon;
grant execute on function public.tolak_pendaftaran(uuid) to authenticated;
