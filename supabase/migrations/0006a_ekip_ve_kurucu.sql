-- Aquagram — 0006a: ekip üyeliği pasifleştirme, kurucu otomatik süper yönetici, moderatör atama

-- Ekip üyeliği pasifleştirilebilir (kayıt silinmez, işlem kaydı korunur)
alter table public.staff add column active boolean not null default true;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()) and active and role = 'super_admin');
$$;
create or replace function private.has_permission(perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff
    where user_id = (select auth.uid()) and active
      and (role = 'super_admin' or perm = any(permissions))
  );
$$;
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()) and active);
$$;
create or replace function public.my_staff_role()
returns table (role text, permissions text[])
language sql stable security definer set search_path = '' as $$
  select s.role, case when s.role = 'super_admin'
    then array['reports','content','users','groups','tags','species','ads','settings'] else s.permissions end
  from public.staff s where s.user_id = (select auth.uid()) and s.active;
$$;

-- Kurucu e-postası API'ye kapalı bir tabloda; bu adresle kayıt olan ilk kişi süper yönetici olur.
-- NOT: Gerçek adres repoda tutulmaz; veritabanında doğrudan ayarlanmıştır.
create table private.config (key text primary key, value text not null);
insert into private.config (key, value) values ('founder_email', 'KURUCU_EPOSTA_ADRESI');

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'uye'));
  base := regexp_replace(base, '[^a-z0-9_.]', '', 'g');
  if char_length(base) < 3 then base := 'uye' || base; end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate::extensions.citext) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, city)
  values (new.id, candidate, nullif(new.raw_user_meta_data->>'city', ''));

  if lower(new.email) = (select lower(value) from private.config where key = 'founder_email')
     and not exists (select 1 from public.staff where role = 'super_admin') then
    insert into public.staff (user_id, role, permissions) values (new.id, 'super_admin', '{}');
  end if;
  return new;
end;
$$;

-- Süper yönetici: moderatör ekler / yetkilerini değiştirir / pasifleştirir
create or replace function public.admin_set_staff(p_user_id uuid, p_permissions text[], p_active boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Yalnızca süper yönetici ekip yönetebilir.'; end if;
  if p_user_id = auth.uid() then raise exception 'Kendi yetkinizi buradan değiştiremezsiniz.'; end if;
  insert into public.staff (user_id, role, permissions, active, created_by)
    values (p_user_id, 'moderator', coalesce(p_permissions, '{}'), p_active, auth.uid())
  on conflict (user_id) do update
    set permissions = coalesce(excluded.permissions, '{}'), active = excluded.active
    where public.staff.role = 'moderator';
  perform private.audit(case when p_active then 'staff.set' else 'staff.deactivate' end, 'user', p_user_id::text,
    jsonb_build_object('permissions', p_permissions));
end; $$;

revoke execute on function private.handle_new_user() from public;
revoke execute on function public.admin_set_staff(uuid, text[], boolean) from public, anon;
grant execute on function public.admin_set_staff(uuid, text[], boolean) to authenticated;
revoke execute on function public.my_staff_role() from public, anon;
grant execute on function public.my_staff_role() to authenticated;
