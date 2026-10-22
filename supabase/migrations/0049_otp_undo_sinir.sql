-- Aquagram — 0049: SMS gönderilemeyen deneme günlük haktan düşmez
-- Geri alma yalnızca son 2 dakikadaki kayıt için ve silmeden ("undone") yapılır.
-- Günlük sınırlar: geri alınmamış 3 kod, geri alınanlar dahil toplam 8 deneme, numara başı 5 kod.
alter table private.phone_otp_log add column if not exists undone boolean not null default false;

create or replace function public.whatsapp_otp_undo(p_user uuid, p_phone text)
returns void language sql security definer set search_path = '' as $$
  update private.phone_otp_log set undone = true
  where id = (select id from private.phone_otp_log
              where user_id = p_user and phone = p_phone and not undone and created_at > now() - interval '2 minutes'
              order by id desc limit 1);
$$;
revoke execute on function public.whatsapp_otp_undo(uuid, text) from public, anon, authenticated;
grant execute on function public.whatsapp_otp_undo(uuid, text) to service_role;

create or replace function public.whatsapp_otp_start(p_phone text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  p public.profiles;
  e164 text;
  pretty text;
begin
  if me is null then raise exception 'Giriş yapmalısın.'; end if;
  select * into p from public.profiles where id = me;
  if p.phone_verified then raise exception 'Hesabın zaten doğrulanmış.'; end if;
  if p.avatar_url is null then raise exception 'Doğrulama için önce profil resmi eklemelisin.'; end if;
  if not exists (select 1 from auth.users where id = me and email_confirmed_at is not null) then
    raise exception 'Doğrulama için önce e-posta adresini doğrulamalısın.';
  end if;
  if not private.is_active_member() then raise exception 'Hesabın askıda olduğu için doğrulama yapamazsın.'; end if;
  e164 := private.normalize_tr_mobile(p_phone);
  pretty := '+90 ' || substr(e164, 4, 3) || ' ' || substr(e164, 7, 3) || ' ' || substr(e164, 10, 2) || ' ' || substr(e164, 12, 2);
  if exists (select 1 from public.verification_requests where phone = pretty and status = 'approved' and user_id <> me) then
    raise exception 'Bu numara başka bir hesapta doğrulanmış.';
  end if;
  if (select count(*) from private.phone_otp_log where user_id = me and not undone and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Günde en fazla 3 doğrulama kodu isteyebilirsin. Yarın tekrar dene.';
  end if;
  if (select count(*) from private.phone_otp_log where user_id = me and created_at > now() - interval '1 day') >= 8 then
    raise exception 'Bugün çok fazla deneme yapıldı. Yarın tekrar dene.';
  end if;
  if (select count(*) from private.phone_otp_log where phone = e164 and not undone and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Bu numaraya bugün çok fazla kod gönderildi. Yarın tekrar dene.';
  end if;
  if exists (select 1 from private.phone_otp_log where user_id = me and created_at > now() - interval '60 seconds') then
    raise exception 'Yeni kod istemeden önce 1 dakika bekle.';
  end if;
  insert into private.phone_otp_log (user_id, phone) values (me, e164);
  return e164;
end; $$;
revoke execute on function public.whatsapp_otp_start(text) from public, anon;
grant execute on function public.whatsapp_otp_start(text) to authenticated;
