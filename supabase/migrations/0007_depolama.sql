-- Aquagram — 0007: dosya depolama alanları ve erişim kuralları

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('listing-media', 'listing-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('community-media', 'community-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('species-media', 'species-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('ad-media', 'ad-media', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Üyeler yalnızca kendi klasörlerine (ilk klasör adı = kullanıcı kimliği) yükler
create policy "üye kendi klasörüne yükler" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'listing-media', 'community-media', 'ad-media')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_member())
  );
create policy "üye kendi dosyasını günceller" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'listing-media', 'community-media', 'ad-media') and owner_id = (select auth.uid())::text)
  with check (bucket_id in ('avatars', 'listing-media', 'community-media', 'ad-media') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "üye kendi dosyasını kaldırır" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'listing-media', 'community-media', 'ad-media') and owner_id = (select auth.uid())::text);

-- Tür görselleri yalnızca bilgi bankası editörlerinden
create policy "editör tür görseli yükler" on storage.objects for insert to authenticated
  with check (bucket_id = 'species-media' and (select private.has_permission('species')));
create policy "editör tür görselini günceller" on storage.objects for update to authenticated
  using (bucket_id = 'species-media' and (select private.has_permission('species')))
  with check (bucket_id = 'species-media' and (select private.has_permission('species')));
create policy "yetkili uygunsuz dosyayı kaldırır" on storage.objects for delete to authenticated
  using ((bucket_id = 'species-media' and (select private.has_permission('species')))
         or (bucket_id in ('avatars', 'listing-media', 'community-media', 'ad-media') and (select private.has_permission('content'))));
