-- Aquagram — 0047: WhatsApp ile telefon doğrulaması (Twilio Verify)
-- Akış: üye numarasını yazar → whatsapp-verify fonksiyonu Twilio'dan WhatsApp kodu gönderir →
-- üye kodu girer → Twilio onaylarsa mavi tik (profiles.phone_verified) otomatik verilir.
-- Elle doğrulama talebi (request_verification) yedek olarak kalır.

-- Kod gönderim kaydı (kötüye kullanım sınırları ve doğrulanan numaranın eşleşmesi için)
create table if not exists private.phone_otp_log (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null, -- E.164: +905xxxxxxxxx
  created_at timestamptz not null default now()
);
create index if not exists phone_otp_log_user_idx on private.phone_otp_log (user_id, created_at desc);
create index if not exists phone_otp_log_phone_idx on private.phone_otp_log (phone, created_at desc);

-- Numarayı biçimler (+905xxxxxxxxx); geçersizse hata
create or replace function private.normalize_tr_mobile(p_phone text)
returns text language plpgsql immutable set search_path = '' as $$
declare digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if digits ~ '^90' then digits := substr(digits, 3); end if;
  if digits ~ '^0' then digits := substr(digits, 2); end if;
  if digits !~ '^5[0-9]{9}$' then raise exception 'Geçerli bir cep telefonu numarası gir (5xx xxx xx xx).'; end if;
  return '+90' || digits;
end; $$;

-- Kod göndermeden önce: şartlar + sınırlar. Üyenin kendi oturumuyla çağrılır; geçerse kaydı yazar ve numarayı döndürür.
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
  if (select count(*) from private.phone_otp_log where user_id = me and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Günde en fazla 3 doğrulama kodu isteyebilirsin. Yarın tekrar dene.';
  end if;
  if (select count(*) from private.phone_otp_log where phone = e164 and created_at > now() - interval '1 day') >= 5 then
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

-- Twilio kodu onayladıktan sonra: yalnızca sunucu fonksiyonu (service_role) çağırır
create or replace function public.whatsapp_otp_complete(p_user uuid, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e164 text := private.normalize_tr_mobile(p_phone);
  pretty text := '+90 ' || substr(e164, 4, 3) || ' ' || substr(e164, 7, 3) || ' ' || substr(e164, 10, 2) || ' ' || substr(e164, 12, 2);
begin
  -- Kod son 15 dakikada bu üye için bu numaraya gönderilmiş olmalı
  if not exists (select 1 from private.phone_otp_log where user_id = p_user and phone = e164 and created_at > now() - interval '15 minutes') then
    raise exception 'Doğrulama süresi doldu. Yeni kod iste.';
  end if;
  if exists (select 1 from public.verification_requests where phone = pretty and status = 'approved' and user_id <> p_user) then
    raise exception 'Bu numara başka bir hesapta doğrulanmış.';
  end if;
  -- Bekleyen elle talep varsa kapat, onaylı kaydı yaz
  update public.verification_requests set status = 'approved', reviewed_at = now(), reject_reason = null
    where user_id = p_user and status = 'pending';
  if not found then
    insert into public.verification_requests (user_id, phone, status, reviewed_at) values (p_user, pretty, 'approved', now());
  end if;
  update public.profiles set phone_verified = true where id = p_user;
  perform private.notify(p_user, null, 'verification_approved', null, null, null, null, 'WhatsApp ile numaran doğrulandı. Profilinde artık mavi tik görünüyor.');
end; $$;
revoke execute on function public.whatsapp_otp_complete(uuid, text) from public, anon, authenticated;
grant execute on function public.whatsapp_otp_complete(uuid, text) to service_role;

-- Twilio gönderemezse kayıt geri alınır (günlük haktan düşmesin); yalnızca sunucu fonksiyonu çağırır
create or replace function public.whatsapp_otp_undo(p_user uuid, p_phone text)
returns void language sql security definer set search_path = '' as $$
  delete from private.phone_otp_log
  where id = (select id from private.phone_otp_log where user_id = p_user and phone = p_phone order by id desc limit 1);
$$;
revoke execute on function public.whatsapp_otp_undo(uuid, text) from public, anon, authenticated;
grant execute on function public.whatsapp_otp_undo(uuid, text) to service_role;
