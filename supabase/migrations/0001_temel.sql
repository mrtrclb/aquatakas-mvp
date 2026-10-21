-- Aquagram — 0001: temel yapı
-- profiller, yönetici/moderatör yetkileri, yardımcı fonksiyonlar, işlem kaydı, site ayarları

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- API'ye açılmayan yardımcı şema
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------
-- Profiller (auth.users ile 1-1)
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique
    check (username ~ '^[a-z0-9_.]{3,24}$'),
  city text,
  district text,
  bio text check (char_length(bio) <= 300),
  avatar_url text,
  socials jsonb not null default '{}'::jsonb,
  hide_from_search boolean not null default false,
  phone_verified boolean not null default false,
  suspended_until timestamptz,
  suspension_reason text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Üye profilleri; username @ işaretsiz saklanır.';

alter table public.profiles enable row level security;

-- Kullanıcı yalnızca kendi düzenlenebilir alanlarını güncelleyebilir (askı/doğrulama yönetici RPC ile)
revoke update on public.profiles from anon, authenticated;
grant update (username, city, district, bio, avatar_url, socials, hide_from_search, last_seen_at)
  on public.profiles to authenticated;

create policy "profiller herkese açık" on public.profiles
  for select to anon, authenticated using (true);
create policy "kendi profilini günceller" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Kayıt olunca otomatik profil
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'uye'));
  base := regexp_replace(base, '[^a-z0-9_.]', '', 'g');
  if char_length(base) < 3 then base := 'uye' || base; end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate::extensions.citext) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, city)
  values (new.id, candidate, nullif(new.raw_user_meta_data->>'city', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------
-- Yönetim ekibi ve yetkiler
-- role: super_admin (her şey) | moderator (yalnızca verilen yetkiler)
-- yetkiler: reports, content, users, groups, tags, species, ads, settings
-- ---------------------------------------------------------------
create table public.staff (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('super_admin', 'moderator')),
  permissions text[] not null default '{}'
    check (permissions <@ array['reports','content','users','groups','tags','species','ads','settings']),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);
alter table public.staff enable row level security;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()) and role = 'super_admin');
$$;

create or replace function private.has_permission(perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff
    where user_id = (select auth.uid())
      and (role = 'super_admin' or perm = any(permissions))
  );
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

create or replace function private.is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and (suspended_until is null or suspended_until < now())
  );
$$;

grant execute on function private.is_super_admin(), private.has_permission(text), private.is_staff(), private.is_active_member()
  to anon, authenticated;

create policy "ekip kendini, süper yönetici herkesi görür" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

-- Arayüzün "ben kimim / hangi yetkilerim var" sorusu için
create or replace function public.my_staff_role()
returns table (role text, permissions text[])
language sql stable security definer set search_path = '' as $$
  select s.role, case when s.role = 'super_admin'
    then array['reports','content','users','groups','tags','species','ads','settings'] else s.permissions end
  from public.staff s where s.user_id = (select auth.uid());
$$;
grant execute on function public.my_staff_role() to authenticated;

-- ---------------------------------------------------------------
-- Yönetici işlem kaydı (yalnızca fonksiyonlar yazar)
-- ---------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create policy "işlem kaydını ekip görür" on public.admin_audit_log
  for select to authenticated using ((select private.is_staff()));
create index on public.admin_audit_log (created_at desc);

create or replace function private.audit(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.admin_audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------
-- Site ayarları (duyuru bandı, yasaklı kelimeler, kural metinleri…)
-- ---------------------------------------------------------------
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.site_settings enable row level security;
create policy "ayarlar herkese açık" on public.site_settings for select to anon, authenticated using (true);
create policy "ayarları yetkili değiştirir" on public.site_settings for all to authenticated
  using ((select private.has_permission('settings'))) with check ((select private.has_permission('settings')));

insert into public.site_settings (key, value) values
  ('announcement', '{"active": false, "text": ""}'),
  ('banned_words', '[]'),
  ('community_rules', '["Saygılı ve yapıcı bir dil kullan.","Satış / takas için ilan ekle bölümünü kullan.","Hastalık ve tedavi konularında deneyimini paylaş, kesin teşhis koyma.","Görsellerde başkalarının izni olmadan kişi paylaşma."]'),
  ('featured_plans', '[{"id":"7g","days":7,"price":49},{"id":"30g","days":30,"price":149}]');

-- updated_at yardımcı tetikleyicisi
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;

-- Yardımcı fonksiyonlar varsayılan olarak herkese açık olmasın
revoke execute on all functions in schema private from public;
grant execute on function private.is_super_admin(), private.has_permission(text), private.is_staff(), private.is_active_member()
  to anon, authenticated;
revoke execute on function public.my_staff_role() from public, anon;
grant execute on function public.my_staff_role() to authenticated;
