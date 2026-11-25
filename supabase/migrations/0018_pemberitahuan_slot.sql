-- KelolaKelas 0018: pemberitahuan untuk satu sesi (slot) dan masa tampil.
alter table pemberitahuan add column if not exists untuk_slot_id uuid;
alter table pemberitahuan add column if not exists sampai_tgl date;
alter table pemberitahuan drop constraint if exists pemberitahuan_slot_fk;
alter table pemberitahuan add constraint pemberitahuan_slot_fk foreign key (untuk_slot_id, tenant_id) references jadwal_template (id, tenant_id) on delete cascade;
