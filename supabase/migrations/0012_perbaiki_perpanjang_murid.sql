-- 0012: perbaikan 0011. Variabel plpgsql `mulai`/`pengajar` bentrok dengan nama kolom (galat 'ambiguous'); diganti awalan v_. Logika tidak berubah.
create or replace function public.perpanjang_murid(p_murid_id uuid, p_paket_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m record;
  pk record;
  v_terakhir date;
  v_pengajar uuid;
  v_mulai date;
  v_mp uuid;
  hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into m from murid where id = p_murid_id;
  if not found then raise exception 'murid_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(m.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if m.aktif is not true then raise exception 'murid_nonaktif' using errcode = 'P0001'; end if;

  select * into pk from paket where id = p_paket_id and tenant_id = m.tenant_id;
  if not found then raise exception 'paket_tidak_ditemukan' using errcode = 'P0001'; end if;
  if pk.aktif is not true then raise exception 'paket_nonaktif' using errcode = 'P0001'; end if;
  if pk.kategori <> m.kategori then raise exception 'kategori_tidak_cocok' using errcode = 'P0001'; end if;

  -- Satu murid satu pemakaian sekaligus: kunci per murid, dan tolak bila perpanjangan sebelumnya belum mulai (klik ganda).
  perform pg_advisory_xact_lock(hashtext('perpanjang:' || m.id::text));
  if exists (select 1 from murid_paket where murid_id = m.id and (mulai > hari_ini or dibuat_pada > now() - interval '30 seconds')) then
    raise exception 'sudah_diperpanjang' using errcode = 'P0001';
  end if;

  select berlaku_sampai, pengajar_id into v_terakhir, v_pengajar
  from murid_paket where murid_id = m.id order by berlaku_sampai desc, mulai desc limit 1;
  v_mulai := greatest(hari_ini, coalesce(v_terakhir, hari_ini));

  insert into murid_paket (tenant_id, murid_id, paket_id, jumlah_sesi, mulai, berlaku_sampai, pengajar_id)
  values (m.tenant_id, m.id, pk.id, pk.jumlah_sesi, v_mulai, v_mulai + pk.masa_berlaku_hari, v_pengajar)
  returning id into v_mp;

  insert into tagihan (tenant_id, murid_id, paket_id, nominal, status, jatuh_tempo)
  values (m.tenant_id, m.id, pk.id, pk.harga, 'belum', hari_ini + 7);

  return v_mp;
end $$;
revoke all on function public.perpanjang_murid(uuid, uuid) from public, anon;
grant execute on function public.perpanjang_murid(uuid, uuid) to authenticated;
