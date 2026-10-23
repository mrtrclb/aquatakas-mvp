-- Aquagram — 0058: Bildirim reklamı (7 gün · 299 TL)
-- Yayın süresince siteye giren her üyeye reklam BİR KEZ bildirim olarak düşer; bir üyeye günde en çok
-- 1 reklam bildirimi gider (aynı hafta birden çok reklam varsa sırayla, en az ulaşan önce).
-- Zamanlayıcı yok: üye siteyi açtığında claim_notification_ad() çağrılır, uygunsa bildirim o an oluşur.
-- Üye bildirime dokununca reklam kartı açılır; bildirimi çarpıyla silebilir (yeniden gönderilmez).

alter table public.ads drop constraint if exists ads_placement_check;
alter table public.ads add constraint ads_placement_check
  check (placement = any (array['feed','sidebar','detail','post','species','article','notification']));
alter table public.ads add column if not exists deliveries integer not null default 0;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['post_like','post_comment','comment_like','feature_approved','feature_rejected','group_join','review','system',
    'content_removed','content_restored','ad_approved','ad_rejected','account_suspended','account_restored','report_resolved',
    'group_closed','group_reopened','verification_approved','verification_rejected','suggestion_approved','suggestion_rejected',
    'form_suggestion_approved','form_suggestion_rejected','team_message','ad_notice']));
alter table public.notifications add column if not exists ad_id bigint references public.ads(id) on delete cascade;

-- Kime hangi reklam gitti (bildirim silinse de kayıt kalır; aynı reklam ikinci kez gönderilmez)
create table if not exists private.ad_deliveries (
  ad_id bigint not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (ad_id, user_id)
);
create index if not exists ad_deliveries_user_idx on private.ad_deliveries (user_id, delivered_at desc);

-- Üye kendi reklam bildirimini silebilir
create policy "reklam bildirimini siler" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()) and type = 'ad_notice');

create or replace function public.claim_notification_ad()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  today_start timestamptz := date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
  pick public.ads;
begin
  if me is null then return 0; end if;
  -- Bugün (Türkiye saatiyle) zaten bir reklam bildirimi aldıysa yeni gönderme
  if exists (select 1 from private.ad_deliveries where user_id = me and delivered_at >= today_start) then return 0; end if;
  select a.* into pick
    from public.ads a
    where a.placement = 'notification' and a.status = 'approved'
      and now() between a.starts_at and a.ends_at
      and a.advertiser_id is distinct from me
      and not exists (select 1 from private.ad_deliveries d where d.ad_id = a.id and d.user_id = me)
    order by a.deliveries, a.starts_at
    limit 1
    for update skip locked;
  if pick.id is null then return 0; end if;
  insert into private.ad_deliveries (ad_id, user_id) values (pick.id, me) on conflict do nothing;
  if not found then return 0; end if;
  update public.ads set deliveries = deliveries + 1 where id = pick.id;
  insert into public.notifications (user_id, actor_id, type, body, ad_id)
    values (me, null, 'ad_notice', left(pick.title, 280), pick.id);
  return 1;
end $$;
revoke execute on function public.claim_notification_ad() from public, anon;
grant execute on function public.claim_notification_ad() to authenticated;

-- Fiyat listesine bildirim reklamı paketi (Ayarlar'dan değiştirilebilir)
update public.site_settings
  set value = value || '[{"id":"notification-7g","days":7,"price":299,"placement":"notification"}]'::jsonb
  where key = 'ad_plans' and not (value @> '[{"placement":"notification"}]'::jsonb);
