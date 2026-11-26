-- KelolaKelas 0022 (B3a): ganti pelatih SEKALI untuk satu sesi (slot + tanggal), disimpan di database.
-- Baris = "pada tanggal ini slot ini dipegang pelatih X". Tanpa baris = pelatih tetap slot. Tulis hanya lewat ganti_pelatih_set (pemilik).

create table if not exists ganti_pelatih (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  jadwal_id uuid not null,
  tanggal date not null,
  pengajar_id uuid not null,
  dibuat_pada timestamptz not null default now(),
  unique (jadwal_id, tanggal),
  foreign key (jadwal_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade,
  foreign key (pengajar_id, tenant_id) references pengajar (id, tenant_id) on delete cascade
);
create index if not exists ganti_pelatih_tenant on ganti_pelatih (tenant_id, tanggal);
alter table ganti_pelatih enable row level security;
create policy ganti_baca on ganti_pelatih for select using (is_member(tenant_id));
-- Sengaja tanpa policy tulis: perubahan hanya lewat fungsi di bawah.

-- p_pengajar null atau = pelatih tetap slot => penggantian dihapus. Aturan sama dengan lib/sesi.ts gantiPelatih (diulang di server).
create or replace function public.ganti_pelatih_set(p_jadwal uuid, p_tanggal date, p_pengajar uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_j jadwal_template%rowtype;
  v_hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
  v_nama text; v_tabrak text;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into v_j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(v_j.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if p_tanggal is null or (extract(isodow from p_tanggal)::int - 1) <> v_j.hari then raise exception 'tanggal_tidak_sesuai' using errcode = 'P0001'; end if;
  if p_tanggal < v_hari_ini then raise exception 'sesi_lewat' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('ganti:' || v_j.tenant_id::text));

  if p_pengajar is null or p_pengajar = v_j.pengajar_id then
    delete from ganti_pelatih where jadwal_id = p_jadwal and tanggal = p_tanggal and tenant_id = v_j.tenant_id;
    return;
  end if;
  select nama into v_nama from pengajar where id = p_pengajar and tenant_id = v_j.tenant_id and aktif;
  if v_nama is null then raise exception 'pelatih_tidak_ditemukan' using errcode = 'P0001'; end if;
  select s2.nama into v_tabrak from jadwal_template s2
   where s2.tenant_id = v_j.tenant_id and s2.id <> v_j.id and s2.hari = v_j.hari
     and coalesce((select g.pengajar_id from ganti_pelatih g where g.jadwal_id = s2.id and g.tanggal = p_tanggal), s2.pengajar_id) = p_pengajar
     and s2.jam_mulai < v_j.jam_mulai + make_interval(mins => v_j.durasi_menit)
     and v_j.jam_mulai < s2.jam_mulai + make_interval(mins => s2.durasi_menit)
   limit 1;
  if v_tabrak is not null then raise exception 'pelatih_bentrok' using errcode = 'P0001'; end if;
  insert into ganti_pelatih (tenant_id, jadwal_id, tanggal, pengajar_id) values (v_j.tenant_id, p_jadwal, p_tanggal, p_pengajar)
  on conflict (jadwal_id, tanggal) do update set pengajar_id = excluded.pengajar_id;
end $$;
revoke all on function public.ganti_pelatih_set(uuid, date, uuid) from public, anon;
grant execute on function public.ganti_pelatih_set(uuid, date, uuid) to authenticated;
