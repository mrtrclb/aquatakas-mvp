-- Aquagram — 0011: bildirimler + canlı (realtime) mesajlaşma

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('post_like', 'post_comment', 'comment_like', 'feature_approved', 'feature_rejected', 'group_join', 'system')),
  post_id bigint references public.posts(id) on delete cascade,
  comment_id bigint references public.comments(id) on delete cascade,
  listing_id bigint references public.listings(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  body text check (char_length(body) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index on public.notifications (actor_id);
create index on public.notifications (post_id);
create index on public.notifications (comment_id);
create index on public.notifications (listing_id);
create index on public.notifications (group_id);
alter table public.notifications enable row level security;
revoke insert, update on public.notifications from anon, authenticated; -- silme kuralı yok, RLS engeller
grant update (read_at) on public.notifications to authenticated;

create policy "kendi bildirimleri" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "kendi bildirimini okundu yapar" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Bildirim üretici (aynı kişi aynı şeyi 1 gün içinde tekrar tetiklerse yeni kayıt açılmaz)
create or replace function private.notify(p_user uuid, p_actor uuid, p_type text, p_post bigint default null,
  p_comment bigint default null, p_listing bigint default null, p_group uuid default null, p_body text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_actor is not null and exists (
    select 1 from public.notifications
    where user_id = p_user and actor_id = p_actor and type = p_type
      and post_id is not distinct from p_post and comment_id is not distinct from p_comment
      and group_id is not distinct from p_group and created_at > now() - interval '1 day'
  ) then return; end if;
  insert into public.notifications (user_id, actor_id, type, post_id, comment_id, listing_id, group_id, body)
  values (p_user, p_actor, p_type, p_post, p_comment, p_listing, p_group, left(p_body, 300));
end; $$;

create or replace function private.on_post_like_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify((select user_id from public.posts where id = new.post_id), new.user_id, 'post_like', new.post_id);
  return null;
end; $$;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function private.on_post_like_notify();

create or replace function private.on_comment_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify((select user_id from public.posts where id = new.post_id), new.user_id, 'post_comment',
    new.post_id, new.id, null, null, new.text);
  return null;
end; $$;
create trigger comments_notify after insert on public.comments
  for each row execute function private.on_comment_notify();

create or replace function private.on_comment_like_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.comments;
begin
  select * into c from public.comments where id = new.comment_id;
  perform private.notify(c.user_id, new.user_id, 'comment_like', c.post_id, c.id);
  return null;
end; $$;
create trigger comment_likes_notify after insert on public.comment_likes
  for each row execute function private.on_comment_like_notify();

create or replace function private.on_feature_review_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    perform private.notify(new.user_id, null, case when new.status = 'approved' then 'feature_approved' else 'feature_rejected' end,
      null, null, new.listing_id, null, new.reject_reason);
  end if;
  return null;
end; $$;
create trigger listing_features_notify after update of status on public.listing_features
  for each row execute function private.on_feature_review_notify();

create or replace function private.on_group_join_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'member' then
    perform private.notify((select owner_id from public.groups where id = new.group_id), new.user_id, 'group_join',
      null, null, null, new.group_id);
  end if;
  return null;
end; $$;
create trigger group_members_notify after insert on public.group_members
  for each row execute function private.on_group_join_notify();

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = (select auth.uid()) and read_at is null;
$$;

revoke execute on function private.notify(uuid, uuid, text, bigint, bigint, bigint, uuid, text) from public;
revoke execute on function private.on_post_like_notify(), private.on_comment_notify(), private.on_comment_like_notify(),
  private.on_feature_review_notify(), private.on_group_join_notify() from public;
revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- Canlı güncellemeler: yeni mesaj ve bildirim anında gelir (erişim kuralları geçerlidir)
alter publication supabase_realtime add table public.messages, public.notifications;
