-- Aquagram — 0036: türlerin lokalite / varyete / ticari ad kayıtları ve eski tür adresleri için yönlendirme.
--   lokalite : doğadaki belirli bir bölgenin popülasyonu (Tropheus moorii 'Ilangi')
--   varyete  : akvaryumda seçilerek üretilmiş renk/yüzgeç hattı (Electric Blue Jack Dempsey)
--   ticari   : satıcıların verdiği ad; tek bir lokaliteye denk gelmeyebilir ("Blue Flash")

create table public.species_forms (
  id bigint generated always as identity primary key,
  species_id bigint not null references public.species(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('lokalite', 'varyete', 'ticari')),
  origin text not null default '',
  note text not null default '',
  aliases text[] not null default '{}',
  images text[] not null default '{}',
  source_url text,
  position int not null default 0,
  status text not null default 'published' check (status in ('published', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (species_id, name)
);
create index on public.species_forms (species_id, position);
alter table public.species_forms enable row level security;
create trigger species_forms_touch before update on public.species_forms for each row execute function private.touch_updated_at();

create policy "yayındaki formlar herkese açık" on public.species_forms for select to anon, authenticated
  using (status = 'published' or (select private.has_permission('species')));
create policy "editör form ekler" on public.species_forms for insert to authenticated with check ((select private.has_permission('species')));
create policy "editör form günceller" on public.species_forms for update to authenticated
  using ((select private.has_permission('species'))) with check ((select private.has_permission('species')));
create policy "editör form siler" on public.species_forms for delete to authenticated using ((select private.has_permission('species')));

-- Ayrı sayfadan bir türün formuna taşınan eski adresler (ör. /tur/altolamprologus-compressiceps-sumbu-shell)
create table public.species_redirects (
  old_slug extensions.citext primary key,
  new_slug extensions.citext not null,
  form_name text,
  created_at timestamptz not null default now()
);
alter table public.species_redirects enable row level security;
create policy "yönlendirmeler herkese açık" on public.species_redirects for select to anon, authenticated using (true);
create policy "editör yönlendirme yönetir" on public.species_redirects for all to authenticated
  using ((select private.has_permission('species'))) with check ((select private.has_permission('species')));
