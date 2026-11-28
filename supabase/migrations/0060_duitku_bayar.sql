-- B6: pembayaran langganan lewat DuitKu.
-- Alur: server membuat invoice (nominal dikunci di server) -> pelanggan memilih metode (biaya admin dari DuitKu) -> satu "percobaan"
-- DuitKu per pilihan metode (merchantOrderId unik tiap percobaan) -> callback bertanda tangan + cek status server-ke-server
-- -> aktifkan_langganan_duitku (atomik, idempoten). Semua fungsi baru HANYA untuk service_role (server); tidak ada policy untuk browser.

-- ===== invoice =====
alter table subscription_invoices add column if not exists biaya_admin int not null default 0 check (biaya_admin >= 0);
do $$ begin
  alter table subscription_invoices add constraint subscription_invoices_id_tenant_uq unique (id, tenant_id);
exception when duplicate_object or duplicate_table then null; end $$;
-- Satu tagihan terbuka per usaha: membuat ulang = memakai yang ada atau membatalkan yang lama.
create unique index if not exists subscription_invoices_satu_terbuka on subscription_invoices (tenant_id) where status = 'belum_bayar';
create sequence if not exists subscription_invoice_seq;

-- ===== percobaan bayar (satu per pilihan metode) =====
create table if not exists duitku_percobaan (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  invoice_id uuid not null,
  merchant_order_id text not null unique check (char_length(merchant_order_id) <= 50),
  metode text not null check (metode ~ '^[A-Z0-9]{2}$'),
  biaya_admin int not null check (biaya_admin >= 0),
  jumlah int not null check (jumlah > 0),
  referensi text check (referensi is null or char_length(referensi) <= 120),
  payment_url text check (payment_url is null or char_length(payment_url) <= 600),
  status text not null default 'menunggu' check (status in ('menunggu', 'lunas', 'gagal', 'kedaluwarsa', 'perlu_tinjau')),
  dibuat_pada timestamptz not null default now(),
  kedaluwarsa_pada timestamptz not null,
  cek_terakhir_pada timestamptz,
  foreign key (invoice_id, tenant_id) references subscription_invoices (id, tenant_id) on delete cascade
);
create index if not exists duitku_percobaan_invoice_idx on duitku_percobaan (tenant_id, invoice_id);
alter table duitku_percobaan enable row level security; -- tanpa policy = hanya service role

-- ===== log kejadian pembayaran (hanya callback yang tanda tangannya valid) =====
alter table payment_events add column if not exists tenant_id uuid references tenants (id) on delete cascade;
alter table payment_events add column if not exists kunci text;
alter table payment_events add column if not exists hasil text;
-- Unik biasa (bukan parsial) supaya upsert on_conflict=kunci jalan; NULL tidak dianggap sama.
create unique index if not exists payment_events_kunci_uq on payment_events (kunci);

