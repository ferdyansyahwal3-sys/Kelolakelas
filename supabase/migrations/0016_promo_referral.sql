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

-- tandai_lunas dan setujui_pendaftaran dipanggil ulang dengan perubahan kecil:
--   tandai_lunas   : setelah menandai lunas -> hitung_promo(pendaftaran disetujui milik murid itu)
--   setujui_pendaftaran : bila tagihan langsung lunas (ada bukti) -> hitung_promo(p_id)
-- (definisi lengkap fungsi-fungsi itu ada di database; lihat 0015 untuk badan dasarnya.)
