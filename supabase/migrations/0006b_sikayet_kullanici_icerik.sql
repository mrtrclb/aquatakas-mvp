-- Aquagram — 0006b: şikâyetler, içerik kaldırma/geri alma, kullanıcı yönetimi, gösterge paneli

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'post', 'comment', 'species_comment', 'message', 'user', 'group')),
  target_id text not null,
  reason text not null check (char_length(reason) between 2 and 120),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_queue_idx on public.reports (status, created_at);
create unique index reports_one_open_per_target on public.reports (reporter_id, target_type, target_id) where status = 'open';
alter table public.reports enable row level security;
create policy "şikâyeti sahibi ve yetkili görür" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.has_permission('reports')));
create policy "üye şikâyet eder" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and (select private.is_active_member()));

-- İçeriği kaldır (ilan / paylaşım / yorum / tür deneyimi); işlem kaydına yazılır
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
  else
    raise exception 'Bilinmeyen içerik türü: %', p_type;
  end if;
  perform private.audit('content.restore', p_type, p_id::text, '{}'::jsonb);
end; $$;

-- Şikâyeti sonuçlandır; istenirse aynı anda içeriği kaldır
create or replace function public.admin_resolve_report(p_report_id bigint, p_status text, p_resolution text default null, p_remove_content boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  if not private.has_permission('reports') then raise exception 'Yetkiniz yok.'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'Geçersiz durum.'; end if;
  select * into r from public.reports where id = p_report_id for update;
  if r.id is null then raise exception 'Şikâyet bulunamadı.'; end if;
  if p_remove_content and r.target_type in ('listing', 'post', 'comment', 'species_comment') then
    if not private.has_permission('content') then raise exception 'İçerik kaldırma yetkiniz yok.'; end if;
    perform public.admin_remove_content(r.target_type, r.target_id::bigint, coalesce(p_resolution, r.reason));
  end if;
  -- Aynı içerik için açık tüm şikâyetler birlikte kapanır
  update public.reports
    set status = p_status, resolution = p_resolution, resolved_by = auth.uid(), resolved_at = now()
    where target_type = r.target_type and target_id = r.target_id and status = 'open';
  perform private.audit('report.' || p_status, r.target_type, r.target_id,
    jsonb_build_object('report_id', p_report_id, 'resolution', p_resolution, 'removed', p_remove_content));
end; $$;

-- Kullanıcı askıya alma / kaldırma / telefon doğrulama
create or replace function public.admin_suspend_user(p_user_id uuid, p_until timestamptz, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  if exists (select 1 from public.staff where user_id = p_user_id and role = 'super_admin') then
    raise exception 'Süper yönetici askıya alınamaz.';
  end if;
  update public.profiles set suspended_until = p_until, suspension_reason = p_reason where id = p_user_id;
  perform private.audit(case when p_until is null then 'user.unsuspend' else 'user.suspend' end, 'user', p_user_id::text,
    jsonb_build_object('until', p_until, 'reason', p_reason));
end; $$;

create or replace function public.admin_set_phone_verified(p_user_id uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  update public.profiles set phone_verified = p_verified where id = p_user_id;
  perform private.audit('user.phone_verified', 'user', p_user_id::text, jsonb_build_object('verified', p_verified));
end; $$;

-- Yalnızca 'users' yetkisi olan ekip e-posta görebilir
create or replace function public.admin_user_private_info(p_user_id uuid)
returns table (email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  return query select u.email::text, u.email_confirmed_at, u.last_sign_in_at, u.created_at from auth.users u where u.id = p_user_id;
end; $$;

-- Gösterge paneli sayıları
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'Yetkiniz yok.'; end if;
  return jsonb_build_object(
    'members_total', (select count(*) from public.profiles),
    'members_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'listings_active', (select count(*) from public.listings where status = 'active'),
    'listings_7d', (select count(*) from public.listings where created_at > now() - interval '7 days'),
    'posts_7d', (select count(*) from public.posts where created_at > now() - interval '7 days'),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'features_pending', (select count(*) from public.listing_features where status = 'pending'),
    'species_suggestions_pending', (select count(*) from public.species_suggestions where status = 'pending'),
    'suspended_users', (select count(*) from public.profiles where suspended_until > now())
  );
end; $$;

revoke execute on function public.admin_remove_content(text, bigint, text), public.admin_restore_content(text, bigint),
  public.admin_resolve_report(bigint, text, text, boolean), public.admin_suspend_user(uuid, timestamptz, text),
  public.admin_set_phone_verified(uuid, boolean), public.admin_user_private_info(uuid), public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_remove_content(text, bigint, text), public.admin_restore_content(text, bigint),
  public.admin_resolve_report(bigint, text, text, boolean), public.admin_suspend_user(uuid, timestamptz, text),
  public.admin_set_phone_verified(uuid, boolean), public.admin_user_private_info(uuid), public.admin_dashboard_stats() to authenticated;
