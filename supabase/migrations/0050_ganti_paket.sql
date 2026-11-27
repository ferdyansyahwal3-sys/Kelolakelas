-- KelolaKelas 0050 (B7): ganti paket dan pindah jenis (Guru Les <-> Agensi) dari panel, turun paket tanpa menonaktifkan diam-diam.
--   1. batasi_rekening: batas ikut paket (plan_batas.rekening), bukan angka 5 tetap.
--   2. langganan_riwayat: catatan tiap pergantian paket (bahan hitung selisih bayar di B6). Hanya dibaca pemilik, ditulis lewat fungsi.
--   3. pemakaian_paket(): jumlah pemakaian saat ini (murid aktif, slot, paket jual aktif, pelatih, rekening) untuk pemilik.
--   4. ganti_paket(p_plan): ganti paket (+ jenis usaha bila beda jenis). DITOLAK bila pemakaian melebihi batas paket tujuan;
--      yang dikembalikan daftar kelebihan, tidak ada data yang dinonaktifkan/dihapus oleh fungsi ini.
-- Pembayaran belum diproses (B6): pergantian langsung berlaku, selisih menyusul.

-- 1. Batas rekening mengikuti paket. Kunci advisory 'rekening:' dipakai juga oleh ganti_paket supaya tidak ada balapan.
create or replace function public.batasi_rekening() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  batas int;
  ditemukan boolean;
  jumlah int;
begin
  perform pg_advisory_xact_lock(hashtext('rekening:' || new.tenant_id::text));
  select true, b.rekening into ditemukan, batas
  from subscriptions s join plan_batas b on b.plan = s.plan
  where s.tenant_id = new.tenant_id;
  if ditemukan is not true then raise exception 'langganan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if batas is null then return new; end if;
  select count(*) into jumlah from rekening_usaha where tenant_id = new.tenant_id;
  if jumlah >= batas then raise exception 'batas_rekening' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.batasi_rekening() from public, anon, authenticated;

-- 2. Riwayat pergantian paket.
create table if not exists langganan_riwayat (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  dari_plan text not null,
  ke_plan text not null,
  dari_jenis text not null,
  ke_jenis text not null,
  oleh uuid references auth.users(id) on delete set null,
  dibuat_pada timestamptz not null default now()
);
create index if not exists langganan_riwayat_tenant on langganan_riwayat (tenant_id, dibuat_pada desc);
alter table langganan_riwayat enable row level security;
drop policy if exists langganan_riwayat_baca on langganan_riwayat;
create policy langganan_riwayat_baca on langganan_riwayat for select to authenticated using (is_owner(tenant_id));

-- 3. Pemakaian saat ini. pelatih_lain = pelatih aktif selain milik pemilik sendiri (yang harus 0 bila pindah ke Guru Les).
create or replace function public.pemakaian_paket() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  tid uuid;
begin
  if uid is null then raise exception 'tidak_masuk' using errcode = 'P0001'; end if;
  select m.tenant_id into tid from tenant_members m where m.user_id = uid and m.role = 'owner' limit 1;
  if tid is null or not is_owner(tid) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'murid', (select count(*) from murid where tenant_id = tid and aktif),
    'slot', (select count(*) from jadwal_template where tenant_id = tid),
    'paketJual', (select count(*) from paket where tenant_id = tid and aktif),
    'pelatih', (select count(*) from pengajar where tenant_id = tid and aktif),
    'pelatihLain', (select count(*) from pengajar where tenant_id = tid and aktif and user_id is distinct from uid),
    'rekening', (select count(*) from rekening_usaha where tenant_id = tid)
  );
end $$;
revoke all on function public.pemakaian_paket() from public, anon;
grant execute on function public.pemakaian_paket() to authenticated;

