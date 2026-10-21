-- Aquagram — 0015: iletişim formu, hesap silme (içerik misafir adıyla kalır), yeni reklam alanları,
-- etiket kaldırma, sistem kullanımı (disk / e-posta) istatistikleri

-- ---------------------------------------------------------------------------
-- 1) Yeni reklam alanları: paylaşım detayı (yorumlardan önce) ve Bilgi Bankası tür sayfası (üstte)
-- ---------------------------------------------------------------------------
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
    where conrelid = 'public.ads'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%placement%';
  if cname is not null then execute 'alter table public.ads drop constraint ' || quote_ident(cname); end if;
end $$;
alter table public.ads add constraint ads_placement_check
  check (placement in ('feed', 'sidebar', 'detail', 'post', 'species'));

update public.site_settings
  set value = value
    || case when value @> '[{"placement":"post"}]' then '[]'::jsonb else '[{"id":"post-7g","placement":"post","days":7,"price":349}]'::jsonb end
    || case when value @> '[{"placement":"species"}]' then '[]'::jsonb else '[{"id":"species-7g","placement":"species","days":7,"price":149}]'::jsonb end
  where key = 'ad_plans';

-- ---------------------------------------------------------------------------
-- 2) İletişim formu
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 160),
  topic text not null check (topic in ('destek', 'oneri', 'hata', 'ilan', 'reklam', 'isbirligi', 'kvkk', 'diger')),
  body text not null check (char_length(body) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  note text check (char_length(note) <= 1000),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index on public.contact_messages (user_id);
create index on public.contact_messages (handled_by);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;
create policy "iletişim mesajlarını ekip görür" on public.contact_messages for select to authenticated
  using ((select private.has_permission('contact')));

-- Ekip yetkisi: iletişim
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
    where conrelid = 'public.staff'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%permissions%';
  if cname is not null then execute 'alter table public.staff drop constraint ' || quote_ident(cname); end if;
end $$;
alter table public.staff add constraint staff_permissions_check
  check (permissions <@ array['reports', 'content', 'users', 'groups', 'tags', 'species', 'ads', 'settings', 'contact']);

create or replace function public.submit_contact(p_name text, p_email text, p_topic text, p_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  mail text := lower(trim(p_email));
  rid bigint;
begin
  -- kötüye kullanım sınırı: aynı kişi/adres saatte en fazla 5 mesaj
  if (select count(*) from public.contact_messages
      where created_at > now() - interval '1 hour' and (email = mail or (me is not null and user_id = me))) >= 5 then
    raise exception 'Çok fazla mesaj gönderdin. Lütfen biraz sonra tekrar dene.';
  end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Çok fazla mesaj gönderdin. Lütfen biraz sonra tekrar dene.';
  end if;
  insert into public.contact_messages (user_id, name, email, topic, body)
    values (me, trim(p_name), mail, p_topic, trim(p_body))
    returning id into rid;
  return rid;
end; $$;
revoke execute on function public.submit_contact(text, text, text, text) from public;
grant execute on function public.submit_contact(text, text, text, text) to anon, authenticated;

create or replace function public.admin_update_contact(p_id bigint, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('contact') then raise exception 'Yetkiniz yok.'; end if;
  if p_status not in ('open', 'answered', 'closed') then raise exception 'Geçersiz durum.'; end if;
  update public.contact_messages
    set status = p_status, note = coalesce(nullif(trim(p_note), ''), note),
        handled_by = case when p_status = 'open' then null else auth.uid() end,
        handled_at = case when p_status = 'open' then null else now() end
    where id = p_id;
  if not found then raise exception 'Mesaj bulunamadı.'; end if;
  perform private.audit('contact.' || p_status, 'contact', p_id::text, jsonb_build_object('note', p_note));
end; $$;
revoke execute on function public.admin_update_contact(bigint, text, text) from public, anon;
grant execute on function public.admin_update_contact(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Hesap silme: profil anonimleşir, paylaşımlar "misafir_…" adıyla kalır
-- ---------------------------------------------------------------------------
alter table public.profiles add column deleted_at timestamptz;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  guest text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  if exists (select 1 from public.staff where user_id = me and role = 'super_admin' and active) then
    raise exception 'Süper yönetici hesabı silinemez. Önce yetkiyi başka bir hesaba devret.';
  end if;

  loop
    guest := 'misafir_' || substr(md5(me::text || clock_timestamp()::text || random()::text), 1, 8);
    exit when not exists (select 1 from public.profiles where username = guest::extensions.citext);
  end loop;

  -- herkese açık profil bilgileri silinir; paylaşım, yorum ve değerlendirmeler misafir adıyla kalır
  update public.profiles
    set username = guest, city = null, district = null, bio = null, avatar_url = null, socials = '{}'::jsonb,
        hide_from_search = true, phone_verified = false, deleted_at = now()
    where id = me;

  -- yayındaki ilanlar ve reklamlar kaldırılır (artık iletişim kurulamaz)
  update public.listings set status = 'removed', removed_reason = 'Hesap silindi' where user_id = me and status <> 'removed';
  update public.ads set status = 'ended', ends_at = least(coalesce(ends_at, now()), now())
    where advertiser_id = me and status in ('pending', 'approved');

  -- kişisel listeler ve kayıtlar
  delete from public.staff where user_id = me;
  delete from public.saved_listings where user_id = me;
  delete from public.post_saves where user_id = me;
  delete from public.tag_follows where user_id = me;
  delete from public.species_keepers where user_id = me;
  delete from public.species_favorites where user_id = me;
  delete from public.group_members where user_id = me;
  delete from public.user_blocks where blocker_id = me or blocked_id = me;
  delete from public.notifications where user_id = me or actor_id = me;
  delete from public.verification_requests where user_id = me;
  update public.conversation_participants set hidden_at = now() where user_id = me;

  -- giriş bilgileri: e-posta ve şifre geri döndürülemez şekilde silinir, oturumlar kapatılır
  update auth.users
    set email = 'silindi+' || replace(me::text, '-', '') || '@aquagram.invalid',
        encrypted_password = '', phone = null, raw_user_meta_data = '{}'::jsonb,
        email_change = '', email_change_token_new = '', email_change_token_current = '',
        recovery_token = '', confirmation_token = '',
        banned_until = '2999-12-31'::timestamptz, updated_at = now()
    where id = me;
  delete from auth.identities where user_id = me;
  delete from auth.sessions where user_id = me;
  delete from auth.refresh_tokens where user_id = me::text;
end; $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Silinmiş hesapla yeni konuşma başlatılamaz
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
    insert into public.conversations (topic, listing_id, species_id, created_by)
      values (t, p_listing_id, p_species_id, me) returning id into cid;
    insert into public.conversation_participants (conversation_id, user_id, last_read_at)
      values (cid, me, now()), (cid, p_other, null);
  else
    update public.conversation_participants set hidden_at = null where conversation_id = cid and user_id = me;
  end if;
  return cid;
end; $$;

-- ---------------------------------------------------------------------------
-- 4) Etiketi kaldır (yasaklamadan): paylaşımlardan silinir, metindeki # işareti kalkar
-- ---------------------------------------------------------------------------
create or replace function public.admin_remove_tag(p_tag text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  t text := lower(trim(leading '#' from trim(p_tag)));
  n integer;
begin
  if not private.has_permission('tags') then raise exception 'Yetkiniz yok.'; end if;
  if t !~ '^[[:alnum:]_çğıöşü]{2,40}$' then raise exception 'Geçersiz etiket.'; end if;
  update public.posts
    set text = regexp_replace(text, '#(' || t || ')(?![[:alnum:]_çğıöşüÇĞİÖŞÜ])', '\1', 'gi')
    where tags @> array[t];
  get diagnostics n = row_count;
  update public.posts set tags = array_remove(tags, t) where tags @> array[t];
  delete from public.tag_follows where tag = t::extensions.citext;
  perform private.audit('tag.remove', 'tag', t, jsonb_build_object('posts', n));
  return n;
end; $$;
revoke execute on function public.admin_remove_tag(text) from public, anon;
grant execute on function public.admin_remove_tag(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Sistem kullanımı: veritabanı ve dosya boyutu, gönderilen e-postalar (yaklaşık)
-- ---------------------------------------------------------------------------
create or replace function public.admin_system_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb;
begin
  if not (private.has_permission('settings')) then raise exception 'Yetkiniz yok.'; end if;
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket_id, 'files', files, 'bytes', bytes) order by bytes desc)
      from (select bucket_id, count(*) files, coalesce(sum((metadata->>'size')::bigint), 0) bytes
            from storage.objects group by bucket_id) s), '[]'::jsonb),
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object('table', relname, 'rows', n_live_tup, 'bytes', pg_total_relation_size(relid)) order by pg_total_relation_size(relid) desc)
      from (select * from pg_stat_user_tables where schemaname = 'public' order by pg_total_relation_size(relid) desc limit 8) t), '[]'::jsonb),
    -- Supabase her kullanıcı için yalnızca son gönderim zamanını tutar; sayılar alt sınırdır
    'emails', jsonb_build_object(
      'confirm_24h', (select count(*) from auth.users where confirmation_sent_at > now() - interval '24 hours'),
      'confirm_30d', (select count(*) from auth.users where confirmation_sent_at > now() - interval '30 days'),
      'recovery_24h', (select count(*) from auth.users where recovery_sent_at > now() - interval '24 hours'),
      'recovery_30d', (select count(*) from auth.users where recovery_sent_at > now() - interval '30 days'),
      'change_24h', (select count(*) from auth.users where email_change_sent_at > now() - interval '24 hours'),
      'change_30d', (select count(*) from auth.users where email_change_sent_at > now() - interval '30 days'),
      'unconfirmed', (select count(*) from auth.users where email_confirmed_at is null and email not like '%@aquagram.invalid')
    ),
    'deleted_accounts', (select count(*) from public.profiles where deleted_at is not null)
  ) into res;
  return res;
end; $$;
revoke execute on function public.admin_system_stats() from public, anon;
grant execute on function public.admin_system_stats() to authenticated;

-- Özet sayaçlarına açık iletişim mesajları
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
    'contact_open', case when private.has_permission('contact') then (select count(*) from public.contact_messages where status = 'open') else 0 end
  );
end; $$;