-- ===== buat / pakai ulang invoice (nominal dari server, plan dari langganan) =====
create or replace function public.buat_invoice_langganan(p_tenant uuid, p_bulan int, p_nominal int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_plan text; v_akhir timestamptz; v_buka subscription_invoices%rowtype;
  v_order text; v_id uuid; v_tempo timestamptz; v_coba int := 0;
begin
  if p_bulan not in (1, 12) then raise exception 'periode tidak valid'; end if;
  if p_nominal is null or p_nominal < 1000 or p_nominal > 100000000 then raise exception 'nominal tidak valid'; end if;
  select s.plan, s.current_period_end into v_plan, v_akhir from subscriptions s where s.tenant_id = p_tenant for update;
  if v_plan is null then raise exception 'langganan tidak ditemukan'; end if;

  select * into v_buka from subscription_invoices i where i.tenant_id = p_tenant and i.status = 'belum_bayar';
  if found then
    if v_buka.plan = v_plan and v_buka.period_months = p_bulan and v_buka.amount = p_nominal then
      return jsonb_build_object('id', v_buka.id, 'orderId', v_buka.order_id, 'plan', v_buka.plan, 'bulan', v_buka.period_months, 'nominal', v_buka.amount, 'baru', false);
    end if;
    update subscription_invoices set status = 'batal' where id = v_buka.id;
  end if;

  v_tempo := case when v_akhir is not null and v_akhir > now() then v_akhir else now() + interval '3 days' end;
  loop
    v_order := 'KK-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || lpad((nextval('subscription_invoice_seq') % 10000)::text, 4, '0');
    begin
      insert into subscription_invoices (tenant_id, order_id, plan, period_months, amount, status, due_at)
      values (p_tenant, v_order, v_plan, p_bulan, p_nominal, 'belum_bayar', v_tempo) returning id into v_id;
      exit;
    exception when unique_violation then
      v_coba := v_coba + 1;
      if v_coba > 8 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('id', v_id, 'orderId', v_order, 'plan', v_plan, 'bulan', p_bulan, 'nominal', p_nominal, 'baru', true);
end $$;

-- ===== aktivasi dari DuitKu (callback terverifikasi / cek status server) =====
-- Hasil 'status': aktif | sudah | bayar_ganda | perlu_tinjau | jumlah_tidak_cocok | tidak_dikenal.
create or replace function public.aktifkan_langganan_duitku(p_merchant_order_id text, p_jumlah int, p_referensi text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_perc duitku_percobaan%rowtype; v_inv subscription_invoices%rowtype; v_plan_kini text;
  v_hari date := (now() at time zone 'Asia/Jakarta')::date;
  v_lama date; v_mulai date; v_baru date;
begin
  select * into v_perc from duitku_percobaan d where d.merchant_order_id = p_merchant_order_id for update;
  if not found then return jsonb_build_object('status', 'tidak_dikenal'); end if;
  select * into v_inv from subscription_invoices i where i.id = v_perc.invoice_id and i.tenant_id = v_perc.tenant_id for update;
  if not found then return jsonb_build_object('status', 'tidak_dikenal'); end if;

  -- Nominal TIDAK dipercaya dari callback: harus sama dengan yang kita simpan, dan sama dengan harga invoice + biaya admin.
  if p_jumlah is distinct from v_perc.jumlah or v_inv.amount + v_perc.biaya_admin <> v_perc.jumlah then
    return jsonb_build_object('status', 'jumlah_tidak_cocok', 'orderId', v_inv.order_id);
  end if;

  if v_inv.status = 'lunas' then
    if v_perc.status = 'lunas' then return jsonb_build_object('status', 'sudah', 'orderId', v_inv.order_id, 'tenantId', v_inv.tenant_id, 'invoiceId', v_inv.id); end if;
    update duitku_percobaan set status = 'perlu_tinjau', referensi = coalesce(left(p_referensi, 120), referensi) where id = v_perc.id;
    return jsonb_build_object('status', 'bayar_ganda', 'orderId', v_inv.order_id, 'tenantId', v_inv.tenant_id, 'invoiceId', v_inv.id);
  end if;

  select s.plan into v_plan_kini from subscriptions s where s.tenant_id = v_inv.tenant_id for update;
  -- Invoice dibatalkan, atau paket sudah berganti sejak invoice terbit: dana masuk tapi jangan mengaktifkan diam-diam.
  if v_inv.status = 'batal' or v_plan_kini is distinct from v_inv.plan then
    update duitku_percobaan set status = 'perlu_tinjau', referensi = coalesce(left(p_referensi, 120), referensi) where id = v_perc.id;
    return jsonb_build_object('status', 'perlu_tinjau', 'orderId', v_inv.order_id, 'tenantId', v_inv.tenant_id, 'invoiceId', v_inv.id);
  end if;

  select (s.current_period_end at time zone 'Asia/Jakarta')::date into v_lama from subscriptions s where s.tenant_id = v_inv.tenant_id;
  v_mulai := case when v_lama is not null and v_lama > v_hari then v_lama else v_hari end;
  v_baru := (v_mulai + make_interval(months => v_inv.period_months))::date;

  update subscription_invoices set status = 'lunas', paid_at = now(), metode = 'duitku', referensi = left(coalesce(p_referensi, ''), 120), biaya_admin = v_perc.biaya_admin where id = v_inv.id;
  update subscriptions set current_period_end = (v_baru::timestamp at time zone 'Asia/Jakarta'), grace_until = null,
    status_manual = null, status_manual_alasan = null, status_manual_sampai = null, status_manual_oleh = null
  where tenant_id = v_inv.tenant_id;
  insert into platform_transactions (order_id, tenant_id, nominal, plan, promo_code, paid_at)
  values (v_inv.order_id, v_inv.tenant_id, v_inv.amount, v_inv.plan, v_inv.promo_code, now()) on conflict (order_id) do nothing;
  if v_inv.promo_code is not null then update platform_promo_codes set used_count = used_count + 1 where kode = v_inv.promo_code; end if;
  update duitku_percobaan set status = 'lunas', referensi = coalesce(left(p_referensi, 120), referensi) where id = v_perc.id;

  return jsonb_build_object('status', 'aktif', 'orderId', v_inv.order_id, 'tenantId', v_inv.tenant_id, 'invoiceId', v_inv.id, 'plan', v_inv.plan, 'periodeBerakhir', v_baru);
end $$;

revoke all on function public.buat_invoice_langganan(uuid, int, int) from public, anon, authenticated;
revoke all on function public.aktifkan_langganan_duitku(text, int, text) from public, anon, authenticated;
grant execute on function public.buat_invoice_langganan(uuid, int, int) to service_role;
grant execute on function public.aktifkan_langganan_duitku(text, int, text) to service_role;
