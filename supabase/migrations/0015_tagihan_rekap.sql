-- KelolaKelas 0015: tagihan (lunas/tolak bukti), pengaturan bagi hasil & gaji, ACC dengan bukti bayar = lunas.
alter table tagihan add column if not exists metode text check (metode in ('tunai', 'transfer', 'qris'));
alter table tagihan add column if not exists catatan text check (catatan is null or char_length(catatan) <= 200);

-- Tandai lunas (pemilik). Hanya tagihan belum lunas; tanggal bayar tidak boleh di masa depan (WIB) dan tidak terlalu lampau.
create or replace function public.tandai_lunas(p_tagihan uuid, p_metode text, p_tanggal date) returns void
language plpgsql security definer set search_path = public as $$
declare t record; hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into t from tagihan where id = p_tagihan for update;
  if not found then raise exception 'tagihan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(t.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if t.status not in ('belum', 'menunggu_verifikasi') then raise exception 'sudah_selesai' using errcode = 'P0001'; end if;
  if p_metode not in ('tunai', 'transfer', 'qris') then raise exception 'metode_tidak_valid' using errcode = 'P0001'; end if;
  if p_tanggal is null or p_tanggal > hari_ini or p_tanggal < hari_ini - 400 then raise exception 'tanggal_tidak_valid' using errcode = 'P0001'; end if;
  update tagihan set status = 'lunas', metode = p_metode, dibayar_pada = (p_tanggal::timestamp at time zone 'Asia/Jakarta'), catatan = null where id = p_tagihan;
end $$;
revoke all on function public.tandai_lunas(uuid, text, date) from public, anon;
grant execute on function public.tandai_lunas(uuid, text, date) to authenticated;

-- Tolak bukti: hanya yang sedang menunggu verifikasi, kembali ke "belum bayar" dengan catatan.
create or replace function public.tolak_bukti(p_tagihan uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select * into t from tagihan where id = p_tagihan for update;
  if not found then raise exception 'tagihan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if not is_owner(t.tenant_id) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if t.status <> 'menunggu_verifikasi' then raise exception 'sudah_selesai' using errcode = 'P0001'; end if;
  update tagihan set status = 'belum', catatan = 'Bukti bayar ditolak, minta kirim ulang.' where id = p_tagihan;
end $$;
revoke all on function public.tolak_bukti(uuid) from public, anon;
grant execute on function public.tolak_bukti(uuid) to authenticated;

-- Simpan satu kunci pengaturan usaha secara atomik (jsonb_set), hanya kunci yang diizinkan.
create or replace function public.set_pengaturan_kunci(p_kunci text, p_nilai jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  if p_kunci not in ('bagiHasil', 'gajiDibayar') then raise exception 'kunci_tidak_diizinkan' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_nilai) <> 'object' or length(p_nilai::text) > 20000 then raise exception 'nilai_tidak_valid' using errcode = 'P0001'; end if;
  select tenant_id into tid from tenant_members where user_id = auth.uid() and role = 'owner' limit 1;
  if tid is null then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  update tenants set pengaturan = jsonb_set(coalesce(pengaturan, '{}'::jsonb), array[p_kunci], p_nilai, true) where id = tid;
end $$;
revoke all on function public.set_pengaturan_kunci(text, jsonb) from public, anon;
grant execute on function public.set_pengaturan_kunci(text, jsonb) to authenticated;

-- ACC: bila pendaftar sudah mengunggah bukti bayar, tagihan pertama langsung LUNAS (transfer) dan buktinya diterima.
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
  if exists (select 1 from pendaftaran_bukti where pendaftaran_id = p_id and tenant_id = d.tenant_id) then
    update tagihan set status = 'lunas', metode = 'transfer', dibayar_pada = now() where murid_id = mid and tenant_id = d.tenant_id and status = 'belum';
    update pendaftaran_bukti set status = 'diterima' where pendaftaran_id = p_id and tenant_id = d.tenant_id;
  end if;
  if d.jadwal_id is not null then
    insert into peserta_tetap (tenant_id, jadwal_id, murid_id) values (d.tenant_id, d.jadwal_id, mid);
  end if;
  update pendaftaran set status = 'disetujui', murid_id = mid, diputuskan_pada = now() where id = p_id;
  return mid;
end $$;
