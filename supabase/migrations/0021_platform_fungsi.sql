-- Fungsi panel admin platform. Semua: security definer, search_path terkunci, wajib is_platform_admin(), hanya role authenticated.
-- Tanpa proxy service role: panel membaca/menulis atas nama akun admin yang login.

alter table subscription_invoices add column if not exists terbit_pada timestamptz not null default now();
alter table subscription_invoices add column if not exists metode text check (metode is null or metode in ('duitku', 'transfer_bank'));
alter table subscription_invoices add column if not exists referensi text check (referensi is null or char_length(referensi) <= 120);

alter table platform_promo_codes add column if not exists id uuid not null default gen_random_uuid();
alter table platform_promo_codes add column if not exists aktif boolean not null default true;
alter table platform_promo_codes add column if not exists dibuat_pada date not null default current_date;
create unique index if not exists platform_promo_codes_id_uq on platform_promo_codes (id);

-- Seluruh data panel dalam satu panggilan.
create or replace function public.platform_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'ditolak' using errcode = '42501'; end if;
  return jsonb_build_object(
    'usaha', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'nama', t.nama, 'slug', t.slug,
        'pemilik', coalesce((select u.email from auth.users u where u.id = t.owner_id), ''),
        'email', coalesce((select u.email from auth.users u where u.id = t.owner_id), ''),
        'noWa', coalesce(t.pengaturan #>> '{profil,noWa}', ''),
        'kategori', t.kategori, 'kota', coalesce(t.pengaturan #>> '{profil,kota}', ''),
        'plan', coalesce(s.plan, 'guru_mulai'),
        'dibuat', (t.dibuat_pada at time zone 'Asia/Jakarta')::date,
        'trialBerakhir', (t.trial_ends_at at time zone 'Asia/Jakarta')::date,
        'periodeBerakhir', (s.current_period_end at time zone 'Asia/Jakarta')::date,
        'graceSampai', (s.grace_until at time zone 'Asia/Jakarta')::date,
        'murid', (select count(*) from murid m where m.tenant_id = t.id),
        'muridAktif', (select count(*) from murid m where m.tenant_id = t.id and m.aktif),
        'pengajar', (select count(*) from pengajar p where p.tenant_id = t.id and p.aktif),
        'sesiBulanIni', (select count(*) from sesi x where x.tenant_id = t.id and x.tanggal >= date_trunc('month', now() at time zone 'Asia/Jakarta')::date),
        'terakhirAktif', (coalesce(t.last_active_at, t.dibuat_pada) at time zone 'Asia/Jakarta')::date,
        'statusManual', case when s.status_manual is null then null else jsonb_build_object(
          'fase', s.status_manual, 'alasan', s.status_manual_alasan, 'sampai', s.status_manual_sampai, 'diubah', '') end
      ) order by t.dibuat_pada desc)
      from tenants t left join subscriptions s on s.tenant_id = t.id), '[]'::jsonb),
    'tagihan', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'orderId', i.order_id, 'usahaId', i.tenant_id, 'plan', i.plan, 'bulan', i.period_months,
        'nominal', i.amount, 'kodePromo', i.promo_code, 'status', i.status,
        'terbit', (i.terbit_pada at time zone 'Asia/Jakarta')::date,
        'tempo', (i.due_at at time zone 'Asia/Jakarta')::date,
        'dibayar', (i.paid_at at time zone 'Asia/Jakarta')::date,
        'metode', i.metode, 'referensi', i.referensi) order by i.terbit_pada desc)
      from subscription_invoices i), '[]'::jsonb),
    'promo', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'kode', c.kode, 'jenis', c.jenis, 'nilai', c.nilai, 'kuota', c.kuota, 'kedaluwarsa', c.kedaluwarsa,
        'berlakuBulan', c.berlaku_bulan, 'aktif', c.aktif, 'dibuat', c.dibuat_pada) order by c.dibuat_pada desc, c.kode)
      from platform_promo_codes c), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'waktu', a.dibuat_pada, 'aksi', a.aksi, 'usahaId', a.tenant_id, 'ringkas', a.ringkas, 'alasan', a.alasan,
        'berlakuSampai', a.berlaku_sampai) order by a.dibuat_pada desc)
      from (select * from platform_audit_log order by dibuat_pada desc limit 300) a), '[]'::jsonb),
    'catatan', coalesce((select jsonb_object_agg(n.tenant_id, n.catatan) from platform_tenant_notes n), '{}'::jsonb),
    'pengingat', coalesce((
      select jsonb_agg(jsonb_build_object('tagihanId', r.invoice_id, 'kanal', r.kanal, 'waktu', r.dikirim_pada))
      from reminder_logs r), '[]'::jsonb)
  );
end $$;

-- Catat audit umum (selain mode lihat dan aktivasi, yang punya fungsi sendiri).
create or replace function public.platform_catat_audit(p_aksi text, p_tenant uuid, p_ringkas text, p_alasan text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'ditolak' using errcode = '42501'; end if;
  if p_aksi not in ('ubah_status', 'ubah_catatan', 'kirim_pengingat', 'buat_promo', 'ubah_promo', 'hapus_promo') then raise exception 'aksi tidak dikenal'; end if;
  insert into platform_audit_log (admin_id, aksi, tenant_id, ringkas, alasan) values (auth.uid(), p_aksi, p_tenant, left(p_ringkas, 300), left(p_alasan, 300));
end $$;

-- Mode lihat: alasan wajib (>= 8 huruf), tercatat SEBELUM data dibaca, berlaku 30 menit.
create or replace function public.platform_lihat(p_tenant uuid, p_alasan text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_nama text; v_sampai timestamptz := now() + interval '30 minutes';
begin
  if not is_platform_admin() then raise exception 'ditolak' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_alasan, ''))) < 8 then raise exception 'Alasan minimal 8 karakter.'; end if;
  select nama into v_nama from tenants where id = p_tenant;
  if v_nama is null then raise exception 'Usaha tidak ditemukan.'; end if;
  insert into platform_audit_log (admin_id, aksi, tenant_id, ringkas, alasan, berlaku_sampai)
  values (auth.uid(), 'lihat_usaha', p_tenant, 'Mode lihat dibuka untuk ' || v_nama, left(btrim(p_alasan), 300), v_sampai);
  return v_sampai;
