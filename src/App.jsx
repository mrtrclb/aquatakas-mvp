import React, { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  CalendarDays,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  UserRound,
  MessageCircle,
  ArrowLeft,
  MoreHorizontal,
  Flag,
  Share2,
  Bookmark,
  Pin,
  X,
  Star,
  Camera,
  Play,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Mail,
  Phone,
  Edit3,
  Eye,
  Send,
  RotateCcw,
  BookmarkX,
  ShieldCheck,
  Info,
  Upload,
  Hourglass,
  BarChart3
} from "lucide-react";

const locations = {
  Gaziantep: { Şehitkamil: ["Batıkent", "Emek", "Merveşehir"], Şahinbey: ["Karataş", "Güneykent", "Binevler"] },
  İstanbul: { Kadıköy: ["Moda", "Fenerbahçe", "Göztepe"], Üsküdar: ["Kuzguncuk", "Beylerbeyi", "Altunizade"] },
  Ankara: { Çankaya: ["Ayrancı", "Bahçelievler", "Kavaklıdere"], Keçiören: ["Etlik", "İncirli", "Şenlik"] },
  İzmir: { Karşıyaka: ["Bostanlı", "Mavişehir", "Yalı"], Bornova: ["Kazımdirik", "Erzene", "Atatürk"] },
  Bursa: { Nilüfer: ["Görükle", "Ataevler", "Fethiye"], Osmangazi: ["Çekirge", "Heykel", "Soğanlı"] }
};

const listingTypes = ["Tümü", "Satıyorum", "Takas", "Ücretsiz / Sahiplendirme", "Arıyorum"];
const categories = ["Tümü", "Canlı", "Bitki", "Yem", "Kimyasal", "Akvaryum", "Ekipman", "Dekor"];

