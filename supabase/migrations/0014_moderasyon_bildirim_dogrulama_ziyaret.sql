-- Aquagram — 0014: moderasyon bildirimleri, mavi tik talepleri, tür önerisi görselleri, ziyaret sayacı

-- ---------------------------------------------------------------------------
-- 0) Yeni bildirim türleri
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'post_like', 'post_comment', 'comment_like', 'feature_approved', 'feature_rejected', 'group_join', 'review', 'system',
  'content_removed', 'content_restored', 'ad_approved', 'ad_rejected', 'account_suspended', 'account_restored',
  'report_resolved', 'group_closed', 'group_reopened', 'verification_approved', 'verification_rejected',
  'suggestion_approved', 'suggestion_rejected'
));

-- ---------------------------------------------------------------------------
-- 1) Moderasyon kararları ilgili üyeye kısa gerekçeyle bildirilir
--    (şikâyet edenin kimliği hiçbir bildirimde yer almaz)
-- ---------------------------------------------------------------------------
create or replace function public.admin_remove_content(p_type text, p_id bigint, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid; v_post bigint; label text;
begin
  if not private.has_permission('content') then raise exception 'Yetkiniz yok.'; end if;
  if p_type = 'listing' then
    update public.listings set status = 'removed', removed_reason = p_reason where id = p_id returning user_id into owner;
    label := 'İlanın';
  elsif p_type = 'post' then
    update public.posts set is_removed = true, removed_reason = p_reason, removed_by = auth.uid() where id = p_id returning user_id into owner;
    label := 'Paylaşımın';
  elsif p_type = 'comment' then
    update public.comments set is_removed = true, removed_reason = p_reason where id = p_id returning user_id, post_id into owner, v_post;
    label := 'Yorumun';
  elsif p_type = 'species_comment' then
    update public.species_comments set is_removed = true, removed_reason = p_reason where id = p_id returning user_id into owner;
    label := 'Tür deneyimin';
  elsif p_type = 'review' then
    update public.reviews set is_hidden = true, hidden_reason = p_reason where id = p_id returning reviewer_id into owner;
    label := 'Değerlendirmen';
  else
    raise exception 'Bilinmeyen içerik türü: %', p_type;
  end if;
  perform private.notify(owner, null, 'content_removed',
    case when p_type = 'post' then p_id when p_type = 'comment' then v_post end,
    case when p_type = 'comment' then p_id end,
    case when p_type = 'listing' then p_id end,
    null, label || ' kaldırıldı' || coalesce(': ' || nullif(trim(p_reason), ''), ''));
  perform private.audit('content.remove', p_type, p_id::text, jsonb_build_object('reason', p_reason));
end; $$;

create or replace function public.admin_restore_content(p_type text, p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid; label text;
begin
  if not private.has_permission('content') then raise exception 'Yetkiniz yok.'; end if;
  if p_type = 'listing' then
    update public.listings set status = 'active', removed_reason = null where id = p_id and status = 'removed' returning user_id into owner;
    label := 'İlanın';
  elsif p_type = 'post' then
    update public.posts set is_removed = false, removed_reason = null, removed_by = null where id = p_id returning user_id into owner;
    label := 'Paylaşımın';
  elsif p_type = 'comment' then
    update public.comments set is_removed = false, removed_reason = null where id = p_id returning user_id into owner;
    label := 'Yorumun';
  elsif p_type = 'species_comment' then
    update public.species_comments set is_removed = false, removed_reason = null where id = p_id returning user_id into owner;
    label := 'Tür deneyimin';
  elsif p_type = 'review' then
    update public.reviews set is_hidden = false, hidden_reason = null where id = p_id returning reviewer_id into owner;
    label := 'Değerlendirmen';
  else
    raise exception 'Bilinmeyen içerik türü: %', p_type;
  end if;
  perform private.notify(owner, null, 'content_restored', case when p_type = 'post' then p_id end, null,
    case when p_type = 'listing' then p_id end, null, label || ' incelendi ve yeniden yayında');
  perform private.audit('content.restore', p_type, p_id::text, '{}'::jsonb);
end; $$;

create or replace function public.admin_resolve_report(p_report_id bigint, p_status text, p_resolution text default null, p_remove_content boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reports; reporter uuid;
begin
  if not private.has_permission('reports') then raise exception 'Yetkiniz yok.'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'Geçersiz durum.'; end if;
  select * into r from public.reports where id = p_report_id for update;
  if r.id is null then raise exception 'Şikâyet bulunamadı.'; end if;
  if p_remove_content and r.target_type in ('listing', 'post', 'comment', 'species_comment', 'review') then
    if not private.has_permission('content') then raise exception 'İçerik kaldırma yetkiniz yok.'; end if;
    perform public.admin_remove_content(r.target_type, r.target_id::bigint, coalesce(p_resolution, r.reason));
  end if;
  -- Şikâyet edenlere sonuç (yaptırımın ayrıntısı paylaşılmaz)
  for reporter in
    select distinct reporter_id from public.reports where target_type = r.target_type and target_id = r.target_id and status = 'open'
  loop
    perform private.notify(reporter, null, 'report_resolved', null, null, null, null,
      case when p_status = 'resolved' then 'Bildirdiğin içerik incelendi ve gerekli işlem yapıldı. Teşekkürler!'
           else 'Bildirdiğin içerik incelendi; topluluk kurallarına aykırı bulunmadı.' end);
  end loop;
  update public.reports
    set status = p_status, resolution = p_resolution, resolved_by = auth.uid(), resolved_at = now()
    where target_type = r.target_type and target_id = r.target_id and status = 'open';
  perform private.audit('report.' || p_status, r.target_type, r.target_id,
    jsonb_build_object('report_id', p_report_id, 'resolution', p_resolution, 'removed', p_remove_content));
end; $$;

create or replace function public.admin_review_ad(p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.ads;
begin
  if not private.has_permission('ads') then raise exception 'Yetkiniz yok.'; end if;
  select * into a from public.ads where id = p_id for update;
  if a.id is null or a.status <> 'pending' then raise exception 'Başvuru bulunamadı ya da zaten incelendi.'; end if;
  if p_approve then
    update public.ads set status = 'approved', starts_at = now(), ends_at = now() + make_interval(days => a.days),
      reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
    perform private.notify(a.advertiser_id, null, 'ad_approved', null, null, null, null, '“' || a.title || '” ' || a.days || ' gün boyunca yayında');
  else
    update public.ads set status = 'rejected', reject_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
    perform private.notify(a.advertiser_id, null, 'ad_rejected', null, null, null, null, '“' || a.title || '”' || coalesce(': ' || nullif(trim(p_reason), ''), ''));
  end if;
  perform private.audit(case when p_approve then 'ad.approve' else 'ad.reject' end, 'ad', p_id::text, jsonb_build_object('reason', p_reason));
end; $$;

create or replace function public.admin_suspend_user(p_user_id uuid, p_until timestamptz, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  if exists (select 1 from public.staff where user_id = p_user_id and role = 'super_admin') then
    raise exception 'Süper yönetici askıya alınamaz.';
  end if;
  update public.profiles set suspended_until = p_until, suspension_reason = p_reason where id = p_user_id;
  if p_until is null then
    perform private.notify(p_user_id, null, 'account_restored', null, null, null, null, 'Hesabındaki kısıtlama kaldırıldı.');
  else
    perform private.notify(p_user_id, null, 'account_suspended', null, null, null, null,
      case when p_until > now() + interval '100 years' then 'Süresiz' else to_char(p_until at time zone 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI') || ' tarihine kadar' end
      || coalesce(' · Gerekçe: ' || nullif(trim(p_reason), ''), ''));
  end if;
  perform private.audit(case when p_until is null then 'user.unsuspend' else 'user.suspend' end, 'user', p_user_id::text,
    jsonb_build_object('until', p_until, 'reason', p_reason));
end; $$;

create or replace function public.admin_set_group_closed(p_group_id uuid, p_closed boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare g public.groups;
begin
  if not private.has_permission('groups') then raise exception 'Yetkiniz yok.'; end if;
  update public.groups set is_closed = p_closed where id = p_group_id returning * into g;
  perform private.notify(g.owner_id, null, case when p_closed then 'group_closed' else 'group_reopened' end, null, null, null, p_group_id,
    g.name || case when p_closed then coalesce(' · Gerekçe: ' || nullif(trim(p_reason), ''), '') else '' end);
  perform private.audit(case when p_closed then 'group.close' else 'group.reopen' end, 'group', p_group_id::text, jsonb_build_object('reason', p_reason));
end; $$;

-- Tür önerisi sonuçlanınca öneren üyeye bildirim
create or replace function private.notify_species_suggestion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform private.notify(new.user_id, null, case when new.status = 'approved' then 'suggestion_approved' else 'suggestion_rejected' end,
      null, null, null, null, new.name);
  end if;
  return null;
end; $$;
create trigger species_suggestions_notify after update on public.species_suggestions
  for each row execute function private.notify_species_suggestion();

-- ---------------------------------------------------------------------------
-- 2) Tür önerisine görsel (en fazla 4)
-- ---------------------------------------------------------------------------
alter table public.species_suggestions add column if not exists images text[] not null default '{}'
  check (coalesce(array_length(images, 1), 0) <= 4);

-- ---------------------------------------------------------------------------
-- 3) Mavi tik (doğrulanmış üye) talepleri
--    Şartlar: profil resmi, kullanıcı adı, doğrulanmış e-posta ve telefon numarası.
--    SMS doğrulaması gelene kadar telefonu ekip elle teyit eder.
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone text not null check (phone ~ '^\+90 5[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 300),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index verification_one_pending on public.verification_requests (user_id) where status = 'pending';
create index on public.verification_requests (status, created_at);
alter table public.verification_requests enable row level security;
revoke insert, update, delete on public.verification_requests from anon, authenticated;
-- Telefon numarası yalnızca sahibine ve "Kullanıcılar" yetkili ekibe görünür
create policy "talebi sahibi ve yetkili görür" on public.verification_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('users')));

create or replace function public.request_verification(p_phone text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  p public.profiles;
  digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  formatted text;
  rid bigint;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into p from public.profiles where id = me;
  if p.phone_verified then raise exception 'Hesabın zaten doğrulanmış.'; end if;
  if p.avatar_url is null then raise exception 'Doğrulama için önce profil resmi eklemelisin.'; end if;
  if not exists (select 1 from auth.users where id = me and email_confirmed_at is not null) then
    raise exception 'Doğrulama için önce e-posta adresini doğrulamalısın.';
  end if;
  if not private.is_active_member() then raise exception 'Hesabın askıda olduğu için talep oluşturamazsın.'; end if;
  if digits ~ '^90' then digits := substr(digits, 3); end if;
  if digits ~ '^0' then digits := substr(digits, 2); end if;
  if digits !~ '^5[0-9]{9}$' then raise exception 'Geçerli bir cep telefonu numarası gir (5xx xxx xx xx).'; end if;
  formatted := '+90 ' || substr(digits, 1, 3) || ' ' || substr(digits, 4, 3) || ' ' || substr(digits, 7, 2) || ' ' || substr(digits, 9, 2);
  if exists (select 1 from public.verification_requests where user_id = me and status = 'pending') then
    raise exception 'Bekleyen bir doğrulama talebin zaten var.';
  end if;
  if exists (select 1 from public.verification_requests where user_id = me and created_at > now() - interval '1 day') then
    raise exception 'Günde en fazla bir doğrulama talebi gönderebilirsin.';
  end if;
  insert into public.verification_requests (user_id, phone) values (me, formatted) returning id into rid;
  return rid;
end; $$;

create or replace function public.admin_review_verification(p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.verification_requests;
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  select * into v from public.verification_requests where id = p_id for update;
  if v.id is null or v.status <> 'pending' then raise exception 'Talep bulunamadı ya da zaten incelendi.'; end if;
  update public.verification_requests
    set status = case when p_approve then 'approved' else 'rejected' end,
        reject_reason = case when p_approve then null else p_reason end,
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
  if p_approve then
    update public.profiles set phone_verified = true where id = v.user_id;
    perform private.notify(v.user_id, null, 'verification_approved', null, null, null, null, 'Profilinde artık mavi tik görünüyor.');
  else
    perform private.notify(v.user_id, null, 'verification_rejected', null, null, null, null, coalesce(nullif(trim(p_reason), ''), 'Bilgiler doğrulanamadı.'));
  end if;
  perform private.audit(case when p_approve then 'verification.approve' else 'verification.reject' end, 'user', v.user_id::text,
    jsonb_build_object('reason', p_reason));
end; $$;

revoke execute on function public.request_verification(text), public.admin_review_verification(bigint, boolean, text) from public, anon;
grant execute on function public.request_verification(text), public.admin_review_verification(bigint, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Ziyaret sayacı: kişisel veri tutmaz (IP, çerez, kullanıcı kimliği yok);
--    yalnızca gün + bölüm bazında sayfa görüntüleme ve oturum sayısı
-- ---------------------------------------------------------------------------
create table public.site_visits_daily (
  day date not null,
  section text not null check (section in ('home', 'listings', 'listing', 'community', 'post', 'group', 'kb', 'species', 'account', 'other')),
  views integer not null default 0,
  sessions integer not null default 0,
  primary key (day, section)
);
alter table public.site_visits_daily enable row level security;
revoke insert, update, delete on public.site_visits_daily from anon, authenticated;
create policy "ziyaret istatistiklerini ekip görür" on public.site_visits_daily for select to authenticated
  using ((select private.is_staff()));

create or replace function public.track_visit(p_section text, p_new_session boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.site_visits_daily (day, section, views, sessions)
  values ((now() at time zone 'Europe/Istanbul')::date,
          case when p_section in ('home', 'listings', 'listing', 'community', 'post', 'group', 'kb', 'species', 'account') then p_section else 'other' end,
          1, case when p_new_session then 1 else 0 end)
  on conflict (day, section) do update
    set views = public.site_visits_daily.views + 1,
        sessions = public.site_visits_daily.sessions + excluded.sessions;
$$;
revoke execute on function public.track_visit(text, boolean) from public;
grant execute on function public.track_visit(text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Özet sayfası: bekleyen doğrulama talepleri
-- ---------------------------------------------------------------------------
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
    'verifications_pending', (select count(*) from public.verification_requests where status = 'pending'),
    'suspended_users', (select count(*) from public.profiles where suspended_until > now())
  );
end; $$;

revoke execute on function private.notify_species_suggestion() from public;

-- ---------------------------------------------------------------------------
-- 6) Güvenlik: profiller yalnızca kayıt tetikleyicisiyle oluşur (mavi tik alanı dahil
--    hiçbir sütun istemciden eklenemez; RLS zaten engelliyordu, yetki de kaldırılır)
-- ---------------------------------------------------------------------------
revoke insert on public.profiles from anon, authenticated;
