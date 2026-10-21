-- Aquagram — 0016: PRO üyelik, ilanı üste taşıma, mesaj kutusu sınırı, PRO ücretsiz öne çıkarma/reklam hakları

-- ---------------------------------------------------------------------------
-- 1) PRO paketleri ve profil alanları
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('pro_plans', '[{"id":"pro-1a","months":1,"price":59},{"id":"pro-3a","months":3,"price":99},{"id":"pro-12a","months":12,"price":199}]')
on conflict (key) do nothing;

alter table public.profiles add column if not exists pro_until timestamptz;
alter table public.profiles add column if not exists message_bonus integer not null default 0 check (message_bonus >= 0);

-- Üyeler PRO süresini ve mesaj hakkını kendileri değiştiremez
create or replace function private.guard_profile_pro()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.pro_until is distinct from old.pro_until or new.message_bonus is distinct from old.message_bonus)
     and coalesce(current_setting('aquagram.pro_write', true), '') <> 'on'
     and not private.has_permission('users') then
    new.pro_until := old.pro_until;
    new.message_bonus := old.message_bonus;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_guard_pro on public.profiles;
create trigger profiles_guard_pro before update on public.profiles
  for each row execute function private.guard_profile_pro();

create table public.pro_purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text,
  months integer not null check (months between 1 and 36),
  price numeric not null default 0 check (price >= 0),
  payment_status text not null default 'simulated_paid' check (payment_status in ('simulated_paid', 'paid', 'refunded', 'granted')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  granted_by uuid references public.profiles(id) on delete set null,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index pro_purchases_user_idx on public.pro_purchases (user_id, created_at desc);
create index on public.pro_purchases (granted_by);
alter table public.pro_purchases enable row level security;
revoke all on public.pro_purchases from anon, authenticated;
grant select on public.pro_purchases to authenticated;
create policy "PRO alımlarını sahibi ve ekip görür" on public.pro_purchases for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('users')));

create or replace function private.is_pro(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pro_until > now() from public.profiles where id = p_user), false);
$$;

