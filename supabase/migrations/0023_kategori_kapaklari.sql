-- Aquagram — 0023: Bilgi Bankası kategori kapak görselleri (site_settings.category_covers = {kategori_id: url})
-- Tür yetkisi olan ekip üyeleri de kapakları değiştirebilir.
insert into public.site_settings (key, value) values ('category_covers', '{}'::jsonb) on conflict (key) do nothing;

create policy "kategori kapakları tür ekibince değişir" on public.site_settings for update to authenticated
  using (key = 'category_covers' and (select private.has_permission('species')))
  with check (key = 'category_covers' and (select private.has_permission('species')));
