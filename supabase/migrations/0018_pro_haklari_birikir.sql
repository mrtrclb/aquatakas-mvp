-- Aquagram — 0018: PRO ücretsiz öne çıkarma/reklam hakları birikir, süre bitse de silinmez.
-- Her alımda ay başına 2 öne çıkarma + 1 reklam hakkı eklenir; kullanım 30 günde en fazla 2 öne çıkarma + 1 reklam.
-- Reddedilen başvuruda kullanılan hak geri verilir.

alter table public.profiles add column if not exists feature_credits integer not null default 0 check (feature_credits >= 0);
alter table public.profiles add column if not exists ad_credits integer not null default 0 check (ad_credits >= 0);

-- Mevcut alımlardan bakiye: ay × hak − bugüne kadar kullanılan (reddedilmeyen) ücretsiz başvurular
update public.profiles p set
  feature_credits = greatest(0, coalesce((select sum(months) * 2 from public.pro_purchases where user_id = p.id), 0)
    - (select count(*) from public.listing_features where user_id = p.id and payment_status = 'pro_free' and status <> 'rejected')),
  ad_credits = greatest(0, coalesce((select sum(months) from public.pro_purchases where user_id = p.id), 0)
    - (select count(*) from public.ads where advertiser_id = p.id and payment_status = 'pro_free' and status <> 'rejected'))
where exists (select 1 from public.pro_purchases where user_id = p.id);

-- Üyeler bakiyeyi kendileri değiştiremez
create or replace function private.guard_profile_pro()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.pro_until is distinct from old.pro_until or new.message_bonus is distinct from old.message_bonus
      or new.feature_credits is distinct from old.feature_credits or new.ad_credits is distinct from old.ad_credits)
     and coalesce(current_setting('aquagram.pro_write', true), '') <> 'on'
     and not private.has_permission('users') then
    new.pro_until := old.pro_until;
    new.message_bonus := old.message_bonus;
    new.feature_credits := old.feature_credits;
    new.ad_credits := old.ad_credits;
  end if;
  return new;
end; $$;

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
  update public.profiles
    set pro_until = end_at, message_bonus = message_bonus + 100,
        feature_credits = feature_credits + 2 * p_months, ad_credits = ad_credits + p_months
    where id = p_user;
  perform set_config('aquagram.pro_write', 'off', true);
  insert into public.pro_purchases (user_id, plan_id, months, price, payment_status, starts_at, ends_at, granted_by, note)
    values (p_user, p_plan, p_months, p_price, p_status, start_at, end_at, p_by, p_note);
  return end_at;
end; $$;

-- Kullanılabilir hak: bakiye ile 30 günlük kullanım sınırının küçüğü (PRO süresi bitse de bakiye kullanılabilir)
create or replace function private.pro_credits_left(p_user uuid, p_kind text)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  balance integer;
  used integer;
begin
  if p_kind = 'feature' then
    select feature_credits into balance from public.profiles where id = p_user;
    select count(*) into used from public.listing_features
      where user_id = p_user and payment_status = 'pro_free' and status <> 'rejected' and created_at > now() - interval '30 days';
    return greatest(0, least(coalesce(balance, 0), 2 - used));
  else
    select ad_credits into balance from public.profiles where id = p_user;
    select count(*) into used from public.ads
      where advertiser_id = p_user and payment_status = 'pro_free' and status <> 'rejected' and created_at > now() - interval '30 days';
    return greatest(0, least(coalesce(balance, 0), 1 - used));
  end if;
end; $$;

create or replace function private.spend_pro_credit(p_user uuid, p_kind text, p_delta integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('aquagram.pro_write', 'on', true);
  if p_kind = 'feature' then
    update public.profiles set feature_credits = greatest(0, feature_credits + p_delta) where id = p_user;
  else
    update public.profiles set ad_credits = greatest(0, ad_credits + p_delta) where id = p_user;
  end if;
  perform set_config('aquagram.pro_write', 'off', true);
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
  if use_pro then
    if private.pro_credits_left(new.user_id, 'feature') < 1 then
      raise exception 'Kullanılabilir ücretsiz öne çıkarma hakkın yok (30 günde en fazla 2 kullanılabilir).';
    end if;
    perform private.spend_pro_credit(new.user_id, 'feature', -1);
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
  if use_pro then
    if private.pro_credits_left(new.advertiser_id, 'ad') < 1 then
      raise exception 'Kullanılabilir ücretsiz reklam hakkın yok (30 günde en fazla 1 kullanılabilir).';
    end if;
    perform private.spend_pro_credit(new.advertiser_id, 'ad', -1);
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

-- Reddedilen ya da onay beklerken geri çekilen ücretsiz başvuruda hak iade edilir
create or replace function private.refund_pro_credit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_status = 'pro_free' and old.status = 'pending' and new.status in ('rejected', 'ended') then
    if tg_table_name = 'listing_features' then
      perform private.spend_pro_credit(new.user_id, 'feature', 1);
    else
      perform private.spend_pro_credit(new.advertiser_id, 'ad', 1);
    end if;
  end if;
  return null;
end; $$;
drop trigger if exists listing_features_refund_pro on public.listing_features;
create trigger listing_features_refund_pro after update of status on public.listing_features
  for each row execute function private.refund_pro_credit();
drop trigger if exists ads_refund_pro on public.ads;
create trigger ads_refund_pro after update of status on public.ads
  for each row execute function private.refund_pro_credit();

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
    'features_balance', p.feature_credits,
    'ads_left', private.pro_credits_left(me, 'ad'),
    'ads_balance', p.ad_credits,
    'conversation_limit', private.conversation_limit(me),
    'conversation_count', private.conversation_count(me)
  );
end; $$;
