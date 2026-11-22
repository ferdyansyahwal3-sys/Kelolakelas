-- DRAF SKEMA PANEL PEMILIK PLATFORM. BELUM DITERAPKAN ke database; tinjau dulu sebelum dijalankan.
-- Prinsip (pelajaran dari admin Journalyze):
--   * Tidak ada proxy service-role untuk panel ini dan tidak ada email admin di kode. Admin = baris di platform_admins.
--   * Semua tabel di sini terkunci RLS tanpa policy untuk anon/authenticated biasa. Hanya admin platform (is_platform_admin) yang lolos.
--   * Mode lihat WAJIB tercatat di platform_audit_log (dengan alasan) sebelum data usaha dibaca; baris audit tidak bisa diubah/dihapus lewat API.

create table if not exists platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dibuat_pada timestamptz not null default now()
);
alter table platform_admins enable row level security;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Admin hanya boleh melihat barisnya sendiri (cek "apakah saya admin"). Menambah/menghapus admin dilakukan manual lewat SQL editor.
create policy platform_admins_diri on platform_admins for select using (user_id = auth.uid());

-- Status langganan yang diatur admin dengan tangan. Kosong = status otomatis dari tanggal (fungsi getAccess). Bila `status_manual_sampai` lewat, pengaturan dianggap tidak ada.
alter table subscriptions add column if not exists status_manual text check (status_manual in ('trial', 'aktif', 'jatuh_tempo', 'ditangguhkan', 'berhenti'));
alter table subscriptions add column if not exists status_manual_alasan text check (status_manual_alasan is null or char_length(status_manual_alasan) <= 200);
alter table subscriptions add column if not exists status_manual_sampai date;
alter table subscriptions add column if not exists status_manual_oleh uuid references auth.users (id);
alter table subscriptions add constraint status_manual_wajib_alasan check (status_manual is null or (status_manual_alasan is not null and char_length(status_manual_alasan) >= 5));

-- Aktivitas terakhir tiap usaha, dipakai tanda "tidak aktif 7 hari". Diisi oleh aplikasi (server) saat owner/pelatih masuk atau mengubah data.
alter table tenants add column if not exists last_active_at timestamptz;

-- Catatan pribadi pemilik platform tentang sebuah usaha.
create table if not exists platform_tenant_notes (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  catatan text not null default '' check (char_length(catatan) <= 1000),
  diubah_oleh uuid references auth.users (id),
  diubah_pada timestamptz not null default now()
);

-- Jejak audit: siapa melakukan apa pada usaha mana, dengan alasan. Hanya tambah baris (tanpa update/delete).
create table if not exists platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id),
  aksi text not null check (aksi in ('lihat_usaha', 'ubah_status', 'aktivasi_manual', 'ubah_catatan', 'kirim_pengingat', 'buat_promo', 'ubah_promo', 'hapus_promo')),
  tenant_id uuid references tenants (id) on delete set null,
  ringkas text not null,
  alasan text check (alasan is null or char_length(alasan) <= 300),
  -- Mode lihat berlaku sampai waktu ini (30 menit). Server menolak membaca data usaha bila tidak ada baris lihat_usaha yang masih berlaku untuk admin itu.
  berlaku_sampai timestamptz,
  dibuat_pada timestamptz not null default now()
);
create index if not exists platform_audit_tenant on platform_audit_log (tenant_id, dibuat_pada desc);
alter table platform_audit_log add constraint lihat_wajib_alasan check (aksi <> 'lihat_usaha' or (alasan is not null and char_length(alasan) >= 8 and berlaku_sampai is not null));

alter table platform_tenant_notes enable row level security;
alter table platform_audit_log enable row level security;

create policy notes_admin on platform_tenant_notes for all using (is_platform_admin()) with check (is_platform_admin());
create policy audit_baca_admin on platform_audit_log for select using (is_platform_admin());
create policy audit_tambah_admin on platform_audit_log for insert with check (is_platform_admin() and admin_id = auth.uid());
-- Sengaja tidak ada policy update/delete pada platform_audit_log.

-- Tabel langganan dari 0001 (subscriptions, subscription_invoices, payment_events, platform_transactions, platform_promo_codes, reminder_logs)
-- dibaca panel lewat policy admin. Owner usaha tetap hanya melihat tagihan miliknya (policy lama inv_baca / sub_baca).
do $$
declare t text;
begin
  foreach t in array array['subscriptions', 'subscription_invoices', 'payment_events', 'platform_transactions', 'platform_promo_codes', 'reminder_logs'] loop
    execute format('create policy %I on %I for select using (is_platform_admin())', t || '_admin_baca', t);
  end loop;
end $$;
create policy promo_platform_admin_tulis on platform_promo_codes for all using (is_platform_admin()) with check (is_platform_admin());
-- Aktivasi manual dan pembaruan tagihan lunas dilakukan oleh fungsi server (aktivasi idempoten), bukan update langsung dari browser.
