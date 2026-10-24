-- Aquagram — 0083: Ürünler ve markalar
-- Kategoriler, markalar, ürünler, 5 yıldızlı ürün değerlendirmeleri ve marka resmî yanıtı,
-- markayı sahiplenme başvurusu, video önerisi, üyelerin marka/ürün ekleme başvurusu (onayla yayına girer),
-- 12 aylık PRO ile 1 marka + 5 ürün ekleme hakkı, paylaşımlarda geçen ürünler (posts.product_slugs).

-- ---------- Kategoriler ----------
create table if not exists public.product_categories (
  id text primary key,
  name text not null,
  emoji text not null default '📦',
  description text not null default '',
  position integer not null default 0
);
alter table public.product_categories enable row level security;
create policy "ürün kategorileri herkese açık" on public.product_categories for select using (true);
create policy "ürün editörü kategori yönetir" on public.product_categories for all to authenticated
  using ((select private.has_permission('products'))) with check ((select private.has_permission('products')));

insert into public.product_categories (id, name, emoji, description, position) values
  ('filtreler', 'Filtreler', '🌀', 'Dış, iç, askı ve sünger filtreler', 1),
  ('yemler', 'Yemler', '🍤', 'Pul, granül, tablet, dondurulmuş ve canlı yemler', 2),
  ('su-duzenleyiciler', 'Su düzenleyiciler', '💧', 'Klor gidericiler, bakteri kültürleri, pH ve sertlik düzenleyiciler', 3),
  ('ilac-bakim', 'İlaç ve bakım', '🩺', 'Hastalık tedavisi ve önleyici bakım ürünleri', 4),
  ('testler', 'Su testleri', '🧪', 'Damla, şerit ve dijital su test ürünleri', 5),
  ('isiticilar', 'Isıtıcılar', '🌡️', 'Cam ve dijital akvaryum ısıtıcıları', 6),
  ('hava-motorlari', 'Hava motorları', '🫧', 'Hava motorları ve hava taşları', 7),
  ('aydinlatma', 'Aydınlatma', '💡', 'LED akvaryum aydınlatmaları', 8),
  ('zeminler', 'Kum ve zeminler', '🪨', 'Bitki toprakları, kumlar ve çakıllar', 9),
  ('bitki-co2', 'Bitki bakımı ve CO2', '🌿', 'Gübreler, CO2 setleri ve bitki bakım ürünleri', 10),
  ('filtre-malzemeleri', 'Filtre malzemeleri', '🧽', 'Seramik halka, sünger, aktif karbon ve biyolojik malzemeler', 11)
on conflict (id) do nothing;

-- ---------- Markalar ----------
create table if not exists public.brands (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 60),
  logo_url text,
  description text not null default '' check (char_length(description) <= 2000),
  country text,
  website text,
  distributor jsonb not null default '{}'::jsonb,   -- { name, website, phone, email, address }
  keywords text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'hidden')),
  owner_id uuid references public.profiles(id) on delete set null,  -- sahiplenmesi onaylanan marka hesabı
  submitted_by uuid references public.profiles(id) on delete set null,
  payment_status text,
  price numeric not null default 0,
  reject_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brands_status_idx on public.brands (status);
alter table public.brands enable row level security;

-- ---------- Ürünler ----------
create table if not exists public.products (
  id bigint generated always as identity primary key,
  slug text not null unique,
  brand_id bigint not null references public.brands(id) on delete cascade,
  category_id text not null references public.product_categories(id),
  name text not null check (char_length(name) between 2 and 120),
  model_code text,
  description text not null default '' check (char_length(description) <= 4000),
  facts jsonb not null default '[]'::jsonb,          -- [["Debi", "1400 l/sa"], ...]
  keywords text[] not null default '{}',
  images text[] not null default '{}',
  videos jsonb not null default '[]'::jsonb,         -- [{ "id": "<youtube id>", "title": "..." }]
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'hidden')),
  submitted_by uuid references public.profiles(id) on delete set null,
  payment_status text,
  price numeric not null default 0,
  reject_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists products_category_idx on public.products (category_id, status);
