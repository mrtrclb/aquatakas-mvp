-- Aquagram — 0003e: etiketler paylaşım satırında dizi olarak tutulur (ayrı tabloya gerek yok)
-- Yasaklama / birleştirme silme yerine güncelleme ile yapılır.
alter table public.posts add column tags text[] not null default '{}';
create index posts_tags_idx on public.posts using gin (tags);
alter table public.banned_tags add column active boolean not null default true;

create or replace function private.extract_post_tags()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.tags := coalesce(array(
    select distinct lower(m[1])
    from regexp_matches(coalesce(new.text, ''), '#([[:alnum:]_çğıöşüÇĞİÖŞÜ]{2,40})', 'g') as m
    where not exists (
      select 1 from public.banned_tags b where b.active and b.tag = lower(m[1])::extensions.citext
    )
  ), '{}');
  return new;
end; $$;
create trigger posts_extract_tags before insert or update of text on public.posts
  for each row execute function private.extract_post_tags();

create or replace view public.tag_counts with (security_invoker = true) as
  select t.tag::extensions.citext as tag, count(*)::int as post_count, max(p.created_at) as last_used_at
  from public.posts p cross join lateral unnest(p.tags) as t(tag)
  where not p.is_removed
  group by t.tag;

create or replace function public.admin_ban_tag(p_tag text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t text := lower(trim(leading '#' from p_tag));
begin
  if not private.has_permission('tags') then raise exception 'Yetkiniz yok.'; end if;
  insert into public.banned_tags (tag, reason, created_by, active) values (t::extensions.citext, p_reason, auth.uid(), true)
    on conflict (tag) do update set reason = excluded.reason, active = true;
  update public.posts set tags = array_remove(tags, t) where tags @> array[t];
  perform private.audit('tag.ban', 'tag', t, jsonb_build_object('reason', p_reason));
end; $$;

create or replace function public.admin_unban_tag(p_tag text)
returns void language plpgsql security definer set search_path = '' as $$
declare t text := lower(trim(leading '#' from p_tag));
begin
  if not private.has_permission('tags') then raise exception 'Yetkiniz yok.'; end if;
  update public.banned_tags set active = false where tag = t::extensions.citext;
  perform private.audit('tag.unban', 'tag', t, '{}'::jsonb);
end; $$;

-- #eski etiketini #yeni etiketine çevirir; takipçileri de taşır
create or replace function public.admin_merge_tag(p_from text, p_to text)
returns void language plpgsql security definer set search_path = '' as $$
declare a text := lower(trim(leading '#' from p_from));
        b text := lower(trim(leading '#' from p_to));
begin
  if not private.has_permission('tags') then raise exception 'Yetkiniz yok.'; end if;
  update public.posts
    set tags = array(select distinct x from unnest(array_replace(tags, a, b)) as x)
    where tags @> array[a];
  update public.tag_follows f set tag = b::extensions.citext
    where f.tag = a::extensions.citext
      and not exists (select 1 from public.tag_follows g where g.user_id = f.user_id and g.tag = b::extensions.citext);
  perform private.audit('tag.merge', 'tag', a, jsonb_build_object('into', b));
end; $$;

comment on table public.post_tags is 'Kullanılmıyor: etiketler posts.tags dizisinde. İlk temizlikte kaldırılacak.';

revoke execute on function private.extract_post_tags() from public;
revoke execute on function public.admin_ban_tag(text, text), public.admin_unban_tag(text), public.admin_merge_tag(text, text) from public, anon;
grant execute on function public.admin_ban_tag(text, text), public.admin_unban_tag(text), public.admin_merge_tag(text, text) to authenticated;
