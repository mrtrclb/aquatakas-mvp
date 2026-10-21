# Aquagram — Supabase veritabanı

`migrations/` klasöründeki dosyalar, Supabase projesine uygulanan adımların birebir kopyasıdır (dosya adı sırasıyla).

| Dosya | İçerik |
|---|---|
| 0001 | Profiller, ekip/yetki sistemi, işlem kaydı, site ayarları |
| 0002 | İlanlar, öne çıkarma başvuruları (onaylı; ödeme şimdilik simüle), kayıtlı ilanlar |
| 0003a–e | Gruplar, paylaşımlar, anketler, beğeni/kayıt, yorumlar, etiketler, moderasyon |
| 0004 | Bilgi bankası: kategoriler, türler, besleyenler, favoriler, deneyimler, öneriler |
| 0005 | Mesajlaşma ve engelleme |
| 0006a–c | Kurucu/ekip yönetimi, şikâyetler, kullanıcı ve içerik yönetimi, reklamlar |
| 0007 | Dosya depolama alanları ve kuralları |
| 0008a–c | Başlangıç verisi (24 kategori, 13 resmi grup, 73 tür) |
| 0009 | Performans indeksleri |

## Yetkiler
`super_admin` her şeyi yapar. `moderator` yalnızca verilen yetkileri kullanır:
`reports` (şikâyetler), `content` (içerik kaldırma), `users` (askıya alma, e-posta görme),
`groups`, `tags`, `species` (bilgi bankası), `ads` (reklam ve öne çıkarma onayı), `settings`.

## Kurucu hesabı
`private.config` tablosundaki `founder_email` adresiyle kayıt olan ilk kişi otomatik süper yönetici olur.
Gerçek adres repoda tutulmaz (0006a'da yer tutucu var), veritabanında doğrudan ayarlıdır.

## Notlar
- `public.post_tags` tablosu kullanılmıyor (etiketler `posts.tags` dizisinde); ilk temizlikte kaldırılacak.
- Yönetici işlemleri `admin_*` / `moderate_*` fonksiyonlarıyla yapılır; her biri yetkiyi kendi içinde kontrol eder ve `admin_audit_log` tablosuna yazar.