alter table public.products enable row level security;

create policy "yayındaki markalar herkese açık" on public.brands for select
  using (status = 'published' or submitted_by = (select auth.uid()) or owner_id = (select auth.uid()) or (select private.has_permission('products')));
create policy "üye marka başvurusu yapar" on public.brands for insert to authenticated
  with check (submitted_by = (select auth.uid()) or (select private.has_permission('products')));
create policy "ürün editörü marka düzenler" on public.brands for update to authenticated
  using ((select private.has_permission('products'))) with check ((select private.has_permission('products')));
create policy "ürün editörü marka siler" on public.brands for delete to authenticated
  using ((select private.has_permission('products')));

create policy "yayındaki ürünler herkese açık" on public.products for select
  using (status = 'published' or submitted_by = (select auth.uid()) or (select private.has_permission('products')));
create policy "üye ürün başvurusu yapar" on public.products for insert to authenticated
  with check (
    (select private.has_permission('products'))
    or (submitted_by = (select auth.uid()) and exists (
      select 1 from public.brands b where b.id = brand_id
        and (b.status = 'published' or b.submitted_by = (select auth.uid()) or b.owner_id = (select auth.uid()))))
  );
create policy "ürün editörü ürün düzenler" on public.products for update to authenticated
  using ((select private.has_permission('products'))) with check ((select private.has_permission('products')));
create policy "ürün editörü ürün siler" on public.products for delete to authenticated
  using ((select private.has_permission('products')));

-- Gizli sütunlar (ödeme, inceleyen, başvuran) yalnızca sahibine/ekibe görünümlerden açılır
revoke select on public.brands from anon, authenticated;
grant select (id, slug, name, logo_url, description, country, website, distributor, keywords, status, created_at, updated_at)
  on public.brands to anon, authenticated;
revoke select on public.products from anon, authenticated;
grant select (id, slug, brand_id, category_id, name, model_code, description, facts, keywords, images, videos, status, rating_avg, rating_count, created_at, updated_at)
  on public.products to anon, authenticated;

-- Üyenin kendi başvuruları
create or replace view public.my_catalog with (security_invoker = false) as
  select 'brand'::text as kind, id, slug, name, status, payment_status, price, reject_reason, created_at from public.brands where submitted_by = (select auth.uid())
  union all
  select 'product', id, slug, name, status, payment_status, price, reject_reason, created_at from public.products where submitted_by = (select auth.uid());
revoke all on public.my_catalog from anon, authenticated;
grant select on public.my_catalog to authenticated;

-- Yönetim paneli: tüm sütunlar
create or replace view public.admin_brands with (security_invoker = false) as
  select * from public.brands where (select private.has_permission('products'));
create or replace view public.admin_products with (security_invoker = false) as
  select * from public.products where (select private.has_permission('products'));
revoke all on public.admin_brands, public.admin_products from anon, authenticated;
grant select on public.admin_brands, public.admin_products to authenticated;

-- ---------- PRO: 12 aylık alımda 1 marka + 5 ürün ekleme hakkı ----------
alter table public.profiles add column if not exists brand_credits integer not null default 0 check (brand_credits >= 0);
alter table public.profiles add column if not exists product_credits integer not null default 0 check (product_credits >= 0);
-- Yeni sütunlar kendi profilim ve yönetim görünümlerine de gelsin
create or replace view public.my_profile with (security_invoker = false) as
  select * from public.profiles where id = (select auth.uid());
create or replace view public.admin_profiles with (security_invoker = false) as
  select * from public.profiles where (select private.is_staff());