end $$;

-- Catatan pribadi per usaha (+ audit).
create or replace function public.platform_catatan(p_tenant uuid, p_teks text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'ditolak' using errcode = '42501'; end if;
  if char_length(coalesce(p_teks, '')) > 1000 then raise exception 'Catatan maksimal 1000 karakter.'; end if;
  insert into platform_tenant_notes (tenant_id, catatan, diubah_oleh, diubah_pada) values (p_tenant, coalesce(p_teks, ''), auth.uid(), now())
  on conflict (tenant_id) do update set catatan = excluded.catatan, diubah_oleh = excluded.diubah_oleh, diubah_pada = excluded.diubah_pada;
  insert into platform_audit_log (admin_id, aksi, tenant_id, ringkas) values (auth.uid(), 'ubah_catatan', p_tenant, 'Catatan pribadi diperbarui');
end $$;

-- Aktivasi manual (transfer bank). Atomik + idempoten: tagihan yang sudah lunas ditolak, jadi periode tidak bertambah dua kali.
-- Periode baru dimulai dari yang lebih akhir antara tanggal terima dana dan akhir periode lama (sama dengan lib/langganan.ts perpanjangPeriode).
create or replace function public.platform_aktivasi(p_tagihan uuid, p_tanggal date, p_referensi text, p_alasan text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_inv subscription_invoices%rowtype;
  v_hari date := (now() at time zone 'Asia/Jakarta')::date;
  v_lama date; v_mulai date; v_baru date; v_nama text;
begin
  if not is_platform_admin() then raise exception 'ditolak' using errcode = '42501'; end if;
  select * into v_inv from subscription_invoices where id = p_tagihan for update;
  if not found then raise exception 'Tagihan tidak ditemukan.'; end if;
  if v_inv.status = 'lunas' then raise exception 'Tagihan ini sudah lunas.'; end if;
  if v_inv.status = 'batal' then raise exception 'Tagihan yang dibatalkan tidak bisa diaktifkan. Terbitkan tagihan baru.'; end if;
  if p_tanggal is null or p_tanggal > v_hari then raise exception 'Tanggal terima dana tidak boleh kosong atau di masa depan.'; end if;
  if p_tanggal < (v_inv.terbit_pada at time zone 'Asia/Jakarta')::date then raise exception 'Tanggal terima dana tidak boleh sebelum tagihan terbit.'; end if;
  if char_length(btrim(coalesce(p_referensi, ''))) < 3 then raise exception 'Isi bank pengirim atau nomor referensi transfer.'; end if;
  if char_length(btrim(coalesce(p_alasan, ''))) < 5 then raise exception 'Tulis alasannya, ini tercatat di audit log.'; end if;

  select (current_period_end at time zone 'Asia/Jakarta')::date into v_lama from subscriptions where tenant_id = v_inv.tenant_id;
  v_mulai := case when v_lama is not null and v_lama > p_tanggal then v_lama else p_tanggal end;
  v_baru := (v_mulai + make_interval(months => v_inv.period_months))::date;

  update subscription_invoices set status = 'lunas', paid_at = (p_tanggal::timestamp at time zone 'Asia/Jakarta'), metode = 'transfer_bank', referensi = left(btrim(p_referensi), 120) where id = v_inv.id;
  insert into subscriptions (tenant_id, plan, current_period_end, grace_until)
  values (v_inv.tenant_id, v_inv.plan, (v_baru::timestamp at time zone 'Asia/Jakarta'), null)
  on conflict (tenant_id) do update set plan = excluded.plan, current_period_end = excluded.current_period_end, grace_until = null,
    status_manual = null, status_manual_alasan = null, status_manual_sampai = null, status_manual_oleh = null;
  insert into platform_transactions (order_id, tenant_id, nominal, plan, promo_code, paid_at)
  values (v_inv.order_id, v_inv.tenant_id, v_inv.amount, v_inv.plan, v_inv.promo_code, (p_tanggal::timestamp at time zone 'Asia/Jakarta')) on conflict (order_id) do nothing;
  if v_inv.promo_code is not null then update platform_promo_codes set used_count = used_count + 1 where kode = v_inv.promo_code; end if;

  select nama into v_nama from tenants where id = v_inv.tenant_id;
  insert into platform_audit_log (admin_id, aksi, tenant_id, ringkas, alasan)
  values (auth.uid(), 'aktivasi_manual', v_inv.tenant_id, v_inv.order_id || ' dilunasi manual (transfer ' || left(btrim(p_referensi), 120) || '), aktif sampai ' || v_baru, left(btrim(p_alasan), 300));
  return jsonb_build_object('periodeBerakhir', v_baru, 'usaha', v_nama, 'orderId', v_inv.order_id);
end $$;

do $$
declare f text;
begin
  foreach f in array array['platform_data()', 'platform_catat_audit(text,uuid,text,text)', 'platform_lihat(uuid,text)', 'platform_catatan(uuid,text)', 'platform_aktivasi(uuid,date,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
