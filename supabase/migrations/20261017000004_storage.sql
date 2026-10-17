-- =====================================================================
-- Image storage for website content (Supabase Storage)
-- Public read; uploads restricted to content editors; images only, 5 MB max.
-- Files are served as static objects by Supabase Storage and never executed.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads site media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-media');

create policy "editors upload site media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.has_permission('content.write'));

create policy "editors update site media" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.has_permission('content.write'))
  with check (bucket_id = 'site-media' and public.has_permission('content.write'));

create policy "editors delete site media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.has_permission('content.write'));
