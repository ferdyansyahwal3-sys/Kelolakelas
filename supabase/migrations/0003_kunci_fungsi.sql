-- Fungsi bantu RLS hanya untuk pengguna login; pengunjung anonim tidak perlu memanggilnya.
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;

-- Trigger batas rekening: kunci search_path.
create or replace function public.batasi_rekening() returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.rekening_usaha where tenant_id = new.tenant_id) >= 5 then
    raise exception 'Maksimal 5 rekening per usaha';
  end if;
  return new;
end $$;
