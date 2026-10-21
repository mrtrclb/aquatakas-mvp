-- Aquagram — 0017: mesaj kotası silinenleri de sayar (kalıcı silme ile açılır), PRO haklarının her alımda yenilenmesi

-- Kalıcı silme: sohbet üyenin kutusundan tamamen çıkar; eski mesajlar bir daha gösterilmez
alter table public.conversation_participants add column if not exists purged_at timestamptz;
alter table public.conversation_participants add column if not exists cleared_at timestamptz;

-- Kota: gelen kutusu + silinmiş mesajlar (kalıcı silinenler hariç)
create or replace function private.conversation_count(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.conversation_participants where user_id = p_user and purged_at is null;
$$;

create or replace function public.purge_conversations(p_ids bigint[])
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if (select auth.uid()) is null then raise exception 'Giriş yapmalısın.'; end if;
  update public.conversation_participants
    set purged_at = now(), cleared_at = now(), hidden_at = coalesce(hidden_at, now())
    where user_id = (select auth.uid()) and conversation_id = any(p_ids) and hidden_at is not null and purged_at is null;
  get diagnostics n = row_count;
  return n;
end; $$;
revoke execute on function public.purge_conversations(bigint[]) from public, anon;
grant execute on function public.purge_conversations(bigint[]) to authenticated;

-- Kalıcı silinen sohbete yeni mesaj gelirse sohbet yeniden açılır (yalnızca yeni mesajlar görünür)
create or replace function private.after_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set hidden_at = null, purged_at = null where conversation_id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end; $$;

create or replace function public.start_conversation(p_other uuid, p_topic text default 'Profil', p_listing_id bigint default null, p_species_id bigint default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); cid bigint; t text := coalesce(nullif(trim(p_topic), ''), 'Profil'); purged boolean;
begin
  if me is null then raise exception 'Giriş yapmalısınız.'; end if;
  if p_other = me then raise exception 'Kendinize mesaj gönderemezsiniz.'; end if;
  if not private.is_active_member() then raise exception 'Hesabınız askıya alınmış.'; end if;
  if private.is_blocked_between(me, p_other) then raise exception 'Bu kullanıcıyla mesajlaşamazsınız.'; end if;
  if exists (select 1 from public.profiles where id = p_other and deleted_at is not null) then
    raise exception 'Bu hesap silinmiş.';
  end if;

  select c.id, a.purged_at is not null into cid, purged
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = p_other
  where (t = 'Profil' or c.topic = t)
  order by c.last_message_at desc
  limit 1;

  if cid is null or purged then
    if private.conversation_count(me) >= private.conversation_limit(me) then
      raise exception 'Mesaj kutun dolu (% sohbet; gelen kutusu ve silinmiş mesajlar birlikte sayılır). Yer açmak için Silinmiş mesajlar sekmesinden sohbetleri kalıcı olarak sil ya da PRO ile +100 sohbet hakkı al.', private.conversation_limit(me);
    end if;
  end if;

  if cid is null then
    insert into public.conversations (topic, listing_id, species_id, created_by)
      values (t, p_listing_id, p_species_id, me) returning id into cid;
    insert into public.conversation_participants (conversation_id, user_id, last_read_at)
      values (cid, me, now()), (cid, p_other, null);
  else
    update public.conversation_participants set hidden_at = null, purged_at = null where conversation_id = cid and user_id = me;
  end if;
  return cid;
end; $$;

-- PRO hakları: her alım (ya da ekip tanımı) son 30 gün içinde ayrı hak sayılır
create or replace function private.pro_credits_left(p_user uuid, p_kind text)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  used integer;
  periods integer;
begin
  if not private.is_pro(p_user) then return 0; end if;
  select greatest(1, count(*)) into periods from public.pro_purchases
    where user_id = p_user and created_at > now() - interval '30 days';
  if p_kind = 'feature' then
    select count(*) into used from public.listing_features
      where user_id = p_user and payment_status = 'pro_free' and status <> 'rejected' and created_at > now() - interval '30 days';
    return greatest(0, 2 * periods - used);
  else
    select count(*) into used from public.ads
      where advertiser_id = p_user and payment_status = 'pro_free' and status <> 'rejected' and created_at > now() - interval '30 days';
    return greatest(0, 1 * periods - used);
  end if;
end; $$;

create or replace function public.my_pro_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  p public.profiles;
  pro boolean;
  bump_limit integer;
  periods integer;
begin
  if me is null then return null; end if;
  select * into p from public.profiles where id = me;
  pro := coalesce(p.pro_until > now(), false);
  bump_limit := case when pro then 3 else 1 end;
  select greatest(1, count(*)) into periods from public.pro_purchases where user_id = me and created_at > now() - interval '30 days';
  return jsonb_build_object(
    'pro', pro,
    'pro_until', p.pro_until,
    'bump_limit', bump_limit,
    'bumps_left', greatest(0, bump_limit - (select count(*) from public.listing_bumps where user_id = me and created_at >= private.istanbul_day_start())),
    'features_left', private.pro_credits_left(me, 'feature'),
    'features_total', case when pro then 2 * periods else 0 end,
    'ads_left', private.pro_credits_left(me, 'ad'),
    'ads_total', case when pro then periods else 0 end,
    'conversation_limit', private.conversation_limit(me),
    'conversation_count', private.conversation_count(me)
  );
end; $$;
