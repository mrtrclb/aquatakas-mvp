-- Aquagram — 0066: Türkiye'nin Tatlı Su Balıkları
-- İçerik öncelikli tür sayfası için yeni alanlar; yeni kategori; bu kategorideki türler
-- "beslediklerim"e eklenemez ve ilanlara bağlanamaz (yalnızca favori).

alter table public.species add column if not exists authority text;
alter table public.species add column if not exists tr_status text
  check (tr_status in ('endemik', 'yerli', 'yabanci'));
alter table public.species add column if not exists iucn text
  check (iucn in ('EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'));
alter table public.species add column if not exists basins text[] not null default '{}';
alter table public.species add column if not exists sections jsonb not null default '[]'::jsonb
  check (jsonb_typeof(sections) = 'array');
alter table public.species add column if not exists refs jsonb not null default '[]'::jsonb
  check (jsonb_typeof(refs) = 'array');
grant select (authority, tr_status, iucn, basins, sections, refs) on public.species to anon, authenticated;
grant insert (authority, tr_status, iucn, basins, sections, refs), update (authority, tr_status, iucn, basins, sections, refs)
  on public.species to authenticated;

insert into public.kb_categories (id, section, name, emoji, tone, position)
values ('turkiye', 'tatlisu', 'Türkiye''nin Tatlı Su Balıkları', '🇹🇷', 'from-red-300 to-cyan-800', 0)
on conflict (id) do nothing;

-- Korunan kategori: besleyen kaydı açılamaz
create or replace function private.species_keep_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.species s where s.id = new.species_id and s.category_id = 'turkiye') then
    raise exception 'Bu tür beslediklerine eklenemez; yalnızca favorilere ekleyebilirsin.';
  end if;
  return new;
end; $$;
create or replace trigger species_keep_guard before insert on public.species_keepers
  for each row execute function private.species_keep_guard();

-- Korunan kategorideki türler ilanlara bağlanmaz
create or replace function private.listing_species_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.species_slugs is not null and array_length(new.species_slugs, 1) > 0 then
    new.species_slugs := array(
      select x from unnest(new.species_slugs) x
      where not exists (select 1 from public.species s where s.slug::text = x and s.category_id = 'turkiye'));
  end if;
  return new;
end; $$;
create or replace trigger listing_species_guard before insert or update of species_slugs on public.listings
  for each row execute function private.listing_species_guard();
