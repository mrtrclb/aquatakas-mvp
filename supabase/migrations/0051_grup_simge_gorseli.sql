-- Aquagram — 0051: Grup simgesi için görsel (emoji yerine yüklenen resim)
-- Boşsa emoji gösterilir. Görseller community-media/<kullanıcı>/groups/ altına yüklenir (kapakla aynı yol).
alter table public.groups add column if not exists icon_url text;
