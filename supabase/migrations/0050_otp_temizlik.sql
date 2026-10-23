-- Aquagram — 0050: Telefon kodu (WhatsApp/Twilio ve SMS/Firebase) altyapısının kaldırılması
-- Mavi tik elle onayla çalışıyor; whatsapp-verify ve phone-verify fonksiyonları silindi.
-- Onaylı üyelerin mavi tikleri (profiles.phone_verified, verification_requests) korunur.
-- Canlıda Supabase SQL Editor'dan çalıştırıldı (23.10.2026).
drop function if exists public.whatsapp_otp_start(text);
drop function if exists public.whatsapp_otp_complete(uuid, text);
drop function if exists public.whatsapp_otp_undo(uuid, text);
drop function if exists private.normalize_tr_mobile(text);
drop table if exists private.phone_otp_log;
