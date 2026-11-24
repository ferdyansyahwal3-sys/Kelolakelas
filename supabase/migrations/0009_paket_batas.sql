-- KelolaKelas 0009: fitur Paket dan harga tersambung database.
--   1. plan_batas: batas tiap paket langganan (sumber: lib/paketLangganan.ts, dijaga sama lewat uji). NULL = tak terbatas.
--   2. paket: nama unik per kategori per usaha, dan nilai dijaga di database (bukan hanya di form).
--   3. Batas jumlah paket JUAL AKTIF ditegakkan di database lewat trigger, jadi tidak bisa dilewati dengan memanggil API langsung.
-- Tidak mengubah data yang ada (tabel paket masih kosong).

create table if not exists plan_batas (
  plan text primary key check (plan in ('guru_mulai', 'guru_tumbuh', 'guru_penuh', 'agensi_tim', 'agensi_klub', 'agensi_jaringan')),
  pelatih int, murid int, slot int, paket_jual int, rekening int, cabang int, staf int
);
insert into plan_batas (plan, pelatih, murid, slot, paket_jual, rekening, cabang, staf) values
  ('guru_mulai',      1,   10,   5,    2,  1,  1,  0),
  ('guru_tumbuh',     1,  100,  30,   10,  3,  1,  0),
  ('guru_penuh',      1, null, null, null, 5,  1,  0),
  ('agensi_tim',      3,   60,  30,   10,  3,  1,  0),
  ('agensi_klub',     7,  150, 100,   20,  3,  1,  1),
  ('agensi_jaringan', 25, 1000, 500,  60, 10, 10, 10)
on conflict (plan) do update set pelatih = excluded.pelatih, murid = excluded.murid, slot = excluded.slot, paket_jual = excluded.paket_jual,
  rekening = excluded.rekening, cabang = excluded.cabang, staf = excluded.staf;
alter table plan_batas enable row level security;
create policy plan_batas_baca on plan_batas for select to authenticated using (true);

-- Nama paket unik per kategori (tak peka huruf besar, spasi tepi diabaikan).
create unique index if not exists paket_nama_unik on paket (tenant_id, kategori, lower(btrim(nama)));

-- Nilai dijaga di database (sama dengan validasi di lib/paket.ts).
alter table paket drop constraint if exists paket_nilai_sah;
alter table paket add constraint paket_nilai_sah check (
  char_length(btrim(nama)) between 2 and 40
  and jumlah_sesi between 1 and 100
  and masa_berlaku_hari between 7 and 365
  and harga between 1000 and 50000000
  and ((jenis = 'keluarga') = (anggota is not null))
);

-- Batas paket jual aktif. Dipicu saat paket baru aktif dibuat, atau paket nonaktif diaktifkan kembali.
create or replace function public.batasi_paket_jual() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  batas int;
  ditemukan boolean;
  jumlah int;
begin
  if new.aktif is not true then return new; end if;
  if tg_op = 'UPDATE' and old.aktif is true then return new; end if; -- jumlah aktif tidak bertambah

  -- Satu usaha diproses satu per satu supaya dua permintaan bersamaan tidak sama-sama lolos.
  perform pg_advisory_xact_lock(hashtext('paket_jual:' || new.tenant_id::text));

  select true, b.paket_jual into ditemukan, batas
  from subscriptions s join plan_batas b on b.plan = s.plan
  where s.tenant_id = new.tenant_id;
  if ditemukan is not true then raise exception 'langganan_tidak_ditemukan' using errcode = 'P0001'; end if;
  if batas is null then return new; end if; -- tak terbatas

  select count(*) into jumlah from paket where tenant_id = new.tenant_id and aktif and id is distinct from new.id;
  if jumlah >= batas then raise exception 'batas_paket_jual' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.batasi_paket_jual() from public, anon, authenticated;

drop trigger if exists paket_batas_jual on paket;
create trigger paket_batas_jual before insert or update of aktif on paket for each row execute function public.batasi_paket_jual();
