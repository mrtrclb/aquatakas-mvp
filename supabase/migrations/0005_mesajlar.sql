-- Aquagram — 0005: mesajlaşma (konuşmalar, katılımcılar, mesajlar, engelleme)

create table public.conversations (
  id bigint generated always as identity primary key,
  topic text not null default 'Profil' check (char_length(topic) <= 140),
  listing_id bigint references public.listings(id) on delete set null,
  species_id bigint references public.species(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  hidden_at timestamptz,
  primary key (conversation_id, user_id)
);
create index on public.conversation_participants (user_id);
alter table public.conversation_participants enable row level security;
revoke update on public.conversation_participants from anon, authenticated;
grant update (last_read_at, hidden_at) on public.conversation_participants to authenticated;

create or replace function private.is_participant(cid bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_participants where conversation_id = cid and user_id = (select auth.uid()));
$$;

create policy "katılımcı konuşmayı görür" on public.conversations for select to authenticated
  using ((select private.is_participant(id)));
create policy "katılımcılar konuşmadakilere açık" on public.conversation_participants for select to authenticated
  using ((select private.is_participant(conversation_id)));
create policy "kendi okundu/gizle bilgisini günceller" on public.conversation_participants for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "kendi engelledikleri" on public.user_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "üye engeller" on public.user_blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "üye engeli kaldırır" on public.user_blocks for delete to authenticated using (blocker_id = (select auth.uid()));

create or replace function private.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;
revoke update on public.messages from anon, authenticated;

create policy "katılımcı mesajları görür" on public.messages for select to authenticated
  using ((select private.is_participant(conversation_id)));
create policy "katılımcı mesaj yazar" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid()) and (select private.is_active_member())
    and (select private.is_participant(conversation_id))
    and not exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id and p.user_id <> (select auth.uid())
        and private.is_blocked_between(p.user_id, (select auth.uid()))
    )
  );

create or replace function private.after_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set hidden_at = null where conversation_id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end; $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function private.after_message();

-- Konuşma başlat: ilan/tür konusu başına ayrı konuşma; "Profil" ile kişiyle son konuşma açılır
create or replace function public.start_conversation(
  p_other uuid, p_topic text default 'Profil', p_listing_id bigint default null, p_species_id bigint default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); cid bigint; t text := coalesce(nullif(trim(p_topic), ''), 'Profil');
begin
  if me is null then raise exception 'Giriş yapmalısınız.'; end if;
  if p_other = me then raise exception 'Kendinize mesaj gönderemezsiniz.'; end if;
  if not private.is_active_member() then raise exception 'Hesabınız askıya alınmış.'; end if;
  if private.is_blocked_between(me, p_other) then raise exception 'Bu kullanıcıyla mesajlaşamazsınız.'; end if;

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

-- Okunmamış mesaj sayısı (üst menü rozeti için)
create or replace function public.my_unread_count()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.messages m
  join public.conversation_participants p on p.conversation_id = m.conversation_id and p.user_id = (select auth.uid())
  where m.sender_id <> (select auth.uid()) and (p.last_read_at is null or m.created_at > p.last_read_at);
$$;

revoke execute on function private.after_message() from public;
revoke execute on function private.is_participant(bigint), private.is_blocked_between(uuid, uuid) from public;
grant execute on function private.is_participant(bigint), private.is_blocked_between(uuid, uuid) to authenticated;
revoke execute on function public.start_conversation(uuid, text, bigint, bigint), public.my_unread_count() from public, anon;
grant execute on function public.start_conversation(uuid, text, bigint, bigint), public.my_unread_count() to authenticated;
