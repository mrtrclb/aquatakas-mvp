-- Aquagram — 0039: üyelerin lokalite / varyete / ticari ad önerileri.
-- Üye öneri gönderir → "Türler" yetkili ekip onaylar ya da reddeder → onaylanınca species_forms'a eklenir,
-- öneren üyeye bildirim gider. Bekleyen öneriler yönetim panelindeki tür önerisi sayacına eklenir.

create table public.species_form_suggestions (
  id bigint generated always as identity primary key,
  species_id bigint not null references public.species(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('lokalite', 'varyete', 'ticari')),
  origin text not null default '' check (char_length(origin) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  aliases text[] not null default '{}',
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 4),
  source_url text check (source_url is null or char_length(source_url) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.species_form_suggestions (status, created_at desc);
create index on public.species_form_suggestions (user_id);
alter table public.species_form_suggestions enable row level security;

create policy "öneriyi sahibi ve editör görür" on public.species_form_suggestions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('species')));
create policy "üye lokalite önerir" on public.species_form_suggestions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

-- Bildirim türleri
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'post_like', 'post_comment', 'comment_like', 'feature_approved', 'feature_rejected', 'group_join', 'review', 'system',
  'content_removed', 'content_restored', 'ad_approved', 'ad_rejected', 'account_suspended', 'account_restored',
  'report_resolved', 'group_closed', 'group_reopened', 'verification_approved', 'verification_rejected',
  'suggestion_approved', 'suggestion_rejected', 'form_suggestion_approved', 'form_suggestion_rejected'
]));

-- Onay / ret: tek adımda forma ekler, bildirir, işlem kaydına yazar
create or replace function public.review_form_suggestion(p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.species_form_suggestions;
  sp_name text;
begin
  if not private.has_permission('species') then raise exception 'Yetkiniz yok.'; end if;
  select * into s from public.species_form_suggestions where id = p_id for update;
  if s.id is null then raise exception 'Öneri bulunamadı.'; end if;
  if s.status <> 'pending' then raise exception 'Bu öneri zaten sonuçlandırılmış.'; end if;
  select name into sp_name from public.species where id = s.species_id;

  if p_approve then
    insert into public.species_forms (species_id, name, kind, origin, note, aliases, images, source_url, position)
    values (s.species_id, s.name, s.kind, s.origin, s.note, s.aliases, s.images, s.source_url,
            coalesce((select max(position) from public.species_forms where species_id = s.species_id), 0) + 1)
    on conflict (species_id, name) do nothing;
  end if;

  update public.species_form_suggestions
     set status = case when p_approve then 'approved' else 'rejected' end,
         reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_id;

  perform private.notify(s.user_id, null, case when p_approve then 'form_suggestion_approved' else 'form_suggestion_rejected' end,
    null, null, null, null, left(coalesce(sp_name, '') || ' – ' || s.name || case when not p_approve and nullif(trim(p_reason), '') is not null then ' (' || trim(p_reason) || ')' else '' end, 300));
  perform private.audit('species_form_suggestion.review', 'species_form_suggestion', p_id::text,
    jsonb_build_object('species', sp_name, 'name', s.name, 'status', case when p_approve then 'approved' else 'rejected' end));
end; $$;
revoke execute on function public.review_form_suggestion(bigint, boolean, text) from public, anon;
grant execute on function public.review_form_suggestion(bigint, boolean, text) to authenticated;

-- Özet sayacı: tür önerileri + lokalite önerileri
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'Yetkiniz yok.'; end if;
  return jsonb_build_object(
    'members_total', (select count(*) from public.profiles where deleted_at is null),
    'members_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days' and deleted_at is null),
    'listings_active', (select count(*) from public.listings where status = 'active'),
    'listings_7d', (select count(*) from public.listings where created_at > now() - interval '7 days'),
    'posts_7d', (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'features_pending', (select count(*) from public.listing_features where status = 'pending'),
    'species_suggestions_pending', (select count(*) from public.species_suggestions where status = 'pending')
                                 + (select count(*) from public.species_form_suggestions where status = 'pending'),
    'form_suggestions_pending', (select count(*) from public.species_form_suggestions where status = 'pending'),
    'verifications_pending', (select count(*) from public.verification_requests where status = 'pending'),
    'suspended_users', (select count(*) from public.profiles where suspended_until > now()),
    'contact_open', case when private.has_permission('contact') then (select count(*) from public.contact_messages where status = 'open') else 0 end,
    'pro_active', (select count(*) from public.profiles where pro_until > now()),
    'pro_30d', (select count(*) from public.pro_purchases where created_at > now() - interval '30 days')
  );
end; $$;
