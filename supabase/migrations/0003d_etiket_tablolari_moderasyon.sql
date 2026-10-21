-- Aquagram — 0003d: etiket tabloları ve moderasyon fonksiyonları

-- ---------------------------------------------------------------
-- Etiketler: paylaşım metnindeki #etiketler otomatik çıkarılır; yasaklı etiketler atlanır
-- ---------------------------------------------------------------
create table public.banned_tags (
  tag extensions.citext primary key,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.banned_tags enable row level security;
create policy "yasaklı etiketler herkese açık" on public.banned_tags for select to anon, authenticated using (true);

create table public.post_tags (
  post_id bigint not null references public.posts(id) on delete cascade,
  tag extensions.citext not null,
  created_at timestamptz not null default now(),
  primary key (post_id, tag)
);
create index on public.post_tags (tag);
alter table public.post_tags enable row level security;
create policy "etiketler herkese açık" on public.post_tags for select to anon, authenticated using (true);

-- Etiket bulutu: görünür paylaşımlardaki etiket sayıları
create or replace view public.tag_counts with (security_invoker = true) as
  select t.tag, count(*)::int as post_count, max(t.created_at) as last_used_at
  from public.post_tags t join public.posts p on p.id = t.post_id
  where not p.is_removed
  group by t.tag;

create table public.tag_follows (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  tag extensions.citext not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);
alter table public.tag_follows enable row level security;
create policy "kendi takip ettiği etiketler" on public.tag_follows for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------
-- Grup moderatörü / yetkili: paylaşım ve yorum kaldırma
-- ---------------------------------------------------------------
create or replace function public.moderate_remove_post(p_post_id bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.posts;
begin
  select * into p from public.posts where id = p_post_id;
  if p.id is null then raise exception 'Paylaşım bulunamadı.'; end if;
  if not (private.has_permission('content') or (p.group_id is not null and private.is_group_mod(p.group_id))) then
    raise exception 'Yetkiniz yok.';
  end if;
  update public.posts set is_removed = true, removed_reason = p_reason, removed_by = auth.uid() where id = p_post_id;
  perform private.audit('post.remove', 'post', p_post_id::text, jsonb_build_object('reason', p_reason, 'group_id', p.group_id));
end; $$;

create or replace function public.moderate_remove_comment(p_comment_id bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare gid uuid;
begin
  select p.group_id into gid from public.comments c join public.posts p on p.id = c.post_id where c.id = p_comment_id;
  if not found then raise exception 'Yorum bulunamadı.'; end if;
  if not (private.has_permission('content') or (gid is not null and private.is_group_mod(gid))) then
    raise exception 'Yetkiniz yok.';
  end if;
  update public.comments set is_removed = true, removed_reason = p_reason where id = p_comment_id;
  perform private.audit('comment.remove', 'comment', p_comment_id::text, jsonb_build_object('reason', p_reason));
end; $$;

create or replace function public.admin_set_group_closed(p_group_id uuid, p_closed boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('groups') then raise exception 'Yetkiniz yok.'; end if;
  update public.groups set is_closed = p_closed where id = p_group_id;
  perform private.audit(case when p_closed then 'group.close' else 'group.reopen' end, 'group', p_group_id::text, jsonb_build_object('reason', p_reason));
end; $$;

revoke execute on function public.moderate_remove_post(bigint, text), public.moderate_remove_comment(bigint, text),
  public.admin_set_group_closed(uuid, boolean, text) from public, anon;
grant execute on function public.moderate_remove_post(bigint, text), public.moderate_remove_comment(bigint, text),
  public.admin_set_group_closed(uuid, boolean, text) to authenticated;
