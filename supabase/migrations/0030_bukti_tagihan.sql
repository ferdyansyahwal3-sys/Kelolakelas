-- KelolaKelas 0030 (B4): murid mengunggah bukti bayar TAGIHAN dari portal pribadinya.
-- Berkas di bucket privat `bukti-bayar`, path <tenant>/tagihan/<tagihan>/<uuid>.<ext>. Insert hanya lewat fungsi (service role).
alter table tagihan drop constraint if exists tagihan_id_tenant_unik;
alter table tagihan add constraint tagihan_id_tenant_unik unique (id, tenant_id);

create table if not exists tagihan_bukti (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  tagihan_id uuid not null,
  rekening_id uuid references rekening_usaha (id) on delete set null,
  berkas_path text not null,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  ukuran int not null check (ukuran > 0 and ukuran <= 5242880),
  diunggah_pada timestamptz not null default now(),
  foreign key (tagihan_id, tenant_id) references tagihan (id, tenant_id) on delete cascade
);
create index if not exists tagihan_bukti_tagihan on tagihan_bukti (tenant_id, tagihan_id);
alter table tagihan_bukti enable row level security;
drop policy if exists tagihan_bukti_baca on tagihan_bukti;
create policy tagihan_bukti_baca on tagihan_bukti for select using (is_member(tenant_id));
-- tanpa policy tulis: hanya fungsi di bawah.

-- Dipanggil server (service role) setelah token portal terbukti sah. Tagihan harus milik murid itu, masih 'belum'.
create or replace function public.kirim_bukti_tagihan(p_tenant uuid, p_murid uuid, p_tagihan uuid, p_rekening uuid, p_path text, p_mime text, p_ukuran int) returns void
language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select * into t from tagihan where id = p_tagihan and tenant_id = p_tenant and murid_id = p_murid for update;
  if not found then raise exception 'tagihan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if t.status <> 'belum' then raise exception 'tagihan_tidak_menunggu_bayar' using errcode = 'P0001'; end if;
  if not exists (select 1 from rekening_usaha where id = p_rekening and tenant_id = p_tenant) then raise exception 'rekening_tidak_valid' using errcode = 'P0001'; end if;
  if left(p_path, length(p_tenant::text) + 1) <> p_tenant::text || '/' then raise exception 'path_tidak_valid' using errcode = 'P0001'; end if;
  insert into tagihan_bukti (tenant_id, tagihan_id, rekening_id, berkas_path, mime, ukuran) values (p_tenant, p_tagihan, p_rekening, p_path, p_mime, p_ukuran);
  update tagihan set status = 'menunggu_verifikasi', metode = 'transfer', bukti_url = p_path, catatan = null where id = p_tagihan;
end $$;
revoke all on function public.kirim_bukti_tagihan(uuid, uuid, uuid, uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.kirim_bukti_tagihan(uuid, uuid, uuid, uuid, text, text, int) to service_role;
