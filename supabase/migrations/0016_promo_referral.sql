-- KelolaKelas 0016: promo aktif/nonaktif + referral per murid + pemakaian dihitung SAAT TAGIHAN LUNAS (sekali per pendaftaran).
alter table promo add column if not exists aktif boolean not null default true;
alter table promo add column if not exists murid_id uuid;
alter table promo drop constraint if exists promo_murid_fk;
alter table promo add constraint promo_murid_fk foreign key (murid_id, tenant_id) references murid (id, tenant_id) on delete cascade;
alter table promo drop constraint if exists promo_nilai_sah;
alter table promo add constraint promo_nilai_sah check (
  kode ~ '^[A-Z0-9]{3,16}$'
  and ((jenis = 'persen' and nilai <= 100) or (jenis = 'nominal' and nilai between 1000 and 10000000))
  and (kuota is null or kuota between 1 and 10000)
);
alter table pendaftaran add column if not exists promo_dihitung boolean not null default false;

create or replace function public.hitung_promo(p_pendaftaran uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select * into d from pendaftaran where id = p_pendaftaran for update;
  if not found or d.kode_promo is null or d.promo_dihitung then return; end if;
  update promo set terpakai = terpakai + 1 where tenant_id = d.tenant_id and kode = d.kode_promo and (kuota is null or terpakai < kuota);
  update pendaftaran set promo_dihitung = true where id = p_pendaftaran;
end $$;
revoke all on function public.hitung_promo(uuid) from public, anon, authenticated;

-- tandai_lunas dan setujui_pendaftaran: versi terbaru (memanggil hitung_promo). Sama persis dengan database.
create or replace function public.tandai_lunas(p_tagihan uuid, p_metode text, p_tanggal date) returns void
language plpgsql security definer set search_path = public as $$
declare t record; hari_ini date := (now() at time zone 'Asia/Jakarta')::date; pid uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into t from tagihan where id = p_tagihan for update;
  if not found then raise exception 'tagihan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(t.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if t.status not in ('belum', 'menunggu_verifikasi') then raise exception 'sudah_selesai' using errcode = 'P0001'; end if;
  if p_metode not in ('tunai', 'transfer', 'qris') then raise exception 'metode_tidak_valid' using errcode = 'P0001'; end if;
  if p_tanggal is null or p_tanggal > hari_ini or p_tanggal < hari_ini - 400 then raise exception 'tanggal_tidak_valid' using errcode = 'P0001'; end if;
  update tagihan set status = 'lunas', metode = p_metode, dibayar_pada = (p_tanggal::timestamp at time zone 'Asia/Jakarta'), catatan = null where id = p_tagihan;
  select id into pid from pendaftaran where murid_id = t.murid_id and tenant_id = t.tenant_id and status = 'disetujui' order by dibuat_pada limit 1;
  if pid is not null then perform public.hitung_promo(pid); end if;
end $$;

create or replace function public.setujui_pendaftaran(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
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
revoke all on function public.tandai_lunas(uuid, text, date) from public, anon;
grant execute on function public.tandai_lunas(uuid, text, date) to authenticated, service_role;
revoke all on function public.setujui_pendaftaran(uuid) from public, anon;
grant execute on function public.setujui_pendaftaran(uuid) to authenticated, service_role;
