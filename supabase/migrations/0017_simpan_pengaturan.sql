-- KelolaKelas 0017: simpan_pengaturan(): profil, istilah, aturan, templat WA, tema, alamat, dan rekening dalam SATU transaksi (pemilik saja).
create or replace function public.simpan_pengaturan(p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  tid uuid; sekarang record; r jsonb; rid uuid; ids uuid[] := '{}'; batas int; slug_baru text;
begin
  if auth.uid() is null then raise exception 'Masuk dulu' using errcode = '28000'; end if;
  select tenant_id into tid from tenant_members where user_id = auth.uid() and role = 'owner' limit 1;
  if tid is null then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 60000 then raise exception 'data_tidak_valid' using errcode = 'P0001'; end if;
  select * into sekarang from tenants where id = tid for update;

  slug_baru := coalesce(nullif(p_data->>'slug', ''), sekarang.slug);
  if slug_baru <> sekarang.slug and not public.alamat_tersedia(slug_baru) then raise exception 'alamat_tidak_tersedia' using errcode = 'P0001'; end if;

  update tenants set
    nama = btrim(p_data->>'nama'), slug = slug_baru, kategori = p_data->>'kategori', tema = p_data->>'tema', istilah = p_data->'istilah',
    pengaturan = jsonb_set(jsonb_set(jsonb_set(coalesce(pengaturan, '{}'::jsonb), '{profil}', coalesce(pengaturan->'profil', '{}'::jsonb) || coalesce(p_data->'profil', '{}'::jsonb)), '{aturan}', coalesce(p_data->'aturan', '{}'::jsonb)), '{templat}', coalesce(p_data->'templat', '{}'::jsonb))
  where id = tid;

  select b.rekening into batas from subscriptions s join plan_batas b on b.plan = s.plan where s.tenant_id = tid;
  if batas is not null and jsonb_array_length(coalesce(p_data->'rekening', '[]'::jsonb)) > batas then raise exception 'batas_rekening' using errcode = 'P0001'; end if;

  for r in select * from jsonb_array_elements(coalesce(p_data->'rekening', '[]'::jsonb)) loop
    rid := null;
    if (r->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into rid from rekening_usaha where id = (r->>'id')::uuid and tenant_id = tid;
    end if;
    if rid is not null then
      update rekening_usaha set bank = btrim(r->>'bank'), nomor = regexp_replace(r->>'nomor', '[\s-]', '', 'g'), atas_nama = btrim(r->>'atasNama') where id = rid;
    else
      insert into rekening_usaha (tenant_id, bank, nomor, atas_nama) values (tid, btrim(r->>'bank'), regexp_replace(r->>'nomor', '[\s-]', '', 'g'), btrim(r->>'atasNama')) returning id into rid;
    end if;
    ids := ids || rid;
  end loop;
  delete from rekening_usaha where tenant_id = tid and not (id = any (ids));
exception
  when unique_violation then raise exception 'alamat_tidak_tersedia' using errcode = 'P0001';
  when check_violation or not_null_violation or invalid_text_representation then raise exception 'data_tidak_valid' using errcode = 'P0001';
end $$;
revoke all on function public.simpan_pengaturan(jsonb) from public, anon;
grant execute on function public.simpan_pengaturan(jsonb) to authenticated;
