-- Pembatasan percobaan per IP (halaman publik tanpa login). Kunci = hash IP (HMAC) + aksi; IP mentah tidak disimpan.
create table if not exists rate_limit (
  kunci text not null,
  aksi text not null,
  jendela timestamptz not null,
  jumlah int not null default 0,
  primary key (kunci, aksi, jendela)
);
alter table rate_limit enable row level security; -- tanpa policy: hanya service role yang bisa menyentuh

-- true = boleh lanjut, false = terlalu sering. Jendela tetap (p_detik detik), hitung atomik.
create or replace function public.cek_rate_limit(p_kunci text, p_aksi text, p_maks int, p_detik int) returns boolean
language plpgsql security definer set search_path = public as $$
declare w timestamptz; n int;
begin
  if p_kunci is null or length(p_kunci) > 128 or p_aksi is null or p_maks < 1 or p_detik < 1 then return false; end if;
  w := to_timestamp(floor(extract(epoch from now()) / p_detik) * p_detik);
  insert into rate_limit (kunci, aksi, jendela, jumlah) values (p_kunci, p_aksi, w, 1)
    on conflict (kunci, aksi, jendela) do update set jumlah = rate_limit.jumlah + 1
    returning jumlah into n;
  if random() < 0.02 then delete from rate_limit where jendela < now() - interval '1 day'; end if;
  return n <= p_maks;
end $$;
revoke all on function public.cek_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.cek_rate_limit(text, text, int, int) to service_role;
