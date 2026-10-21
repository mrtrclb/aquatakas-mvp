-- Aquagram — 0006c: reklam başvuruları, onay, gösterim/tıklama sayacı

insert into public.site_settings (key, value) values
  ('ad_plans', '[{"id":"feed-7g","placement":"feed","days":7,"price":299},{"id":"sidebar-7g","placement":"sidebar","days":7,"price":399},{"id":"detail-7g","placement":"detail","days":7,"price":249}]')
on conflict (key) do nothing;

create table public.ads (
  id bigint generated always as identity primary key,
  advertiser_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  brand text not null check (char_length(brand) between 2 and 40),
  title text not null check (char_length(title) between 4 and 80),
  text text not null default '' check (char_length(text) <= 160),
  cta text not null default 'İncele' check (char_length(cta) <= 20),
  image_url text,
  target_url text check (target_url is null or target_url ~ '^https?://'),
  placement text not null default 'feed' check (placement in ('feed', 'sidebar', 'detail')),
  plan_id text not null,
  days int not null default 0,
  price numeric(10, 2) not null default 0,
  payment_status text not null default 'simulated_paid' check (payment_status in ('simulated_paid', 'paid', 'refunded', 'failed')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  reject_reason text,
  impressions int not null default 0,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
create index ads_live_idx on public.ads (status, placement, ends_at);
alter table public.ads enable row level security;
revoke update on public.ads from anon, authenticated;
grant update (brand, title, text, cta, image_url, target_url) on public.ads to authenticated;

create policy "yayındaki reklamlar herkese açık" on public.ads for select to anon, authenticated
  using ((status = 'approved' and now() between starts_at and ends_at)
         or advertiser_id = (select auth.uid()) or (select private.has_permission('ads')));
create policy "üye reklam başvurusu yapar" on public.ads for insert to authenticated
  with check (advertiser_id = (select auth.uid()) and (select private.is_active_member()));
create policy "reklam veren bekleyen başvurusunu düzenler" on public.ads for update to authenticated
  using (advertiser_id = (select auth.uid()) and status = 'pending')
  with check (advertiser_id = (select auth.uid()) and status = 'pending');

create or replace function private.prepare_ad()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan jsonb;
begin
  select e.value into plan
  from public.site_settings s cross join lateral jsonb_array_elements(s.value) as e(value)
  where s.key = 'ad_plans' and e.value->>'id' = new.plan_id;
  if plan is null then raise exception 'Geçersiz reklam paketi: %', new.plan_id; end if;
  new.placement := plan->>'placement';
  new.days := (plan->>'days')::int;
  new.price := (plan->>'price')::numeric;
  new.payment_status := 'simulated_paid';
  new.status := 'pending';
  new.starts_at := null; new.ends_at := null; new.reviewed_by := null; new.reviewed_at := null; new.reject_reason := null;
  new.impressions := 0; new.clicks := 0;
  return new;
end; $$;
create trigger ads_prepare before insert on public.ads for each row execute function private.prepare_ad();

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
  else
    update public.ads set status = 'rejected', reject_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  end if;
  perform private.audit(case when p_approve then 'ad.approve' else 'ad.reject' end, 'ad', p_id::text, jsonb_build_object('reason', p_reason));
end; $$;

-- Gösterim / tıklama sayacı (ziyaretçiler de çağırabilir; yalnızca yayındaki reklamı sayar)
create or replace function public.track_ad(p_id bigint, p_click boolean default false)
returns void language sql security definer set search_path = '' as $$
  update public.ads
    set impressions = impressions + case when p_click then 0 else 1 end,
        clicks = clicks + case when p_click then 1 else 0 end
    where id = p_id and status = 'approved' and now() between starts_at and ends_at;
$$;

revoke execute on function private.prepare_ad() from public;
revoke execute on function public.admin_review_ad(bigint, boolean, text) from public, anon;
grant execute on function public.admin_review_ad(bigint, boolean, text) to authenticated;
revoke execute on function public.track_ad(bigint, boolean) from public;
grant execute on function public.track_ad(bigint, boolean) to anon, authenticated;
