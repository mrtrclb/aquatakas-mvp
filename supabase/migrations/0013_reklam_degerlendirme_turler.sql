-- Aquagram — 0013: reklam verenin reklamını durdurması, alışveriş değerlendirmeleri, tür görselleri

-- ---------------------------------------------------------------------------
-- 1) Reklam veren kendi reklamını durdurur / bekleyen başvurusunu geri çeker
-- ---------------------------------------------------------------------------
create or replace function public.end_my_ad(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.ads
    set status = 'ended',
        ends_at = case when status = 'approved' then least(coalesce(ends_at, now()), now()) else ends_at end
    where id = p_id and advertiser_id = (select auth.uid()) and status in ('pending', 'approved');
  if not found then raise exception 'Reklam bulunamadı ya da zaten sona ermiş.'; end if;
end; $$;
revoke execute on function public.end_my_ad(bigint) from public, anon;
grant execute on function public.end_my_ad(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Alışveriş değerlendirmeleri (olumlu / nötr / olumsuz)
--    Yalnızca bir ilan üzerinden yazışmış iki taraf birbirini değerlendirebilir:
--    konuşma bir ilana bağlı olmalı, ilan sahibi taraflardan biri olmalı ve iki taraf da mesaj yazmış olmalı.
--    Her taraf bir konuşma için bir değerlendirme yapar; 30 gün içinde değiştirebilir.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id bigint generated always as identity primary key,
  conversation_id bigint references public.conversations(id) on delete set null,
  listing_id bigint references public.listings(id) on delete set null,
  listing_title text,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('buyer', 'seller')),
  rating text not null check (rating in ('positive', 'neutral', 'negative')),
  comment text check (char_length(comment) <= 500),
  reply text check (char_length(reply) <= 500),
  replied_at timestamptz,
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reviewer_id <> reviewee_id),
  unique (conversation_id, reviewer_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);
create index on public.reviews (reviewer_id);
create index on public.reviews (listing_id);
alter table public.reviews enable row level security;
revoke insert, update, delete on public.reviews from anon, authenticated; -- yazma yalnızca aşağıdaki işlevlerle

create policy "değerlendirmeler herkese açık" on public.reviews for select to anon, authenticated
  using (not is_hidden or reviewer_id = (select auth.uid()) or reviewee_id = (select auth.uid())
         or (select private.has_permission('content')));

