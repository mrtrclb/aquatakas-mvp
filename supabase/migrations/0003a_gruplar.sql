-- Aquagram — 0003a: gruplar ve üyelikler

-- ---------------------------------------------------------------
-- Gruplar
-- ---------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 3 and 40),
  emoji text not null default '🐠',
  color text not null default 'bg-cyan-100',
  cover_url text,
  description text not null check (char_length(description) between 10 and 200),
  rules text[] not null default '{}' check (coalesce(array_length(rules, 1), 0) <= 10),
  owner_id uuid references public.profiles(id) on delete set null,
  is_official boolean not null default false,
  is_closed boolean not null default false,
  member_count int not null default 0,
  post_count int not null default 0,
  created_at timestamptz not null default now()
);
-- Her üye en fazla 1 (açık) grup kurabilir
create unique index groups_one_per_owner on public.groups (owner_id) where owner_id is not null and not is_closed;
alter table public.groups enable row level security;

revoke update on public.groups from anon, authenticated;
grant update (slug, name, emoji, color, cover_url, description, rules) on public.groups to authenticated;

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);
alter table public.group_members enable row level security;

create or replace function private.group_role(gid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select role from public.group_members where group_id = gid and user_id = (select auth.uid());
$$;
create or replace function private.is_group_mod(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.group_role(gid) in ('owner', 'moderator'), false);
$$;
create or replace function private.is_group_owner(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.group_role(gid) = 'owner', false);
$$;

create policy "açık gruplar herkese açık" on public.groups for select to anon, authenticated
  using (not is_closed or owner_id = (select auth.uid()) or (select private.has_permission('groups')));
create policy "üye grup kurar" on public.groups for insert to authenticated
  with check (owner_id = (select auth.uid()) and not is_official and not is_closed and (select private.is_active_member()));
create policy "kurucu ya da yetkili düzenler" on public.groups for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.has_permission('groups')))
  with check (owner_id = (select auth.uid()) or (select private.has_permission('groups')));

create policy "üyelikler herkese açık" on public.group_members for select to anon, authenticated using (true);
create policy "üye gruba katılır" on public.group_members for insert to authenticated
  with check (
    user_id = (select auth.uid()) and role = 'member'
    and exists (select 1 from public.groups g where g.id = group_id and not g.is_closed)
  );
create policy "üye ayrılır, kurucu üye çıkarır" on public.group_members for delete to authenticated
  using ((user_id = (select auth.uid()) and role <> 'owner') or (role <> 'owner' and (select private.is_group_owner(group_id))));
create policy "kurucu moderatör atar" on public.group_members for update to authenticated
  using ((select private.is_group_owner(group_id)) and role <> 'owner')
  with check (role in ('moderator', 'member'));

-- Grup kurulunca kurucu otomatik üye; moderatör sınırı 5
create or replace function private.after_group_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is not null then
    insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'owner')
    on conflict (group_id, user_id) do update set role = 'owner';
  end if;
  return new;
end; $$;
create trigger groups_after_insert after insert on public.groups
  for each row execute function private.after_group_insert();

create or replace function private.check_group_mod_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'moderator' and (select count(*) from public.group_members
      where group_id = new.group_id and role = 'moderator' and user_id <> new.user_id) >= 5 then
    raise exception 'Bir grupta en fazla 5 moderatör olabilir.';
  end if;
  return new;
end; $$;
create trigger group_members_mod_limit before insert or update of role on public.group_members
  for each row execute function private.check_group_mod_limit();

create or replace function private.count_group_members()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.groups set member_count = member_count + 1 where id = new.group_id;
  elsif tg_op = 'DELETE' then
    update public.groups set member_count = greatest(member_count - 1, 0) where id = old.group_id;
  end if;
  return null;
end; $$;
create trigger group_members_count after insert or delete on public.group_members
  for each row execute function private.count_group_members();

revoke execute on function private.group_role(uuid), private.is_group_mod(uuid), private.is_group_owner(uuid),
  private.after_group_insert(), private.check_group_mod_limit(), private.count_group_members() from public;
grant execute on function private.group_role(uuid), private.is_group_mod(uuid), private.is_group_owner(uuid) to anon, authenticated;