const categoryOptions = {
  Tümü: ["Sıfır ürün", "Kendi üretimim", "Çok az kullanıldı", "İkinci el", "Gönderim yapılır", "Deniz akvaryumu", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Canlı: ["Kendi üretimim", "Yavru", "Damızlık altı", "Damızlık", "Çift", "Gönderim yapılır", "Deniz akvaryumu", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Bitki: ["Budama", "Kök", "Su üstü", "Rizomlu", "Gönderim yapılır", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Yem: ["Canlı yem", "Canlı yem kültürü", "Kendim yaptım", "Sıfır ürün", "Gönderim yapılır", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Kimyasal: ["Su düzenleyici", "Gübre", "İlaç", "Sıfır ürün", "Gönderim yapılır", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Akvaryum: ["Tüm set", "Sadece akvaryum", "Mobilyalı", "Sehpalı", "İthal", "Bakım gerekiyor", "Deniz akvaryumu", "Gönderim yapılır", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Ekipman: ["Aydınlatma", "Filtre", "Isıtıcı", "CO2", "Sıfır ürün", "İkinci el", "Çok az kullanıldı", "Deniz akvaryumu", "Gönderim yapılır", "Hobiyi bırakıyorum", "Tür değiştiriyorum"],
  Dekor: ["Plastik", "Seramik", "3D baskı", "Kök", "Kaya", "İkinci el", "Deniz akvaryumu", "Gönderim yapılır", "Hobiyi bırakıyorum", "Tür değiştiriyorum"]
};

const users = {
  1: { username: "@brichardici", city: "Gaziantep", joined: "Mayıs 2026", lastSeen: "2 saat önce", online: false, listingsCount: 4, verified: true, bio: "Tanganyika cikletleri ve üretim tanklarıyla ilgileniyor.", socials: { instagram: "@brichardici", facebook: "", x: "" }, reviewStats: { positive: 2, neutral: 0, negative: 0 }, reviews: ["Yavrular sağlıklıydı, elden teslim aldım.", "İletişim hızlıydı, ilan bilgileri doğruydu."] },
  2: { username: "@kadikoytank", city: "İstanbul", joined: "Mart 2025", lastSeen: "çevrimiçi", online: true, listingsCount: 5, verified: true, bio: "Bitkili tank ekipmanları ve ikinci el akvaryumlar.", socials: { instagram: "@kadikoytank", facebook: "kadikoytank", x: "" }, reviewStats: { positive: 2, neutral: 0, negative: 0 }, reviews: ["Akvaryum temiz ve anlatıldığı gibiydi.", "Teslimat konusunda yardımcı oldu."] },
  3: { username: "@nanoankara", city: "Ankara", joined: "Ocak 2026", lastSeen: "dün", online: false, listingsCount: 5, verified: false, bio: "Nano tank, moss ve düşük destekli bitkiler.", socials: { instagram: "@nanoankara", facebook: "", x: "@nanoankara" }, reviewStats: { positive: 2, neutral: 0, negative: 0 }, reviews: ["Bitkiler tertemiz geldi.", "Takas sorunsuz gerçekleşti."] },
  4: { username: "@izmirfiltre", city: "İzmir", joined: "Ağustos 2024", lastSeen: "4 saat önce", online: false, listingsCount: 5, verified: true, bio: "Ekipman, filtre ve bakım malzemeleri.", socials: { instagram: "", facebook: "", x: "@izmirfiltre" }, reviewStats: { positive: 1, neutral: 1, negative: 0 }, reviews: ["Filtre çalışır durumdaydı.", "Paketleme daha iyi olabilirdi ama ürün sağlam."] },
  5: { username: "@bitkilibursa", city: "Bursa", joined: "Nisan 2026", lastSeen: "3 gün önce", online: false, listingsCount: 5, verified: false, bio: "Low-tech bitkili tanklar ve budama paketleri.", socials: { instagram: "@bitkilibursa", facebook: "", x: "" }, reviewStats: { positive: 2, neutral: 0, negative: 0 }, reviews: ["Bitkiler temiz ve yosunsuzdu.", "Takas hızlıca tamamlandı."] }
};

const img = {
  fish1: "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&w=1200&q=80",
  fish2: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=1200&q=80",
  tank1: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  tank2: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80",
  plant1: "https://images.unsplash.com/photo-1518156677180-95a2893f3499?auto=format&fit=crop&w=1200&q=80",
  plant2: "https://images.unsplash.com/photo-1520301255226-bf5f144451c1?auto=format&fit=crop&w=1200&q=80",
  equip1: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
  food1: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  chem1: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1200&q=80",
  decor1: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  bottle: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1200&q=80",
  culture: "https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=1200&q=80"
};

const listings = [
  { id: 1, userId: 1, title: "Kendi üretimim genç Brichardi kolonisi", category: "Canlı", tags: ["Kendi üretimim", "Yavru"], type: "Satıyorum", city: "Gaziantep", district: "Şehitkamil", neighborhood: "Batıkent", price: "750 TL", allowOffer: true, date: "2026-05-18", images: [img.fish1, img.fish2, img.tank1], youtube: "https://youtube.com/shorts/example", description: "2-3 cm civarı, kuru yeme alışık, sağlıklı genç Neolamprologus brichardi yavruları. Elden teslim tercih edilir. Takas da konuşulur." },
  { id: 2, userId: 2, title: "160x40x45h akvaryum ve sehpa", category: "Akvaryum", tags: ["Sehpalı", "Çok az kullanıldı"], type: "Satıyorum", city: "İstanbul", district: "Kadıköy", neighborhood: "Fenerbahçe", price: "4.500 TL", allowOffer: true, date: "2026-05-15", images: [img.tank1, img.tank2], description: "Sızdırma yok, sehpa dahil. Taşıma alıcıya aittir. Bitkili tank kurulumu için uygundur." },
  { id: 3, userId: 3, title: "Java fern, anubias ve moss budama paketi", category: "Bitki", tags: ["Budama", "Rizomlu"], type: "Takas", city: "Ankara", district: "Çankaya", neighborhood: "Ayrancı", price: "Takas", allowOffer: false, date: "2026-05-10", images: [img.plant1, img.plant2], description: "Düşük destekli tanktan budama. Karides, salyangoz veya nano türlerle takas düşünülür." },
  { id: 4, userId: 4, title: "Oase dış filtre, temiz ve çalışır durumda", category: "Ekipman", tags: ["Filtre", "İkinci el"], type: "Satıyorum", city: "İzmir", district: "Karşıyaka", neighborhood: "Bostanlı", price: "2.250 TL", allowOffer: false, date: "2026-05-02", images: [img.equip1], description: "Yaklaşık 1 yıl kullanıldı. Medyalar dahil değildir. Hortum ve aparatları mevcut." },
  { id: 5, userId: 1, title: "Fazla lepistes yavruları sahiplendirilecek", category: "Canlı", tags: ["Kendi üretimim", "Yavru"], type: "Ücretsiz / Sahiplendirme", city: "Gaziantep", district: "Şahinbey", neighborhood: "Karataş", price: "Ücretsiz", allowOffer: false, date: "2026-05-17", images: [img.fish1], description: "Fazla yavrular uygun tanka sahip hobicilere ücretsiz verilecektir. Detaylar mesajla konuşulur." },
  { id: 6, userId: 5, title: "Bucephalandra ve salvinia budama", category: "Bitki", tags: ["Budama", "Su üstü", "Rizomlu"], type: "Satıyorum", city: "Bursa", district: "Nilüfer", neighborhood: "Görükle", price: "300 TL", allowOffer: true, date: "2026-05-16", images: [img.plant2, img.plant1], youtube: "https://youtube.com/watch?v=example", description: "Low-tech tanktan budama. Buce kökleri ve salvinia karışık paket. Kargo konuşulur." },
  { id: 7, userId: 2, title: "100 cm bitkili tank için LED arıyorum", category: "Ekipman", tags: ["Aydınlatma"], type: "Arıyorum", city: "İstanbul", district: "Üsküdar", neighborhood: "Kuzguncuk", price: "Arıyorum", allowOffer: false, date: "2026-05-14", images: [img.decor1], description: "100 cm bitkili tankta kullanabileceğim düzgün bir LED arıyorum. Temiz ikinci el olabilir." },
  { id: 8, userId: 3, title: "Karides yemleri ve yavru yemleri", category: "Yem", tags: ["Sıfır ürün"], type: "Satıyorum", city: "Ankara", district: "Keçiören", neighborhood: "Etlik", price: "180 TL", allowOffer: true, date: "2026-05-13", images: [img.food1], description: "Açılmamış paketler. Karides ve yavru balıklar için yem çeşitleri." },
  { id: 9, userId: 4, title: "Seachem Prime su düzenleyici", category: "Kimyasal", tags: ["Su düzenleyici", "Sıfır ürün"], type: "Satıyorum", city: "İzmir", district: "Bornova", neighborhood: "Erzene", price: "", allowOffer: true, date: "2026-05-12", images: [img.chem1, img.bottle], description: "Kapalı ambalaj su düzenleyici. Fiyat için teklif verilebilir. Elden teslim tercih edilir." },
  { id: 10, userId: 5, title: "Low-tech bitki gübresi ve mikro element", category: "Kimyasal", tags: ["Gübre", "Kendim yaptım"], type: "Satıyorum", city: "Bursa", district: "Osmangazi", neighborhood: "Çekirge", price: "120 TL", allowOffer: false, date: "2026-05-11", images: [img.bottle], description: "Kendi tanklarımda kullandığım düşük destekli bitki gübresi. Kullanım notu ile verilir." },
  { id: 11, userId: 3, title: "Microworm canlı yem kültürü", category: "Yem", tags: ["Canlı yem kültürü", "Kendim yaptım"], type: "Satıyorum", city: "Ankara", district: "Çankaya", neighborhood: "Bahçelievler", price: "90 TL", allowOffer: true, date: "2026-05-09", images: [img.culture], description: "Yavru balıklar için canlı yem kültürü. Teslimde kurulum ve yenileme anlatılır." },
  { id: 12, userId: 2, title: "CO2 tüp, regülatör ve difüzör seti", category: "Ekipman", tags: ["CO2", "İkinci el"], type: "Satıyorum", city: "İstanbul", district: "Kadıköy", neighborhood: "Moda", price: "", allowOffer: true, date: "2026-05-08", images: [img.equip1, img.bottle], description: "Bitkili tanktan söküldü. Tüp dolu değil. Komple set olarak tekliflere açığım." },
  { id: 13, userId: 1, title: "Damızlık altı Calvus çifti", category: "Canlı", tags: ["Damızlık altı", "Çift"], type: "Satıyorum", city: "Gaziantep", district: "Şehitkamil", neighborhood: "Emek", price: "1.600 TL", allowOffer: true, date: "2026-05-07", images: [img.fish2], description: "Aynı tankta büyümüş, uyumlu görünen genç çift. Tanganyika takası konuşulur." },
  { id: 14, userId: 5, title: "Su üstü bitki paketi", category: "Bitki", tags: ["Su üstü", "Budama"], type: "Ücretsiz / Sahiplendirme", city: "Bursa", district: "Nilüfer", neighborhood: "Ataevler", price: "Ücretsiz", allowOffer: false, date: "2026-05-06", images: [img.plant2], description: "Fazla salvinia ve pistia budaması. Karides tankından, ilaç kullanılmadı." },
  { id: 15, userId: 4, title: "Dış filtre arıyorum", category: "Ekipman", tags: ["Filtre"], type: "Arıyorum", city: "İzmir", district: "Karşıyaka", neighborhood: "Yalı", price: "Arıyorum", allowOffer: false, date: "2026-05-05", images: [img.equip1], description: "300 litre tanka yetecek sessiz dış filtre arıyorum. Temiz ikinci el olabilir." },
  { id: 16, userId: 2, title: "Mobilyalı nano akvaryum seti", category: "Akvaryum", tags: ["Tüm set", "Mobilyalı", "Çok az kullanıldı"], type: "Satıyorum", city: "İstanbul", district: "Üsküdar", neighborhood: "Beylerbeyi", price: "2.800 TL", allowOffer: true, date: "2026-05-04", images: [img.tank2, img.tank1], description: "Nano tank, mobilya, küçük filtre ve led dahil. Ofis tankı olarak kurulmuştu." },
  { id: 17, userId: 3, title: "Seramik karides mağaraları", category: "Dekor", tags: ["Seramik", "Sıfır ürün"], type: "Satıyorum", city: "Ankara", district: "Keçiören", neighborhood: "İncirli", price: "150 TL", allowOffer: false, date: "2026-05-03", images: [img.decor1], description: "Nano tanklar için el yapımı seramik saklanma alanları. Karides ve cüce vatoz için uygun." },
  { id: 18, userId: 1, title: "3D baskı yem halkası ve hortum tutucu", category: "Dekor", tags: ["3D baskı", "Kendim yaptım"], type: "Takas", city: "Gaziantep", district: "Şahinbey", neighborhood: "Güneykent", price: "Takas", allowOffer: false, date: "2026-05-01", images: [img.equip1], description: "3D baskı küçük akvaryum aksesuarları. Bitki budaması veya yavru yemle takas olur." },
  { id: 19, userId: 4, title: "Beyaz kum ve kaya dekoru", category: "Dekor", tags: ["Kaya", "İkinci el"], type: "Satıyorum", city: "İzmir", district: "Bornova", neighborhood: "Kazımdirik", price: "350 TL", allowOffer: true, date: "2026-04-30", images: [img.tank1], description: "Tanganyika kurulumundan çıkan beyaz kum ve birkaç parça kaya dekoru." },
  { id: 20, userId: 5, title: "İlaçlı tedavi sonrası kalan ürünler", category: "Kimyasal", tags: ["İlaç", "Çok az kullanıldı"], type: "Ücretsiz / Sahiplendirme", city: "Bursa", district: "Nilüfer", neighborhood: "Fethiye", price: "Ücretsiz", allowOffer: false, date: "2026-04-29", images: [img.chem1], description: "Açılmış ama çoğu dolu birkaç tedavi ürünü. Son kullanım tarihleri kontrol edilmelidir." },
  { id: 21, userId: 2, title: "İthal rimless akvaryum", category: "Akvaryum", tags: ["Sadece akvaryum", "İthal", "İkinci el"], type: "Satıyorum", city: "İstanbul", district: "Kadıköy", neighborhood: "Göztepe", price: "", allowOffer: true, date: "2026-04-28", images: [img.tank2], description: "Şeffaf silikonlu rimless tank. Fiyat için teklif alıyorum. Çizik durumu fotoğraflarda." },
  { id: 22, userId: 3, title: "Artemia çıkarma seti arıyorum", category: "Yem", tags: ["Canlı yem"], type: "Arıyorum", city: "Ankara", district: "Çankaya", neighborhood: "Kavaklıdere", price: "Arıyorum", allowOffer: false, date: "2026-04-27", images: [img.food1], description: "Yavru melekler için artemia çıkarma şişesi, hava taşı ve yumurta arıyorum." },
  { id: 23, userId: 1, title: "Damızlık melek çifti", category: "Canlı", tags: ["Damızlık", "Çift"], type: "Satıyorum", city: "Gaziantep", district: "Şehitkamil", neighborhood: "Merveşehir", price: "", allowOffer: true, date: "2026-04-26", images: [img.fish1, img.fish2], description: "Yumurta dökmüş, yavru bakımı deneyimlemiş çift. Sadece uygun tanka verilir, teklif alınır." },
  { id: 24, userId: 4, title: "Bakım isteyen büyük akvaryum", category: "Akvaryum", tags: ["Sadece akvaryum", "Bakım gerekiyor", "İkinci el"], type: "Satıyorum", city: "İzmir", district: "Karşıyaka", neighborhood: "Mavişehir", price: "1.200 TL", allowOffer: true, date: "2026-04-25", images: [img.tank1], description: "Silikon kontrolü ve temizlik isteyen büyük tank. Uğraşacak hobiye uygun fiyat." },
  { id: 25, userId: 5, title: "Hobiyi bırakıyorum bitkili tank paketi", category: "Akvaryum", tags: ["Tüm set", "Hobiyi bırakıyorum", "Bitki"], type: "Satıyorum", city: "Bursa", district: "Osmangazi", neighborhood: "Heykel", price: "6.500 TL", allowOffer: true, date: "2026-04-24", images: [img.tank1, img.plant1], description: "Tank, filtre, led ve köklerle birlikte komple set. Bitkili düzene geçmek isteyenler için hazır kurulum." },
  { id: 26, userId: 1, title: "Tür değiştiriyorum: genç frontosa grubu", category: "Canlı", tags: ["Yavru", "Tür değiştiriyorum", "Gönderim yapılır"], type: "Satıyorum", city: "Gaziantep", district: "Şehitkamil", neighborhood: "Batıkent", price: "2.400 TL", allowOffer: true, date: "2026-04-23", images: [img.fish2, img.tank2], description: "Tanganyika tankından sağlıklı genç grup. Yer açmak için veriyorum, şehir dışı gönderim konuşulur." },
  { id: 27, userId: 2, title: "Deniz akvaryumu protein skimmer", category: "Ekipman", tags: ["Deniz akvaryumu", "Çok az kullanıldı"], type: "Satıyorum", city: "İstanbul", district: "Kadıköy", neighborhood: "Moda", price: "3.750 TL", allowOffer: true, date: "2026-04-22", images: [img.equip1, img.tank2], description: "Kısa süre kullanılmış skimmer. Tuzlu su kurulumunu büyüttüğüm için boşa çıktı." },
  { id: 28, userId: 4, title: "RO cihazı ve TDS metre", category: "Ekipman", tags: ["İkinci el", "Gönderim yapılır"], type: "Satıyorum", city: "İzmir", district: "Bornova", neighborhood: "Atatürk", price: "1.950 TL", allowOffer: false, date: "2026-04-21", images: [img.equip1], description: "RO cihazı çalışır durumda. Discus ve karides kurulumlarında kullanıldı, yanında TDS metre verilir." },
  { id: 29, userId: 3, title: "Kök üstü anubias nana petite", category: "Bitki", tags: ["Kök", "Rizomlu", "Gönderim yapılır"], type: "Satıyorum", city: "Ankara", district: "Çankaya", neighborhood: "Ayrancı", price: "280 TL", allowOffer: true, date: "2026-04-20", images: [img.plant1, img.decor1], description: "Küçük köke sarılı nana petite. Low-tech tanktan, yosun problemi yok." },
  { id: 30, userId: 5, title: "Canlı yem kültürü başlangıç seti", category: "Yem", tags: ["Canlı yem", "Canlı yem kültürü", "Kendim yaptım"], type: "Satıyorum", city: "Bursa", district: "Nilüfer", neighborhood: "Fethiye", price: "220 TL", allowOffer: false, date: "2026-04-19", images: [img.culture, img.food1], description: "Mikrokurt ve infusoria başlangıç kültürü. Yavru büyütmeye yeni başlayanlar için anlatımla verilir." },
  { id: 31, userId: 1, title: "Tuzlu su canlı kaya parçaları", category: "Dekor", tags: ["Kaya", "Deniz akvaryumu", "Hobiyi bırakıyorum"], type: "Satıyorum", city: "Gaziantep", district: "Şahinbey", neighborhood: "Binevler", price: "900 TL", allowOffer: true, date: "2026-04-18", images: [img.decor1, img.tank2], description: "Tuzlu su kurulumundan çıkan canlı kaya parçaları. Kurulumu kapattığım için toplu verilecek." },
  { id: 32, userId: 2, title: "Karides tankı için moss arıyorum", category: "Bitki", tags: ["Budama", "Su üstü"], type: "Arıyorum", city: "İstanbul", district: "Üsküdar", neighborhood: "Altunizade", price: "Arıyorum", allowOffer: false, date: "2026-04-17", images: [img.plant2], description: "Karides tankı için temiz moss ve su üstü bitki arıyorum. Takas da olabilir." },
  { id: 33, userId: 4, title: "Akvaryum tuzu ve mineral seti", category: "Kimyasal", tags: ["Su düzenleyici", "Deniz akvaryumu", "Sıfır ürün"], type: "Satıyorum", city: "İzmir", district: "Karşıyaka", neighborhood: "Bostanlı", price: "480 TL", allowOffer: true, date: "2026-04-16", images: [img.chem1, img.bottle], description: "Açılmamış mineral ve tuz seti. Tuzlu su denemesi için alınmıştı, kurulumdan vazgeçildi." },
  { id: 34, userId: 3, title: "Mobilyalı 60 cm karides tankı", category: "Akvaryum", tags: ["Mobilyalı", "Tüm set", "Tür değiştiriyorum"], type: "Satıyorum", city: "Ankara", district: "Keçiören", neighborhood: "Şenlik", price: "3.200 TL", allowOffer: true, date: "2026-04-15", images: [img.tank2, img.plant1], description: "Karides düzeninden çıkma komple set. İçindeki bitkiler ayrı konuşulabilir." }
];

const featuredListingIds = [9, 12, 16, 21];

const welcomeSlides = [
  { title: "Yerel hobicilerle buluş", text: "Canlı, bitki, ekipman ve akvaryum ilanlarını konumuna göre keşfet.", image: img.tank1 },
  { title: "Sat, takas et, sahiplendir", text: "İletişimi platform içinde mesajlaşarak başlat; detayları kullanıcıyla konuş.", image: img.fish1 },
  { title: "Akvaryum hobisine özel", text: "Genel pazar yeri kalabalığı yerine yalnızca akvaryum dünyasına odaklan.", image: img.plant1 }
];

const adPool = [
  {
    id: "ad-1",
    brand: "AquaLeaf",
    title: "Bitkili tanklar için haftalık bakım seti",
    text: "Gübre, makas ve mini bakım aparatı tek pakette.",
    cta: "İncele",
    image: img.plant1
  },
  {
    id: "ad-2",
    brand: "ReefLine",
    title: "Sessiz iç filtre kampanyası",
    text: "Nano ve orta hacimli tanklar için düşük sesli filtre seçenekleri.",
    cta: "Detaylar",
    image: img.equip1
  },
  {
    id: "ad-3",
    brand: "BioDrop",
    title: "Yeni başlayanlara su düzenleyici rehberi",
    text: "Kurulum sonrası ilk hafta için pratik bakım önerileri.",
    cta: "Oku",
    image: img.chem1
  },
  {
    id: "ad-4",
    brand: "TankStudio",
    title: "Özel ölçü akvaryum ve mobilya üretimi",
    text: "Evinize ve tank ölçünüze uygun sade kurulum çözümleri.",
    cta: "Teklif al",
    image: img.tank2
  }
];

function formatDate(iso) {
  const parts = iso.split("-");
  return parts[2] + "." + parts[1] + "." + parts[0];
}

function priceLabel(item) {
  if (item.type === "Takas") return "Takas";
  if (item.type === "Ücretsiz / Sahiplendirme") return "Ücretsiz";
  if (item.type === "Arıyorum") return "Arıyorum";
  if (item.type === "Satıyorum" && item.allowOffer && !item.price) return "Teklif ver";
  return item.price || "Fiyat belirtilmedi";
}

function VerifiedBadge() {
  return <span title="Doğrulanmış kullanıcı" className="inline-grid h-4 w-4 place-items-center rounded-full bg-sky-500 text-[10px] font-black leading-none text-white">✓</span>;
}

function UserName({ user, positive = false }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{user.username}</span>
      {user.verified && <VerifiedBadge />}
      {positive && <span className="text-emerald-700">%{user.positive}</span>}
    </span>
  );
}

function Select({ label, value, onChange, options, placeholder, disabled, labels = {} }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-500">{label}</span>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-cyan-800 disabled:cursor-not-allowed disabled:opacity-50">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}
      </select>
    </label>
  );
}

function MultiSelectChips({ label, options, selected, onChange }) {
  function toggle(option) {
    if (selected.includes(option)) onChange(selected.filter((item) => item !== option));
    else onChange([...selected, option]);
  }

  return (
    <div>
      <div className="mb-1 text-xs font-black text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => toggle(option)} className={"rounded-full border px-2.5 py-1 text-[11px] font-black transition " + (selected.includes(option) ? "border-cyan-950 bg-cyan-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiSelectDropdown({ label, options, selected, onChange, placeholder = "Seçim yap", searchable = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const safeOptions = [...new Set(options || [])];
  const filteredOptions = searchable
    ? safeOptions.filter((item) => item.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")))
    : safeOptions;

  function toggleItem(value) {
    if (selected.includes(value)) onChange(selected.filter((item) => item !== value));
    else onChange([...selected, value]);
  }

  function clearAll(event) {
    event.stopPropagation();
    onChange([]);
    setSearch("");
  }

  const summary = selected.length === 0 ? placeholder : selected.length <= 2 ? selected.join(", ") : selected.length + " seçim yapıldı";

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="block text-xs font-black text-slate-500">{label}</span>
        {selected.length > 0 && <button type="button" onClick={clearAll} className="text-[11px] font-black text-cyan-700 hover:text-cyan-950">temizle</button>}
      </div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white">
        <span className={"min-w-0 truncate " + (selected.length === 0 ? "text-slate-400" : "font-bold text-slate-700")}>{summary}</span>
        <span className={"shrink-0 text-slate-400 transition " + (open ? "rotate-180" : "")}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <strong className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</strong>
              {selected.length > 0 && <button type="button" onClick={clearAll} className="text-[11px] font-black text-cyan-700 hover:text-cyan-950">Seçimleri temizle</button>}
            </div>
            {searchable && <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ara..." className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-800" />}
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => {
              const active = selected.includes(option);
              return (
                <button key={option} type="button" onClick={() => toggleItem(option)} className={"mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition " + (active ? "bg-cyan-50 font-black text-cyan-950" : "text-slate-700 hover:bg-slate-50")}>
                  <span className="min-w-0 truncate">{option}</span>
                  {active && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-950 text-[11px] text-white">✓</span>}
                </button>
              );
            }) : <div className="px-3 py-3 text-sm text-slate-400">Sonuç bulunamadı.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AquaTakasPrototype() {
  const [selectedType, setSelectedType] = useState("Tümü");
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [memberPage, setMemberPage] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [removeListing, setRemoveListing] = useState(null);
  const [promoteListing, setPromoteListing] = useState(null);

  const cityNames = Object.keys(locations);
  const districtNames = selectedCities.length > 0
    ? selectedCities.flatMap((cityName) => Object.keys(locations[cityName] || {}))
    : Object.values(locations).flatMap((districtMap) => Object.keys(districtMap));
  const neighborhoodNames = selectedCities.length > 0
    ? selectedCities.flatMap((cityName) => {
        const districtMap = locations[cityName] || {};
        const districtsForCity = selectedDistricts.length > 0 ? selectedDistricts.filter((districtName) => districtMap[districtName]) : Object.keys(districtMap);
        return districtsForCity.flatMap((districtName) => districtMap[districtName] || []);
      })
    : Object.values(locations).flatMap((districtMap) => Object.values(districtMap).flat());
  const activeCategoryOptions = categoryOptions[selectedCategory] || categoryOptions.Tümü;

  const filteredListings = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    let result = listings.filter((item) => {
      const user = users[item.userId];
      const text = (item.title + " " + item.description + " " + item.category + " " + item.type + " " + item.city + " " + item.district + " " + item.neighborhood + " " + user.username + " " + (item.tags || []).join(" ")).toLocaleLowerCase("tr");
      const tagMatch = selectedTags.length === 0 || selectedTags.every((tag) => (item.tags || []).includes(tag));
      return (!q || text.includes(q)) &&
        (selectedType === "Tümü" || item.type === selectedType) &&
        (selectedCategory === "Tümü" || item.category === selectedCategory) &&
        tagMatch &&
        (selectedCities.length === 0 || selectedCities.includes(item.city)) &&
        (selectedDistricts.length === 0 || selectedDistricts.includes(item.district)) &&
        (selectedNeighborhoods.length === 0 || selectedNeighborhoods.includes(item.neighborhood));
    });
    result.sort((a, b) => {
      const aFeatured = featuredListingIds.includes(a.id) ? 1 : 0;
      const bFeatured = featuredListingIds.includes(b.id) ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;
      if (sort === "verified") {
        const aVerified = users[a.userId]?.verified ? 1 : 0;
        const bVerified = users[b.userId]?.verified ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
      }
      return sort === "oldest" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
    });
    return result;
  }, [query, selectedType, selectedCategory, selectedTags, selectedCities, selectedDistricts, selectedNeighborhoods, sort]);

  function resetFilters() {
    setSelectedType("Tümü");
    setSelectedCategory("Tümü");
    setSelectedTags([]);
    setSelectedCities([]);
    setSelectedDistricts([]);
    setSelectedNeighborhoods([]);
    setQuery("");
    setSort("newest");
  }

  function openListing(item) {
    setMemberPage(null);
    setSelectedListing(item);
    setActiveImage(0);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    setSelectedListing(null);
    setMemberPage(null);
    setViewUser(null);
    setProfileUser(null);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const effectiveMemberPage = isMember ? memberPage : null;
  const accountMode = Boolean(effectiveMemberPage);
  const userListingsMode = Boolean(viewUser);
  const detailMode = Boolean(selectedListing);
  const currentUserId = 1;
  const currentUser = users[currentUserId];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4">
          <button onClick={goHome} className="flex items-center gap-3 text-left">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-cyan-950 text-sm font-black text-white">HH<span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-tight tracking-tight">Hobiciden Hobiciye</h1>
              <p className="text-xs text-slate-500">Akvaryum hobisine özel ilan platformu</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            
            {isMember && (
              <div className="hidden items-center gap-1 rounded-full bg-slate-100 p-1 md:flex">
                {[["home", "Ana sayfa"], ["account", "Hesabım"], ["listings", "İlanlarım"], ["messages", "Mesajlarım"], ["ads", "Reklamlarım"]].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === "home") {
                        goHome();
                        return;
                      }
                      setMemberPage(key);
                      setSelectedListing(null);
                      setViewUser(null);
                      setProfileUser(null);
                      setMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={
                      "rounded-full px-3 py-1.5 text-xs font-black " +
                      ((key === "home" && !effectiveMemberPage && !selectedListing && !viewUser)
                        ? "bg-cyan-950 text-white"
                        : effectiveMemberPage === key
                        ? "bg-cyan-950 text-white"
                        : "text-slate-600 hover:bg-white")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => {
              if (isMember) {
                setIsMember(false);
                setMemberPage(null);
                setViewUser(null);
                setSelectedListing(null);
                setProfileUser(null);
                setMenuOpen(false);
              } else {
                setAuthMode("login");
                setAuthOpen(true);
              }
            }} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {isMember ? "Çıkış yap" : "Üye ol / Giriş yap"}
            </button>
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white hover:bg-cyan-900">
              <Plus size={17} /> İlan ekle
            </button>
          </div>
        </div>
      </header>

      <main className={"mx-auto grid max-w-7xl px-4 " + ((accountMode || userListingsMode) ? "lg:grid-cols-[1fr]" : detailMode ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[260px_1fr_300px]")}> 
                {!accountMode && !userListingsMode && (
          <aside className="h-fit border-x border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-black"><SlidersHorizontal size={17} /> Filtrele</h2>
              <button onClick={resetFilters} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"><RefreshCw size={13} /> sıfırla</button>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-black text-slate-500">Ara</span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Discus, filtre, gübre..." />
              </div>
            </label>

            <div className="grid gap-3">
              <MultiSelectDropdown label="İl" options={cityNames} selected={selectedCities} onChange={(value) => { setSelectedCities(value); setSelectedDistricts([]); setSelectedNeighborhoods([]); }} placeholder="Tüm iller" searchable />
              <MultiSelectDropdown label="İlçe" options={[...new Set(districtNames)]} selected={selectedDistricts} onChange={(value) => { setSelectedDistricts(value); setSelectedNeighborhoods([]); }} placeholder="Tüm ilçeler" searchable />
              <MultiSelectDropdown label="Mahalle" options={[...new Set(neighborhoodNames)]} selected={selectedNeighborhoods} onChange={setSelectedNeighborhoods} placeholder="Tüm mahalleler" searchable />
              <Select label="İlan tipi" value={selectedType} onChange={setSelectedType} options={listingTypes} />
              <Select label="Kategori" value={selectedCategory} onChange={(value) => { setSelectedCategory(value); setSelectedTags([]); }} options={categories} />
              <MultiSelectDropdown label="Alt seçenekler" options={activeCategoryOptions} selected={selectedTags} onChange={setSelectedTags} placeholder="Alt seçenek seç" searchable />
              <Select label="Sıralama" value={sort} onChange={setSort} options={["newest", "oldest", "verified"]} labels={{ newest: "En yeni", oldest: "En eski", verified: "Doğrulanmış üye ilanları" }} />
            </div>
          </aside>
        )}

        <section className={"min-w-0 bg-white " + (accountMode || userListingsMode ? "border-x border-slate-200" : "border-r border-slate-200")}>
  {effectiveMemberPage === "account" ? (
  <AccountPage user={currentUser} />
) : effectiveMemberPage === "listings" ? (
  <MyListingsPage
    listings={listings.filter((item) => item.userId === currentUserId)}
    onOpen={openListing}
    onRemove={setRemoveListing}
    onPromote={setPromoteListing}
  />
) : effectiveMemberPage === "messages" ? (
  <MessagesPage />
) : effectiveMemberPage === "ads" ? (
  <AdsManagerPage />
) : selectedListing ? (
  <ListingDetail
    item={selectedListing}
    user={users[selectedListing.userId]}
    activeImage={activeImage}
    setActiveImage={setActiveImage}
    isMember={isMember}
    onBack={() => setSelectedListing(null)}
    onProfile={setProfileUser}
    menuOpen={menuOpen}
    setMenuOpen={setMenuOpen}
    onReport={() => setReportOpen(true)}
    onAuth={() => {
      setAuthMode("login");
      setAuthOpen(true);
    }}
  />
) : viewUser ? (
  <UserListingsPage
    user={viewUser}
    onBack={() => setViewUser(null)}
    onOpen={(item) => {
      setViewUser(null);
      openListing(item);
    }}
    onProfile={setProfileUser}
    users={users}
    listings={listings}
    formatDate={formatDate}
    priceLabel={priceLabel}
    UserName={UserName}
  />
) : (
  <ListingFeed
    listings={filteredListings}
    onOpen={openListing}
    onProfile={setProfileUser}
    users={users}
    featuredListingIds={featuredListingIds}
    adPool={adPool}
    priceLabel={priceLabel}
    formatDate={formatDate}
    UserName={UserName}
    FeedAdCard={FeedAdCard}
  />
)}
</section>
        {!detailMode && !accountMode && !userListingsMode && <RightSidebar />}
      </main>

      {profileUser && (
  <ProfileModal
    user={profileUser}
    onClose={() => setProfileUser(null)}
    onViewListings={() => {
      setViewUser(profileUser);
      setProfileUser(null);
      setSelectedListing(null);
      setMemberPage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
  />
)}
      {reportOpen && <ReportModal onClose={() => setReportOpen(false)} />}
      {addOpen && <AddListingModal onClose={() => setAddOpen(false)} />}
      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setIsMember(true);
            setAuthOpen(false);
            setMemberPage("account");
            setSelectedListing(null);
            setViewUser(null);
            setProfileUser(null);
            setMenuOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
      {removeListing && <RemoveListingModal listing={removeListing} onClose={() => setRemoveListing(null)} />}
      {promoteListing && <PromoteListingModal listing={promoteListing} onClose={() => setPromoteListing(null)} />}
    </div>
  );
}

function ListingFeed({ listings, onOpen, onProfile }) {
  const [visibleCount, setVisibleCount] = useState(8);
  const visibleListings = listings.slice(0, visibleCount);
  const feedItems = [];

  visibleListings.forEach((item, index) => {
    feedItems.push({ kind: "listing", item });
    if ((index + 1) % 5 === 0) {
      feedItems.push({ kind: "ad", ad: adPool[Math.floor(index / 5) % adPool.length] });
    }
  });

  return (
    <div>
      {feedItems.map((entry, entryIndex) => {
        if (entry.kind === "ad") {
          return <FeedAdCard key={entry.ad.id + "-" + entryIndex} ad={entry.ad} />;
        }

        const item = entry.item;
        const user = users[item.userId];
        const isFeatured = featuredListingIds.includes(item.id);

        return (
          <article
            key={item.id}
            className={
              "relative border-b border-slate-200 p-4 transition " +
              (isFeatured ? "bg-cyan-50/60 hover:bg-cyan-50" : "bg-white hover:bg-slate-50")
            }
          >
            {isFeatured && (
              <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 shadow-sm">
                <Pin size={12} fill="currentColor" /> Öne çıkan
              </div>
            )}

            <button onClick={() => onOpen(item)} className="grid w-full grid-cols-[96px_1fr] gap-4 pr-0 text-left sm:pr-24">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
                <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                {item.youtube && (
                  <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white shadow">
                    <Play size={14} fill="currentColor" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-cyan-950 px-2.5 py-1 text-xs font-black text-white">{item.type}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{item.category}</span>
                </div>
                <h3 className="line-clamp-1 text-[17px] font-black leading-snug">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </button>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-[112px] text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                <button onClick={() => onProfile(user)} className="font-black text-slate-700 hover:underline">
                  <UserName user={user} />
                </button>
                <span className="flex items-center gap-1"><MapPin size={14} /> {item.city} / {item.district}</span>
                <span className="flex items-center gap-1"><CalendarDays size={14} /> {formatDate(item.date)}</span>
              </div>
              <strong className="text-base font-black text-cyan-950">{priceLabel(item)}</strong>
            </div>
          </article>
        );
      })}

      {visibleCount < listings.length && (
        <div className="border-b border-slate-200 p-5">
          <button onClick={() => setVisibleCount((count) => count + 8)} className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
            Daha fazla göster
          </button>
        </div>
      )}
    </div>
  );
}

function ListingDetail({ item, user, activeImage, setActiveImage, isMember, onBack, onProfile, menuOpen, setMenuOpen, onReport, onAuth }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isVideoSelected = activeImage === "video";
  const imageIndex = typeof activeImage === "number" ? activeImage : 0;
  const currentImage = item.images[imageIndex] || item.images[0];
  const featuredListings = listings.filter((listing) => featuredListingIds.includes(listing.id) && listing.id !== item.id);

  return (
    <article className="bg-white px-5 py-5">
      <DetailBannerAd ad={adPool[item.id % adPool.length]} />
      <button onClick={onBack} className="mb-4 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100">
        <ArrowLeft size={17} /> İlan listesine dön
      </button>

   <div className="grid gap-5 lg:grid-cols-[minmax(280px,420px)_1fr]">
        <div>
          <button
            onClick={() => !isVideoSelected && setLightboxOpen(true)}
            className="block aspect-[4/3] w-full overflow-hidden rounded-[24px] bg-slate-100 text-left"
          >
            {isVideoSelected ? (
              <div className="grid h-full w-full place-items-center bg-slate-950 text-white">
                <div className="text-center">
                  <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-red-600 shadow-lg">
                    <Play size={26} fill="currentColor" />
                  </div>
                  <div className="text-lg font-black">YouTube videosu</div>
                  <p className="mt-1 max-w-xs text-sm text-slate-300">{item.youtube}</p>
                </div>
              </div>
            ) : (
              <img src={currentImage} alt="" className="h-full w-full object-cover transition hover:scale-[1.02]" />
            )}
          </button>

        <div className="mt-3 grid grid-cols-5 gap-2">
  {[0, 1, 2, 3, 4].map((slot) => {
    const image = item.images[slot];

    if (image) {
      return (
        <button
          key={"image-slot-" + slot}
          onClick={() => setActiveImage(slot)}
          className={
            "aspect-[4/3] overflow-hidden rounded-xl border-2 bg-slate-100 transition " +
            (activeImage === slot
              ? "border-cyan-950"
              : "border-transparent hover:border-slate-300")
          }
          title={"Görsel " + (slot + 1)}
        >
          <img src={image} alt="" className="h-full w-full object-cover" />
        </button>
      );
    }

    return (
      <div
        key={"empty-slot-" + slot}
        className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300"
        title="Boş görsel alanı"
      >
        <Camera size={16} />
      </div>
    );
  })}
</div>

{item.youtube && (
  <button
    onClick={() => setActiveImage("video")}
    className={
      "mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 bg-slate-950 px-3 py-2 text-xs font-black text-white transition " +
      (activeImage === "video"
        ? "border-cyan-950"
        : "border-transparent hover:border-slate-300")
    }
    title="YouTube videosu"
  >
    <Play size={15} fill="currentColor" className="text-red-500" />
    YouTube videosu
  </button>
)}
</div>

        <div className="relative min-w-0">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-black text-white">{item.type}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{item.category}</span>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-100"><MoreHorizontal size={21} /></button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-10 min-w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <button onClick={onReport} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Flag size={15} /> Bildir</button>
                <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Share2 size={15} /> Paylaş</button>
                <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><Bookmark size={15} /> Kaydet</button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-tight">{item.title}</h2>
            <strong className="shrink-0 text-2xl font-black text-cyan-950">{priceLabel(item)}</strong>
          </div>

          <button onClick={() => onProfile(user)} className="mt-2 inline-flex items-center gap-1 rounded-full text-sm font-black text-slate-700 hover:underline">
            <UserName user={user} />
            {user.verified && <span className="ml-1 text-xs font-bold text-slate-400">doğrulanmış kullanıcı</span>}
          </button>

          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-700">{item.description}</p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1"><MapPin size={15} /> {item.city} / {item.district}{item.neighborhood ? " / " + item.neighborhood : ""}</span>
            <span className="flex items-center gap-1"><CalendarDays size={15} /> {formatDate(item.date)}</span>
          </div>

          <div className="mt-5 max-w-2xl border-t border-slate-200 pt-5">
            {isMember ? (
              <button className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900"><MessageCircle size={17} /> Mesaj gönder</button>
            ) : (
              <div>
                <p className="mb-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">Mesaj göndermek için üye girişi yapmalısınız.</p>
                <button onClick={onAuth} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900">Üye ol / Giriş yap</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {featuredListings.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-5">
          <div className="mb-3 flex items-center gap-2 text-lg font-black"><Pin size={17} fill="currentColor" className="text-cyan-950" /> Öne çıkan ilanlar</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {featuredListings.map((featured) => (
              <div key={featured.id} className="relative grid min-w-[250px] max-w-[250px] grid-cols-[74px_1fr] gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-left">
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-cyan-950 text-white"><Pin size={12} fill="currentColor" /></span>
                <img src={featured.images[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <span className="min-w-0 pr-6">
                  <span className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{featured.title}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">{featured.city} · {featured.category}</span>
                  <span className="mt-1 block text-sm font-black text-cyan-950">{priceLabel(featured)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm" onClick={() => setLightboxOpen(false)}>
          <button className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}><X size={22} /></button>
          <img src={currentImage} alt="" className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </article>
  );
}

function RightSidebar() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTab, setInfoTab] = useState("nedir");
  const slide = welcomeSlides[activeSlide];

  function openInfo(tab) {
    setInfoTab(tab);
    setInfoOpen(true);
  }

  const footerLinks = [
    ["nedir", "Nedir?"],
    ["contact", "Bize ulaşın"],
    ["terms", "Kullanım şartları"],
    ["ads", "Reklam verin"],
    ["adpolicy", "Reklam politikası"],
    ["warnings", "Önemli uyarılar"],
    ["privacy", "Gizlilik politikası"],
    ["blog", "Blog"]
  ];

  return (
    <aside className="h-fit border-r border-slate-200 bg-white p-4 lg:sticky lg:top-[72px]">
      <SidebarAd ad={adPool[0]} />
      <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <div className="relative h-52 overflow-hidden bg-slate-900 p-5 text-white" style={{ backgroundImage: "linear-gradient(120deg, rgba(8,51,68,.92), rgba(15,23,42,.62)), url(" + slide.image + ")", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/80">Hoş geldin</div>
            <h3 className="text-xl font-black leading-tight tracking-tight">{slide.title}</h3>
            <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-cyan-50/90">{slide.text}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-3">
          <div className="flex gap-1.5">
            {welcomeSlides.map((item, index) => (
              <button key={item.title} onClick={() => setActiveSlide(index)} className={"h-2 rounded-full transition-all " + (activeSlide === index ? "w-6 bg-cyan-950" : "w-2 bg-slate-300")} />
            ))}
          </div>
          <button onClick={() => openInfo("nedir")} className="text-xs font-black text-slate-500 hover:text-slate-900">Detaylar</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 opacity-75 transition hover:opacity-100">
        {footerLinks.map(([key, label]) => (
          <button key={key} onClick={() => openInfo(key)} className="rounded-xl px-2.5 py-2 text-[11px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            {label}
          </button>
        ))}
      </div>
      {infoOpen && <SiteInfoModal activeTab={infoTab} setActiveTab={setInfoTab} onClose={() => setInfoOpen(false)} />}
    </aside>
  );
}

function SiteInfoModal({ activeTab, setActiveTab, onClose }) {
  const tabs = [
    ["nedir", "Nedir?"],
    ["contact", "Bize ulaşın"],
    ["terms", "Kullanım şartları"],
    ["ads", "Reklam verin"],
    ["adpolicy", "Reklam politikası"],
    ["warnings", "Önemli uyarılar"],
    ["privacy", "Gizlilik politikası"]
  ];

  const content = {
    nedir: [
      "Hobiciden Hobiciye nedir?",
      "Akvaryum hobisine odaklanan; canlı, bitki, ekipman, yem, kimyasal ve dekor ilanlarının aynı çatı altında toplandığı niş bir ilan platformudur. Amaç genel pazar yeri kalabalığını azaltıp hobicilerin birbirini daha hızlı bulmasını sağlamaktır."
    ],
    contact: [
      "Bize ulaşın",
      "Destek, öneri, ilan bildirimi ve iş birliği talepleri için iletişim formu burada konumlanır. MVP aşamasında bu alan temsilidir; canlıda destek talepleri ayrı kayıt altında izlenebilir."
    ],
    terms: [
      "Kullanım şartları",
      "İlan veren kullanıcı, paylaştığı görsel ve metinlerden sorumludur. Canlı gönderimi, ödeme, teslimat ve iade koşulları taraflar arasında netleştirilmelidir. Platform şüpheli ilanları incelemeye alabilir."
    ],
    ads: [
      "Reklam verin",
      "Akvaryum hobisine doğrudan ulaşan hedefli reklam alanları sunulur. Sidebar, ilan arası reklam kartı ve ilan detay banner alanları marka görünürlüğü için kullanılabilir."
    ],
    adpolicy: [
      "Reklam politikası",
      "Reklam görsellerinde okunabilir telefon, WhatsApp, fiyat etiketi veya yoğun kampanya metni bulunmamalıdır. Görsel sade ürün, marka veya mağaza atmosferi taşımalı; iletişim ve fiyat bilgileri reklam metni ya da hedef sayfada verilmelidir. Uygun bulunmayan reklamlar incelemede reddedilebilir veya düzenleme istenebilir."
    ],
    warnings: [
      "Önemli uyarılar",
      "Canlı satışı, canlı gönderimi, ödeme, teslimat ve iade süreçleri kullanıcıların sorumluluğundadır. Platform; yanıltıcı, yoğun metinli, fiyat odaklı, iletişim bilgisi taşıyan veya topluluk güvenliğini zedeleyen reklamları incelemeye alabilir, reddedebilir ya da yayından kaldırabilir."
    ],
    privacy: [
      "Gizlilik politikası",
      "E-posta, telefon, mesajlaşma ve doğrulama bilgileri kullanıcı güvenliği için işlenir. Canlıya geçişte KVKK uyumlu açık rıza, aydınlatma metni ve veri saklama politikası gerekecektir."
    ],
    blog: [
      "Blog",
      "Kurulum rehberleri, tür tanıtımları, bakım notları, yeni başlayanlara öneriler ve ilan güvenliği yazıları bu bölümde yer alabilir. Blog, platforma organik trafik kazandıran güçlü bir içerik katmanı olur."
    ]
  };

  const current = content[activeTab] || content.nedir;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="grid max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl md:grid-cols-[190px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r md:sticky md:top-0">
          <div className="mb-3 flex justify-end md:hidden">
            <button onClick={onClose} className="rounded-full bg-white p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
          <div className="grid gap-1">
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} className={"rounded-2xl px-3 py-2 text-left text-sm font-black " + (activeTab === key ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")}>{label}</button>
            ))}
          </div>
        </aside>
        <section className="overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{current[0]}</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{current[1]}</p>
            </div>
            <button onClick={onClose} className="hidden rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 md:block"><X size={18} /></button>
          </div>
          {activeTab === "nedir" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"><div className="font-black">Güven</div><p className="mt-1 text-sm leading-relaxed text-slate-600">Doğrulama, bildirim, engelleme ve işlem sonrası değerlendirme akışlarıyla topluluk kalitesi korunur.</p></div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"><div className="font-black">Odak</div><p className="mt-1 text-sm leading-relaxed text-slate-600">Sadece akvaryum hobisine ait kategori ve filtreler kullanıldığı için ilan bulmak daha hızlıdır.</p></div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SidebarAd({ ad }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50 shadow-sm">
      <div className="relative h-28 overflow-hidden">
        <img src={ad.image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 to-slate-950/10" />
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Reklam</div>
      </div>
      <div className="p-3">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">{ad.brand}</div>
        <div className="mt-1 text-sm font-black leading-snug text-slate-900">{ad.title}</div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{ad.text}</p>
        <button className="mt-3 rounded-full bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600">{ad.cta}</button>
      </div>
    </div>
  );
}

function FeedAdCard({ ad }) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <article className="border-b border-slate-200 bg-amber-50/55 p-4 transition hover:bg-amber-50">
      <div className="grid grid-cols-[82px_1fr_auto] gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-amber-100">
          <img src={ad.image} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">
              Reklam
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setInfoOpen(true);
                }}
                className="grid h-4 w-4 place-items-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
                title="Bu reklam hakkında"
              >
                <Info size={10} />
              </button>
            </span>

            <span className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
              {ad.brand}
            </span>
          </div>

          <h3 className="line-clamp-1 text-[16px] font-black leading-snug text-slate-950">
            {ad.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-slate-600">
            {ad.text}
          </p>
        </div>

        <div className="flex items-center">
          <button className="rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-white hover:bg-amber-600">
            {ad.cta}
          </button>
        </div>
      </div>

      {infoOpen && <AdInfoModal onClose={() => setInfoOpen(false)} />}
    </article>
  );
}

function AdInfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Reklam alanı</div>
            <h3 className="mt-1 text-xl font-black">Reklamınız burada görünsün ister misiniz?</h3>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
        </div>
        <p className="text-sm leading-6 text-slate-600">Hobiciden.com aracılığıyla akvaryum hobisine ilgi duyan doğrudan hedef kitlenize ulaşın. Marka, ürün, mağaza veya hizmetinizi ilan akışı içinde doğal ve görünür biçimde konumlandırın.</p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-black text-white hover:bg-amber-600">Reklam ver</button>
      </div>
    </div>
  );
}

function DetailBannerAd({ ad }) {
  return (
    <div className="mb-5 overflow-hidden rounded-[22px] border border-amber-200 bg-amber-50/80 shadow-sm">
      <div className="grid min-h-[92px] gap-0 sm:grid-cols-[150px_1fr_auto]">
        <div className="relative hidden overflow-hidden sm:block">
          <img src={ad.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
            Reklam
          </span>
        </div>

        <div className="flex min-w-0 flex-col justify-center px-4 py-3">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
            {ad.brand}
          </div>
          <div className="mt-0.5 line-clamp-1 text-base font-black leading-tight text-slate-950">
            {ad.title}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm leading-relaxed text-slate-600">
            {ad.text}
          </p>
        </div>

        <div className="flex items-center px-4 pb-3 sm:pb-0">
          <button className="rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600">
            {ad.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountPage({ user }) {
  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">Hesabım</h2>
        <p className="mt-1 text-sm text-slate-500">Profil bilgilerini, doğrulama durumunu ve sosyal hesaplarını yönet.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4">
          <div className="grid place-items-center rounded-[24px] bg-slate-50 p-5 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-cyan-950 text-2xl font-black text-white">HH</div>
            <button className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Profil resmi ekle</button>
          </div>
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">
            <div className="mb-1 flex items-center gap-2 font-black"><ShieldCheck size={17} /> Güven profili</div>
            Telefon ve e-posta doğrulaması tamamlandığında kullanıcı adının yanında mavi tik görünür.
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"><Trash2 size={16} /> Hesabımı sil</button>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-lg font-black">Profil bilgileri</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-xs font-black text-slate-500">Kullanıcı adı</span><input defaultValue={user.username} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" /></label>
              <label><span className="mb-1 block text-xs font-black text-slate-500">Şehir</span><input defaultValue={user.city} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black text-slate-500">Hakkında</span><textarea rows={4} defaultValue={user.bio} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" /></label>
            </div>
            <button className="mt-4 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white">Bilgileri kaydet</button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-lg font-black">Doğrulama</h3>
              <VerificationRow icon={<Mail size={16} />} title="E-posta adresi" value="murat@example.com" verified />
              <VerificationRow icon={<Phone size={16} />} title="Telefon numarası" value="05xx xxx xx xx" verified />
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-lg font-black">Sosyal hesaplar</h3>
              <SocialInput icon="IG" placeholder="Instagram kullanıcı adı" />
              <SocialInput icon="FB" placeholder="Facebook profil linki" />
              <SocialInput icon="X" placeholder="Twitter / X kullanıcı adı" />
              <SocialInput icon="WEB" placeholder="Web sitesi" />
              <SocialInput icon="YT" placeholder="YouTube kanalı" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationRow({ icon, title, value, verified }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-slate-700">{icon}<div><div className="font-black">{title}</div><div className="text-xs text-slate-500">{value}</div></div></div>
      <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (verified ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500")}>{verified ? "Doğrulandı" : "Bekliyor"}</span>
    </div>
  );
}

function SocialInput({ icon, placeholder }) {
  return (
    <label className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="w-6 text-xs font-black text-slate-400">{icon}</span>
      <input placeholder={placeholder} className="w-full bg-transparent text-sm outline-none" />
    </label>
  );
}

function MyListingsPage({ listings = [], onOpen, onRemove, onPromote }) {
  const [tab, setTab] = useState("active");
  const [editingListing, setEditingListing] = useState(null);
  const [editingMode, setEditingMode] = useState("edit");

  const activeListings = Array.isArray(listings) ? listings : [];

  const expiredListings = activeListings.slice(0, 2).map((item, index) => ({
    ...item,
    id: "expired-" + item.id,
    date: index === 0 ? "2026-03-18" : "2026-03-05"
  }));

  const savedListings = activeListings.slice(-2).map((item) => ({
    ...item,
    id: "saved-" + item.id
  }));

  const tabs = [
    ["active", "Yayındaki ilanlarım", activeListings.length],
    ["expired", "Süresi dolmuş ilanlar", expiredListings.length],
    ["saved", "Kaydettiğim ilanlar", savedListings.length]
  ];

  const currentList =
    tab === "expired" ? expiredListings : tab === "saved" ? savedListings : activeListings;

  function openEditor(item, mode) {
    setEditingMode(mode);
    setEditingListing(item);
  }

  function safeDate(date) {
    if (!date || typeof date !== "string") return "";
    return date.split("-").reverse().join(".");
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">İlanlarım</h2>
        <p className="mt-1 text-sm text-slate-500">
          Yayındaki, süresi dolmuş ve kaydettiğin ilanları buradan yönetebilirsin.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-[24px] bg-slate-100 p-1">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              "rounded-full px-4 py-2 text-xs font-black transition " +
              (tab === key ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
            }
          >
            {label}
            <span className={tab === key ? "ml-2 text-cyan-100" : "ml-2 text-slate-400"}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {currentList.length > 0 ? (
          currentList.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-3 sm:grid-cols-[112px_1fr]"
            >
              {item.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt=""
                  className="h-28 w-28 rounded-2xl object-cover"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-2xl bg-slate-50 text-xs font-black text-slate-300">
                  Görsel yok
                </div>
              )}

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {tab === "active" && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                      Yayında
                    </span>
                  )}

                  {tab === "expired" && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      Süresi doldu
                    </span>
                  )}

                  {tab === "saved" && (
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-800">
                      Kaydedildi
                    </span>
                  )}

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {item.type || "İlan"}
                  </span>

                  <span className="text-xs font-black text-slate-500">
                    {safeDate(item.date)}
                  </span>
                </div>

                <h3 className="line-clamp-1 text-lg font-black text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpen(item)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <Eye size={14} /> Görüntüle
                  </button>

                  {tab === "active" && (
                    <>
                      <button
                        onClick={() => openEditor(item, "edit")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 size={14} /> Düzenle
                      </button>

                      <button
                        onClick={() => onPromote(item)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100"
                      >
                        <Pin size={14} /> Öne çıkar
                      </button>

                      <button
                        onClick={() => onRemove(item)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={14} /> Yayından kaldır
                      </button>
                    </>
                  )}

                  {tab === "expired" && (
                    <>
                      <button
                        onClick={() => openEditor(item, "republish")}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100"
                      >
                        <RotateCcw size={14} /> Güncelle ve tekrar yayımla
                      </button>

                      <button className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">
                        <Trash2 size={14} /> Komple sil
                      </button>
                    </>
                  )}

                  {tab === "saved" && (
                    <button className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                      <BookmarkX size={14} /> Kaydedilenlerden kaldır
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : tab === "active" ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="text-lg font-black text-slate-800">Yayında ilanın yok</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Yeni bir ilan eklediğinde burada görünecek.</p>
          </div>
        ) : tab === "expired" ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="text-lg font-black text-slate-800">Süresi dolmuş ilanın yok</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">30 günlük yayın süresi biten ilanlar burada listelenir.</p>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="text-lg font-black text-slate-800">Kaydettiğin ilan yok</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">İlan detayındaki Kaydet butonunu kullandığında ilanlar burada görünecek.</p>
          </div>
        )}
      </div>

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          mode={editingMode}
          onClose={() => setEditingListing(null)}
        />
      )}
    </div>
  );
}

function EditListingModal({ listing, mode, onClose }) {
  if (!listing) return null;

  const isRepublish = mode === "republish";
  const images = Array.isArray(listing.images) ? listing.images : [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h3 className="text-2xl font-black tracking-tight">
              {isRepublish ? "İlanı güncelle ve tekrar yayımla" : "İlanı düzenle"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              İlan bilgilerini güncelleyip inceleme için gönderebilirsin. Canlı sürümde bu işlem moderasyon kuyruğuna düşer.
            </p>
          </div>

          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-96px)] overflow-y-auto p-5">
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div>
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                {images[0] ? (
                  <img src={images[0]} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square w-full place-items-center text-sm font-black text-slate-300">
                    Görsel yok
                  </div>
                )}
              </div>

              <button className="mt-3 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                Görselleri güncelle
              </button>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((slot) => {
                  const image = images[slot];

                  return (
                    <div
                      key={slot}
                      className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-black text-slate-300"
                    >
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : slot + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">İlan tipi</span>
                  <select defaultValue={listing.type || "Satıyorum"} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none">
                    <option>Satıyorum</option>
                    <option>Takas</option>
                    <option>Ücretsiz / Sahiplendirme</option>
                    <option>Arıyorum</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">Kategori</span>
                  <select defaultValue={listing.category || "Canlı"} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none">
                    <option>Canlı</option>
                    <option>Bitki</option>
                    <option>Yem</option>
                    <option>Kimyasal</option>
                    <option>Akvaryum</option>
                    <option>Ekipman</option>
                    <option>Dekor</option>
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">İlan başlığı</span>
                <input defaultValue={listing.title || ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" />
              </label>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">Açıklama</span>
                <textarea rows={5} defaultValue={listing.description || ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">Fiyat / teklif</span>
                  <input defaultValue={listing.price || ""} placeholder="Örn. 750 TL, Takas, Teklif ver" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">Konum</span>
                  <input defaultValue={`${listing.city || ""} / ${listing.district || ""}`} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" />
                </label>
              </div>

              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">Etiketler</span>
                <input defaultValue={(listing.tags || []).join(", ")} placeholder="Örn. kendi üretimim, yavru, gönderim yapılır" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" />
              </label>

              <div className="rounded-2xl bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-900">
                Değişiklikler doğrudan yayına alınmaz; inceleme sonrası yeni bilgiler yayına geçer.
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Vazgeç
                </button>

                <button onClick={onClose} className="inline-flex items-center gap-2 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white hover:bg-cyan-900">
                  <Send size={16} /> İnceleme için gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function AdsManagerPage() {
  const [statsAd, setStatsAd] = useState(null);
  const [rejectAd, setRejectAd] = useState(null);
  const [paymentAd, setPaymentAd] = useState(null);
  const [liveOpen, setLiveOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [liveAds, setLiveAds] = useState([
    { ...adPool[0], remaining: "6 gün 14 saat", impressions: 1842, clicks: 73, paid: "89 TL", startDate: "19.05.2026" },
    { ...adPool[2], remaining: "2 gün 8 saat", impressions: 965, clicks: 31, paid: "49 TL", startDate: "16.05.2026" }
  ]);
  const reviewAds = [
    { ...adPool[1], status: "Reddedildi", reason: "Reklam görselinde okunabilir iletişim bilgisi ve fiyat bilgisi bulunuyor. Reklam politikası gereği görselde yoğun metin yerine sade ürün/marka görseli kullanılmalı." },
    { ...adPool[3], status: "Yayımlanmaya hazır" }
  ];
  const previewAd = adPool[0];

  function publishAd(ad, plan, price) {
    setLiveAds((current) => [{ ...ad, remaining: plan, impressions: 0, clicks: 0, paid: price, startDate: "19.05.2026" }, ...current]);
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">Reklamlarım</h2>
        <p className="mt-1 text-sm text-slate-500">Reklam görselini, marka bilgisini ve hedef linkini gir; reklam havuzuna alınması için incelemeye gönder.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-lg font-black">Yeni reklam oluştur</h3>
          <div className="grid gap-3">
            <div className="grid h-40 place-items-center rounded-[24px] border-2 border-dashed border-amber-300 bg-amber-50 text-center text-amber-800">
              <div><Upload className="mx-auto mb-2" size={28} /><strong>Görsel yükle</strong><p className="mt-1 text-xs">Reklam havuzunda farklı alanlara otomatik uyarlanır.</p></div>
            </div>
            <input className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" placeholder="Firma / marka adı" />
            <input className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" placeholder="Reklam başlığı" />
            <textarea rows={4} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" placeholder="Kısa açıklama" />
            <input className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" placeholder="Hedef link" />
            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
  Onaylanan reklamlar havuza alınır ve sitenin uygun alanlarında seçtiğiniz süre boyunca otomatik olarak gösterilir.{" "}
  <a
    href="https://siteadi.com/reklam-politikasi"
    target="_blank"
    rel="noreferrer"
    className="font-black text-cyan-800 underline decoration-cyan-800/30 underline-offset-2 hover:text-cyan-950"
  >
    Reklam politikamızı
  </a>{" "}
  inceleyerek reklamınızın yayımlanmasını kolaylaştırabilirsiniz.
</div>
            <button className="rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white hover:bg-cyan-900">İnceleme için gönder</button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-lg font-black">Canlı önizleme</h3>
          <div className="mb-4 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="relative h-28 overflow-hidden">
              <img src={previewAd.image} alt="" className="h-full w-full object-cover" />
              <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 shadow-sm">Reklam</span>
            </div>
            <div className="p-3">
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700">{previewAd.brand}</div>
              <div className="text-sm font-black text-slate-900">{previewAd.title}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{previewAd.text}</p>
            </div>
          </div>

          <AdAccordion title="Yayındaki reklamlarım" count={liveAds.length} open={liveOpen} onToggle={() => setLiveOpen(!liveOpen)}>
            {liveAds.map((ad) => (
              <AdSmallCard key={ad.id + ad.startDate} ad={ad} status="Yayında" onStats={() => setStatsAd(ad)} />
            ))}
          </AdAccordion>

          <AdAccordion title="İncelemedeki reklamlarım" count={reviewAds.length} open={reviewOpen} onToggle={() => setReviewOpen(!reviewOpen)}>
            {reviewAds.map((ad) => (
              <div key={ad.id + ad.status} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img src={ad.image} alt="" className="h-24 w-full object-cover" />
                <div className="p-3">
                  <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">{ad.brand}</span><span className={(ad.status === "Reddedildi" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700") + " rounded-full px-2 py-1 text-[11px] font-black"}>{ad.status}</span></div>
                  <div className="text-sm font-black text-slate-900">{ad.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{ad.text}</p>
                  {ad.status === "Reddedildi" ? <button onClick={() => setRejectAd(ad)} className="mt-3 w-full rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Reddedilme nedeni</button> : <button onClick={() => setPaymentAd(ad)} className="mt-3 w-full rounded-full bg-cyan-950 px-3 py-2 text-xs font-black text-white hover:bg-cyan-900">Öde ve yayımla</button>}
                </div>
              </div>
            ))}
          </AdAccordion>
        </div>
      </div>
      {statsAd && <AdStatsModal ad={statsAd} onClose={() => setStatsAd(null)} />}
      {rejectAd && <AdRejectModal ad={rejectAd} onClose={() => setRejectAd(null)} />}
      {paymentAd && <AdPaymentModal ad={paymentAd} onClose={() => setPaymentAd(null)} onPublish={publishAd} />}
    </div>
  );
}

function AdAccordion({ title, count, open, onToggle, children }) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-white">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
        <span className="font-black text-slate-900">{title}</span>
        <span className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{count}</span><span className={(open ? "rotate-180" : "") + " text-slate-400 transition"}>⌄</span></span>
      </button>
      {open && <div className="grid gap-3 border-t border-slate-100 p-3">{children}</div>}
    </div>
  );
}

function AdSmallCard({ ad, status, onStats }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <img src={ad.image} alt="" className="h-24 w-full object-cover" />
      <div className="p-3">
        <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">{ad.brand}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">{status}</span></div>
        <div className="text-sm font-black text-slate-900">{ad.title}</div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{ad.text}</p>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600"><Hourglass size={14} /> Kalan süre: {ad.remaining}</div>
        <div className="mt-3 grid grid-cols-3 gap-2"><button className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Düzenle</button><button onClick={onStats} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100">İstatistik</button><button className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Durdur</button></div>
      </div>
    </div>
  );
}

function AdRejectModal({ ad, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[30px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Reddedilme nedeni</h2>
            <p className="mt-1 text-sm text-slate-500">{ad.title}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          {ad.reason}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Tamam
          </button>

          <button
            onClick={onClose}
            className="rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900"
          >
            Tekrar düzenle
          </button>
        </div>
      </div>
    </div>
  );
}

function AdPaymentModal({ ad, onClose, onPublish }) {
  const [plan, setPlan] = useState("15 gün");
  const [success, setSuccess] = useState(false);
  const prices = { "7 gün": "199 TL", "15 gün": "349 TL", "30 gün": "599 TL" };

  function completePayment() {
    onPublish(ad, plan, prices[plan]);
    setSuccess(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[30px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Reklamı yayımla</h2><p className="mt-1 text-sm text-slate-500">{ad.title}</p></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X size={18} /></button></div>
        {success ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
            <CheckCircle2 className="mx-auto mb-2" size={34} />
            <div className="text-xl font-black">Ödeme başarılı</div>
            <p className="mt-1 text-sm leading-6">Reklam yayındaki reklamlarım bölümüne eklendi.</p>
            <button onClick={onClose} className="mt-4 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white">Tamam</button>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">{Object.keys(prices).map((item) => <button key={item} onClick={() => setPlan(item)} className={(plan === item ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50") + " rounded-2xl border p-3 text-left"}><div className="text-sm font-black">{item}</div><div className="mt-1 text-lg font-black text-amber-700">{prices[item]}</div></button>)}</div>
            <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3"><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="Kart üzerindeki isim" /><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="Kart numarası" /><div className="grid grid-cols-2 gap-3"><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="AA / YY" /><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="CVC" /></div></div>
            <button onClick={completePayment} className="mt-5 w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white">{prices[plan]} öde ve yayımla</button>
          </>
        )}
      </div>
    </div>
  );
}

function AdStatsModal({ ad, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[30px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Reklam istatistikleri</h2><p className="mt-1 text-sm text-slate-500">{ad.title}</p></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X size={18} /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3 text-center"><div className="text-2xl font-black text-slate-950">{ad.impressions}</div><div className="text-xs font-black text-slate-500">Gösterim</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center"><div className="text-2xl font-black text-slate-950">{ad.clicks}</div><div className="text-xs font-black text-slate-500">Tıklanma</div></div>
          <div className="rounded-2xl bg-amber-50 p-3 text-center"><div className="text-lg font-black text-amber-800">{ad.remaining}</div><div className="text-xs font-black text-amber-700">Kalan süre</div></div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center"><div className="text-lg font-black text-slate-950">{ad.paid || "89 TL"}</div><div className="text-xs font-black text-slate-500">Ödenen tutar</div></div>
        </div>
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600"><strong>Yayına başlama tarihi:</strong> {ad.startDate || "19.05.2026"}</div>
        <button onClick={onClose} className="mt-5 w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white">Tamam</button>
      </div>
    </div>
  );
}

function MessagesPage() {
  const [tab, setTab] = useState("active");
  const [selectedConversation, setSelectedConversation] = useState(null);

  function UserAvatarBubble({ user, size = "md" }) {
    const username = user?.user || user?.from || user?.name || "Kullanıcı";
    const initial = username.replace("@", "").trim().charAt(0).toUpperCase() || "H";

    const sizeClass =
      size === "lg"
        ? "h-12 w-12 text-sm"
        : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-10 w-10 text-xs";

    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-cyan-950 font-black text-white shadow-sm`}
        title={username}
      >
        {initial}
      </div>
    );
  }

  const conversations = [
    {
      id: 1,
      user: "@kadikoytank",
      title: "160x40x45h akvaryum ve sehpa",
      last: "Merhaba, ölçüler net 160x40x45 mi?",
      date: "18.05.2026",
      unread: true,
      deleted: false,
      messages: [
        { from: "@kadikoytank", body: "Merhaba, ölçüler net 160x40x45 mi?", time: "10:24" },
        { from: "sen", body: "Evet net ölçü bu, sehpa da dahil.", time: "10:31" }
      ]
    },
    {
      id: 2,
      user: "@nanoankara",
      title: "Java fern budama paketi",
      last: "Takas için karides düşünebilirim.",
      date: "17.05.2026",
      unread: false,
      deleted: false,
      messages: [
        { from: "sen", body: "Moss paketi hâlâ duruyor mu?", time: "18:12" },
        { from: "@nanoankara", body: "Duruyor. Takas için karides düşünebilirim.", time: "18:20" }
      ]
    },
    {
      id: 3,
      user: "@izmirfiltre",
      title: "Oase dış filtre",
      last: "Hortum aparatı duruyor mu?",
      date: "16.05.2026",
      unread: false,
      deleted: false,
      messages: [
        { from: "@izmirfiltre", body: "Hortum aparatı duruyor mu?", time: "14:03" },
        { from: "sen", body: "Duruyor ama medya dahil değil.", time: "14:18" }
      ]
    },
    {
      id: 4,
      user: "@eskitank",
      title: "Bitkili tank dekorları",
      last: "Tamamdır, ben vazgeçtim teşekkürler.",
      date: "12.05.2026",
      unread: false,
      deleted: true,
      messages: [
        { from: "@eskitank", body: "Dekorların tamamı duruyor mu?", time: "09:10" },
        { from: "sen", body: "Evet duruyor.", time: "09:18" },
        { from: "@eskitank", body: "Tamamdır, ben vazgeçtim teşekkürler.", time: "09:30" }
      ]
    }
  ];

  const visibleConversations = conversations.filter((message) => {
    if (tab === "deleted") {
      return message.deleted;
    }

    return !message.deleted;
  });

  let activeConversation = visibleConversations[0] || null;

  if (
    selectedConversation &&
    visibleConversations.some((message) => message.id === selectedConversation.id)
  ) {
    activeConversation = selectedConversation;
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">Mesajlarım</h2>
        <p className="mt-1 text-sm text-slate-500">
          İlanlarla ilgili konuşmaları görüntüle, bildir, engelle veya sil.
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1">
        <button
          onClick={() => {
            setTab("active");
            setSelectedConversation(null);
          }}
          className={
            "rounded-full px-4 py-2 text-xs font-black " +
            (tab === "active" ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
          }
        >
          Gelen kutusu
        </button>

        <button
          onClick={() => {
            setTab("deleted");
            setSelectedConversation(null);
          }}
          className={
            "rounded-full px-4 py-2 text-xs font-black " +
            (tab === "deleted" ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
          }
        >
          Silinmiş mesajlar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          {visibleConversations.map((message) => (
            <button
              key={message.id}
              onClick={() => setSelectedConversation(message)}
              className={
                "block w-full border-b border-slate-100 p-4 text-left last:border-b-0 hover:bg-slate-50 " +
                (activeConversation?.id === message.id ? "bg-slate-50" : "")
              }
            >
              <div className="flex gap-3">
                <UserAvatarBubble user={message} />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="truncate font-black text-slate-900">{message.user}</span>

                    {message.unread && (
                      <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[11px] font-black text-white">
                        Yeni
                      </span>
                    )}

                    {message.deleted && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700">
                        Silindi
                      </span>
                    )}

                    <span className="text-xs text-slate-500">{message.date}</span>
                  </div>

                  <div className="line-clamp-1 text-sm font-black text-slate-700">
                    {message.title}
                  </div>

                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">{message.last}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="min-h-[360px] rounded-[28px] border border-slate-200 bg-white p-4">
          {activeConversation ? (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex min-w-0 items-start gap-3">
                  <UserAvatarBubble user={activeConversation} size="lg" />

                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900">
                      {activeConversation.user}
                    </div>

                    <div className="line-clamp-1 text-base font-black text-slate-800">
                      {activeConversation.title}
                    </div>

                    <div className="text-xs text-slate-500">{activeConversation.date}</div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                    <Flag size={13} className="mr-1 inline" /> Şikayet et
                  </button>

                  <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
                    Engelle
                  </button>

                  <button className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
                    <Trash2 size={13} className="mr-1 inline" /> Sil
                  </button>
                </div>
              </div>

              <div className="grid flex-1 content-start gap-3">
                {activeConversation.messages.map((item, index) => {
                  const mine = item.from === "sen";

                  return (
                    <div
                      key={index}
                      className={
                        "max-w-[78%] rounded-2xl px-3 py-2 text-sm " +
                        (mine ? "ml-auto bg-cyan-950 text-white" : "bg-slate-100 text-slate-700")
                      }
                    >
                      <div className="mb-1 text-[11px] font-black opacity-70">
                        {item.from} · {item.time}
                      </div>

                      <div>{item.body}</div>
                    </div>
                  );
                })}
              </div>

              {tab !== "deleted" ? (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <input
                    className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Mesaj yaz..."
                  />

                  <button className="rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white">
                    Gönder
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  Bu konuşma silinmiş mesajlar içinde görünüyor. İstersen ileride “geri al”
                  aksiyonu da eklenebilir.
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              <div>
                <MessageCircle className="mx-auto mb-3 text-slate-300" size={36} />
                Bir konuşma seçerek mesajları burada görüntüleyebilirsin.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function UserListingsPage({ user, onBack, onOpen, onProfile }) {
  const userId = Number(Object.keys(users).find((id) => users[id].username === user.username));
  const userListings = listings.filter((item) => item.userId === userId);

  return (
    <div className="mx-auto max-w-5xl p-5">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeft size={17} /> İlan akışına dön
      </button>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-br from-cyan-950 to-slate-900 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <UserRound size={30} />
                {user.online && (
                  <span
                    title="Çevrimiçi"
                    className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"
                  />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">{user.username}</h2>
                  {user.verified && <VerifiedBadge />}
                </div>

                <p className="mt-1 text-sm text-cyan-50/80">
                  {user.city} · {user.joined} üyesi · {user.online ? "Çevrimiçi" : "Son ziyaret: " + user.lastSeen}
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/90">
                  {user.bio || "Bu kullanıcı henüz hakkında bilgisi eklememiş."}
                </p>
              </div>
            </div>

            <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-950 hover:bg-cyan-50">
              <MessageCircle size={16} /> Mesaj gönder
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">{userListings.length}</div>
            <div className="text-xs font-black text-slate-500">Yayındaki ilan</div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-emerald-700">{user.reviewStats?.positive || 0}</div>
            <div className="text-xs font-black text-slate-500">Olumlu değerlendirme</div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">{user.verified ? "Var" : "Yok"}</div>
            <div className="text-xs font-black text-slate-500">Doğrulama durumu</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h3 className="text-lg font-black">{user.username} kullanıcısının ilanları</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bu sayfada kullanıcının yayındaki ücretsiz ilanları listelenir.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            İlanlar 30 gün yayında kalır
          </div>
        </div>

        <div>
          {userListings.map((item) => {
            const isFeatured = featuredListingIds.includes(item.id);

            return (
              <article
                key={item.id}
                className={
                  "relative border-b border-slate-200 p-4 transition last:border-b-0 " +
                  (isFeatured ? "bg-cyan-50/60 hover:bg-cyan-50" : "bg-white hover:bg-slate-50")
                }
              >
                {isFeatured && (
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800 shadow-sm">
                    <Pin size={12} fill="currentColor" /> Öne çıkan
                  </div>
                )}

                <button
                  onClick={() => onOpen(item)}
                  className="grid w-full grid-cols-[96px_1fr] gap-4 pr-0 text-left sm:pr-24"
                >
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
                    <img src={item.images[0]} alt="" className="h-full w-full object-cover" />

                    {item.youtube && (
                      <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white shadow">
                        <Play size={14} fill="currentColor" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-cyan-950 px-2.5 py-1 text-xs font-black text-white">
                        {item.type}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {item.category}
                      </span>
                    </div>

                    <h4 className="line-clamp-1 text-[17px] font-black leading-snug">{item.title}</h4>
                    <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-[112px] text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                    <button onClick={() => onProfile(user)} className="font-black text-slate-700 hover:underline">
                      <UserName user={user} />
                    </button>

                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {item.city} / {item.district}
                    </span>

                    <span className="flex items-center gap-1">
                      <CalendarDays size={14} /> {formatDate(item.date)}
                    </span>
                  </div>

                  <strong className="text-base font-black text-cyan-950">{priceLabel(item)}</strong>
                </div>
              </article>
            );
          })}

          {userListings.length === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <UserRound size={26} />
              </div>
              <h3 className="mt-3 text-lg font-black">Yayında ilan yok</h3>
              <p className="mt-1 text-sm text-slate-500">
                Bu kullanıcının şu anda yayında aktif ilanı bulunmuyor.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function ProfileModal({ user, onClose, onViewListings }) {
  const stats = user.reviewStats || { positive: 0, neutral: 0, negative: 0 };
  const totalReviews = stats.positive + stats.neutral + stats.negative;
  const hasSocials = user.socials && (user.socials.instagram || user.socials.facebook || user.socials.x);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-cyan-950 text-white">
              <UserRound size={27} />
              {user.online && (
                <span
                  title="Çevrimiçi"
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"
                />
              )}
            </div>

            <div>
              <h2 className="flex items-center gap-1 text-xl font-black">
                <UserName user={user} />
              </h2>
              <p className="text-sm text-slate-500">{user.city} · {user.joined} üyesi</p>
              <p className={"mt-1 text-xs font-bold " + (user.online ? "text-emerald-600" : "text-slate-400")}>
                {user.online ? "Çevrimiçi" : "Son ziyaret: " + user.lastSeen}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
          {user.bio || "Bu kullanıcı henüz hakkında bilgisi eklememiş."}
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-lg font-black text-slate-950">{user.listingsCount || 0}</div>
            <div className="text-xs font-black text-slate-500">Yayındaki ilan</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-lg font-black text-slate-950">{totalReviews}</div>
            <div className="text-xs font-black text-slate-500">Toplam değerlendirme</div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="mb-1 flex items-center gap-2 font-black">
            <ShieldCheck size={16} /> Doğrulama durumu
          </div>
          {user.verified ? "E-posta ve telefon doğrulaması tamamlanmış." : "Tüm doğrulamalar henüz tamamlanmamış."}
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black">
            <Star size={16} /> Değerlendirme özeti
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-200">
              <div className="text-lg font-black text-emerald-700">{stats.positive}</div>
              <div className="text-xs font-bold text-slate-500">Olumlu</div>
            </div>

            <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-200">
              <div className="text-lg font-black text-slate-700">{stats.neutral}</div>
              <div className="text-xs font-bold text-slate-500">Nötr</div>
            </div>

            <div className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-200">
              <div className="text-lg font-black text-red-700">{stats.negative}</div>
              <div className="text-xs font-bold text-slate-500">Olumsuz</div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 text-sm font-black">Sosyal hesaplar</div>

          {hasSocials ? (
            <div className="flex flex-wrap gap-2 text-xs font-black text-slate-600">
              {user.socials.instagram && (
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                  IG {user.socials.instagram}
                </span>
              )}

              {user.socials.facebook && (
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                  FB {user.socials.facebook}
                </span>
              )}

              {user.socials.x && (
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
                  X {user.socials.x}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sosyal hesap eklenmemiş.</p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 text-sm font-black">Son değerlendirmeler</div>

          {user.reviews && user.reviews.length > 0 ? (
            <div className="grid gap-2">
              {user.reviews.map((review) => (
                <p key={review} className="rounded-xl bg-white p-2 text-sm text-slate-600 ring-1 ring-slate-200">
                  “{review}”
                </p>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-2 text-sm text-slate-500 ring-1 ring-slate-200">
              Henüz değerlendirme yok.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white">
            <MessageCircle size={17} /> Mesaj gönder
          </button>

          <button
            onClick={onViewListings}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Tüm ilanlarını gör
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({ onClose }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[32px] bg-white p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Bildir</h2><p className="text-sm text-slate-500">Bu ilanla ilgili kısa bir bildirim gönder.</p></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button></div><Select label="Neden?" value="Yanıltıcı ilan" onChange={() => {}} options={["Yanıltıcı ilan", "Uygunsuz canlı / ürün", "Sahte fotoğraf", "Satıldı ama yayında", "Diğer"]} /><label className="mt-3 block"><span className="mb-1 block text-xs font-black text-slate-500">Açıklama - opsiyonel</span><textarea rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="Kısaca açıklayın..." /></label><button onClick={onClose} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white">Bildir</button></div></div>;
}

function RemoveListingModal({ listing, onClose }) {
  const [reason, setReason] = useState("Hobicidenhobiciye aracılığıyla sattım / sahiplendirdim / buldum");
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[32px] bg-white p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">İlanı yayından kaldır</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">“{listing.title}” ilanını neden yayından kaldırıyorsun?</p></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button></div><div className="grid gap-2">{["Hobicidenhobiciye aracılığıyla sattım / sahiplendirdim / buldum", "Başka bir platform ile sattım / sahiplendirdim / buldum", "Vazgeçtim"].map((item) => <label key={item} className={"flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm " + (reason === item ? "border-cyan-950 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}><input type="radio" checked={reason === item} onChange={() => setReason(item)} className="mt-0.5" /><span className="font-bold leading-relaxed">{item}</span></label>)}</div><label className="mt-4 block"><span className="mb-1 block text-xs font-black text-slate-500">Kısa not - opsiyonel</span><textarea rows={3} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="İstersen kısa bir not ekleyebilirsin." /></label><div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">Bu bilgi platformun ilan kalitesini ve başarı oranını ölçmek için kullanılabilir. Kullanıcılara açık şekilde gösterilmez.</div><div className="mt-5 flex gap-2"><button onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Vazgeç</button><button onClick={onClose} className="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700">Yayından kaldır</button></div></div></div>;
}

function PromoteListingModal({ listing, onClose }) {
  const [plan, setPlan] = useState("7 Gün");
  const prices = { "3 Gün": "49 TL", "7 Gün": "89 TL", "14 Gün": "149 TL" };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[32px] bg-white p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-black"><Pin size={18} fill="currentColor" className="text-amber-600" /> İlanı öne çıkar</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">“{listing.title}” ilanını ana akışta vurgulu ve öne çıkan ilan olarak göster.</p></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button></div><div className="grid gap-2 sm:grid-cols-3">{["3 Gün", "7 Gün", "14 Gün"].map((item) => <button key={item} onClick={() => setPlan(item)} className={"rounded-2xl border p-3 text-left " + (plan === item ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50")}><div className="text-sm font-black text-slate-900">{item}</div><div className="mt-1 text-lg font-black text-amber-700">{prices[item]}</div><div className="mt-1 text-xs text-slate-500">Öne çıkan ilan bandı</div></button>)}</div><div className="mt-4 rounded-2xl bg-slate-50 p-3"><div className="mb-3 text-sm font-black">Ödeme bilgileri</div><div className="grid gap-3"><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="Kart üzerindeki isim" /><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="Kart numarası" /><div className="grid grid-cols-2 gap-3"><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="AA / YY" /><input className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" placeholder="CVC" /></div></div></div><div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Bu alan MVP’de temsili ödeme ekranıdır. Canlıya geçerken kart bilgileri platformda tutulmaz; ödeme altyapısı üzerinden güvenli şekilde işlenir.</div><div className="mt-5 flex gap-2"><button onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Vazgeç</button><button onClick={onClose} className="flex-1 rounded-full bg-amber-500 px-4 py-3 text-sm font-black text-white hover:bg-amber-600">{prices[plan]} öde ve öne çıkar</button></div></div></div>;
}

function AuthModal({ mode, setMode, onClose, onSuccess }) {
  const isLogin = mode === "login";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[34px] bg-white shadow-2xl md:grid-cols-[1.05fr_1fr]">
        <div
          className="relative hidden min-h-[640px] overflow-hidden bg-slate-950 p-8 text-white md:block"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(8,51,68,.92), rgba(15,23,42,.68)), url(" + img.tank1 + ")",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Hobiciden Hobiciye
              </div>
              <h2 className="max-w-md text-4xl font-black leading-tight tracking-tight">
                Akvaryum hobisine özel sade ve güvenli ilan alanı
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-7 text-cyan-50/85">
                Canlı, bitki, ekipman ve akvaryum ilanlarını keşfet. Sat, takas et, sahiplendir veya aradığını bul.
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-h-[90vh] overflow-y-auto p-6 sm:p-8 md:p-10">
          <button onClick={onClose} className="absolute right-5 top-5 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
            <X size={18} />
          </button>

          <div className="mx-auto max-w-md">
            <div className="mb-6">
              <div className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-slate-400">
                Hoş geldin
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-950">
                {isLogin ? "Giriş yap" : "Kayıt ol"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {isLogin
                  ? "Hesabına giriş yaparak ilan verebilir, mesaj gönderebilir ve profilini yönetebilirsin."
                  : "Yeni bir hesap oluşturarak topluluğa katılabilirsin."}
              </p>
            </div>

            <div className="mb-6 flex rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setMode("login")}
                className={
                  "flex-1 rounded-full px-4 py-2.5 text-sm font-black transition " +
                  (isLogin ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
                }
              >
                Giriş Yap
              </button>
              <button
                onClick={() => setMode("register")}
                className={
                  "flex-1 rounded-full px-4 py-2.5 text-sm font-black transition " +
                  (!isLogin ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")
                }
              >
                Kayıt Ol
              </button>
            </div>

            <div className="space-y-3">
              {!isLogin && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-500">Kullanıcı adı</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-800"
                    placeholder="@kullaniciadi"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-slate-500">E-posta adresi</span>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-800"
                  placeholder="ornek@mail.com"
                />
              </label>

              {!isLogin && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-500">Telefon numarası</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-800"
                    placeholder="05xx xxx xx xx"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-slate-500">Şifre</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-800"
                  placeholder="••••••••"
                />
              </label>

              {isLogin && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-cyan-950" />
                    Beni hatırla
                  </label>

                  <button type="button" className="text-xs font-black text-cyan-800 hover:text-cyan-950">
                    Şifremi unuttum
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onSuccess}
              className="mt-5 w-full rounded-full bg-cyan-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-cyan-900"
            >
              {isLogin ? "Giriş yap" : "Hesap oluştur"}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">veya</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-3">
              <button onClick={onSuccess} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-black">G</span>
                Google ile devam et
              </button>

              <button onClick={onSuccess} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-black">A</span>
                Apple ile devam et
              </button>

              <button onClick={onSuccess} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-black">F</span>
                Facebook ile devam et
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddListingModal({ onClose }) {
  const [type, setType] = useState("Satıyorum");
  const [category, setCategory] = useState("Canlı");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [allowOffer, setAllowOffer] = useState(true);
  const options = categoryOptions[category] || [];
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5"><div><h2 className="text-xl font-black">İlan ekle</h2><p className="text-sm text-slate-500">Fotoğraf, başlık, açıklama, kategori ve konum yeterli. Alt seçenekler opsiyoneldir.</p></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button></div><div className="max-h-[72vh] overflow-y-auto p-5"><div className="grid gap-4"><div className="grid h-36 place-items-center rounded-[26px] border-2 border-dashed border-slate-300 bg-slate-50 text-center text-slate-500"><div><Camera className="mx-auto mb-2" size={28} /><strong>Fotoğraf ekle</strong><p className="mt-1 text-xs">En fazla 5 fotoğraf · vitrin seçilebilir · sıralama yapılabilir</p></div></div><div className="grid grid-cols-5 gap-2">{["Vitrin", "2", "3", "4", "5"].map((slot) => <div key={slot} className="grid h-14 place-items-center rounded-2xl bg-slate-100 text-xs font-black text-slate-500">{slot}</div>)}</div><input className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="YouTube linki - opsiyonel" /><input className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="Başlık" /><textarea rows={4} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="Açıklama: adet, durum, takas, teslimat ve diğer notlar burada yazılabilir." /><div className="grid gap-3 sm:grid-cols-2"><Select label="İlan tipi" value={type} onChange={setType} options={listingTypes.filter((x) => x !== "Tümü")} /><Select label="Kategori" value={category} onChange={(value) => { setCategory(value); setSelectedOptions([]); }} options={categories.filter((x) => x !== "Tümü")} />{type === "Satıyorum" && <label><span className="mb-1 block text-xs font-black text-slate-500">Fiyat</span><input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder={allowOffer ? "Boş bırakılırsa Teklif ver görünür" : "Örn. 750 TL"} /></label>}<Select label="İl" value="Gaziantep" onChange={() => {}} options={Object.keys(locations)} /></div>{type === "Satıyorum" && <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-950"><input type="checkbox" checked={allowOffer} onChange={(e) => setAllowOffer(e.target.checked)} className="mt-0.5" /><span><strong>Teklif ver seçeneği açık</strong><br /><span className="text-cyan-800/80">Fiyat yazmasan bile ilanda “Teklif ver” görünebilir.</span></span></label>}<MultiSelectChips label={category + " için opsiyonel seçenekler"} options={options} selected={selectedOptions} onChange={setSelectedOptions} /></div></div><div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-5"><p className="text-xs leading-relaxed text-slate-500">İlanların yayımda kalma süresi 30 gündür. İlanınız inceleme sonrası yayına alınacaktır.</p><button onClick={onClose} className="rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white">Yayınla</button></div></div></div>;
}