-- PRO süresini uzatır, mesaj hakkını +100 artırır (yalnızca sunucu içinden çağrılır)
create or replace function private.extend_pro(p_user uuid, p_months integer, p_plan text, p_price numeric, p_status text, p_by uuid, p_note text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  start_at timestamptz;
  end_at timestamptz;
begin
  select greatest(coalesce(pro_until, now()), now()) into start_at from public.profiles where id = p_user;
  if start_at is null then raise exception 'Üye bulunamadı.'; end if;
  end_at := start_at + make_interval(months => p_months);
  perform set_config('aquagram.pro_write', 'on', true);
  update public.profiles set pro_until = end_at, message_bonus = message_bonus + 100 where id = p_user;
  perform set_config('aquagram.pro_write', 'off', true);
  insert into public.pro_purchases (user_id, plan_id, months, price, payment_status, starts_at, ends_at, granted_by, note)
    values (p_user, p_plan, p_months, p_price, p_status, start_at, end_at, p_by, p_note);
  return end_at;
end; $$;

-- Üye PRO satın alır (ödeme altyapısı gelene kadar ödeme alınmadan hemen etkinleşir)
create or replace function public.buy_pro(p_plan text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  plan jsonb;
  end_at timestamptz;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.is_active_member() then raise exception 'Hesabın askıda olduğu için PRO alamazsın.'; end if;
  select e.value into plan
    from public.site_settings s cross join lateral jsonb_array_elements(s.value) as e(value)
    where s.key = 'pro_plans' and e.value->>'id' = p_plan;
  if plan is null then raise exception 'Geçersiz PRO paketi.'; end if;
  end_at := private.extend_pro(me, (plan->>'months')::int, p_plan, (plan->>'price')::numeric, 'simulated_paid', null, null);
  insert into public.notifications (user_id, actor_id, type, body)
    values (me, null, 'system', 'Aquagram PRO etkin! ' || to_char(end_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY') || ' tarihine kadar PRO ayrıcalıklarından yararlanabilirsin. 💎');
  return end_at;
end; $$;
revoke execute on function public.buy_pro(text) from public, anon;
grant execute on function public.buy_pro(text) to authenticated;

-- Yönetici PRO verir / kaldırır
create or replace function public.admin_grant_pro(p_user uuid, p_months integer, p_note text default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare end_at timestamptz;
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  if p_months not between 1 and 36 then raise exception 'Süre 1-36 ay arasında olmalı.'; end if;
  end_at := private.extend_pro(p_user, p_months, null, 0, 'granted', auth.uid(), nullif(trim(p_note), ''));
  insert into public.notifications (user_id, actor_id, type, body)
    values (p_user, null, 'system', 'Aquagram ekibi sana ' || p_months || ' aylık PRO üyelik tanımladı. 💎');
  perform private.audit('pro.grant', 'user', p_user::text, jsonb_build_object('months', p_months, 'note', p_note, 'until', end_at));
  return end_at;
end; $$;

create or replace function public.admin_revoke_pro(p_user uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('users') then raise exception 'Yetkiniz yok.'; end if;
  update public.profiles set pro_until = null where id = p_user;
  perform private.audit('pro.revoke', 'user', p_user::text, jsonb_build_object('note', p_note));
end; $$;
revoke execute on function public.admin_grant_pro(uuid, integer, text), public.admin_revoke_pro(uuid, text) from public, anon;
grant execute on function public.admin_grant_pro(uuid, integer, text), public.admin_revoke_pro(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) İlanı üste taşı: normal üye günde 1, PRO günde 3 (İstanbul saatiyle gün)
-- ---------------------------------------------------------------------------
alter table public.listings add column if not exists bumped_at timestamptz;
update public.listings set bumped_at = created_at where bumped_at is null;
alter table public.listings alter column bumped_at set default now();
alter table public.listings alter column bumped_at set not null;
create index if not exists listings_bumped_idx on public.listings (status, bumped_at desc);

-- Üye bumped_at'i doğrudan değiştiremez
create or replace function private.guard_listing_bump()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.bumped_at is distinct from old.bumped_at and coalesce(current_setting('aquagram.bump_write', true), '') <> 'on' then
    new.bumped_at := old.bumped_at;
  end if;
  return new;
end; $$;
drop trigger if exists listings_guard_bump on public.listings;
create trigger listings_guard_bump before update on public.listings
  for each row execute function private.guard_listing_bump();

create table public.listing_bumps (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index listing_bumps_user_idx on public.listing_bumps (user_id, created_at desc);
create index on public.listing_bumps (listing_id);
alter table public.listing_bumps enable row level security;
revoke all on public.listing_bumps from anon, authenticated;
grant select on public.listing_bumps to authenticated;
create policy "üye kendi üste taşımalarını görür" on public.listing_bumps for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.istanbul_day_start()
returns timestamptz language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Europe/Istanbul')) at time zone 'Europe/Istanbul';
$$;

create or replace function public.bump_listing(p_listing bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  l public.listings;
  lim integer;
  used integer;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if not private.is_active_member() then raise exception 'Hesabın askıda olduğu için ilan taşıyamazsın.'; end if;
  select * into l from public.listings where id = p_listing;
  if l.id is null or l.user_id <> me then raise exception 'İlan bulunamadı.'; end if;
  if l.status <> 'active' or (l.expires_at is not null and l.expires_at < now()) then raise exception 'Yalnızca yayındaki ilanlar üste taşınabilir.'; end if;
  lim := case when private.is_pro(me) then 3 else 1 end;
  select count(*) into used from public.listing_bumps where user_id = me and created_at >= private.istanbul_day_start();
  if used >= lim then
    raise exception 'Bugünkü üste taşıma hakkını kullandın (günde %). %', lim,
      case when lim = 1 then 'PRO üyelikle günde 3 kez taşıyabilirsin.' else 'Yarın yeniden taşıyabilirsin.' end;
  end if;
  perform set_config('aquagram.bump_write', 'on', true);
  update public.listings set bumped_at = now() where id = p_listing;
  perform set_config('aquagram.bump_write', 'off', true);
  insert into public.listing_bumps (listing_id, user_id) values (p_listing, me);
  return jsonb_build_object('left', lim - used - 1, 'limit', lim);
end; $$;
revoke execute on function public.bump_listing(bigint) from public, anon;
grant execute on function public.bump_listing(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) PRO ücretsiz öne çıkarma (30 günde 2) ve reklam (30 günde 1) hakları
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select conrelid::regclass::text as tbl, conname from pg_constraint
    where conrelid in ('public.listing_features'::regclass, 'public.ads'::regclass) and contype = 'c' and pg_get_constraintdef(oid) like '%payment_status%'
  loop
    execute 'alter table ' || r.tbl || ' drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;
alter table public.listing_features add constraint listing_features_payment_status_check
  check (payment_status in ('simulated_paid', 'paid', 'refunded', 'failed', 'pro_free'));
alter table public.ads add constraint ads_payment_status_check
  check (payment_status in ('simulated_paid', 'paid', 'refunded', 'failed', 'pro_free'));

create or replace function private.pro_credits_left(p_user uuid, p_kind text)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare used integer;
begin
  if not private.is_pro(p_user) then return 0; end if;
  if p_kind = 'feature' then
    select count(*) into used from public.listing_features
      where user_id = p_user and payment_status = 'pro_free' and status <> 'rejected' and created_at > now() - interval '30 days';
    return greatest(0, 2 - used);
  else
    select count(*) into used from public.ads
      where advertiser_id = p_user and payment_status = 'pro_free' and status <> 'rejected' and created_at > now() - interval '30 days';
    return greatest(0, 1 - used);
  end if;
end; $$;

create or replace function private.prepare_feature_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  plan jsonb;
  use_pro boolean := new.payment_status = 'pro_free';
begin
  select e.value into plan
  from public.site_settings s cross join lateral jsonb_array_elements(s.value) as e(value)
  where s.key = 'featured_plans' and e.value->>'id' = new.plan_id;
  if plan is null then raise exception 'Geçersiz öne çıkarma paketi: %', new.plan_id; end if;
  if use_pro and private.pro_credits_left(new.user_id, 'feature') < 1 then
    raise exception 'Bu ayki ücretsiz öne çıkarma hakkın kalmadı.';
  end if;
  new.days := (plan->>'days')::int;
  new.price := case when use_pro then 0 else (plan->>'price')::numeric end;
  new.payment_status := case when use_pro then 'pro_free' else 'simulated_paid' end;
  new.status := 'pending';
  new.starts_at := null; new.ends_at := null;
  new.reviewed_by := null; new.reviewed_at := null; new.reject_reason := null;
  return new;
end; $$;

create or replace function private.prepare_ad()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  plan jsonb;
  use_pro boolean := new.payment_status = 'pro_free';
begin
  select e.value into plan
  from public.site_settings s cross join lateral jsonb_array_elements(s.value) as e(value)
  where s.key = 'ad_plans' and e.value->>'id' = new.plan_id;
  if plan is null then raise exception 'Geçersiz reklam paketi: %', new.plan_id; end if;
  if use_pro and private.pro_credits_left(new.advertiser_id, 'ad') < 1 then
    raise exception 'Bu ayki ücretsiz reklam hakkın kalmadı.';
  end if;
  new.placement := plan->>'placement';
  new.days := (plan->>'days')::int;
  new.price := case when use_pro then 0 else (plan->>'price')::numeric end;
  new.payment_status := case when use_pro then 'pro_free' else 'simulated_paid' end;
  new.status := 'pending';
  new.starts_at := null; new.ends_at := null; new.reviewed_by := null; new.reviewed_at := null; new.reject_reason := null;
  new.impressions := 0; new.clicks := 0;
  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- 4) Mesaj kutusu: 20 sohbet + her PRO alımında +100
-- ---------------------------------------------------------------------------
create or replace function private.conversation_limit(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select 20 + coalesce((select message_bonus from public.profiles where id = p_user), 0);
$$;

create or replace function private.conversation_count(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.conversation_participants where user_id = p_user and hidden_at is null;
$$;

create or replace function public.start_conversation(p_other uuid, p_topic text default 'Profil', p_listing_id bigint default null, p_species_id bigint default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); cid bigint; t text := coalesce(nullif(trim(p_topic), ''), 'Profil');
begin
  if me is null then raise exception 'Giriş yapmalısınız.'; end if;
  if p_other = me then raise exception 'Kendinize mesaj gönderemezsiniz.'; end if;
  if not private.is_active_member() then raise exception 'Hesabınız askıya alınmış.'; end if;
  if private.is_blocked_between(me, p_other) then raise exception 'Bu kullanıcıyla mesajlaşamazsınız.'; end if;
  if exists (select 1 from public.profiles where id = p_other and deleted_at is not null) then
    raise exception 'Bu hesap silinmiş.';
  end if;

  select c.id into cid
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = p_other
  where (t = 'Profil' or c.topic = t)
  order by c.last_message_at desc
  limit 1;

  if cid is null then
    if private.conversation_count(me) >= private.conversation_limit(me) then
      raise exception 'Mesaj kutun dolu (% sohbet). Yeni sohbet başlatmak için eski sohbetlerinden birini sil ya da PRO ile +100 sohbet hakkı al.', private.conversation_limit(me);
    end if;
    insert into public.conversations (topic, listing_id, species_id, created_by)
      values (t, p_listing_id, p_species_id, me) returning id into cid;
    insert into public.conversation_participants (conversation_id, user_id, last_read_at)
      values (cid, me, now()), (cid, p_other, null);
  else
    if exists (select 1 from public.conversation_participants where conversation_id = cid and user_id = me and hidden_at is not null)
       and private.conversation_count(me) >= private.conversation_limit(me) then
      raise exception 'Mesaj kutun dolu (% sohbet). Yeni sohbet başlatmak için eski sohbetlerinden birini sil ya da PRO ile +100 sohbet hakkı al.', private.conversation_limit(me);
    end if;
    update public.conversation_participants set hidden_at = null where conversation_id = cid and user_id = me;
  end if;
  return cid;
end; $$;

-- ---------------------------------------------------------------------------
-- 5) Üyenin PRO durumu ve hakları (Hesabım sayfası)
-- ---------------------------------------------------------------------------
create or replace function public.my_pro_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  p public.profiles;
  pro boolean;
  bump_limit integer;
begin
  if me is null then return null; end if;
  select * into p from public.profiles where id = me;
  pro := coalesce(p.pro_until > now(), false);
  bump_limit := case when pro then 3 else 1 end;
  return jsonb_build_object(
    'pro', pro,
    'pro_until', p.pro_until,
    'bump_limit', bump_limit,
    'bumps_left', greatest(0, bump_limit - (select count(*) from public.listing_bumps where user_id = me and created_at >= private.istanbul_day_start())),
    'features_left', private.pro_credits_left(me, 'feature'),
    'ads_left', private.pro_credits_left(me, 'ad'),
    'conversation_limit', private.conversation_limit(me),
    'conversation_count', private.conversation_count(me)
  );
end; $$;
revoke execute on function public.my_pro_status() from public, anon;
grant execute on function public.my_pro_status() to authenticated;

-- Özet sayaçlarına PRO üye sayısı
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
    'species_suggestions_pending', (select count(*) from public.species_suggestions where status = 'pending'),
    'verifications_pending', (select count(*) from public.verification_requests where status = 'pending'),
    'suspended_users', (select count(*) from public.profiles where suspended_until > now()),
    'contact_open', case when private.has_permission('contact') then (select count(*) from public.contact_messages where status = 'open') else 0 end,
    'pro_active', (select count(*) from public.profiles where pro_until > now()),
    'pro_30d', (select count(*) from public.pro_purchases where created_at > now() - interval '30 days')
  );
end; $$;
