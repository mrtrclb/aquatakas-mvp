-- Aquagram — 0065: Sütun bazlı okuma izinleri (veri mahremiyeti)
-- RLS satırları korur, sütunları değil. Herkese açık tablolarda yalnızca gösterilmesi gereken sütunlar okunabilir.
-- Gizli sütunlar: sahibine ve yetkili ekibe, filtreli (security definer) görünümlerden açılır.

-- ---------- profiles ----------
revoke select on public.profiles from anon, authenticated;
grant select (id, username, city, district, bio, avatar_url, socials, hide_from_search, phone_verified, created_at, pro_until, deleted_at)
  on public.profiles to anon, authenticated;
-- Gizli kalanlar: suspended_until, suspension_reason, last_seen_at, message_bonus, feature_credits, ad_credits

-- Kendi profilim (tüm sütunlar)
create or replace view public.my_profile with (security_invoker = false) as
  select * from public.profiles where id = (select auth.uid());
revoke all on public.my_profile from anon, authenticated;
grant select on public.my_profile to authenticated;

-- Yönetim paneli (tüm sütunlar, yalnızca ekip)
create or replace view public.admin_profiles with (security_invoker = false) as
  select * from public.profiles where (select private.is_staff());
revoke all on public.admin_profiles from anon, authenticated;
grant select on public.admin_profiles to authenticated;

-- ---------- ads ----------
revoke select on public.ads from anon, authenticated;
grant select (id, brand, title, text, cta, image_url, target_url, placement, status, starts_at, ends_at)
  on public.ads to anon, authenticated;
-- Gizli kalanlar: advertiser_id, plan_id, days, price, payment_status, reviewed_by, reviewed_at, reject_reason, impressions, clicks, created_at, deliveries

-- Reklamverenin kendi reklamları
create or replace view public.my_ads with (security_invoker = false) as
  select * from public.ads where advertiser_id = (select auth.uid());
revoke all on public.my_ads from anon, authenticated;
grant select on public.my_ads to authenticated;

-- Yönetim paneli reklam listesi
create or replace view public.admin_ads with (security_invoker = false) as
  select * from public.ads where (select private.has_permission('ads'));
revoke all on public.admin_ads from anon, authenticated;
grant select on public.admin_ads to authenticated;

-- ---------- site_settings: yasaklı kelime listesi yalnızca ayar yetkilisine ----------
alter policy "ayarlar herkese açık" on public.site_settings
  using (key <> 'banned_words' or (select private.has_permission('settings')));
