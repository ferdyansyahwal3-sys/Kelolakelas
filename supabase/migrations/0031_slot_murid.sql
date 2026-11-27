-- KelolaKelas 0031 (B4): murid <-> slot dari panel owner: tambah murid + slot (atomik), pasang, pindah, lepas.
-- Sesi mendatang: baris `sesi` berstatus terjadwal/izin di slot lama dari hari ini dihapus (riwayat hadir/alpa tetap).

-- Pemeriksaan bersama (bukan titik masuk; tidak bisa dipanggil klien). Mengembalikan tenant_id slot.
create or replace function public._cek_slot_murid(p_murid uuid, p_jadwal uuid, p_kecuali uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare j record; m record;
begin
  select * into j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(j.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  select * into m from murid where id = p_murid and tenant_id = j.tenant_id;
  if not found then raise exception 'murid_tidak_ditemukan' using errcode = 'P0001'; end if;
  if m.aktif is not true then raise exception 'murid_nonaktif' using errcode = 'P0001'; end if;
  if exists (select 1 from peserta_tetap where jadwal_id = p_jadwal and murid_id = p_murid) then raise exception 'sudah_di_slot' using errcode = 'P0001'; end if;
  if exists (
    select 1 from peserta_tetap pt join jadwal_template x on x.id = pt.jadwal_id
    where pt.murid_id = p_murid and pt.tenant_id = j.tenant_id and (p_kecuali is null or pt.jadwal_id <> p_kecuali)
      and x.hari = j.hari and x.jam_mulai < j.jam_mulai + make_interval(mins => j.durasi_menit) and j.jam_mulai < x.jam_mulai + make_interval(mins => x.durasi_menit)
  ) then raise exception 'murid_bentrok' using errcode = 'P0001'; end if;
  return j.tenant_id;
end $$;
revoke all on function public._cek_slot_murid(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.pasang_slot_murid(p_murid uuid, p_jadwal uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtext('slotmurid:' || p_murid::text));
  v_tenant := public._cek_slot_murid(p_murid, p_jadwal, null);
  insert into peserta_tetap (tenant_id, jadwal_id, murid_id) values (v_tenant, p_jadwal, p_murid); -- trigger menolak 'slot_penuh'
end $$;
revoke all on function public.pasang_slot_murid(uuid, uuid) from public, anon;
grant execute on function public.pasang_slot_murid(uuid, uuid) to authenticated;

create or replace function public.lepas_slot_murid(p_murid uuid, p_jadwal uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j record; hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into j from jadwal_template where id = p_jadwal;
  if not found then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(j.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('slotmurid:' || p_murid::text));
  delete from peserta_tetap where jadwal_id = p_jadwal and murid_id = p_murid and tenant_id = j.tenant_id;
  if not found then raise exception 'bukan_peserta' using errcode = 'P0001'; end if;
  delete from sesi where jadwal_id = p_jadwal and murid_id = p_murid and tenant_id = j.tenant_id and tanggal >= hari_ini and status in ('terjadwal', 'izin');
end $$;
revoke all on function public.lepas_slot_murid(uuid, uuid) from public, anon;
grant execute on function public.lepas_slot_murid(uuid, uuid) to authenticated;

create or replace function public.pindah_slot_murid(p_murid uuid, p_dari uuid, p_ke uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tenant uuid; hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  if p_dari = p_ke then raise exception 'slot_sama' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('slotmurid:' || p_murid::text));
  if not exists (select 1 from peserta_tetap where jadwal_id = p_dari and murid_id = p_murid) then raise exception 'bukan_peserta' using errcode = 'P0001'; end if;
  v_tenant := public._cek_slot_murid(p_murid, p_ke, p_dari);
  if not exists (select 1 from jadwal_template where id = p_dari and tenant_id = v_tenant) then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
  insert into peserta_tetap (tenant_id, jadwal_id, murid_id) values (v_tenant, p_ke, p_murid); -- 'slot_penuh' bila penuh; seluruh fungsi batal
  delete from peserta_tetap where jadwal_id = p_dari and murid_id = p_murid and tenant_id = v_tenant;
  delete from sesi where jadwal_id = p_dari and murid_id = p_murid and tenant_id = v_tenant and tanggal >= hari_ini and status in ('terjadwal', 'izin');
end $$;
revoke all on function public.pindah_slot_murid(uuid, uuid, uuid) from public, anon;
grant execute on function public.pindah_slot_murid(uuid, uuid, uuid) to authenticated;

-- Murid baru + paket + tagihan + (opsional) slot dalam satu transaksi.
create or replace function public.tambah_murid_slot(
  p_nama text, p_kategori text, p_usia int, p_nama_ortu text, p_no_wa text,
  p_paket_id uuid, p_mulai date, p_pengajar_id uuid, p_jadwal uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_murid uuid; v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  v_murid := public.tambah_murid(p_nama, p_kategori, p_usia, p_nama_ortu, p_no_wa, p_paket_id, p_mulai, p_pengajar_id);
  if p_jadwal is not null then
    v_tenant := public._cek_slot_murid(v_murid, p_jadwal, null);
    if v_tenant is distinct from (select tenant_id from murid where id = v_murid) then raise exception 'slot_tidak_ditemukan' using errcode = 'P0001'; end if;
    insert into peserta_tetap (tenant_id, jadwal_id, murid_id) values (v_tenant, p_jadwal, v_murid);
  end if;
  return v_murid;
end $$;
revoke all on function public.tambah_murid_slot(text, text, int, text, text, uuid, date, uuid, uuid) from public, anon;
grant execute on function public.tambah_murid_slot(text, text, int, text, text, uuid, date, uuid, uuid) to authenticated;
