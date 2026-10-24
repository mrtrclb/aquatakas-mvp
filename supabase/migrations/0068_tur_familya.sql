-- Aquagram — 0068: türlere familya alanı (Türkiye bölümündeki "Grup" filtresi için)
alter table public.species add column if not exists family text;
grant select (family) on public.species to anon, authenticated;
grant insert (family), update (family) on public.species to authenticated;
update public.species set family = 'Aphaniidae' where category_id = 'turkiye' and family is null;