create or replace function private.guard_profile_pro()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.pro_until is distinct from old.pro_until or new.message_bonus is distinct from old.message_bonus
      or new.feature_credits is distinct from old.feature_credits or new.ad_credits is distinct from old.ad_credits
      or new.brand_credits is distinct from old.brand_credits or new.product_credits is distinct from old.product_credits)
     and coalesce(current_setting('aquagram.pro_write', true), '') <> 'on'
     and not private.has_permission('users') then
    new.pro_until := old.pro_until;
    new.message_bonus := old.message_bonus;
    new.feature_credits := old.feature_credits;
    new.ad_credits := old.ad_credits;
    new.brand_credits := old.brand_credits;
    new.product_credits := old.product_credits;
  end if;
  return new;
end; $$;

create or replace function private.extend_pro(p_user uuid, p_months integer, p_plan text, p_price numeric, p_status text, p_by uuid, p_note text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  start_at timestamptz;
  end_at timestamptz;
  yearly boolean := p_months >= 12;
begin
  select greatest(coalesce(pro_until, now()), now()) into start_at from public.profiles where id = p_user;
  if start_at is null then raise exception 'Üye bulunamadı.'; end if;
  end_at := start_at + make_interval(months => p_months);
  perform set_config('aquagram.pro_write', 'on', true);
  update public.profiles
    set pro_until = end_at, message_bonus = message_bonus + 100,
        feature_credits = feature_credits + 2 * p_months, ad_credits = ad_credits + p_months,
        brand_credits = brand_credits + case when yearly then 1 else 0 end,
        product_credits = product_credits + case when yearly then 5 else 0 end
    where id = p_user;
  perform set_config('aquagram.pro_write', 'off', true);
  insert into public.pro_purchases (user_id, plan_id, months, price, payment_status, starts_at, ends_at, granted_by, note)
    values (p_user, p_plan, p_months, p_price, p_status, start_at, end_at, p_by, p_note);
  return end_at;
end; $$;

-- Ücretler (ödeme sistemi gelene kadar başvurular "simulated_paid" olarak onaya düşer)
insert into public.site_settings (key, value) values ('catalog_prices', '{"brand": 499, "product": 149}'::jsonb)
on conflict (key) do nothing;

-- Başvuru hazırlığı: üye eklerse durum "onay bekliyor", ücret ya da PRO hakkı işlenir
create or replace function private.prepare_catalog_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- Ekip ya da sunucu tarafı (göç/veri yükleme: oturum yok) doğrudan ekler
  is_editor boolean := private.has_permission('products') or (select auth.uid()) is null;
  kind text := case when tg_table_name = 'brands' then 'brand' else 'product' end;
  use_pro boolean := new.payment_status = 'pro_free';
  fee numeric;
begin
  new.slug := lower(new.slug);
  if is_editor then
    new.status := coalesce(new.status, 'published');
    return new;
  end if;
  new.submitted_by := (select auth.uid());
  select coalesce((value->>kind)::numeric, 0) into fee from public.site_settings where key = 'catalog_prices';
  if use_pro then
    if (select case when kind = 'brand' then brand_credits else product_credits end from public.profiles where id = new.submitted_by) < 1 then
      raise exception 'Kullanılabilir PRO % ekleme hakkın yok.', case when kind = 'brand' then 'marka' else 'ürün' end;
    end if;
    perform set_config('aquagram.pro_write', 'on', true);
    if kind = 'brand' then
      update public.profiles set brand_credits = brand_credits - 1 where id = new.submitted_by;
    else
      update public.profiles set product_credits = product_credits - 1 where id = new.submitted_by;
    end if;
    perform set_config('aquagram.pro_write', 'off', true);
  end if;
  if kind = 'product' then
    new.rating_avg := 0; new.rating_count := 0;
  end if;
  new.status := 'pending';
  new.payment_status := case when use_pro then 'pro_free' else 'simulated_paid' end;
  new.price := case when use_pro then 0 else coalesce(fee, 0) end;
  new.reviewed_by := null; new.reviewed_at := null; new.reject_reason := null;
  if kind = 'brand' then new.owner_id := null; end if;
  return new;
end; $$;
drop trigger if exists brands_prepare on public.brands;
create trigger brands_prepare before insert on public.brands for each row execute function private.prepare_catalog_submission();
drop trigger if exists products_prepare on public.products;
create trigger products_prepare before insert on public.products for each row execute function private.prepare_catalog_submission();

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists brands_touch on public.brands;
create trigger brands_touch before update on public.brands for each row execute function private.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();

-- Başvuruyu sonuçlandır (onay / ret): bildirim + PRO hakkı iadesi + işlem kaydı
create or replace function public.review_catalog_submission(p_kind text, p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_name text;
  v_status text;
  v_payment text;
begin
  if not private.has_permission('products') then raise exception 'Yetkiniz yok.'; end if;
  if p_kind = 'brand' then
    select submitted_by, name, status, payment_status into v_user, v_name, v_status, v_payment from public.brands where id = p_id for update;
  else
    select submitted_by, name, status, payment_status into v_user, v_name, v_status, v_payment from public.products where id = p_id for update;
  end if;
  if v_name is null then raise exception 'Kayıt bulunamadı.'; end if;
  if v_status <> 'pending' then raise exception 'Bu başvuru zaten sonuçlandırılmış.'; end if;

  if p_kind = 'brand' then
    update public.brands set status = case when p_approve then 'published' else 'rejected' end,
      reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
      reviewed_by = (select auth.uid()), reviewed_at = now(),
      owner_id = case when p_approve then submitted_by else owner_id end   -- markayı ekleyen üye marka hesabı olur
    where id = p_id;
  else
    update public.products set status = case when p_approve then 'published' else 'rejected' end,
      reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
      reviewed_by = (select auth.uid()), reviewed_at = now()
    where id = p_id;
  end if;

  if not p_approve and v_payment = 'pro_free' and v_user is not null then
    perform set_config('aquagram.pro_write', 'on', true);
    if p_kind = 'brand' then
      update public.profiles set brand_credits = brand_credits + 1 where id = v_user;
    else
      update public.profiles set product_credits = product_credits + 1 where id = v_user;
    end if;
    perform set_config('aquagram.pro_write', 'off', true);
  end if;

  perform private.notify(v_user, null, 'system', null, null, null, null,
    left(case when p_kind = 'brand' then 'Marka başvurun' else 'Ürün başvurun' end || ' (' || v_name || ') '
      || case when p_approve then 'onaylandı ve yayına alındı.' else 'reddedildi' || coalesce(': ' || nullif(trim(p_reason), ''), '.') end, 300));
  perform private.audit('catalog.review', p_kind, p_id::text,
    jsonb_build_object('name', v_name, 'status', case when p_approve then 'approved' else 'rejected' end));
end; $$;
revoke all on function public.review_catalog_submission(text, bigint, boolean, text) from public, anon;
grant execute on function public.review_catalog_submission(text, bigint, boolean, text) to authenticated;

-- ---------- Ürün değerlendirmeleri: yıldızlı paylaşım ----------
-- Değerlendirme akışta normal bir paylaşımdır (beğeni, yorum, şikâyet, moderasyon aynı); rated_product + rating taşır.
-- Ürün puanı: her üyenin o ürüne verdiği son (kaldırılmamış) puanların ortalaması.
alter table public.posts add column if not exists product_slugs text[] not null default '{}';
alter table public.posts add column if not exists rated_product text;
alter table public.posts add column if not exists rating smallint check (rating between 1 and 5);
alter table public.posts drop constraint if exists posts_rating_pair;
alter table public.posts add constraint posts_rating_pair check ((rating is null) = (rated_product is null));
create index if not exists posts_product_slugs_idx on public.posts using gin (product_slugs);
create index if not exists posts_rated_product_idx on public.posts (rated_product, created_at desc) where rated_product is not null;

create or replace function private.refresh_product_rating_for(p_slug text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_slug is null then return; end if;
  update public.products p set rating_count = s.cnt, rating_avg = coalesce(s.avg, 0)
  from (
    select count(*) cnt, round(avg(rating)::numeric, 2) avg from (
      select distinct on (user_id) rating from public.posts
      where rated_product = p_slug and not is_removed
      order by user_id, created_at desc
    ) latest
  ) s
  where p.slug = p_slug;
end; $$;

create or replace function private.posts_product_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform private.refresh_product_rating_for(old.rated_product); end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.rated_product is distinct from old.rated_product) then
    perform private.refresh_product_rating_for(new.rated_product);
  end if;
  return null;
end; $$;
drop trigger if exists posts_product_rating on public.posts;
create trigger posts_product_rating after insert or delete or update of rating, rated_product, is_removed on public.posts
  for each row execute function private.posts_product_rating();

-- Puanlanan ürün paylaşımın ürünleri arasında olmalı ve yayında olmalı
create or replace function private.posts_check_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.rated_product is not null then
    if not exists (select 1 from public.products where slug = new.rated_product and status = 'published') then
      raise exception 'Değerlendirilen ürün bulunamadı.';
    end if;
    if not (new.rated_product = any(new.product_slugs)) then
      new.product_slugs := array_append(new.product_slugs, new.rated_product);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists posts_check_rating on public.posts;
create trigger posts_check_rating before insert or update of rated_product, product_slugs on public.posts
  for each row execute function private.posts_check_rating();

-- Değerlendirme gelince marka hesabına bildirim
create or replace function private.notify_brand_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name text;
begin
  if new.rated_product is null then return null; end if;
  select b.owner_id, p.name into v_owner, v_name from public.products p join public.brands b on b.id = p.brand_id where p.slug = new.rated_product;
  if v_owner is not null then
    perform private.notify(v_owner, new.user_id, 'system', new.id, null, null, null, left(v_name || ' ürününe yeni değerlendirme: ' || new.rating || '/5', 300));
  end if;
  return null;
end; $$;
drop trigger if exists posts_notify_brand on public.posts;
create trigger posts_notify_brand after insert on public.posts for each row execute function private.notify_brand_review();

-- Marka hesapları (rozet için: resmî yanıtı veren hesap herkese görünür)
create or replace view public.brand_accounts with (security_invoker = false) as
  select id as brand_id, slug as brand_slug, owner_id from public.brands where status = 'published' and owner_id is not null;
grant select on public.brand_accounts to anon, authenticated;
create table if not exists public.brand_claims (
  id bigint generated always as identity primary key,
  brand_id bigint not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text not null check (char_length(company) between 2 and 120),
  contact_name text not null check (char_length(contact_name) between 2 and 80),
  title text check (title is null or char_length(title) <= 80),
  phone text check (phone is null or char_length(phone) <= 30),
  email text not null check (char_length(email) between 5 and 120),
  documents text[] not null default '{}',
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.brand_claims enable row level security;
create policy "üye kendi sahiplenme başvurusunu görür" on public.brand_claims for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('products')));
create policy "üye sahiplenme başvurusu yapar" on public.brand_claims for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending'
    and not exists (select 1 from public.brand_claims c where c.brand_id = brand_claims.brand_id and c.user_id = (select auth.uid()) and c.status = 'pending'));

