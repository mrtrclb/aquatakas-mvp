-- Aquagram — 0031: Bilgi Bankası makaleleri + makale detayı reklam alanı
create table if not exists public.articles (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 100),
  title text not null check (char_length(title) between 3 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  body text not null check (char_length(body) between 20 and 60000),
  footnotes jsonb not null default '[]'::jsonb check (jsonb_typeof(footnotes) = 'array'),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  cover_url text check (char_length(cover_url) <= 600),
  species_slugs text[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published')),
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_published_idx on public.articles (status, published_at desc);
create index if not exists articles_species_idx on public.articles using gin (species_slugs);
create index if not exists articles_created_by_idx on public.articles (created_by);

alter table public.articles enable row level security;
revoke all on public.articles from anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

create policy "yayındaki makaleleri herkes okur" on public.articles for select to anon
  using (status = 'published');
create policy "makaleleri üyeler ve tür ekibi okur" on public.articles for select to authenticated
  using (status = 'published' or (select private.has_permission('species')));
create policy "makaleyi tür ekibi ekler" on public.articles for insert to authenticated
  with check ((select private.has_permission('species')));
create policy "makaleyi tür ekibi düzenler" on public.articles for update to authenticated
  using ((select private.has_permission('species')))
  with check ((select private.has_permission('species')));
create policy "makaleyi tür ekibi siler" on public.articles for delete to authenticated
  using ((select private.has_permission('species')));

-- Reklam alanı: makale detayının üstünde geniş şerit
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
    where conrelid = 'public.ads'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%placement%';
  if cname is not null then execute 'alter table public.ads drop constraint ' || quote_ident(cname); end if;
end $$;
alter table public.ads add constraint ads_placement_check
  check (placement in ('feed', 'sidebar', 'detail', 'post', 'species', 'article'));

update public.site_settings
  set value = value || '[{"id":"article-7g","placement":"article","days":7,"price":149}]'::jsonb
  where key = 'ad_plans' and not value @> '[{"placement":"article"}]';
