import { createClient } from "@supabase/supabase-js";

// Bu iki değer herkese açıktır (tarayıcıda zaten görünür). Veriyi koruyan şey
// veritabanındaki satır düzeyi güvenlik kurallarıdır. Gizli "service_role" anahtarı
// asla buraya yazılmaz.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kqgcaegwewdsivkbrjjr.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_cyS2b9WCD-t7Csm8YeUqAw_PJfwV_9c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Supabase'de hangi sosyal girişlerin açık olduğu ({ google: true, apple: false … })
let providersPromise = null;
export function enabledProviders() {
  if (!providersPromise) {
    providersPromise = fetch(SUPABASE_URL + "/auth/v1/settings", { headers: { apikey: SUPABASE_KEY } })
      .then((res) => (res.ok ? res.json() : {}))
      .then((json) => json.external || {})
      .catch(() => ({}));
  }
  return providersPromise;
}

// E-posta bağlantılarının döneceği adres (alan adı değişse de doğru çalışır)
export function siteUrl() {
  return window.location.origin + "/";
}

const ERRORS = [
  [/invalid login credentials/i, "E-posta veya şifre hatalı."],
  [/email not confirmed/i, "E-posta adresin henüz doğrulanmadı. Gelen kutundaki bağlantıya tıkla."],
  [/user already registered|already been registered/i, "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene."],
  [/password should be at least/i, "Şifre en az 8 karakter olmalı."],
  [/weak.?password|password is known to be weak/i, "Bu şifre çok kolay tahmin edilebilir. Daha güçlü bir şifre seç."],
  [/rate limit|too many requests|security purposes/i, "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene."],
  [/unable to validate email|invalid format|invalid email/i, "Geçerli bir e-posta adresi gir."],
  [/email address.*already|email.?exists|already.*registered.*email/i, "Bu e-posta adresi başka bir hesapta kullanılıyor."],
  [/reauthentication|requires recent login/i, "Güvenlik için çıkış yapıp tekrar giriş yap, sonra yeniden dene."],
  [/captcha_timeout/, "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene."],
  [/captcha_load/, "Güvenlik doğrulaması yüklenemedi. Reklam/izleme engelleyiciyi bu site için kapatıp sayfayı yenile."],
  [/captcha/i, "Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar dene."],
  [/same.?password|different from the old/i, "Yeni şifre eskisiyle aynı olamaz."],
  [/profiles_username_key|duplicate key.*username/i, "Bu kullanıcı adı alınmış."],
  [/username_check|profiles_username_check/i, "Kullanıcı adı 3-24 karakter olmalı; yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir."],
  [/provider is not enabled|unsupported provider/i, "Bu giriş yöntemi henüz etkin değil."],
  [/failed to fetch|network/i, "Bağlantı kurulamadı. İnternet bağlantını kontrol et."],
  [/row-level security policy for table "messages"/i, "Bu kullanıcıyla mesajlaşamazsın (engellenmiş olabilirsin ya da hesabın kısıtlı)."],
  [/Mesaj kutun dolu/, null],
  [/üste taşıma hakkını kullandın|ücretsiz öne çıkarma hakkın kalmadı|ücretsiz reklam hakkın kalmadı|Yalnızca yayındaki ilanlar üste/, null],
  [/Bu hesap silinmiş/, "Bu hesap silinmiş; mesaj gönderilemez."],
  [/Süper yönetici hesabı silinemez/, "Süper yönetici hesabı silinemez. Önce yetkiyi başka bir hesaba devret."],
  [/Çok fazla mesaj gönderdin/, "Çok fazla mesaj gönderdin. Lütfen biraz sonra tekrar dene."],
  [/Bu kullanıcıyla mesajlaşamazsınız/i, "Bu kullanıcıyla mesajlaşamazsın."],
  [/izin verilmeyen bir ifade/i, "Metinde izin verilmeyen bir ifade var. Lütfen düzenleyip tekrar dene."],
  [/Yetkiniz yok|yetkiniz yok/, "Bu işlem için yetkin yok."],
  [/Süper yönetici askıya alınamaz/, "Süper yönetici askıya alınamaz."],
  [/Kendi yetkinizi/, "Kendi yetkini buradan değiştiremezsin."],
  [/zaten incelendi/, "Bu başvuru zaten incelenmiş; sayfayı yenile."]
];

export function trError(error) {
  const message = (error && (error.message || error.error_description || String(error))) || "";
  const hit = ERRORS.find(([pattern]) => pattern.test(message));
  if (hit && hit[1] === null) return message.replace(/^.*?ERROR:\s*/, "");
  return hit ? hit[1] : "Bir sorun oluştu. Lütfen tekrar dene." + (message ? " (" + message + ")" : "");
}