create or replace function public.review_brand_claim(p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.brand_claims;
  v_name text;
begin
  if not private.has_permission('products') then raise exception 'Yetkiniz yok.'; end if;
  select * into c from public.brand_claims where id = p_id for update;
  if c.id is null then raise exception 'Başvuru bulunamadı.'; end if;
  if c.status <> 'pending' then raise exception 'Bu başvuru zaten sonuçlandırılmış.'; end if;
  select name into v_name from public.brands where id = c.brand_id;
  update public.brand_claims set status = case when p_approve then 'approved' else 'rejected' end,
    reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
    reviewed_by = (select auth.uid()), reviewed_at = now() where id = p_id;
  if p_approve then
    update public.brands set owner_id = c.user_id where id = c.brand_id;
  end if;
  perform private.notify(c.user_id, null, 'system', null, null, null, null,
    left(v_name || ' markasını sahiplenme başvurun ' || case when p_approve then 'onaylandı. Artık ürün değerlendirmelerine resmî yanıt verebilirsin.'
      else 'reddedildi' || coalesce(': ' || nullif(trim(p_reason), ''), '.') end, 300));
  perform private.audit('brand_claim.review', 'brand', c.brand_id::text,
    jsonb_build_object('brand', v_name, 'status', case when p_approve then 'approved' else 'rejected' end));
end; $$;
revoke all on function public.review_brand_claim(bigint, boolean, text) from public, anon;
grant execute on function public.review_brand_claim(bigint, boolean, text) to authenticated;

-- Sahiplenme belgeleri gizli depoda (yalnızca sahibi ve ürün editörü)
insert into storage.buckets (id, name, public) values ('brand-claims', 'brand-claims', false)
on conflict (id) do nothing;
create policy "üye sahiplenme belgesi yükler" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-claims' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sahiplenme belgesini sahibi ve editör görür" on storage.objects for select to authenticated
  using (bucket_id = 'brand-claims' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.has_permission('products'))));