create or replace function public.submit_review(p_conversation_id bigint, p_rating text, p_comment text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c public.conversations;
  other uuid;
  l public.listings;
  existing public.reviews;
  rid bigint;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.is_active_member() then raise exception 'Hesabın askıda olduğu için değerlendirme yapamazsın.'; end if;
  if p_rating not in ('positive', 'neutral', 'negative') then raise exception 'Geçersiz değerlendirme.'; end if;
  select * into c from public.conversations where id = p_conversation_id;
  if c.id is null or not exists (select 1 from public.conversation_participants where conversation_id = c.id and user_id = me) then
    raise exception 'Konuşma bulunamadı.';
  end if;
  if c.listing_id is null then raise exception 'Yalnızca bir ilan üzerinden yapılan alışverişler değerlendirilebilir.'; end if;
  select user_id into other from public.conversation_participants where conversation_id = c.id and user_id <> me limit 1;
  if other is null then raise exception 'Karşı taraf bulunamadı.'; end if;
  select * into l from public.listings where id = c.listing_id;
  if l.id is null or l.user_id not in (me, other) then raise exception 'İlan bulunamadı.'; end if;
  if not exists (select 1 from public.messages where conversation_id = c.id and sender_id = me)
     or not exists (select 1 from public.messages where conversation_id = c.id and sender_id = other) then
    raise exception 'Değerlendirme için iki tarafın da konuşmada mesaj yazmış olması gerekir.';
  end if;

  select * into existing from public.reviews where conversation_id = c.id and reviewer_id = me;
  if existing.id is not null then
    if existing.created_at < now() - interval '30 days' then raise exception 'Değerlendirme 30 gün sonra değiştirilemez.'; end if;
    update public.reviews set rating = p_rating, comment = nullif(trim(p_comment), ''), updated_at = now()
      where id = existing.id;
    return existing.id;
  end if;

  insert into public.reviews (conversation_id, listing_id, listing_title, reviewer_id, reviewee_id, reviewer_role, rating, comment)
    values (c.id, l.id, l.title, me, other, case when l.user_id = me then 'seller' else 'buyer' end, p_rating, nullif(trim(p_comment), ''))
    returning id into rid;
  perform private.notify(other, me, 'review', null, null, l.id, null,
    case p_rating when 'positive' then 'Olumlu' when 'neutral' then 'Nötr' else 'Olumsuz' end);
  return rid;
end; $$;

-- Değerlendirilen kişi bir kez (sonradan düzenleyebilir) kısa bir yanıt yazabilir
create or replace function public.reply_review(p_review_id bigint, p_reply text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.reviews set reply = nullif(trim(p_reply), ''), replied_at = now()
    where id = p_review_id and reviewee_id = (select auth.uid());
  if not found then raise exception 'Değerlendirme bulunamadı.'; end if;
end; $$;

revoke execute on function public.submit_review(bigint, text, text), public.reply_review(bigint, text) from public, anon;
grant execute on function public.submit_review(bigint, text, text), public.reply_review(bigint, text) to authenticated;

-- Yeni bildirim türü: değerlendirme
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%post_like%';
  if cname is not null then execute 'alter table public.notifications drop constraint ' || quote_ident(cname); end if;
end $$;
alter table public.notifications add constraint notifications_type_check
  check (type in ('post_like', 'post_comment', 'comment_like', 'feature_approved', 'feature_rejected', 'group_join', 'review', 'system'));

-- Değerlendirmeler de şikâyet edilebilir ve yönetimden gizlenebilir
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%target_type%';
  if cname is not null then execute 'alter table public.reports drop constraint ' || quote_ident(cname); end if;
end $$;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('listing', 'post', 'comment', 'species_comment', 'message', 'user', 'group', 'review'));

create or replace function public.admin_remove_content(p_type text, p_id bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('content') then raise exception 'Yetkiniz yok.'; end if;
  if p_type = 'listing' then
    update public.listings set status = 'removed', removed_reason = p_reason where id = p_id;
  elsif p_type = 'post' then
    update public.posts set is_removed = true, removed_reason = p_reason, removed_by = auth.uid() where id = p_id;
  elsif p_type = 'comment' then
    update public.comments set is_removed = true, removed_reason = p_reason where id = p_id;
  elsif p_type = 'species_comment' then
    update public.species_comments set is_removed = true, removed_reason = p_reason where id = p_id;
  elsif p_type = 'review' then
    update public.reviews set is_hidden = true, hidden_reason = p_reason where id = p_id;
  else
    raise exception 'Bilinmeyen içerik türü: %', p_type;
  end if;
  perform private.audit('content.remove', p_type, p_id::text, jsonb_build_object('reason', p_reason));
end; $$;

create or replace function public.admin_restore_content(p_type text, p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('content') then raise exception 'Yetkiniz yok.'; end if;
  if p_type = 'listing' then
    update public.listings set status = 'active', removed_reason = null where id = p_id and status = 'removed';
  elsif p_type = 'post' then
    update public.posts set is_removed = false, removed_reason = null, removed_by = null where id = p_id;
  elsif p_type = 'comment' then
    update public.comments set is_removed = false, removed_reason = null where id = p_id;
  elsif p_type = 'species_comment' then
    update public.species_comments set is_removed = false, removed_reason = null where id = p_id;
  elsif p_type = 'review' then
    update public.reviews set is_hidden = false, hidden_reason = null where id = p_id;
  else
    raise exception 'Bilinmeyen içerik türü: %', p_type;
  end if;
  perform private.audit('content.restore', p_type, p_id::text, '{}'::jsonb);
end; $$;

create or replace function public.admin_resolve_report(p_report_id bigint, p_status text, p_resolution text default null, p_remove_content boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  if not private.has_permission('reports') then raise exception 'Yetkiniz yok.'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'Geçersiz durum.'; end if;
  select * into r from public.reports where id = p_report_id for update;
  if r.id is null then raise exception 'Şikâyet bulunamadı.'; end if;
  if p_remove_content and r.target_type in ('listing', 'post', 'comment', 'species_comment', 'review') then
    if not private.has_permission('content') then raise exception 'İçerik kaldırma yetkiniz yok.'; end if;
    perform public.admin_remove_content(r.target_type, r.target_id::bigint, coalesce(p_resolution, r.reason));
  end if;
  update public.reports
    set status = p_status, resolution = p_resolution, resolved_by = auth.uid(), resolved_at = now()
    where target_type = r.target_type and target_id = r.target_id and status = 'open';
  perform private.audit('report.' || p_status, r.target_type, r.target_id,
    jsonb_build_object('report_id', p_report_id, 'resolution', p_resolution, 'removed', p_remove_content));
end; $$;

-- ---------------------------------------------------------------------------
-- 3) Tür görselleri: birden fazla görsel (ilki kapak)
-- ---------------------------------------------------------------------------
alter table public.species add column images text[] not null default '{}'
  check (coalesce(array_length(images, 1), 0) <= 12);
update public.species set images = array[image_url] where image_url is not null and images = '{}';
