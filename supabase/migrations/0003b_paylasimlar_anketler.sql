-- Aquagram — 0003b: paylaşımlar ve anketler

-- ---------------------------------------------------------------
-- Paylaşımlar
-- ---------------------------------------------------------------
create table public.posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  kind text not null default 'post' check (kind in ('post', 'question')),
  text text not null default '' check (char_length(text) <= 500),
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 10),
  video jsonb,
  poll_ends_at timestamptz,
  species_slugs text[] not null default '{}',
  like_count int not null default 0,
  comment_count int not null default 0,
  is_removed boolean not null default false,
  removed_reason text,
  removed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(text) > 0 or coalesce(array_length(images, 1), 0) > 0 or video is not null)
);
create index posts_feed_idx on public.posts (created_at desc) where not is_removed;
create index posts_user_idx on public.posts (user_id, created_at desc);
create index posts_group_idx on public.posts (group_id, created_at desc);
create index posts_species_idx on public.posts using gin (species_slugs);
create index posts_text_trgm_idx on public.posts using gin (text extensions.gin_trgm_ops);
alter table public.posts enable row level security;

revoke update on public.posts from anon, authenticated;
grant update (text, images, video, species_slugs, kind) on public.posts to authenticated;

create trigger posts_touch before update on public.posts
  for each row execute function private.touch_updated_at();

-- Bağlantı adresi: 5 haneli sayı + metnin ilk 4 kelimesi (örn. 48213-calvus-ciftimde-yumurta-gordum)
create or replace function private.slugify(input text, max_words int default 4)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(array_to_string((regexp_split_to_array(
    trim(regexp_replace(translate(lower(coalesce(input, '')), 'çğıöşüâîû', 'cgiosuaiu'), '[^a-z0-9]+', ' ', 'g')),
    '\s+'))[1:max_words], '-'), ''), 'paylasim');
$$;

create or replace function private.prepare_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare candidate text;
begin
  loop
    candidate := (10000 + floor(random() * 90000))::int::text || '-' || private.slugify(new.text);
    exit when not exists (select 1 from public.posts where slug = candidate);
  end loop;
  new.slug := candidate;
  new.like_count := 0; new.comment_count := 0;
  new.is_removed := false; new.removed_reason := null; new.removed_by := null;
  new.created_at := now();
  return new;
end; $$;
create trigger posts_prepare before insert on public.posts
  for each row execute function private.prepare_post();

create policy "paylaşımlar herkese açık" on public.posts for select to anon, authenticated
  using (
    not is_removed or user_id = (select auth.uid()) or (select private.has_permission('content'))
    or (group_id is not null and (select private.is_group_mod(group_id)))
  );
create policy "üye paylaşır" on public.posts for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select private.is_active_member())
    and (group_id is null or exists (select 1 from public.group_members m where m.group_id = posts.group_id and m.user_id = (select auth.uid())))
  );
create policy "sahibi düzenler" on public.posts for update to authenticated
  using (user_id = (select auth.uid()) and not is_removed) with check (user_id = (select auth.uid()));
create policy "sahibi siler" on public.posts for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.count_group_posts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.group_id is not null then
    update public.groups set post_count = post_count + 1 where id = new.group_id;
  elsif tg_op = 'DELETE' and old.group_id is not null then
    update public.groups set post_count = greatest(post_count - 1, 0) where id = old.group_id;
  end if;
  return null;
end; $$;
create trigger posts_group_count after insert or delete on public.posts
  for each row execute function private.count_group_posts();

-- ---------------------------------------------------------------
-- Anketler (2–4 seçenek; oy veren kişiler gizli, sayılar açık)
-- ---------------------------------------------------------------
create table public.poll_options (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  position smallint not null,
  text text not null check (char_length(text) between 1 and 40),
  vote_count int not null default 0,
  unique (post_id, position)
);
alter table public.poll_options enable row level security;
revoke update on public.poll_options from anon, authenticated;
create policy "seçenekler herkese açık" on public.poll_options for select to anon, authenticated using (true);
create policy "paylaşım sahibi seçenek ekler" on public.poll_options for insert to authenticated
  with check (
    vote_count = 0 and position between 1 and 4
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()) and p.poll_ends_at is not null)
  );

create table public.poll_votes (
  post_id bigint not null references public.posts(id) on delete cascade,
  option_id bigint not null references public.poll_options(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.poll_votes enable row level security;
create policy "kendi oyunu görür" on public.poll_votes for select to authenticated using (user_id = (select auth.uid()));
create policy "üye oy verir" on public.poll_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.poll_options o join public.posts p on p.id = o.post_id
      where o.id = option_id and o.post_id = poll_votes.post_id and p.poll_ends_at > now() and not p.is_removed
    )
  );

create or replace function private.count_poll_vote()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
  return null;
end; $$;
create trigger poll_votes_count after insert on public.poll_votes
  for each row execute function private.count_poll_vote();

revoke execute on function private.slugify(text, int), private.prepare_post(), private.count_group_posts(), private.count_poll_vote() from public;