-- ---------- Video önerisi ----------
create table if not exists public.product_video_suggestions (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text check (title is null or char_length(title) <= 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (product_id, youtube_id)
);
alter table public.product_video_suggestions enable row level security;
create policy "üye video önerir" on public.product_video_suggestions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "öneren ve editör görür" on public.product_video_suggestions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('products')));

create or replace function public.review_video_suggestion(p_id bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.product_video_suggestions;
begin
  if not private.has_permission('products') then raise exception 'Yetkiniz yok.'; end if;
  select * into s from public.product_video_suggestions where id = p_id for update;
  if s.id is null or s.status <> 'pending' then raise exception 'Öneri bulunamadı ya da sonuçlandırılmış.'; end if;
  update public.product_video_suggestions set status = case when p_approve then 'approved' else 'rejected' end where id = p_id;
  if p_approve then
    update public.products set videos = videos || jsonb_build_array(jsonb_build_object('id', s.youtube_id, 'title', coalesce(s.title, '')))
    where id = s.product_id and not (videos @> jsonb_build_array(jsonb_build_object('id', s.youtube_id)));
  end if;
end; $$;
revoke all on function public.review_video_suggestion(bigint, boolean) from public, anon;
grant execute on function public.review_video_suggestion(bigint, boolean) to authenticated;

-- ---------- Yönetim paneli sayacı ----------
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
    'pro_30d', (select count(*) from public.pro_purchases where created_at > now() - interval '30 days'),
    'catalog_pending', (select count(*) from public.brands where status = 'pending')
                     + (select count(*) from public.products where status = 'pending')
                     + (select count(*) from public.brand_claims where status = 'pending')
                     + (select count(*) from public.product_video_suggestions where status = 'pending')
  );
end; $$;

-- ---------- Ziyaret sayacı: ürün bölümleri ----------
create or replace function public.track_visit(p_section text, p_new_session boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.site_visits_daily (day, section, views, sessions)
  values ((now() at time zone 'Europe/Istanbul')::date,
          case when p_section in ('home', 'listings', 'listing', 'community', 'post', 'group', 'kb', 'species', 'account', 'products', 'product') then p_section else 'other' end,
          1, case when p_new_session then 1 else 0 end)
  on conflict (day, section) do update
    set views = public.site_visits_daily.views + 1,
        sessions = public.site_visits_daily.sessions + excluded.sessions;
$$;

-- ---------- Reklam yeri: ürün sayfası ----------
alter table public.ads drop constraint if exists ads_placement_check;
alter table public.ads add constraint ads_placement_check
  check (placement = any (array['feed', 'sidebar', 'detail', 'post', 'species', 'article', 'notification', 'product']));
