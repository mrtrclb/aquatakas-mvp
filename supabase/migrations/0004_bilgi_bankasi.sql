-- Aquagram — 0004: bilgi bankası (kategoriler, türler, besleyenler, favoriler, deneyimler, öneriler)

create table public.kb_categories (
  id text primary key,
  section text not null check (section in ('tatlisu', 'omurgasiz', 'deniz', 'bitki')),
  name text not null,
  emoji text not null,
  tone text not null,
  position int not null default 0
);
alter table public.kb_categories enable row level security;
create policy "kategoriler herkese açık" on public.kb_categories for select to anon, authenticated using (true);
create policy "editör kategori yönetir" on public.kb_categories for insert to authenticated with check ((select private.has_permission('species')));
create policy "editör kategori günceller" on public.kb_categories for update to authenticated
  using ((select private.has_permission('species'))) with check ((select private.has_permission('species')));

create table public.species (
  id bigint generated always as identity primary key,
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name text not null,
  latin text not null,
  category_id text not null references public.kb_categories(id),
  kind text not null check (kind in ('fish', 'plant', 'coral')),
  difficulty text not null check (difficulty in ('Kolay', 'Orta', 'Zor')),
  temperament text,
  description text not null default '',
  facts jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  is_rare boolean not null default false,
  image_url text,
  status text not null default 'published' check (status in ('published', 'draft')),
  keeper_count int not null default 0,
  comment_count int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.species (category_id);
create index species_name_trgm_idx on public.species using gin ((name || ' ' || latin) extensions.gin_trgm_ops);
alter table public.species enable row level security;
create trigger species_touch before update on public.species for each row execute function private.touch_updated_at();

create policy "yayındaki türler herkese açık" on public.species for select to anon, authenticated
  using (status = 'published' or (select private.has_permission('species')));
create policy "editör tür ekler" on public.species for insert to authenticated with check ((select private.has_permission('species')));
create policy "editör tür günceller" on public.species for update to authenticated
  using ((select private.has_permission('species'))) with check ((select private.has_permission('species')));

-- Beslediğim türler (herkese açık) ve favoriler (yalnızca sahibine)
create table public.species_keepers (
  species_id bigint not null references public.species(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (species_id, user_id)
);
create index on public.species_keepers (user_id);
alter table public.species_keepers enable row level security;
create policy "besleyenler herkese açık" on public.species_keepers for select to anon, authenticated using (true);
create policy "üye beslediği türü ekler" on public.species_keepers for insert to authenticated with check (user_id = (select auth.uid()));
create policy "üye beslediği türü çıkarır" on public.species_keepers for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.count_species_keepers()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.species set keeper_count = keeper_count + 1 where id = new.species_id;
  else update public.species set keeper_count = greatest(keeper_count - 1, 0) where id = old.species_id; end if;
  return null;
end; $$;
create trigger species_keepers_count after insert or delete on public.species_keepers
  for each row execute function private.count_species_keepers();

create table public.species_favorites (
  species_id bigint not null references public.species(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (species_id, user_id)
);
alter table public.species_favorites enable row level security;
create policy "kendi favorileri" on public.species_favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Üye deneyimleri
create table public.species_comments (
  id bigint generated always as identity primary key,
  species_id bigint not null references public.species(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 600),
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 4),
  video jsonb,
  like_count int not null default 0,
  is_removed boolean not null default false,
  removed_reason text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(text) > 0 or coalesce(array_length(images, 1), 0) > 0 or video is not null)
);
create index on public.species_comments (species_id, created_at desc);
alter table public.species_comments enable row level security;
revoke update on public.species_comments from anon, authenticated;
grant update (text) on public.species_comments to authenticated;

create policy "deneyimler herkese açık" on public.species_comments for select to anon, authenticated
  using (not is_removed or user_id = (select auth.uid()) or (select private.has_permission('content')) or (select private.has_permission('species')));
create policy "üye deneyim yazar" on public.species_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active_member()));
create policy "sahibi düzenler" on public.species_comments for update to authenticated
  using (user_id = (select auth.uid()) and not is_removed) with check (user_id = (select auth.uid()));
create policy "sahibi siler" on public.species_comments for delete to authenticated using (user_id = (select auth.uid()));

create trigger species_comments_prepare before insert or update on public.species_comments
  for each row execute function private.prepare_comment();

create or replace function private.count_species_comments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.species set comment_count = comment_count + 1 where id = new.species_id;
  else update public.species set comment_count = greatest(comment_count - 1, 0) where id = old.species_id; end if;
  return null;
end; $$;
create trigger species_comments_count after insert or delete on public.species_comments
  for each row execute function private.count_species_comments();

create table public.species_comment_likes (
  comment_id bigint not null references public.species_comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
alter table public.species_comment_likes enable row level security;
create policy "faydalı işaretleri herkese açık" on public.species_comment_likes for select to anon, authenticated using (true);
create policy "üye faydalı işaretler" on public.species_comment_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "üye işareti geri alır" on public.species_comment_likes for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.count_species_comment_likes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.species_comments set like_count = like_count + 1 where id = new.comment_id;
  else update public.species_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id; end if;
  return null;
end; $$;
create trigger species_comment_likes_count after insert or delete on public.species_comment_likes
  for each row execute function private.count_species_comment_likes();

create or replace function public.moderate_remove_species_comment(p_comment_id bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_permission('content') or private.has_permission('species')) then raise exception 'Yetkiniz yok.'; end if;
  update public.species_comments set is_removed = true, removed_reason = p_reason where id = p_comment_id;
  perform private.audit('species_comment.remove', 'species_comment', p_comment_id::text, jsonb_build_object('reason', p_reason));
end; $$;

-- Üyelerin yeni tür önerileri (editör onaylar)
create table public.species_suggestions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  latin text,
  category_id text references public.kb_categories(id),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.species_suggestions enable row level security;
create policy "öneriyi sahibi ve editör görür" on public.species_suggestions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('species')));
create policy "üye tür önerir" on public.species_suggestions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and (select private.is_active_member()));
create policy "editör öneriyi sonuçlandırır" on public.species_suggestions for update to authenticated
  using ((select private.has_permission('species'))) with check ((select private.has_permission('species')));

revoke execute on function private.count_species_keepers(), private.count_species_comments(), private.count_species_comment_likes() from public;
revoke execute on function public.moderate_remove_species_comment(bigint, text) from public, anon;
grant execute on function public.moderate_remove_species_comment(bigint, text) to authenticated;
