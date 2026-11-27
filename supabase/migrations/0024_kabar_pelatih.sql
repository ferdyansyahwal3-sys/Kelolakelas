-- KelolaKelas 0024 (B3c): kabar untuk pelatih (hasil keputusan permintaan ganti / tukar jadwal) dan info ke murid lewat tabel `pemberitahuan` (0002/0018).
-- Penulisan hanya oleh owner (kabar dibuat saat ia memutuskan); pelatih membaca kabar miliknya dan menandai dibaca (lewat server, tersaring pelatih + usaha).
-- `kunci` = id kejadian (mis. "kb-<id permintaan>-pemohon") supaya memproses keputusan yang sama dua kali tidak menggandakan kabar.

create table if not exists kabar_pelatih (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  untuk_pengajar_id uuid not null,
  kunci text not null,
  jenis text not null check (jenis in ('ganti_disetujui', 'ganti_masuk', 'ganti_ditolak', 'tukar_disetujui', 'tukar_ditolak', 'tukar_dibatalkan', 'ganti_langsung')),
  judul text not null check (char_length(judul) between 3 and 120),
  isi text not null check (char_length(isi) between 5 and 600),
  dibaca boolean not null default false,
  dibuat_pada timestamptz not null default now(),
  unique (tenant_id, kunci),
  foreign key (untuk_pengajar_id, tenant_id) references pengajar (id, tenant_id) on delete cascade
);
create index if not exists kabar_pelatih_untuk on kabar_pelatih (tenant_id, untuk_pengajar_id, dibuat_pada desc);
alter table kabar_pelatih enable row level security;
drop policy if exists kabar_baca on kabar_pelatih;
create policy kabar_baca on kabar_pelatih for select using (is_owner(tenant_id) or untuk_pengajar_id = _pengajar_saya(tenant_id));
drop policy if exists kabar_tulis_owner on kabar_pelatih;
create policy kabar_tulis_owner on kabar_pelatih for insert with check (is_owner(tenant_id));
-- Sengaja tanpa policy update/delete: "dibaca" diubah lewat server (service role, disaring pelatih + usaha).

-- Info ke murid dari keputusan owner memakai `pemberitahuan` (untuk_slot_id + sampai_tgl dari 0018). Kolom kunci menjaga idempotensi.
alter table pemberitahuan add column if not exists kunci text;
alter table pemberitahuan drop constraint if exists pemberitahuan_kunci_unik;
alter table pemberitahuan add constraint pemberitahuan_kunci_unik unique (tenant_id, kunci); -- NULL boleh banyak (pemberitahuan biasa tanpa kunci)
