# Aquagram — Yol Haritası

## Şu an
Arayüz prototipi yayında (GitHub Pages). Veriler örnek; sayfa yenilenince sıfırlanır.

## Sıradaki aşamalar
1. **Altyapı:** Supabase (PostgreSQL, üyelik, dosya depolama, canlı mesajlaşma)
2. **Veritabanı şeması + güvenlik kuralları:** kullanıcılar, ilanlar, paylaşımlar, yorumlar, beğeniler, kayıtlar,
   gruplar ve üyelikler, etiketler ve etiket takibi, tür rehberi (türler, beslenen/favori türler, tür yorumları),
   mesajlar, bildirimler (şikâyetler), reklamlar
3. **Gerçek üyelik:** e-posta, Google ile giriş, şifre sıfırlama; telefon doğrulaması (SMS sağlayıcısı)
4. **Ekranları gerçek veriye bağlama** (ilan → topluluk → gruplar → bilgi bankası → mesajlar)
5. **Yönetim paneli**
   - Şikâyet kuyruğu, içerik kaldırma, kullanıcı uzaklaştırma
   - Reklam onayı
   - **Etiket yönetimi: etiket kaldırma / birleştirme / yasaklı etiket listesi**
   - Tür rehberi: tür profili ekleme/düzenleme, üye tür önerilerini onaylama, gerçek görsel yükleme
   - Grup yönetimi: resmi grupları düzenleme, kural ihlali yapan grupları kapatma
6. **Yayına hazırlık:** alan adı, arama motoru ayarları (profil gizleme → noindex), hata takibi
7. **Hukuki metinler:** KVKK aydınlatma ve açık rıza, kullanım şartları, çerez bildirimi
8. **PWA**, ardından **Capacitor** ile App Store / Google Play
9. **Gelir:** öne çıkarma ve reklam ödemeleri (iyzico / PayTR)

## Not
Tür rehberindeki bakım değerleri hobide yaygın kabul gören aralıklardır; yayın öncesi bir uzman gözüyle kontrol edilmeli.
