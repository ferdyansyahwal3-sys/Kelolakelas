-- Bucket PRIVAT untuk bukti bayar. Tanpa policy di storage.objects: hanya service role (server) yang bisa baca/tulis.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti-bayar', 'bukti-bayar', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
