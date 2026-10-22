-- Aquagram — 0048: SMS ile telefon doğrulaması (Firebase Phone Auth)
-- 0047'deki whatsapp_otp_start / whatsapp_otp_complete kontrolleri aynen kullanılır (phone-verify fonksiyonu);
-- yalnızca onay bildirimi metni kanaldan bağımsız hale getirildi.
create or replace function public.whatsapp_otp_complete(p_user uuid, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e164 text := private.normalize_tr_mobile(p_phone);
  pretty text := '+90 ' || substr(e164, 4, 3) || ' ' || substr(e164, 7, 3) || ' ' || substr(e164, 10, 2) || ' ' || substr(e164, 12, 2);
begin
  if not exists (select 1 from private.phone_otp_log where user_id = p_user and phone = e164 and created_at > now() - interval '15 minutes') then
    raise exception 'Doğrulama süresi doldu. Yeni kod iste.';
  end if;
  if exists (select 1 from public.verification_requests where phone = pretty and status = 'approved' and user_id <> p_user) then
    raise exception 'Bu numara başka bir hesapta doğrulanmış.';
  end if;
  update public.verification_requests set status = 'approved', reviewed_at = now(), reject_reason = null
    where user_id = p_user and status = 'pending';
  if not found then
    insert into public.verification_requests (user_id, phone, status, reviewed_at) values (p_user, pretty, 'approved', now());
  end if;
  update public.profiles set phone_verified = true where id = p_user;
  perform private.notify(p_user, null, 'verification_approved', null, null, null, null, 'Numaran doğrulandı. Profilinde artık mavi tik görünüyor.');
end; $$;
revoke execute on function public.whatsapp_otp_complete(uuid, text) from public, anon, authenticated;
grant execute on function public.whatsapp_otp_complete(uuid, text) to service_role;
