-- Aquagram — 0003c: beğeni, kayıt, yorumlar

-- ---------------------------------------------------------------
-- Beğeni ve kayıt
-- ---------------------------------------------------------------
create table public.post_likes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index on public.post_likes (user_id);
alter table public.post_likes enable row level security;
create policy "beğeniler herkese açık" on public.post_likes for select to anon, authenticated using (true);
create policy "üye beğenir" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "üye beğeniyi geri alır" on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.count_post_likes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.posts set like_count = like_count + 1 where id = new.post_id;
  else update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id; end if;
  return null;
end; $$;
create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function private.count_post_likes();

create table public.post_saves (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_saves enable row level security;
create policy "kendi kayıtları" on public.post_saves for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------
-- Yorumlar
-- ---------------------------------------------------------------
create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 300),
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 4),
  video jsonb,
  like_count int not null default 0,
  is_removed boolean not null default false,
  removed_reason text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(text) > 0 or coalesce(array_length(images, 1), 0) > 0 or video is not null)
);
create index on public.comments (post_id, created_at);
create index on public.comments (user_id, created_at desc);
alter table public.comments enable row level security;
revoke update on public.comments from anon, authenticated;
grant update (text) on public.comments to authenticated;

create policy "yorumlar herkese açık" on public.comments for select to anon, authenticated
  using (not is_removed or user_id = (select auth.uid()) or (select private.has_permission('content')));
create policy "üye yorum yazar" on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select private.is_active_member())
    and exists (select 1 from public.posts p where p.id = post_id and not p.is_removed)
  );
create policy "sahibi düzenler" on public.comments for update to authenticated
  using (user_id = (select auth.uid()) and not is_removed) with check (user_id = (select auth.uid()));
create policy "sahibi siler" on public.comments for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.prepare_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.like_count := 0; new.is_removed := false; new.removed_reason := null; new.edited_at := null; new.created_at := now();
  elsif new.text is distinct from old.text then
    new.edited_at := now();
  end if;
  return new;
end; $$;
create trigger comments_prepare before insert or update on public.comments
  for each row execute function private.prepare_comment();

create or replace function private.count_comments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  else update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id; end if;
  return null;
end; $$;
create trigger comments_count after insert or delete on public.comments
  for each row execute function private.count_comments();

create table public.comment_likes (
  comment_id bigint not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
create policy "yorum beğenileri herkese açık" on public.comment_likes for select to anon, authenticated using (true);
create policy "üye yorumu beğenir" on public.comment_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "üye beğeniyi geri alır" on public.comment_likes for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.count_comment_likes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.comments set like_count = like_count + 1 where id = new.comment_id;
  else update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id; end if;
  return null;
end; $$;
create trigger comment_likes_count after insert or delete on public.comment_likes
  for each row execute function private.count_comment_likes();

revoke execute on function private.count_post_likes(), private.prepare_comment(), private.count_comments(), private.count_comment_likes() from public;
