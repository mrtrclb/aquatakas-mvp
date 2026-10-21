-- Aquagram — 0002: ilanlar, öne çıkarma başvuruları, kayıtlı ilanlar

create type public.listing_type as enum ('sale', 'trade', 'free', 'wanted');
create type public.listing_status as enum ('active', 'sold', 'removed', 'expired');

create table public.listings (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null,
  tags text[] not null default '{}',
  type public.listing_type not null,
  city text not null,
  district text,
  neighborhood text,
  price numeric(12, 2) check (price is null or price >= 0),
  allow_offer boolean not null default false,
  youtube_url text,
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 10),
  species_slugs text[] not null default '{}',
  status public.listing_status not null default 'active',
  featured_until timestamptz,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);
create index listings_feed_idx on public.listings (status, created_at desc);
create index listings_user_idx on public.listings (user_id);
create index listings_city_idx on public.listings (city, district);
create index listings_category_idx on public.listings (category);
create index listings_tags_idx on public.listings using gin (tags);
create index listings_species_idx on public.listings using gin (species_slugs);
create index listings_title_trgm_idx on public.listings using gin (title extensions.gin_trgm_ops);

create trigger listings_touch before update on public.listings
  for each row execute function private.touch_updated_at();

alter table public.listings enable row level security;

-- Sahibi yalnızca içerik alanlarını değiştirebilir; öne çıkarma ve kaldırma bilgisi yönetici fonksiyonlarıyla
revoke update on public.listings from anon, authenticated;
grant update (title, description, category, tags, type, city, district, neighborhood, price, allow_offer,
  youtube_url, images, species_slugs, status, expires_at) on public.listings to authenticated;

create policy "aktif ilanlar herkese açık" on public.listings for select to anon, authenticated
  using (status = 'active' or user_id = (select auth.uid()) or (select private.has_permission('content')));
create policy "üye ilan verir" on public.listings for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'active' and (select private.is_active_member()));
create policy "sahibi günceller" on public.listings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status <> 'removed');
create policy "sahibi siler" on public.listings for delete to authenticated
  using (user_id = (select auth.uid()));

-- Yönetici tarafından kaldırılan ilanı sahibi yeniden yayına alamaz
create or replace function private.guard_listing_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'removed' and new.status <> 'removed' and not private.has_permission('content') then
    raise exception 'Bu ilan yönetici tarafından kaldırıldı.';
  end if;
  return new;
end; $$;
create trigger listings_guard_status before update of status on public.listings
  for each row execute function private.guard_listing_status();

-- ---------------------------------------------------------------
-- Öne çıkarma başvuruları: her zaman onaya düşer.
-- Ödeme şimdilik "simulated_paid"; ödeme entegrasyonu gelince gerçek durum yazılacak.
-- ---------------------------------------------------------------
create table public.listing_features (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  plan_id text not null,
  days int not null default 0,
  price numeric(10, 2) not null default 0,
  payment_status text not null default 'simulated_paid' check (payment_status in ('simulated_paid', 'paid', 'refunded', 'failed')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
create index on public.listing_features (status, created_at);
create index on public.listing_features (listing_id);
alter table public.listing_features enable row level security;

create policy "başvuruyu sahibi ve yetkili görür" on public.listing_features for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('ads')));
create policy "sahibi kendi ilanı için başvurur" on public.listing_features for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid()) and l.status = 'active')
  );

-- Başvuruda istemciden gelen fiyat/durum yok sayılır; plan bilgisi site ayarlarından okunur
create or replace function private.prepare_feature_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan jsonb;
begin
  select e.value into plan
  from public.site_settings s cross join lateral jsonb_array_elements(s.value) as e(value)
  where s.key = 'featured_plans' and e.value->>'id' = new.plan_id;
  if plan is null then raise exception 'Geçersiz öne çıkarma paketi: %', new.plan_id; end if;
  new.days := (plan->>'days')::int;
  new.price := (plan->>'price')::numeric;
  new.payment_status := 'simulated_paid';
  new.status := 'pending';
  new.starts_at := null; new.ends_at := null;
  new.reviewed_by := null; new.reviewed_at := null; new.reject_reason := null;
  return new;
end; $$;
create trigger listing_features_prepare before insert on public.listing_features
  for each row execute function private.prepare_feature_request();

create or replace function public.admin_review_feature(p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.listing_features;
begin
  if not private.has_permission('ads') then raise exception 'Yetkiniz yok.'; end if;
  select * into f from public.listing_features where id = p_id for update;
  if f.id is null or f.status <> 'pending' then raise exception 'Başvuru bulunamadı ya da zaten incelendi.'; end if;
  if p_approve then
    update public.listing_features
      set status = 'approved', starts_at = now(), ends_at = now() + make_interval(days => f.days),
          reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_id;
    update public.listings
      set featured_until = greatest(coalesce(featured_until, now()), now()) + make_interval(days => f.days)
      where id = f.listing_id;
  else
    update public.listing_features
      set status = 'rejected', reject_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_id;
  end if;
  perform private.audit(case when p_approve then 'feature.approve' else 'feature.reject' end,
    'listing', f.listing_id::text, jsonb_build_object('request_id', p_id, 'reason', p_reason));
end; $$;

-- ---------------------------------------------------------------
-- Kayıtlı ilanlar (yalnızca sahibine açık)
-- ---------------------------------------------------------------
create table public.saved_listings (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.saved_listings enable row level security;
create policy "kendi kayıtları" on public.saved_listings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke execute on function private.guard_listing_status(), private.prepare_feature_request() from public;
revoke execute on function public.admin_review_feature(bigint, boolean, text) from public, anon;
grant execute on function public.admin_review_feature(bigint, boolean, text) to authenticated;