-- 4. Ganti paket. Mengembalikan {ok:true, plan, jenis, berubah} atau {ok:false, galat:'melebihi_batas', kelebihan:[{kunci, pakai, batas, lebih}]}.
create or replace function public.ganti_paket(p_plan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  tid uuid;
  plan_lama text;
  jenis_lama text;
  jenis_baru text;
  b plan_batas%rowtype;
  n_murid int; n_slot int; n_paket int; n_pelatih int; n_lain int; n_rek int;
  lebih jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'tidak_masuk' using errcode = 'P0001'; end if;
  select m.tenant_id into tid from tenant_members m where m.user_id = uid and m.role = 'owner' limit 1;
  if tid is null or not is_owner(tid) then raise exception 'bukan_pemilik' using errcode = 'P0001'; end if;

  select * into b from plan_batas where plan = p_plan;
  if not found then raise exception 'paket_tidak_dikenal' using errcode = 'P0001'; end if;
  jenis_baru := case when p_plan like 'guru\_%' then 'guru_les' else 'agensi' end;

  -- Kunci yang sama dengan trigger batas (tambah murid/slot/paket/pelatih/rekening), supaya tak ada tambahan menyelip saat dicek.
  perform pg_advisory_xact_lock(hashtext('murid_aktif:' || tid::text));
  perform pg_advisory_xact_lock(hashtext('slot:' || tid::text));
  perform pg_advisory_xact_lock(hashtext('paket_jual:' || tid::text));
  perform pg_advisory_xact_lock(hashtext('pelatih:' || tid::text));
  perform pg_advisory_xact_lock(hashtext('rekening:' || tid::text));

  select s.plan, t.jenis into plan_lama, jenis_lama
  from subscriptions s join tenants t on t.id = s.tenant_id where s.tenant_id = tid for update of s;
  if plan_lama is null then raise exception 'langganan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if plan_lama = p_plan then raise exception 'paket_sama' using errcode = 'P0001'; end if;

  select count(*) into n_murid from murid where tenant_id = tid and aktif;
  select count(*) into n_slot from jadwal_template where tenant_id = tid;
  select count(*) into n_paket from paket where tenant_id = tid and aktif;
  select count(*) into n_pelatih from pengajar where tenant_id = tid and aktif;
  select count(*) into n_lain from pengajar where tenant_id = tid and aktif and user_id is distinct from uid;
  select count(*) into n_rek from rekening_usaha where tenant_id = tid;

  if b.murid is not null and n_murid > b.murid then
    lebih := lebih || jsonb_build_object('kunci', 'murid', 'pakai', n_murid, 'batas', b.murid, 'lebih', n_murid - b.murid);
  end if;
  if b.slot is not null and n_slot > b.slot then
    lebih := lebih || jsonb_build_object('kunci', 'slot', 'pakai', n_slot, 'batas', b.slot, 'lebih', n_slot - b.slot);
  end if;
  if b.paket_jual is not null and n_paket > b.paket_jual then
    lebih := lebih || jsonb_build_object('kunci', 'paketJual', 'pakai', n_paket, 'batas', b.paket_jual, 'lebih', n_paket - b.paket_jual);
  end if;
  if b.rekening is not null and n_rek > b.rekening then
    lebih := lebih || jsonb_build_object('kunci', 'rekening', 'pakai', n_rek, 'batas', b.rekening, 'lebih', n_rek - b.rekening);
  end if;
  if jenis_baru = 'guru_les' then
    -- Guru Les = pelatih tunggal (diri sendiri): semua pelatih aktif lain harus sudah dinonaktifkan pemilik.
    if n_lain > 0 then
      lebih := lebih || jsonb_build_object('kunci', 'pelatihLain', 'pakai', n_lain, 'batas', 0, 'lebih', n_lain);
    end if;
  elsif b.pelatih is not null and n_pelatih > b.pelatih then
    lebih := lebih || jsonb_build_object('kunci', 'pelatih', 'pakai', n_pelatih, 'batas', b.pelatih, 'lebih', n_pelatih - b.pelatih);
  end if;

  if jsonb_array_length(lebih) > 0 then
    return jsonb_build_object('ok', false, 'galat', 'melebihi_batas', 'kelebihan', lebih);
  end if;

  update subscriptions set plan = p_plan where tenant_id = tid;
  if jenis_baru <> jenis_lama then update tenants set jenis = jenis_baru where id = tid; end if;
  insert into langganan_riwayat (tenant_id, dari_plan, ke_plan, dari_jenis, ke_jenis, oleh)
  values (tid, plan_lama, p_plan, jenis_lama, jenis_baru, uid);

  return jsonb_build_object('ok', true, 'plan', p_plan, 'jenis', jenis_baru, 'berubahJenis', jenis_baru <> jenis_lama);
end $$;
revoke all on function public.ganti_paket(text) from public, anon;
grant execute on function public.ganti_paket(text) to authenticated;
