import { createClient } from "@supabase/supabase-js";

// Bu iki değer herkese açıktır (tarayıcıda zaten görünür). Veriyi koruyan şey
// veritabanındaki satır düzeyi güvenlik kurallarıdır. Gizli "service_role" anahtarı
// asla buraya yazılmaz.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kqgcaegwewdsivkbrjjr.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_cyS2b9WCD-t7Csm8YeUqAw_PJfwV_9c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// E-posta bağlantılarının döneceği adres (alan adı değişse de doğru çalışır)
export function siteUrl() {
  return window.location.origin + window.location.pathname;
}

const ERRORS = [
  [/invalid login credentials/i, "E-posta veya şifre hatalı."],
  [/email not confirmed/i, "E-posta adresin henüz doğrulanmadı. Gelen kutundaki bağlantıya tıkla."],
  [/user already registered|already been registered/i, "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı dene."],
  [/password should be at least/i, "Şifre en az 8 karakter olmalı."],
  [/weak.?password|password is known to be weak/i, "Bu şifre çok kolay tahmin edilebilir. Daha güçlü bir şifre seç."],
  [/rate limit|too many requests|security purposes/i, "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene."],
  [/unable to validate email|invalid format|invalid email/i, "Geçerli bir e-posta adresi gir."],
  [/same.?password|different from the old/i, "Yeni şifre eskisiyle aynı olamaz."],
  [/profiles_username_key|duplicate key.*username/i, "Bu kullanıcı adı alınmış."],
  [/username_check|profiles_username_check/i, "Kullanıcı adı 3-24 karakter olmalı; yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir."],
  [/failed to fetch|network/i, "Bağlantı kurulamadı. İnternet bağlantını kontrol et."]
];

export function trError(error) {
  const message = (error && (error.message || error.error_description || String(error))) || "";
  const hit = ERRORS.find(([pattern]) => pattern.test(message));
  return hit ? hit[1] : "Bir sorun oluştu. Lütfen tekrar dene." + (message ? " (" + message + ")" : "");
}
