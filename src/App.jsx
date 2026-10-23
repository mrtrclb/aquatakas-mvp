import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth, AuthModal, NewPasswordModal, AquagramMark } from "./auth";
import { supabase, trError } from "./lib/supabase";
import { TR_CITIES, TR_TO_TYPE, mapListing, profileToUser, useDbListings, uploadListingImages, loadFeaturedPlans } from "./lib/listings";
import { detectSpecies } from "./species";
import { useDbCommunity, mapPost, uploadMedia, uploadBlobUrl } from "./lib/community";
import { useDbMessages, useNotifications, notificationText } from "./lib/social";
import { useDbKnowledge } from "./lib/knowledge";
import { useSiteSettings } from "./lib/settings";
import { useLiveAds, trackAdImpression, openAd, mapAd } from "./lib/ads";
import { playNotificationSound, setSoundEnabled, soundEnabled } from "./lib/sound";
import { SeenMarker, markSeen, pickLeastSeen, rotate } from "./lib/rotation";
import { LazySiteInfoModal as SiteInfoModal, SiteLinks, BLOG_URL } from "./site-links.jsx";
import { LEGAL_PATHS } from "./lib/legal-meta.js";
import { shouldOnboard } from "./lib/onboarding-check.js";
import { BumpButton, ProBadge, ProCard, useProStatus } from "./pro.jsx";
import { VerificationCard } from "./verification.jsx";
import { AccountSecurity, DeleteAccountDialog } from "./account-security.jsx";
import { trackVisit } from "./lib/visits";
import { absoluteUrl, navigate, onRoute, routePath, upgradeLegacyHash } from "./lib/router";
import { ListingDetailAside } from "./listing-aside.jsx";
import { ReviewModal, ReviewStrip, ReviewSummary, ReviewList, useProfileReviews } from "./reviews.jsx";
import {
  Bell,
  ChevronDown,
  PenLine,
  Tag,
  Users,
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
  BadgeCheck,
  Volume2,
  VolumeX,
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
  EyeOff,
  Send,
  Loader2,
  RotateCcw,
  BookmarkX,
  ShieldCheck,
  Info,
  Upload,
  Hourglass,
  BarChart3,
  Home,
  LogOut,
  BookOpen,
  Menu
} from "lucide-react";
import {
  ComposerModal,
  CommunityAside,
  CommunityFeed,
  MyPostsPage,
  PostDetailPage,
  PostNotFound,
  UserPostsPage,
  buildInitialPosts,
  commentSnippet,
  extractTags,
  mediaLabel,
  newMemberUsers,
  postSnippet,
  postUrl,
  timeAgo,
  userIdOf
} from "./community.jsx";
import { GroupFormModal, GroupPage, GroupsPage, TagsPage, buildDefaultGroups } from "./groups.jsx";
import { HomeAside, HomeFeed, HomeTopBar, loadHomeFilter, saveHomeFilter } from "./home.jsx";
import { KbAside, KbCategoryPage, KbHome, KbMinePage, KbWidgets, KeptSpeciesChips, SpeciesPage, SuggestSpeciesModal } from "./knowledge.jsx";
import { ArticlePage, ArticlesPage } from "./articles.jsx";
import { useArticles } from "./lib/articles";

// Seyrek kullanılan bölümler ayrı parçalar halinde, açıldıklarında indirilir
const AdsManagerPage = lazy(() => import("./ads-manager.jsx"));
const OnboardingModal = lazy(() => import("./onboarding.jsx").then((mod) => ({ default: mod.OnboardingModal })));
import { SEED_FAVORITES, SEED_KEEPING, SEED_SPECIES_COMMENTS, SPECIES, speciesBySlug } from "./species.js";
import { GroupIcon } from "./lib/group-icon.jsx";

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
  5: { username: "@bitkilibursa", city: "Bursa", joined: "Nisan 2026", lastSeen: "3 gün önce", online: false, listingsCount: 5, verified: false, bio: "Low-tech bitkili tanklar ve budama paketleri.", socials: { instagram: "@bitkilibursa", facebook: "", x: "" }, reviewStats: { positive: 2, neutral: 0, negative: 0 }, reviews: ["Bitkiler temiz ve yosunsuzdu.", "Takas hızlıca tamamlandı."] },
  ...newMemberUsers
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

const demoListings = [
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

// Örnek (demo) içerik: gerçek içerik yeterince çoğalınca SHOW_DEMO=false yapılır
const SHOW_DEMO = true;
const demoFeaturedIds = [9, 12, 16, 21];
// Aşağıdaki iki değişken her çizimde App içinde güncellenir (gerçek + örnek ilanlar)
let listings = demoListings;
let featuredListingIds = demoFeaturedIds;
for (const city of TR_CITIES) if (!locations[city]) locations[city] = {};

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

// Yayındaki gerçek reklamlar (yerleşime göre); yoksa örnek reklamlar gösterilir
let livePools = {};
function adsFor(placement) {
  const live = livePools[placement] || [];
  return live.length ? live : SHOW_DEMO ? adPool : [];
}

function AdImage({ ad, className = "h-full w-full object-cover" }) {
  const [broken, setBroken] = useState(false);
  return ad.image && !broken
    ? <img src={ad.image} alt="" loading="lazy" onError={() => setBroken(true)} className={className} />
    : <div className={className + " grid place-items-center bg-gradient-to-br from-amber-200 via-amber-100 to-cyan-100 text-lg font-black text-amber-700/70"}>{(ad.brand || "").slice(0, 1)}</div>;
}

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
      {user.pro && <ProBadge />}
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
          <button key={option} type="button" onClick={() => toggle(option)} className={"rounded-full border px-2.5 py-1 text-[12px] font-black transition " + (selected.includes(option) ? "border-cyan-950 bg-cyan-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
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
        {selected.length > 0 && <button type="button" onClick={clearAll} className="text-[12px] font-black text-cyan-700 hover:text-cyan-950">temizle</button>}
      </div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white">
        <span className={"min-w-0 truncate " + (selected.length === 0 ? "text-slate-400" : "font-bold text-slate-700")}>{summary}</span>
        <span className={"shrink-0 text-slate-400 transition " + (open ? "rotate-180" : "")}>⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <strong className="text-[12px] uppercase tracking-[0.12em] text-slate-500">{label}</strong>
              {selected.length > 0 && <button type="button" onClick={clearAll} className="text-[12px] font-black text-cyan-700 hover:text-cyan-950">Seçimleri temizle</button>}
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

export default function AquagramApp() {
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
  const auth = useAuth();
  const isMember = Boolean(auth.session);
  const [profileUser, setProfileUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSpecies, setAddSpecies] = useState(null); // tür sayfasından "İlk ilanı ver"
  const [composerOpts, setComposerOpts] = useState(null); // { species, kind } — tür sayfasından açılınca
  const [memberPage, setMemberPage] = useState(null);
  const [onboardDismissed, setOnboardDismissed] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);

  // Masaüstünde akış kaydırılınca sağ altta "+" düğmesi (Twitter gibi)
  useEffect(() => {
    const onScroll = () => setFabVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [removeListing, setRemoveListing] = useState(null);
  const [promoteListing, setPromoteListing] = useState(null);
  const [editListing, setEditListing] = useState(null); // { item, mode: "edit" | "republish" }
  const [demoPosts, setDemoPosts] = useState(() => buildInitialPosts());
  const [communityOpen, setCommunityOpen] = useState(false);
  const [postSlug, setPostSlug] = useState(null);
  const [postsUser, setPostsUser] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [localGroups, setGroups] = useState(() => buildDefaultGroups());
  const [groupSlug, setGroupSlug] = useState(null);
  const [communityPage, setCommunityPage] = useState(null); // "tags" | "groups" | null
  const [composerGroupId, setComposerGroupId] = useState(null);
  const [groupForm, setGroupForm] = useState(null); // { group } — group null ise yeni grup
  const [tagSeed] = useState(() => Math.random()); // her sayfa yenilemede farklı etiketler
  const [listingsOpen, setListingsOpen] = useState(false); // "İlanlar" sayfası
  const [homeFilter, setHomeFilter] = useState(loadHomeFilter);
  const [homeTab, setHomeTab] = useState("foryou");
  const [homeLocation, setHomeLocation] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [demoFollowedTags, setFollowedTags] = useState([]);
  const [kbRoute, setKbRoute] = useState(null);
  const articlesDb = useArticles(); // { section } | { category } | { slug } | { mine }
  const [kbSearch, setKbSearch] = useState("");
  const [kbKeeping, setKbKeeping] = useState(() => ({ ...SEED_KEEPING }));
  const [kbFavorites, setKbFavorites] = useState(() => ({ ...SEED_FAVORITES }));
  const [kbComments, setKbComments] = useState(() =>
    SEED_SPECIES_COMMENTS.map(([slug, userId, text, hoursAgo], index) => ({
      id: "sc" + index, slug, userId, text, createdAt: Date.now() - hoursAgo * 3600000, likes: (text.length % 9) + 1, likedByMe: false
    }))
  );
  const [drawerOpen, setDrawerOpen] = useState(false); // mobil: sol menü / filtre paneli
  const [mobileShareOpen, setMobileShareOpen] = useState(false);
  const [localConversations, setConversations] = useState([]); // örnek kullanıcılarla (yalnızca bu cihazda) konuşmalar
  const [activeConvId, setActiveConvId] = useState(null);
  const [reviewConv, setReviewConv] = useState(null);
  const [suggestSpecies, setSuggestSpecies] = useState(null); // { category, name }
  const userMenuRef = useRef(null);
  const shareMenuRef = useRef(null);
  const cameFromApp = useRef(false);
  const myId = auth.user?.id || null;
  const currentUserId = isMember && myId ? myId : 1;
  const db = useDbListings(myId);
  // Gerçek kullanıcıları (ilan sahipleri + giriş yapan üye) kullanıcı listesine ekle
  db.rows.forEach((row) => { if (row.owner) users[row.owner.id] = profileToUser(row.owner); });
  if (myId) users[myId] = auth.profile ? profileToUser(auth.profile) : users[myId] || { ...profileToUser({ id: myId, username: (auth.email || "uye").split("@")[0] }) };
  const dbListings = useMemo(() => db.rows.map(mapListing), [db.rows]);
  const myListings = dbListings.filter((item) => item.userId === myId);
  listings = [...dbListings.filter((item) => item.status === "active"), ...(SHOW_DEMO ? demoListings : [])];
  featuredListingIds = [...demoFeaturedIds, ...dbListings.filter((item) => item.featured && item.status === "active").map((item) => item.id)];
  Object.values(users).forEach((user) => { if (user.real) user.listingsCount = listings.filter((item) => item.userId === user.id).length; });

  // ---- Topluluk (gerçek veritabanı) ----
  const community = useDbCommunity(myId);
  const msgs = useDbMessages(isMember ? myId : null);
  const notifs = useNotifications(isMember ? myId : null);
  // Yeni bildirim ya da mesaj gelince kısa ses (site açıkken; ilk yüklemede çalmaz)
  const alertCount = notifs.unread + msgs.unreadCount;
  const prevAlertCount = useRef(null);
  useEffect(() => {
    if (prevAlertCount.current !== null && alertCount > prevAlertCount.current) playNotificationSound();
    prevAlertCount.current = alertCount;
  }, [alertCount]);
  const kbDb = useDbKnowledge(myId);
  const siteSettings = useSiteSettings();
  livePools = useLiveAds();
  const announcement = siteSettings.announcement && siteSettings.announcement.active && siteSettings.announcement.text ? siteSettings.announcement : null;
  [...community.profiles, ...msgs.profiles, ...kbDb.profiles].forEach((row) => { if (!users[row.id] || users[row.id].real) users[row.id] = profileToUser(row); });
  if (myId && auth.profile) users[myId] = profileToUser(auth.profile);
  const dbGroupById = useMemo(() => Object.fromEntries(community.groups.map((group) => [group.id, group])), [community.groups]);
  const groupKey = (dbGroupId) => {
    const group = dbGroupById[dbGroupId];
    return group ? (group.is_official ? String(group.slug) : group.id) : dbGroupId;
  };
  const groups = useMemo(() => {
    const membersOf = (gid) => community.members.filter((row) => row.group_id === gid);
    const merged = localGroups.map((group) => {
      const db = community.groups.find((row) => row.is_official && String(row.slug) === group.slug);
      if (!db) return group;
      const rows = membersOf(db.id);
      // Resmi grubun yönetimden düzenlenmiş bilgileri yerel varsayılanların önüne geçer
      return {
        ...group,
        name: db.name || group.name,
        description: db.description || group.description,
        rules: db.rules && db.rules.length ? db.rules : group.rules,
        emoji: db.emoji || group.emoji,
        cover: db.cover_url || group.cover,
        icon: db.icon_url || group.icon || null,
        dbId: db.id,
        memberIds: Array.from(new Set([...group.memberIds, ...rows.map((row) => row.user_id)])),
        moderatorIds: Array.from(new Set([...group.moderatorIds, ...rows.filter((row) => row.role !== "member").map((row) => row.user_id)]))
      };
    });
    community.groups
      .filter((row) => !row.is_official && !row.is_closed)
      .forEach((row) => {
        const rows = membersOf(row.id);
        merged.push({
          id: row.id,
          dbId: row.id,
          slug: String(row.slug),
          name: row.name,
          emoji: row.emoji,
          color: row.color,
          cover: row.cover_url || null,
          icon: row.icon_url || null,
          description: row.description,
          rules: row.rules || [],
          ownerId: row.owner_id,
          moderatorIds: rows.filter((m) => m.role !== "member").map((m) => m.user_id),
          memberIds: rows.map((m) => m.user_id),
          createdAt: new Date(row.created_at).getTime()
        });
      });
    return merged;
  }, [localGroups, community.groups, community.members]);
  const dbPosts = useMemo(
    () => community.rows.map((row) => mapPost(row, { ...community.mine, groupKey })),
    [community.rows, community.mine, dbGroupById] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const posts = useMemo(
    () => [...dbPosts, ...(SHOW_DEMO ? demoPosts : [])].sort((a, b) => b.createdAt - a.createdAt),
    [dbPosts, demoPosts]
  );
  const followedTags = isMember ? community.mine.tags : demoFollowedTags;
  const conversations = useMemo(() => [...msgs.conversations, ...localConversations], [msgs.conversations, localConversations]);
  const isDbPost = (postId) => String(postId).startsWith("dp");
  const dbIdOf = (postId) => Number(String(postId).slice(2));

  // Veritabanı satırlarında iyimser güncelleme yardımcıları
  function patchRow(postDbId, fn) {
    community.setRows((prev) => prev.map((row) => (row.id === postDbId ? fn(row) : row)));
  }
  function patchMine(key, fn) {
    community.setMine((prev) => ({ ...prev, [key]: fn(prev[key]) }));
  }
  async function dbCall(promise, rollback) {
    const { error } = await promise;
    if (error) {
      setToast(trError(error));
      if (rollback) rollback();
      community.reload();
      return false;
    }
    return true;
  }

  // Bilgi Bankası / tür sayfası ya da ilan açılınca tür ayrıntılarını beklemeden getir
  useEffect(() => {
    if (kbRoute || selectedListing) kbDb.loadDetails();
  }, [kbRoute, selectedListing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yasal sayfa adresleri (/kullanim-kosullari, /gizlilik, /kvkk) site bilgileri penceresini açar
  const [legalTab, setLegalTab] = useState(null);

  // Adresler: /paylasim/<sayı>-<kelimeler>, /gruplar, /grup/<ad>, /etiketler, /bilgi..., /tur/<ad>, /ilan/<no>, /ilanlar, /topluluk
  useEffect(() => {
    upgradeLegacyHash();
    function syncFromRoute(kind) {
      const path = routePath();
      const post = path.match(/^\/paylasim\/(.+)$/);
      const group = path.match(/^\/grup\/([^/]+)$/);
      setLegalTab(LEGAL_PATHS[path] || null);
      setPostSlug(post ? post[1] : null);
      setGroupSlug(group ? group[1] : null);
      setCommunityPage(path === "/gruplar" ? "groups" : path === "/etiketler" ? "tags" : null);
      const kbSection = path.match(/^\/bilgi(?:\/b\/([^/]+))?$/);
      const kbCategory = path.match(/^\/bilgi\/k\/([^/]+)$/);
      const species = path.match(/^\/tur\/([^/]+)$/);
      const article = path.match(/^\/makale\/([^/]+)$/);
      setKbRoute(
        species ? { slug: species[1] }
          : article ? { article: decodeURIComponent(article[1]) }
          : path === "/makaleler" ? { articles: true }
          : kbCategory ? { category: kbCategory[1] }
          : path === "/bilgi/turlerim" ? { mine: true }
          : kbSection ? { section: kbSection[1] || "tatlisu" }
          : null
      );
      if (kind === "pop") {
        // Tarayıcının geri/ileri tuşu ya da ilk açılış: görünümü adrese göre baştan kur
        setMemberPage(null);
        setViewUser(null);
        setProfileUser(null);
        setPostsUser(null);
        setMenuOpen(false);
        if (!/^\/ilan\/(ornek-)?\d+$/.test(path)) setSelectedListing(null);
        setListingsOpen(path === "/ilanlar");
        setCommunityOpen(path === "/topluluk");
      } else {
        if (path === "/ilanlar") setListingsOpen(true);
        if (path === "/topluluk") setCommunityOpen(true);
      }
      setDrawerOpen(false);
    }
    syncFromRoute("pop");
    return onRoute(syncFromRoute);
  }, []);

  useEffect(() => {
    if (!shareMenuOpen) return undefined;
    function onDown(event) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) setShareMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [shareMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    function onDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  // Reklam kartlarındaki "Reklam ver" düğmesi
  useEffect(() => {
    const onOpenAds = () => openMemberPage("ads");
    window.addEventListener("aquagram:open-ads", onOpenAds);
    return () => window.removeEventListener("aquagram:open-ads", onOpenAds);
  });

  // İlan adresi: /ilan/<no> (paylaşılan bağlantılar, arama motorları, geri/ileri tuşları)
  const selectedListingRef = useRef(null);
  selectedListingRef.current = selectedListing;
  useEffect(() => {
    function openFromRoute() {
      const path = routePath();
      const match = path.match(/^\/ilan\/(\d+)$/);
      const demo = path.match(/^\/ilan\/ornek-(\d+)$/); // örnek (demo) ilanlar
      if (!match && !demo) return;
      const current = selectedListingRef.current;
      if (current && (match ? current.dbId === Number(match[1]) : !current.dbId && current.id === Number(demo[1]))) return;
      const item = match ? dbListings.find((row) => row.dbId === Number(match[1])) : SHOW_DEMO ? demoListings.find((row) => row.id === Number(demo[1])) : null;
      if (item) {
        clearViews();
        setListingsOpen(false);
        setSelectedListing(item);
        setActiveImage(0);
        window.scrollTo({ top: 0 });
      }
    }
    openFromRoute();
    return onRoute(openFromRoute);
  }, [dbListings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Açılan konuşmayı okundu say
  useEffect(() => {
    if (memberPage !== "messages") return;
    const visible = msgs.conversations.filter((item) => !item.deleted);
    const active = msgs.conversations.find((item) => item.id === activeConvId) || (activeConvId ? null : visible[0]);
    if (active && active.unread) msgs.markRead(active.dbId);
  }, [memberPage, activeConvId, msgs.conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bildirimler sayfası açılınca hepsi okundu
  useEffect(() => {
    if (memberPage === "notifications" && notifs.unread > 0) {
      const timer = setTimeout(() => notifs.markAllRead(), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [memberPage, notifs.unread]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni üyeye ilk girişte profil kurulumu (açıldıktan sonra kapanana kadar açık kalır)
  // Çıkış yapılınca kurulum penceresi kapanır (başka hesapla girişte yanlışlıkla açılmasın)
  useEffect(() => {
    if (!auth.user) setOnboardOpen(false);
  }, [auth.user]);
  useEffect(() => {
    if (!onboardOpen && !onboardDismissed && !authOpen && (auth.needsTerms ? Boolean(auth.profile) : shouldOnboard(auth))) setOnboardOpen(true);
  }, [auth.user, auth.profile, authOpen, auth.needsTerms]); // eslint-disable-line react-hooks/exhaustive-deps

  // Google/Apple girişinden hata ile dönüldü
  useEffect(() => {
    if (!auth.oauthError) return;
    setToast(/denied|cancel/i.test(auth.oauthError) ? "Giriş iptal edildi." : "Giriş yapılamadı: " + auth.oauthError);
    auth.clearOauthError();
  }, [auth.oauthError]); // eslint-disable-line react-hooks/exhaustive-deps

  // E-postadaki doğrulama bağlantısıyla gelen yeni üye
  useEffect(() => {
    if (!auth.justConfirmed || !auth.session) return;
    const kind = auth.justConfirmed;
    auth.clearJustConfirmed();
    setToast(kind === "email_change" ? "E-posta adresin güncellendi." : "E-postan doğrulandı. Aquagram'a hoş geldin!");
    setMemberPage("account");
  }, [auth.justConfirmed, auth.session]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), Math.max(2600, toast.length * 55));
    return () => clearTimeout(timer);
  }, [toast]);

  function clearPostHash() {
    setPostSlug(null);
    setGroupSlug(null);
    setCommunityPage(null);
    setKbRoute(null);
  }

  function clearViews() {
    setMemberPage(null);
    setSelectedListing(null);
    setViewUser(null);
    setProfileUser(null);
    setMenuOpen(false);
    setCommunityOpen(false);
    setPostsUser(null);
    setShareMenuOpen(false);
    setDrawerOpen(false);
    setMobileShareOpen(false);
    clearPostHash();
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Adresi olmayan görünümlere (üye sayfaları, kullanıcı ilanları vb.) geçerken adres çubuğunu ana yola al
  function leaveTo(path = "/") {
    if (routePath() !== path) navigate(path);
  }

  function openCommunity() {
    clearViews();
    setListingsOpen(false);
    setCommunitySearch("");
    setCommunityOpen(true);
    navigate("/topluluk");
    scrollTop();
  }

  function openHashPage(path) {
    clearViews();
    setListingsOpen(false);
    navigate(path);
    scrollTop();
  }

  // Herhangi bir yerden mesaj başlat: varsa mevcut konuşmayı aç, yoksa yeni konuşma oluştur
  function startConversation(user, topic) {
    if (!isMember) {
      requireLogin();
      return;
    }
    if (user.username === users[currentUserId].username) return;
    const otherId = userIdOf(users, user);
    if (users[otherId] && users[otherId].real) {
      const draft = topic && topic.endsWith(" hakkında") ? "Merhaba! " + topic.replace(/ hakkında$/, "") + " beslediğini gördüm, sormak istediğim bir şey var:" : "";
      const listing = selectedListing && selectedListing.dbId && selectedListing.title === topic ? selectedListing.dbId : null;
      msgs.start(otherId, topic || "Profil", listing, draft).then((id) => {
        clearViews();
        leaveTo("/");
        setListingsOpen(false);
        setMemberPage("messages");
        setActiveConvId(id);
        scrollTop();
      }, (error) => setToast(trError(error)));
      return;
    }
    // İlan ve tür konuları ayrı konuşma olur; profilden yazılınca kişiyle son konuşma açılır
    const existing = conversations.find((item) => item.user === user.username && !item.deleted && (topic === "Profil" || item.title === topic));
    let id = existing ? existing.id : Date.now();
    if (!existing) {
      setConversations((prev) => [
        {
          id,
          user: user.username,
          title: topic || "Yeni konuşma",
          last: "",
          date: new Date().toLocaleDateString("tr-TR"),
          unread: false,
          deleted: false,
          messages: [],
          draft: topic && topic.endsWith(" hakkında") ? "Merhaba! " + topic.replace(/ hakkında$/, "") + " beslediğini gördüm, sormak istediğim bir şey var:" : "Merhaba! "
        },
        ...prev
      ]);
    }
    clearViews();
    setListingsOpen(false);
    setMemberPage("messages");
    setActiveConvId(id);
    scrollTop();
  }

  function sendMessage(id, body) {
    if (String(id).startsWith("dm")) {
      msgs.send(Number(String(id).slice(2)), body).catch((error) => setToast(trError(error)));
      return;
    }
    setConversations((prev) => prev.map((item) => (item.id !== id ? item : {
      ...item,
      last: body,
      unread: false,
      date: new Date().toLocaleDateString("tr-TR"),
      messages: [...item.messages, { from: "sen", body, time: nowTime() }]
    })));
  }

  function toggleTag(tag) {
    if (!isMember) {
      requireLogin();
      return;
    }
    const following = followedTags.includes(tag);
    if (myId) {
      patchMine("tags", (prev) => (following ? prev.filter((item) => item !== tag) : [...prev, tag]));
      // Veritabanında etiketler "#" olmadan ve küçük harfle saklanır (paylaşım etiketleriyle aynı biçim)
      const dbTag = tag.replace(/^#/, "").toLocaleLowerCase("tr");
      dbCall(following ? supabase.from("tag_follows").delete().eq("user_id", myId).eq("tag", dbTag) : supabase.from("tag_follows").insert({ tag: dbTag }));
    } else setFollowedTags((prev) => (following ? prev.filter((item) => item !== tag) : [...prev, tag]));
    setToast(following ? tag + " takibi bırakıldı" : tag + " takip ediliyor · paylaşımlar ana sayfanda");
  }

  function toggleInMap(setter, slug, onMsg, offMsg) {
    setter((prev) => {
      const mine = prev[currentUserId] || [];
      const has = mine.includes(slug);
      setToast(has ? offMsg : onMsg);
      return { ...prev, [currentUserId]: has ? mine.filter((item) => item !== slug) : [...mine, slug] };
    });
  }

  // Bilgi Bankası: giriş yapan üyenin besledikleri/favorileri/yorumları veritabanında; örnek içerik yanında gösterilir
  const kbKeepingAll = useMemo(() => ({ ...(SHOW_DEMO ? kbKeeping : {}), ...kbDb.keeping }), [kbKeeping, kbDb.keeping]);
  const kbFavoritesAll = useMemo(
    () => (myId ? { ...(SHOW_DEMO ? kbFavorites : {}), [myId]: kbDb.favoriteSlugs } : kbFavorites),
    [kbFavorites, kbDb.favoriteSlugs, myId]
  );
  const kbCommentsAll = useMemo(() => [...kbDb.comments, ...(SHOW_DEMO ? kbComments : [])], [kbDb.comments, kbComments]);
  const isDbSpeciesComment = (id) => String(id).startsWith("dsc");
  const speciesCommentDbId = (id) => Number(String(id).slice(3));

  async function kbDbCall(promise, rollback) {
    const { error } = await promise;
    if (error) {
      setToast(trError(error));
      if (rollback) rollback();
      kbDb.reload();
      return false;
    }
    return true;
  }

  function toggleSpecies(table, slug, onMsg, offMsg) {
    const speciesId = kbDb.speciesId(slug);
    if (!speciesId) return setToast("Tür bulunamadı, sayfayı yenileyip tekrar dene.");
    if (table === "species_keepers") {
      const has = (kbDb.keeping[myId] || []).includes(slug);
      const apply = (on) => kbDb.setKeepers((prev) => (on ? [...prev, { species_id: speciesId, user_id: myId }] : prev.filter((row) => !(row.species_id === speciesId && row.user_id === myId))));
      apply(!has);
      setToast(has ? offMsg : onMsg);
      return kbDbCall(
        has ? supabase.from(table).delete().eq("species_id", speciesId).eq("user_id", myId) : supabase.from(table).insert({ species_id: speciesId, user_id: myId }),
        () => apply(has)
      );
    }
    const has = kbDb.favoriteSlugs.includes(slug);
    const apply = (on) => kbDb.setFavorites((prev) => (on ? [...prev, speciesId] : prev.filter((id) => id !== speciesId)));
    apply(!has);
    setToast(has ? offMsg : onMsg);
    return kbDbCall(
      has ? supabase.from(table).delete().eq("species_id", speciesId).eq("user_id", myId) : supabase.from(table).insert({ species_id: speciesId, user_id: myId }),
      () => apply(has)
    );
  }

  function patchSpeciesComment(dbId, fn) {
    kbDb.setCommentRows((prev) => prev.map((row) => (row.id === dbId ? fn(row) : row)));
  }

  const kb = {
    species: kbDb.speciesList || SPECIES,
    keeping: kbKeepingAll,
    favorites: kbFavoritesAll,
    comments: kbCommentsAll,
    search: kbSearch,
    setSearch: (value) => {
      setKbSearch(value);
      if (value && !(kbRoute && kbRoute.section)) openHashPage("/bilgi");
    },
    openHome: () => { setKbSearch(""); openHashPage("/bilgi"); },
    openSection: (id) => openHashPage(id === "tatlisu" ? "/bilgi" : "/bilgi/b/" + id),
    openCategory: (id) => { setKbSearch(""); openHashPage("/bilgi/k/" + id); },
    openSpecies: (species) => openHashPage("/tur/" + species.slug),
    openMine: () => openHashPage("/bilgi/turlerim"),
    articles: articlesDb.list,
    articlesLoaded: articlesDb.loaded,
    reloadArticles: articlesDb.reload,
    openArticles: () => { setKbSearch(""); openHashPage("/makaleler"); },
    openArticle: (article) => openHashPage("/makale/" + (typeof article === "string" ? article : article.slug)),
    onSuggest: (initial) => (isMember ? setSuggestSpecies(initial || {}) : requireLogin()),
    currentUserId: isMember ? currentUserId : null,
    onAuth: requireLogin,
    onToggleKeep: (slug) =>
      myId
        ? toggleSpecies("species_keepers", slug, "Beslediğin türlere eklendi · profilinde görünür", "Beslediğin türlerden çıkarıldı")
        : toggleInMap(setKbKeeping, slug, "Beslediğin türlere eklendi · profilinde görünür", "Beslediğin türlerden çıkarıldı"),
    onToggleFav: (slug) =>
      myId
        ? toggleSpecies("species_favorites", slug, "Favori türlerine eklendi ⭐", "Favorilerden çıkarıldı")
        : toggleInMap(setKbFavorites, slug, "Favori türlerine eklendi ⭐", "Favorilerden çıkarıldı"),
    onComment: async (slug, { text, images = [], video = null }) => {
      if (myId) {
        const speciesId = kbDb.speciesId(slug);
        if (!speciesId) return setToast("Tür bulunamadı, sayfayı yenileyip tekrar dene.");
        try {
          setToast("Paylaşılıyor…");
          const media = await uploadMedia(myId, "species", images, video);
          const { error } = await supabase.from("species_comments").insert({ species_id: speciesId, user_id: myId, text: text || "", images: media.images, video: media.video });
          if (error) throw error;
          await kbDb.reload();
          setToast("Deneyimin paylaşıldı, teşekkürler!");
        } catch (error) {
          setToast(trError(error));
        }
        return undefined;
      }
      setKbComments((prev) => [{ id: "sc" + Date.now(), slug, userId: currentUserId, text, images, video, createdAt: Date.now(), likes: 0, likedByMe: false }, ...prev]);
      setToast("Deneyimin paylaşıldı, teşekkürler!");
      return undefined;
    },
    onEditComment: (id, text) => {
      if (isDbSpeciesComment(id)) {
        const dbId = speciesCommentDbId(id);
        patchSpeciesComment(dbId, (row) => ({ ...row, text, edited_at: new Date().toISOString() }));
        kbDbCall(supabase.from("species_comments").update({ text }).eq("id", dbId)).then((ok) => ok && setToast("Yorum güncellendi"));
        return;
      }
      setKbComments((prev) => prev.map((item) => (item.id === id ? { ...item, text, editedAt: Date.now() } : item)));
      setToast("Yorum güncellendi");
    },
    onDeleteComment: (id) => {
      if (!window.confirm("Bu yorumu silmek istediğine emin misin?")) return;
      if (isDbSpeciesComment(id)) {
        const dbId = speciesCommentDbId(id);
        kbDb.setCommentRows((prev) => prev.filter((row) => row.id !== dbId));
        kbDbCall(supabase.from("species_comments").delete().eq("id", dbId)).then((ok) => ok && setToast("Yorum silindi"));
        return;
      }
      setKbComments((prev) => prev.filter((item) => item.id !== id));
    },
    onLikeComment: (id) => {
      if (isDbSpeciesComment(id)) {
        if (!myId) return requireLogin();
        const dbId = speciesCommentDbId(id);
        const liked = kbDb.comments.some((item) => item.dbId === dbId && item.likedByMe);
        const apply = (on) => {
          kbDb.setLikedComments((prev) => { const next = new Set(prev); on ? next.add(dbId) : next.delete(dbId); return next; });
          patchSpeciesComment(dbId, (row) => ({ ...row, like_count: Math.max(0, row.like_count + (on ? 1 : -1)) }));
        };
        apply(!liked);
        return kbDbCall(
          liked ? supabase.from("species_comment_likes").delete().eq("comment_id", dbId).eq("user_id", myId) : supabase.from("species_comment_likes").insert({ comment_id: dbId, user_id: myId }),
          () => apply(liked)
        );
      }
      return setKbComments((prev) => prev.map((item) => (item.id === id ? { ...item, likedByMe: !item.likedByMe, likes: item.likes + (item.likedByMe ? -1 : 1) } : item)));
    }
  };

  function openGroup(group) {
    setCommunitySearch("");
    openHashPage("/grup/" + group.slug);
  }

  // Arama akışta sonuç gösterir; bir grubun içindeyken o grupta arar
  function searchCommunity(value) {
    setCommunitySearch(value);
    if (groupSlug && !postSlug) return;
    const onFeed = communityOpen && !postSlug && !communityPage && !postsUser && !memberPage;
    if (value && !onFeed) {
      clearViews();
      leaveTo("/topluluk");
      setCommunityOpen(true);
      scrollTop();
    }
  }

  function openPost(post) {
    setProfileUser(null);
    cameFromApp.current = true;
    navigate("/paylasim/" + post.slug);
    scrollTop();
  }

  function closePost() {
    if (cameFromApp.current && window.history.length > 1) {
      cameFromApp.current = false;
      window.history.back();
      return;
    }
    clearPostHash();
    if (!communityOpen && !postsUser && memberPage !== "posts") setCommunityOpen(true);
    navigate(postsUser || memberPage === "posts" ? "/" : "/topluluk", { replace: true });
  }

  function openAddListing(species = null) {
    if (!isMember) return requireLogin();
    setAddSpecies(species && species.slug ? species : null);
    setAddOpen(true);
  }

  function requireLogin() {
    setAuthMode("login");
    setAuthOpen(true);
  }

  function openComposer(groupId = null, opts = null) {
    setShareMenuOpen(false);
    if (!isMember) {
      requireLogin();
      return;
    }
    setComposerOpts(opts && opts.species ? opts : null);
    setComposerGroupId(typeof groupId === "string" ? groupId : null);
    setComposerOpen(true);
  }

  async function publishPost(post) {
    if (myId) {
      const ok = await publishDbPost(post);
      if (!ok) return;
    } else setDemoPosts((prev) => [post, ...prev]);
    setComposerOpen(false);
    const target = post.groupId ? groups.find((group) => group.id === post.groupId) : null;
    setToast(target ? target.name + " grubunda paylaşıldı 🎉" : "Paylaşımın yayında 🎉");
    if (!communityOpen && memberPage !== "posts" && !postsUser && !groupSlug) {
      clearViews();
      leaveTo("/topluluk");
      setCommunityOpen(true);
    }
    scrollTop();
  }

  function updatePost(postId, updater) {
    setDemoPosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
  }

  // Paylaşımı veritabanına yazar: önce medya yüklenir, sonra paylaşım ve (varsa) anket seçenekleri
  async function publishDbPost(post) {
    try {
      setToast("Paylaşılıyor…");
      const media = await uploadMedia(myId, "posts", post.images || [], post.video || null);
      const group = post.groupId ? groups.find((item) => item.id === post.groupId) : null;
      if (group && group.dbId && !group.memberIds.includes(myId)) {
        const joined = await supabase.from("group_members").insert({ group_id: group.dbId });
        if (joined.error) throw joined.error;
      }
      const { data, error } = await supabase
        .from("posts")
        .insert({
          text: post.text || "",
          images: media.images,
          video: media.video,
          group_id: group ? group.dbId || null : null,
          kind: post.kind || "post",
          species_slugs: post.speciesSlugs || [],
          poll_ends_at: post.poll ? new Date(post.poll.endsAt).toISOString() : null
        })
        .select()
        .single();
      if (error) throw error;
      if (post.poll) {
        const options = post.poll.options.map((option, index) => ({ post_id: data.id, position: index + 1, text: option.text }));
        const res = await supabase.from("poll_options").insert(options);
        if (res.error) throw res.error;
      }
      await community.reload();
      return true;
    } catch (error) {
      setToast(trError(error));
      return false;
    }
  }

  function toggleJoin(groupId) {
    if (!isMember) {
      requireLogin();
      return;
    }
    const group = groups.find((item) => item.id === groupId);
    if (!group || group.ownerId === currentUserId) return;
    const joined = group.memberIds.includes(currentUserId);
    if (joined && !window.confirm(group.name + " grubundan ayrılmak istediğine emin misin?")) return;
    if (group.dbId && myId) {
      (joined
        ? supabase.from("group_members").delete().eq("group_id", group.dbId).eq("user_id", myId)
        : supabase.from("group_members").insert({ group_id: group.dbId })
      ).then(({ error }) => {
        if (error) setToast(trError(error));
        else setToast(joined ? group.name + " grubundan ayrıldın" : group.name + " grubuna katıldın 👋");
        community.reload();
      });
      return;
    }
    setGroups((prev) => prev.map((item) => (item.id !== groupId ? item : {
      ...item,
      memberIds: joined ? item.memberIds.filter((id) => id !== currentUserId) : [...item.memberIds, currentUserId],
      moderatorIds: joined ? item.moderatorIds.filter((id) => id !== currentUserId) : item.moderatorIds
    })));
    setToast(joined ? group.name + " grubundan ayrıldın" : group.name + " grubuna katıldın 👋");
  }

  function openGroupForm(group = null) {
    if (!isMember) {
      requireLogin();
      return;
    }
    if (!group && groups.some((item) => item.ownerId === currentUserId)) {
      setToast("Her üye en fazla 1 grup oluşturabilir");
      return;
    }
    setGroupForm({ group });
  }

  async function saveGroup(group) {
    if (myId) {
      const isNewDb = !group.dbId;
      try {
        let cover = group.cover || null;
        if (cover && cover.startsWith("blob:")) cover = await uploadBlobUrl(myId, "groups", cover);
        let icon = group.icon || null;
        if (icon && icon.startsWith("blob:")) icon = await uploadBlobUrl(myId, "groups", icon);
        const fields = { slug: group.slug, name: group.name, emoji: group.emoji, icon_url: icon, color: group.color, cover_url: cover, description: group.description, rules: group.rules };
        const res = isNewDb
          ? await supabase.from("groups").insert({ ...fields, owner_id: myId }).select().single()
          : await supabase.from("groups").update(fields).eq("id", group.dbId).select().single();
        if (res.error) throw res.error;
        const gid = res.data.id;
        // Moderatörleri yalnızca kurucu belirler (yalnızca gerçek üyeler; önce gruba üye olmaları gerekir)
        if (isNewDb || group.ownerId === myId) {
          const mods = (group.moderatorIds || []).filter((id) => id !== myId && users[id] && users[id].real);
          if (mods.length) await supabase.from("group_members").update({ role: "moderator" }).eq("group_id", gid).in("user_id", mods);
          const demoted = community.members.filter((row) => row.group_id === gid && row.role === "moderator" && !mods.includes(row.user_id)).map((row) => row.user_id);
          if (demoted.length) await supabase.from("group_members").update({ role: "member" }).eq("group_id", gid).in("user_id", demoted);
        }
        await community.reload();
        setGroupForm(null);
        setToast(isNewDb ? group.name + " grubu oluşturuldu 🎉" : "Grup bilgileri güncellendi");
        openGroup({ ...group, id: gid, slug: String(res.data.slug) });
      } catch (error) {
        setToast(trError(error));
      }
      return;
    }
    const isNew = !groups.some((item) => item.id === group.id);
    setGroups((prev) => (isNew ? [...prev, group] : prev.map((item) => (item.id === group.id ? group : item))));
    setGroupForm(null);
    setToast(isNew ? group.name + " grubu oluşturuldu 🎉" : "Grup bilgileri güncellendi");
    if (isNew || group.slug !== groupSlug) openGroup(group);
  }

  // Bir bağlantıyı (ör. tür sayfası) üyeye mesaj olarak gönder: konuşmayı bul/oluştur, mesajı yaz
  async function sendLinkToUser(otherId, topic, body) {
    if (!isMember) {
      requireLogin();
      return false;
    }
    const convId = await msgs.start(otherId, topic);
    await msgs.send(convId.replace(/^dm/, ""), body);
    return true;
  }

  const communityCtx = {
    sendLinkToUser,
    myDbId: myId,
    rules: Array.isArray(siteSettings.community_rules) && siteSettings.community_rules.length ? siteSettings.community_rules : null,
    users,
    UserName,
    VerifiedBadge,
    FeedAdCard,
    DetailBannerAd,
    adsFor,
    RotatingDetailAd,
    adPool: adsFor("feed"),
    isMember,
    currentUserId,
    listingCountOf: (userId) => listings.filter((item) => item.userId === userId).length,
    onProfile: setProfileUser,
    onAuth: requireLogin,
    onCompose: openComposer,
    onOpenPost: openPost,
    onToast: setToast,
    onLike: (postId) => {
      if (!isDbPost(postId)) return updatePost(postId, (post) => ({ ...post, likedByMe: !post.likedByMe, likes: post.likes + (post.likedByMe ? -1 : 1) }));
      if (!myId) return requireLogin();
      const id = dbIdOf(postId);
      const liked = community.mine.likes.has(id);
      patchMine("likes", (set) => { const next = new Set(set); liked ? next.delete(id) : next.add(id); return next; });
      patchRow(id, (row) => ({ ...row, like_count: Math.max(0, row.like_count + (liked ? -1 : 1)) }));
      return dbCall(liked ? supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", myId) : supabase.from("post_likes").insert({ post_id: id }));
    },
    onLikeComment: (postId, commentId) => {
      if (isDbPost(postId)) {
        if (!myId) return requireLogin();
        const cid = Number(String(commentId).slice(2));
        const liked = community.mine.commentLikes.has(cid);
        patchMine("commentLikes", (set) => { const next = new Set(set); liked ? next.delete(cid) : next.add(cid); return next; });
        patchRow(dbIdOf(postId), (row) => ({ ...row, comments: row.comments.map((c) => (c.id === cid ? { ...c, like_count: Math.max(0, c.like_count + (liked ? -1 : 1)) } : c)) }));
        return dbCall(liked ? supabase.from("comment_likes").delete().eq("comment_id", cid).eq("user_id", myId) : supabase.from("comment_likes").insert({ comment_id: cid }));
      }
      return updatePost(postId, (post) => ({
        ...post,
        comments: post.comments.map((comment) =>
          comment.id === commentId ? { ...comment, likedByMe: !comment.likedByMe, likes: comment.likes + (comment.likedByMe ? -1 : 1) } : comment
        )
      }));
    },
    onVote: (postId, optionId) => {
      if (isDbPost(postId)) {
        if (!myId) return requireLogin();
        const id = dbIdOf(postId);
        if (community.mine.votes.has(id)) return undefined;
        patchMine("votes", (map) => new Map(map).set(id, optionId));
        patchRow(id, (row) => ({ ...row, poll_options: row.poll_options.map((o) => (o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o)) }));
        return dbCall(supabase.from("poll_votes").insert({ post_id: id, option_id: optionId }));
      }
      return updatePost(postId, (post) => {
        if (!post.poll || post.poll.votedId !== null) return post;
        return {
          ...post,
          poll: {
            ...post.poll,
            votedId: optionId,
            options: post.poll.options.map((option) => (option.id === optionId ? { ...option, votes: option.votes + 1 } : option))
          }
        };
      });
    },
    onReply: async (postId, { text, images = [], video = null }) => {
      if (isDbPost(postId) && myId) {
        try {
          const media = await uploadMedia(myId, "comments", images, video);
          const { error } = await supabase.from("comments").insert({ post_id: dbIdOf(postId), text: text || "", images: media.images, video: media.video });
          if (error) throw error;
          await community.reload();
        } catch (error) {
          setToast(trError(error));
        }
        return;
      }
      updatePost(postId, (post) => ({
        ...post,
        comments: [...post.comments, { id: "c" + Date.now(), userId: currentUserId, text, images, video, createdAt: Date.now(), likes: 0, likedByMe: false }]
      }));
    },
    onDeleteComment: (postId, commentId) => {
      if (!window.confirm("Bu yorumu silmek istediğine emin misin?")) return;
      if (isDbPost(postId)) {
        const cid = Number(String(commentId).slice(2));
        const post = posts.find((item) => item.id === postId);
        const comment = post && post.comments.find((item) => item.id === commentId);
        const mineComment = comment && comment.userId === myId;
        patchRow(dbIdOf(postId), (row) => ({ ...row, comments: row.comments.filter((c) => c.id !== cid) }));
        dbCall(mineComment ? supabase.from("comments").delete().eq("id", cid) : supabase.rpc("moderate_remove_comment", { p_comment_id: cid, p_reason: "Moderatör kaldırdı" })).then((ok) => ok && setToast("Yorum silindi"));
        return;
      }
      updatePost(postId, (post) => ({ ...post, comments: post.comments.filter((comment) => comment.id !== commentId) }));
      setToast("Yorum silindi");
    },
    onSave: (postId) => {
      const target = posts.find((post) => post.id === postId);
      if (!target) return;
      if (isDbPost(postId)) {
        if (!myId) return requireLogin();
        const id = dbIdOf(postId);
        const saved = community.mine.saves.has(id);
        patchMine("saves", (set) => { const next = new Set(set); saved ? next.delete(id) : next.add(id); return next; });
        dbCall(saved ? supabase.from("post_saves").delete().eq("post_id", id).eq("user_id", myId) : supabase.from("post_saves").insert({ post_id: id }));
      } else updatePost(postId, (post) => ({ ...post, savedByMe: !post.savedByMe }));
      setToast(target.savedByMe ? "Kayıtlardan çıkarıldı" : "Kaydedildi · Paylaşımlarım > Kaydettiklerim");
    },
    onReport: setReportTarget,
    onSearch: searchCommunity,
    onEditComment: (postId, commentId, text) => {
      if (isDbPost(postId)) {
        const cid = Number(String(commentId).slice(2));
        patchRow(dbIdOf(postId), (row) => ({ ...row, comments: row.comments.map((c) => (c.id === cid ? { ...c, text, edited_at: new Date().toISOString() } : c)) }));
        dbCall(supabase.from("comments").update({ text }).eq("id", cid)).then((ok) => ok && setToast("Yorum güncellendi"));
        return;
      }
      updatePost(postId, (post) => ({
        ...post,
        comments: post.comments.map((comment) => (comment.id === commentId ? { ...comment, text, editedAt: Date.now() } : comment))
      }));
      setToast("Yorum güncellendi");
    },
    groupById: (id) => groups.find((group) => group.id === id),
    canModerate: (post) => {
      if (!isMember || !post.groupId) return false;
      const group = groups.find((item) => item.id === post.groupId);
      return Boolean(group) && (group.ownerId === currentUserId || group.moderatorIds.includes(currentUserId));
    },
    onOpenGroup: openGroup,
    followedTags,
    onToggleTag: toggleTag,
    onMessage: startConversation,
    onOpenSpecies: (species) => openHashPage("/tur/" + species.slug),
    onOpenListing: (item) => openListing(item),
    onAddListing: openAddListing,
    featuredListingIds,
    priceLabel,
    formatDate,
    onJoinGroup: (groupId) => {
      const group = groups.find((item) => item.id === groupId);
      if (group && group.dbId && myId) {
        if (!group.memberIds.includes(myId)) supabase.from("group_members").insert({ group_id: group.dbId }).then(() => community.reload());
        return;
      }
      setGroups((prev) => prev.map((item) => (item.id === groupId && !item.memberIds.includes(currentUserId) ? { ...item, memberIds: [...item.memberIds, currentUserId] } : item)));
    },
    onMyPosts: () => openMemberPage("posts"),
    onMyListings: () => openMemberPage("listings"),
    onMessages: () => openMemberPage("messages"),
    onOpenGroups: () => openHashPage("/gruplar"),
    onOpenTags: () => openHashPage("/etiketler"),
    onOpenFeed: openCommunity,
    onToggleJoin: toggleJoin,
    onCreateGroup: () => openGroupForm(null),
    onEditGroup: (group) => openGroupForm(group),
    canManageGroups: Boolean(auth.staff && (auth.staff.role === "super_admin" || (auth.staff.permissions || []).includes("groups"))),
    onShareGroup: (group) => {
      const url = absoluteUrl("/grup/" + group.slug);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => setToast("Grup bağlantısı kopyalandı"), () => setToast(url));
      else setToast(url);
    },
    onDelete: (post, moderated = false) => {
      if (!window.confirm(moderated ? "Bu paylaşımı moderatör olarak gruptan kaldırmak istediğine emin misin?" : "Bu paylaşımı silmek istediğine emin misin?")) return;
      if (post.dbId) {
        community.setRows((prev) => prev.filter((row) => row.id !== post.dbId));
        dbCall(moderated && post.userId !== myId ? supabase.rpc("moderate_remove_post", { p_post_id: post.dbId, p_reason: "Moderatör kaldırdı" }) : supabase.from("posts").delete().eq("id", post.dbId));
      } else setDemoPosts((prev) => prev.filter((item) => item.id !== post.id));
      setToast(moderated ? "Paylaşım gruptan kaldırıldı" : "Paylaşım silindi");
      if (postSlug === post.slug) closePost();
    },
    onShare: (post) => {
      const url = postUrl(post);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => setToast("Bağlantı kopyalandı"), () => setToast(url));
      } else {
        setToast(url);
      }
    }
  };

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
    // Öne çıkanlar en üstte; kendi aralarında en az gösterilen önce, eşitlerde rastgele
    const featuredRank = new Map(rotate(result.filter((item) => featuredListingIds.includes(item.id)), "listing").map((item, index) => [item.id, index]));
    result.sort((a, b) => {
      const aFeatured = featuredListingIds.includes(a.id) ? 1 : 0;
      const bFeatured = featuredListingIds.includes(b.id) ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;
      if (aFeatured && bFeatured) return featuredRank.get(a.id) - featuredRank.get(b.id);
      if (sort === "verified") {
        const aVerified = users[a.userId]?.verified ? 1 : 0;
        const bVerified = users[b.userId]?.verified ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
      }
      const at = (row) => row.sortAt || new Date(row.date).getTime() || 0;
      return sort === "oldest" ? at(a) - at(b) : at(b) - at(a);
    });
    return result;
  }, [query, selectedType, selectedCategory, selectedTags, selectedCities, selectedDistricts, selectedNeighborhoods, sort, dbListings]);

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
    clearViews();
    setSelectedListing(item);
    if (item.dbId) navigate("/ilan/" + item.dbId);
    else navigate("/ilan/ornek-" + item.id); // örnek ilanlar: sayfa yenilenince de açılsın
    setActiveImage(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    clearViews();
    setListingsOpen(false);
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openListingsPage() {
    clearViews();
    setListingsOpen(true);
    navigate("/ilanlar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMemberPage(key) {
    setUserMenuOpen(false);
    if (!isMember) {
      requireLogin();
      return;
    }
    clearViews();
    leaveTo("/");
    setMemberPage(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Site bilgileri penceresinden (ör. "Reklam başvurusu yap") gelen sayfa açma isteği
  const openMemberPageRef = useRef(openMemberPage);
  openMemberPageRef.current = openMemberPage;
  useEffect(() => {
    const onOpen = (event) => openMemberPageRef.current(event.detail);
    window.addEventListener("aq:member-page", onOpen);
    return () => window.removeEventListener("aq:member-page", onOpen);
  }, []);

  function changeHomeFilter(value) {
    setHomeFilter(value);
    saveHomeFilter(value);
    scrollTop();
  }

  const postMode = Boolean(postSlug);
  const currentGroup = groupSlug ? groups.find((group) => group.slug === groupSlug) : null;
  const groupMode = Boolean(groupSlug) && !postMode;
  const kbMode = Boolean(kbRoute) && !postMode;
  const currentSpecies = kbMode && kbRoute.slug ? speciesBySlug(kbRoute.slug) : null;
  // Ayrı sayfadan bir türün lokalitesine/varyetesine taşınan eski tür adresleri
  const speciesRedirect = kbMode && kbRoute.slug && !currentSpecies ? kbDb.redirects[kbRoute.slug] : null;
  useEffect(() => {
    if (speciesRedirect) navigate("/tur/" + speciesRedirect.slug, { replace: true });
  }, [speciesRedirect]); // eslint-disable-line react-hooks/exhaustive-deps
  const hashMode = postMode || groupMode || Boolean(communityPage) || kbMode;
  const effectiveMemberPage = isMember && !hashMode ? memberPage : null;
  const accountMode = Boolean(effectiveMemberPage) && effectiveMemberPage !== "posts";
  const userListingsMode = Boolean(viewUser) && !hashMode;
  const detailMode = Boolean(selectedListing) && !hashMode;
  const communityMode = (hashMode && !kbMode) || (!selectedListing && !viewUser && (Boolean(postsUser) || communityOpen || effectiveMemberPage === "posts"));
  const currentUser = users[currentUserId];
  const currentPost = postSlug ? posts.find((post) => post.slug === postSlug) : null;

  // Sayfa başlığı ve açıklaması: tarayıcı sekmesi, arama motorları ve yer imleri için
  const currentArticleMeta = kbMode && kbRoute.article ? articlesDb.list.find((item) => item.slug === kbRoute.article) : null;
  const pageTitle = currentArticleMeta
    ? currentArticleMeta.title + " — Aquagram Makaleler"
    : kbMode && kbRoute.articles
      ? "Akvaryum makaleleri — Aquagram Bilgi Bankası"
      : currentSpecies
    ? currentSpecies.name + (currentSpecies.latin ? " (" + currentSpecies.latin + ")" : "") + " bakımı ve künyesi — Aquagram Bilgi Bankası"
    : selectedListing
      ? selectedListing.title + " — " + priceLabel(selectedListing) + (selectedListing.city ? " · " + selectedListing.city : "") + " | Aquagram İlanlar"
      : currentGroup
        ? currentGroup.name + " grubu — Aquagram Topluluk"
        : currentPost
          ? postSnippet(currentPost).slice(0, 60) + " — Aquagram Topluluk"
          : kbMode
            ? "Akvaryum Bilgi Bankası: tür bakım rehberi — Aquagram"
            : "Aquagram — Akvaryum hobicilerinin buluşma noktası";
  const pageDescription = currentArticleMeta
    ? currentArticleMeta.excerpt.slice(0, 155)
    : currentSpecies
    ? (currentSpecies.desc || "").slice(0, 155)
    : selectedListing
      ? (selectedListing.description || "").slice(0, 155)
      : currentGroup
        ? (currentGroup.description || "").slice(0, 155)
        : currentPost
          ? postSnippet(currentPost).slice(0, 155)
          : "Akvaryum hobicileri için ilan, takas ve topluluk platformu: canlı, bitki, ekipman ilanları; hobicilerle soru-cevap ve tür bakım rehberi.";
  // Ziyaret sayacı (bölüm bazında, kişisel veri yok)
  const visitSection = currentSpecies ? "species" : kbMode ? "kb" : selectedListing ? "listing" : listingsOpen ? "listings" : currentPost ? "post" : currentGroup ? "group" : memberPage ? "account" : communityOpen || communityPage ? "community" : "home";
  const visitKey = visitSection + ":" + (currentSpecies ? currentSpecies.slug : selectedListing ? selectedListing.id : currentPost ? currentPost.slug : currentGroup ? currentGroup.slug : memberPage || communityPage || (kbRoute && (kbRoute.article || (kbRoute.articles && "makaleler") || kbRoute.category || kbRoute.section)) || "");
  useEffect(() => {
    trackVisit(visitSection, visitKey);
  }, [visitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = pageTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && pageDescription) meta.setAttribute("content", pageDescription);
  }, [pageTitle, pageDescription]);
  const newMembers = Object.values(users).filter((user) => user.newMember);
  const allTags = useMemo(() => extractTags(posts), [posts]);
  // Sol menüde her yenilemede rastgele 3 etiket
  const asideTags = useMemo(() => {
    const score = (tag) => {
      let h = 0;
      for (let i = 0; i < tag.length; i += 1) h = (h * 31 + tag.charCodeAt(i)) | 0;
      const x = Math.sin(h * 0.0001 + tagSeed * 1000) * 10000;
      return x - Math.floor(x);
    };
    return allTags.slice().sort((a, b) => score(a.tag) - score(b.tag)).slice(0, 3);
  }, [allTags, tagSeed]);
  const asideView = postMode ? "post" : groupMode ? "group" : communityPage || (communityOpen && !postsUser && !effectiveMemberPage ? "feed" : "other");
  const joinedGroups = isMember ? groups.filter((group) => group.memberIds.includes(currentUserId)) : [];
  // Ana sayfa: İlanlar + İçerikler karışık akış; "İlanlar"/"İçerikler" seçimi hatırlanır ve o görünüme döner
  const homeMode = !communityMode && !kbMode && !accountMode && !userListingsMode && !detailMode && !listingsOpen && !effectiveMemberPage;
  const homeView = homeMode ? (homeFilter === "listings" ? "listings" : homeFilter === "posts" ? "posts" : "mixed") : null;
  const showListingFilters = !accountMode && !userListingsMode && !communityMode && !kbMode && homeView !== "mixed" && homeView !== "posts";
  const navActive = kbMode ? "kb" : communityMode ? "community" : homeMode ? "home" : listingsOpen && !accountMode && !effectiveMemberPage && !userListingsMode ? "listings" : null;
  const homeTopBar = (
    <HomeTopBar
      filter={homeFilter}
      onFilter={changeHomeFilter}
      tab={homeTab}
      onTab={setHomeTab}
      location={homeLocation}
      onLocation={setHomeLocation}
      cities={Object.keys(locations)}
      myCity={isMember ? currentUser.city : null}
      showTabs={homeView === "mixed"}
      showLocation={homeView === "mixed"}
    />
  );

  const listingFilterAside = (

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
  );
  const leftAside = kbMode ? (
    <KbAside kb={kb} ctx={communityCtx} route={{ ...kbRoute, species: currentSpecies }} />
  ) : communityMode ? (
    <CommunityAside ctx={communityCtx} view={asideView} group={groupMode ? currentGroup : null} search={communitySearch} tags={asideTags} groups={groups} />
  ) : homeView === "posts" ? (
    <CommunityAside ctx={communityCtx} view="feed" search={communitySearch} tags={asideTags} groups={groups} />
  ) : homeView === "mixed" ? (
    <HomeAside ctx={communityCtx} groups={groups} posts={posts} />
  ) : detailMode ? (
    <ListingDetailAside
      item={selectedListing}
      listings={listings}
      users={users}
      priceLabel={priceLabel}
      onOpenListing={openListing}
      onOpenSpecies={kb.openSpecies}
      onViewUser={(target) => {
        clearViews();
        leaveTo("/");
        setViewUser(target);
        scrollTop();
      }}
    />
  ) : showListingFilters ? (
    listingFilterAside
  ) : null;
  // Mobilde sağ sütun yerine açılır panelin altında gösterilenler
  const drawerExtras = kbMode ? <KbWidgets kb={kb} posts={posts} listings={listings} /> : null;
  const isListingFilterPanel = leftAside === listingFilterAside;

  const navItems = [["home", "Ana sayfa", Home, goHome], ["listings", "İlanlar", Tag, openListingsPage], ["community", "Topluluk", Users, openCommunity], ["kb", "Bilgi Bankası", BookOpen, kb.openHome]];

  return (
    <div className="min-h-screen bg-white pb-[calc(64px+env(safe-area-inset-bottom))] text-slate-950 lg:pb-0">
      {announcement && (
        <div className="bg-cyan-950 px-4 py-2 text-center text-sm font-bold text-white">
          {announcement.text}
          {announcement.link && /^https?:\/\//.test(announcement.link) && (
            <a href={announcement.link} target="_blank" rel="noreferrer noopener" className="ml-2 underline underline-offset-2">Ayrıntılar</a>
          )}
        </div>
      )}
      {auth.profile && auth.profile.suspended_until && new Date(auth.profile.suspended_until) > new Date() && (
        <div role="alert" className="bg-red-700 px-4 py-2 text-center text-sm font-bold text-white">
          Hesabın {new Date(auth.profile.suspended_until).getFullYear() > 2900 ? "süresiz olarak" : new Date(auth.profile.suspended_until).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) + " tarihine kadar"} askıya alındı
          {auth.profile.suspension_reason ? " · Gerekçe: " + auth.profile.suspension_reason : ""}. Bu sürede paylaşım, yorum, ilan ve mesaj gönderemezsin. İtiraz: info@aquagram.com.tr
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-4 lg:h-[72px]">
          <div className="flex min-w-0 items-center gap-1.5">
            {leftAside && (
              <button
                onClick={() => setDrawerOpen(true)}
                title={isListingFilterPanel ? "Filtrele" : "Menü"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 hover:bg-slate-100 lg:hidden"
              >
                {isListingFilterPanel ? <SlidersHorizontal size={20} /> : <Menu size={21} />}
              </button>
            )}
            <button onClick={goHome} className="flex min-w-0 items-center gap-2.5 text-left lg:gap-3">
              <AquagramMark />
              <div className="min-w-0 lg:hidden xl:block">
                <h1 className="truncate text-lg font-black leading-tight tracking-tight lg:text-xl">Aquagram</h1>
                <p className="hidden text-xs text-slate-500 xl:block">Akvaryum hobicilerinin buluşma noktası</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 rounded-full bg-slate-100 p-1 lg:flex">
              {navItems.map(([key, label, Icon, onClick]) => (
                <button
                  key={key}
                  onClick={onClick}
                  title={label}
                  className={"flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black transition " + (navActive === key ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")}
                >
                  <Icon size={16} /> <span className="hidden xl:inline">{label}</span>
                </button>
              ))}
            </nav>
            {isMember && (
              <button
                onClick={() => openMemberPage("notifications")}
                title="Bildirimler"
                className={"relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition " + (effectiveMemberPage === "notifications" ? "bg-cyan-50 text-cyan-950" : "text-slate-700 hover:bg-slate-100")}
              >
                <Bell size={20} />
                {notifs.unread + msgs.unreadCount > 0 && (
                  <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">{Math.min(99, notifs.unread + msgs.unreadCount)}</span>
                )}
              </button>
            )}
            {isMember ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className={"flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm font-black transition " + (effectiveMemberPage ? "border-cyan-950 bg-cyan-50" : "border-slate-200 bg-white hover:bg-slate-50")}
                >
                  {auth.profile?.avatar_url ? <img src={auth.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-950 text-white"><UserRound size={16} /></span>}
                  <span className="hidden xl:inline">{currentUser.username}</span>
                  <ChevronDown size={14} className={"transition " + (userMenuOpen ? "rotate-180" : "")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {[["account", "Hesabım"], ["notifications", "Bildirimler"], ["posts", "Paylaşımlarım"], ["listings", "İlanlarım"], ["species", "Türlerim"], ["messages", "Mesajlarım"], ["ads", "Reklamlarım"]].map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { if (key === "species") { setUserMenuOpen(false); kb.openMine(); } else openMemberPage(key); }}
                        className={"flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-black " + (effectiveMemberPage === key ? "bg-cyan-50 text-cyan-950" : "text-slate-700 hover:bg-slate-50")}
                      >
                        <span className="flex-1">{label}</span>
                        {key === "messages" && msgs.unreadCount > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[12px] font-black text-white">{msgs.unreadCount}</span>}
                        {key === "notifications" && notifs.unread > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[12px] font-black text-white">{notifs.unread}</span>}
                      </button>
                    ))}
                    {auth.isStaff && (
                      <a href="/#/yonetim" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-black text-amber-800 hover:bg-amber-50">
                        <ShieldCheck size={15} /> Yönetim paneli
                      </a>
                    )}
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => { setUserMenuOpen(false); auth.signOut(); clearViews(); leaveTo("/"); setToast("Çıkış yaptın."); }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-black text-slate-500 hover:bg-slate-50"
                    >
                      <LogOut size={15} /> Çıkış yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={requireLogin} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:px-4">
                <span className="hidden sm:inline">Üye ol / </span>Giriş yap
              </button>
            )}
            <div ref={shareMenuRef} className="relative hidden lg:block">
              <button onClick={() => setShareMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white hover:bg-cyan-900">
                <Plus size={17} /> Paylaş <ChevronDown size={15} className={"transition " + (shareMenuOpen ? "rotate-180" : "")} />
              </button>
              {shareMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button
                    onClick={() => { setShareMenuOpen(false); openAddListing(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-50 text-cyan-900"><Tag size={17} /></span>
                    <span>
                      <span className="block text-sm font-black text-slate-900">İlan ekle</span>
                      <span className="block text-xs text-slate-500">Sat, takas et, sahiplendir</span>
                    </span>
                  </button>
                  <button
                    onClick={openComposer}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-50 text-cyan-900"><PenLine size={17} /></span>
                    <span>
                      <span className="block text-sm font-black text-slate-900">İçerik ekle</span>
                      <span className="block text-xs text-slate-500">Yazı, foto, video veya anket</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={"mx-auto grid max-w-[1440px] px-4 " + ((accountMode || userListingsMode) ? "lg:grid-cols-[1fr]" : detailMode ? "lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]" : "lg:grid-cols-[270px_minmax(0,1fr)_300px] xl:grid-cols-[310px_minmax(0,1fr)_340px]")}> 
        {leftAside && <div className="hidden lg:block">{leftAside}</div>}

        <section className={"min-w-0 bg-white " + (accountMode || userListingsMode ? "border-x border-slate-200" : "lg:border-r border-slate-200")}>
  {kbMode ? (
  kbRoute.slug ? (
    currentSpecies ? (
      <SpeciesPage key={currentSpecies.slug} species={currentSpecies} kb={kb} ctx={communityCtx} listings={listings} posts={posts} />
    ) : (
      <div className="p-10 text-center">
        <h2 className="text-xl font-black">Tür bulunamadı</h2>
        <button onClick={kb.openHome} className="mt-5 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Bilgi Bankası'na dön</button>
      </div>
    )
  ) : kbRoute.article ? (
    <ArticlePage key={kbRoute.article} slug={kbRoute.article} kb={kb} ctx={communityCtx} />
  ) : kbRoute.articles ? (
    <ArticlesPage kb={kb} />
  ) : kbRoute.category ? (
    <KbCategoryPage key={kbRoute.category} kb={kb} categoryId={kbRoute.category} />
  ) : kbRoute.mine && isMember ? (
    <KbMinePage kb={kb} ctx={communityCtx} />
  ) : (
    <KbHome kb={kb} section={kbRoute.section || "tatlisu"} />
  )
) : postMode ? (
  currentPost ? (
    <PostDetailPage post={currentPost} ctx={communityCtx} onBack={closePost} />
  ) : (
    <PostNotFound onBack={() => { clearViews(); leaveTo("/topluluk"); setCommunityOpen(true); }} />
  )
) : groupMode ? (
  currentGroup ? (
    <GroupPage group={currentGroup} posts={posts} ctx={communityCtx} search={communitySearch} />
  ) : (
    <div className="p-10 text-center">
      <h2 className="text-xl font-black">Grup bulunamadı</h2>
      <p className="mt-2 text-sm text-slate-500">Bu grup kaldırılmış ya da bağlantı hatalı olabilir.</p>
      <button onClick={communityCtx.onOpenGroups} className="mt-5 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Gruplara dön</button>
    </div>
  )
) : communityPage === "groups" ? (
  <GroupsPage groups={groups} posts={posts} ctx={communityCtx} />
) : communityPage === "tags" ? (
  <TagsPage posts={posts} ctx={communityCtx} />
) : effectiveMemberPage === "posts" ? (
  <MyPostsPage posts={posts} ctx={communityCtx} />
) : postsUser && !selectedListing && !viewUser && !effectiveMemberPage ? (
  <UserPostsPage
    user={postsUser}
    posts={posts}
    ctx={communityCtx}
    onBack={openCommunity}
    onViewListings={() => {
      const target = postsUser;
      clearViews();
      leaveTo("/");
      setViewUser(target);
      scrollTop();
    }}
  />
) : communityOpen && !selectedListing && !viewUser && !effectiveMemberPage ? (
  <CommunityFeed posts={posts} members={newMembers} ctx={communityCtx} search={communitySearch} />
) : effectiveMemberPage === "account" ? (
  <AccountPage auth={auth} onSaved={(message) => setToast(message)} />
) : effectiveMemberPage === "listings" ? (
  <MyListingsPage
    listings={myListings.filter((item) => item.status === "active")}
    endedListings={myListings.filter((item) => item.status !== "active")}
    onOpen={openListing}
    onRemove={setRemoveListing}
    onPromote={setPromoteListing}
    onBumped={() => db.reload()}
    onToast={setToast}
    onEdit={(item, mode) => setEditListing({ item, mode })}
    onDelete={async (item) => {
      if (!item.dbId || !window.confirm("“" + item.title + "” ilanı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
      const { error } = await supabase.from("listings").delete().eq("id", item.dbId);
      if (error) return setToast(trError(error));
      await db.reload();
      setToast("İlan silindi.");
    }}
  />
) : effectiveMemberPage === "messages" ? (
  <MessagesPage
    conversations={conversations}
    activeId={activeConvId}
    setActiveId={setActiveConvId}
    onSend={sendMessage}
    onReview={setReviewConv}
    onReportUser={(conv) => {
      if (!conv.real || !conv.otherId) return setToast("Örnek konuşmalarda bu işlem yapılamaz");
      return setReportTarget({ kind: "user", user: { dbId: conv.otherId, username: conv.user } });
    }}
    onToggleBlock={(conv) => {
      if (!conv.real || !conv.otherId) return setToast("Örnek konuşmalarda bu işlem yapılamaz");
      const blocking = !conv.blockedByMe;
      if (blocking && !window.confirm(conv.user + " engellensin mi? Birbirinize mesaj gönderemeyeceksiniz.")) return undefined;
      return msgs.setBlock(conv.otherId, blocking).then(
        () => setToast(blocking ? conv.user + " engellendi" : conv.user + " engeli kaldırıldı"),
        (error) => setToast(trError(error))
      );
    }}
    onPurge={(dbIds) =>
      msgs.purge(dbIds).then(
        () => setToast(dbIds.length > 1 ? dbIds.length + " sohbet kalıcı olarak silindi" : "Sohbet kalıcı olarak silindi"),
        (error) => setToast(trError(error))
      )
    }
    onDirectSend={async (otherId, topic, body) => {
      const id = await msgs.start(otherId, topic || "Profil");
      await msgs.send(Number(String(id).slice(2)), body);
      await msgs.reload();
      setActiveConvId(id);
      setToast("Mesajın gönderildi");
      return id;
    }}
    onRestore={(id) => {
      if (String(id).startsWith("dm")) msgs.setHidden(Number(String(id).slice(2)), false);
      else setConversations((prev) => prev.map((item) => (item.id === id ? { ...item, deleted: false } : item)));
      setToast("Sohbet gelen kutuna geri taşındı");
    }}
    onDelete={(id) => {
      if (String(id).startsWith("dm")) msgs.setHidden(Number(String(id).slice(2)), true);
      else setConversations((prev) => prev.map((item) => (item.id === id ? { ...item, deleted: true } : item)));
      setToast("Konuşma silinmiş mesajlara taşındı");
    }}
  />
) : effectiveMemberPage === "notifications" ? (
  <NotificationsPage
    notifs={notifs}
    onOpen={(item) => {
      if (item.type === "review" && myId && users[myId]) {
        setProfileUser(users[myId]);
        return;
      }
      if (item.type === "ad_approved" || item.type === "ad_rejected") return openMemberPage("ads");
      if (item.type.startsWith("verification_")) return openMemberPage("account");
      if (item.type.startsWith("suggestion_")) return kb.openHome();
      if (item.type === "content_removed" || item.type.startsWith("account_") || item.type === "report_resolved") return undefined;
      // Bildirim yeni bir beğeni/yorumdan geliyor; paylaşımın güncel hâlini görmek için veriyi tazele
      if (item.post || item.grp) community.reload();
      if (item.post) openPost({ slug: item.post.slug });
      else if (item.grp) openGroup({ slug: String(item.grp.slug) });
      else if (item.listing_id) openMemberPage("listings");
    }}
    onProfile={(actor) => actor && users[actor.id] && setProfileUser(users[actor.id])}
  />
) : effectiveMemberPage === "ads" ? (
  <Suspense fallback={<div className="p-10 text-center text-sm font-bold text-slate-400">Yükleniyor…</div>}><AdsManagerPage auth={auth} onToast={setToast} previews={{ FeedAdCard, SidebarAd, DetailBannerAd, NotificationAdRow, NotificationAdCard }} /></Suspense>
) : selectedListing ? (
  <ListingDetail
    item={selectedListing}
    user={users[selectedListing.userId]}
    activeImage={activeImage}
    setActiveImage={setActiveImage}
    isMember={isMember}
    onBack={() => {
      setSelectedListing(null);
      navigate(listingsOpen ? "/ilanlar" : "/");
    }}
    onProfile={setProfileUser}
    menuOpen={menuOpen}
    setMenuOpen={setMenuOpen}
    onReport={() => { setMenuOpen(false); setReportTarget({ kind: "listing", listing: selectedListing }); }}
    onMessage={startConversation}
    onOpenListing={openListing}
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
    onMessage={startConversation}
    users={users}
    listings={listings}
    formatDate={formatDate}
    priceLabel={priceLabel}
    UserName={UserName}
  />
) : homeView === "mixed" ? (
  <>
    {homeTopBar}
    <HomeFeed posts={posts} listings={listings} groups={groups} ctx={communityCtx} filter={homeFilter} tab={homeTab} location={homeLocation} />
  </>
) : homeView === "posts" ? (
  <>
    {homeTopBar}
    <CommunityFeed posts={posts} members={newMembers} ctx={communityCtx} search={communitySearch} embedded />
  </>
) : (
  <>
    {homeView === "listings" ? homeTopBar : (
      <div className="sticky top-[60px] lg:top-[72px] z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <h2 className="text-xl font-black text-slate-950">İlanlar</h2>
        <p className="text-xs font-semibold text-slate-500">{filteredListings.length} ilan · soldan filtreleyebilirsin</p>
      </div>
    )}
    <ListingFeed
      listings={filteredListings}
      onOpen={openListing}
      onProfile={setProfileUser}
      users={users}
      featuredListingIds={featuredListingIds}
      priceLabel={priceLabel}
      formatDate={formatDate}
      UserName={UserName}
      FeedAdCard={FeedAdCard}
    />
  </>
)}
</section>
        {!detailMode && !accountMode && !userListingsMode && (
          <RightSidebar minimal={kbMode}>{kbMode ? <KbWidgets kb={kb} posts={posts} listings={listings} /> : null}</RightSidebar>
        )}
      </main>

      {suggestSpecies && (
        <SuggestSpeciesModal
          initial={suggestSpecies}
          userId={myId}
          onClose={() => setSuggestSpecies(null)}
          onDone={() => {
            setSuggestSpecies(null);
            setToast("Önerin ekibe iletildi, teşekkürler! Sonucu bildirim olarak alacaksın.");
          }}
        />
      )}
      {reviewConv && (
        <ReviewModal
          conversation={reviewConv}
          onClose={() => setReviewConv(null)}
          onSaved={(message) => {
            setReviewConv(null);
            setToast(message);
            msgs.reload();
          }}
        />
      )}
      {profileUser && (
  <ProfileModal
    myId={myId}
    onToast={setToast}
    onReportReview={(review) => setReportTarget({ kind: "review", review: { ...review, dbId: review.id } })}
    onProfileRow={(row) => {
      if (!users[row.id]) users[row.id] = profileToUser(row);
      setProfileUser(users[row.id]);
    }}
    user={profileUser}
    userPosts={posts.filter((post) => post.userId === userIdOf(users, profileUser))}
    allPosts={posts}
    groups={groups}
    onOpenGroup={openGroup}
    keptSpecies={kbKeepingAll[userIdOf(users, profileUser)] || []}
    onMessage={startConversation}
    kb={kb}
    onClose={() => setProfileUser(null)}
    onOpenPost={openPost}
    onViewPosts={() => {
      const target = profileUser;
      clearViews();
      leaveTo("/");
      setPostsUser(target);
      scrollTop();
    }}
    onViewListings={() => {
      const target = profileUser;
      clearViews();
      leaveTo("/");
      setViewUser(target);
      scrollTop();
    }}
  />
)}
      {reportTarget && (
        <ReportModal
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={async ({ reason, note } = {}) => {
            const kind = reportTarget.kind || "listing";
            const item = kind === "post" ? reportTarget.post : kind === "comment" ? reportTarget.comment : kind === "review" ? reportTarget.review : kind === "user" ? reportTarget.user : reportTarget.listing;
            const targetType = (item && item.reportType) || kind;
            if (item && item.dbId) {
              if (!myId) {
                setReportTarget(null);
                return requireLogin();
              }
              const { error } = await supabase.from("reports").insert({ target_type: targetType, target_id: String(item.dbId), reason: (reason || "Diğer").slice(0, 120), note: note ? note.slice(0, 500) : null });
              if (error && !/duplicate|unique/i.test(error.message)) {
                setToast(trError(error));
                return undefined;
              }
            }
            setReportTarget(null);
            setToast("Bildirimin alındı, ekibimiz inceleyecek. Teşekkürler!");
            return undefined;
          }}
        />
      )}
      {editListing && (
        <AddListingModal
          auth={auth}
          listing={editListing.item}
          republish={editListing.mode === "republish"}
          onClose={() => setEditListing(null)}
          onCreated={async () => {
            const republished = editListing.mode === "republish";
            setEditListing(null);
            await db.reload();
            setToast(republished ? "İlanın yeniden yayında!" : "İlan güncellendi.");
          }}
        />
      )}
      {addOpen && (
        <AddListingModal
          auth={auth}
          species={addSpecies}
          onClose={() => setAddOpen(false)}
          onCreated={async (row) => {
            setAddOpen(false);
            await db.reload();
            setToast("İlanın yayında!");
            openListing(mapListing({ ...row, owner: auth.profile }));
          }}
        />
      )}
      {composerOpen && (
        <ComposerModal
          user={currentUser}
          userId={currentUserId}
          groups={joinedGroups}
          defaultGroupId={composerGroupId && joinedGroups.some((group) => group.id === composerGroupId) ? composerGroupId : null}
          defaultKind={composerOpts && composerOpts.kind === "question" ? "question" : "post"}
          pinnedSpecies={composerOpts ? composerOpts.species : null}
          onClose={() => setComposerOpen(false)}
          onPublish={publishPost}
        />
      )}
      {groupForm && (
        <GroupFormModal
          group={groupForm.group}
          users={users}
          groups={groups}
          currentUserId={currentUserId}
          canManageMods={!groupForm.group || groupForm.group.ownerId === currentUserId}
          onClose={() => setGroupForm(null)}
          onSave={saveGroup}
        />
      )}
      {drawerOpen && leftAside && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-black text-slate-800">{isListingFilterPanel ? "İlanlar" : "Menü"}</span>
              <button onClick={() => setDrawerOpen(false)} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200" title="Kapat"><X size={17} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto [&>aside]:border-0">
              {leftAside}
              {drawerExtras && <div className="px-4 pb-4">{drawerExtras}</div>}
              {!isListingFilterPanel && <SiteLinks className="border-t border-slate-100 px-3 py-3" />}
            </div>
            <div className="border-t border-slate-100 p-3">
              <button onClick={() => setDrawerOpen(false)} className="w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900">
                {isListingFilterPanel ? filteredListings.length + " ilanı göster" : "Kapat"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
          {[navItems[0], navItems[1], null, navItems[2], navItems[3]].map((item, index) => {
            if (!item) {
              return (
                <div key="share" className="flex justify-center">
                  <button onClick={() => setMobileShareOpen(true)} title="Paylaş" className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-950 text-white shadow-lg shadow-cyan-950/20 active:scale-95">
                    <Plus size={24} />
                  </button>
                </div>
              );
            }
            const [key, label, Icon, onClick] = item;
            const active = navActive === key;
            return (
              <button key={key} onClick={onClick} className={"flex flex-col items-center gap-0.5 py-1 text-[12px] font-black " + (active ? "text-cyan-950" : "text-slate-400")}>
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span className="max-w-full truncate px-0.5">{key === "kb" ? "Bilgi" : label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {mobileShareOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/50 lg:hidden" onClick={() => setMobileShareOpen(false)}>
          <div className="w-full rounded-t-[28px] bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            {[
              [Tag, "İlan ekle", "Sat, takas et, sahiplendir", () => { setMobileShareOpen(false); openAddListing(); }],
              [PenLine, "İçerik paylaş", "Yazı, foto, video veya anket", () => { setMobileShareOpen(false); openComposer(groupMode && currentGroup ? currentGroup.id : null); }]
            ].map(([Icon, title, sub, onClick]) => (
              <button key={title} onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-cyan-50 text-cyan-900"><Icon size={19} /></span>
                <span>
                  <span className="block text-[15px] font-black text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {fabVisible && communityMode && !postMode && (
        <button
          type="button"
          onClick={() => (isMember ? openComposer() : requireLogin())}
          title="İçerik paylaş"
          aria-label="İçerik paylaş"
          className="fixed bottom-8 z-30 hidden h-14 w-14 place-items-center rounded-full bg-cyan-950 text-white shadow-xl shadow-cyan-950/30 transition hover:scale-105 hover:bg-cyan-900 lg:grid"
          style={{ right: "calc(max(1rem, (100vw - 1440px) / 2 + 1rem) + " + (typeof window !== "undefined" && window.innerWidth >= 1280 ? 340 : 300) + "px + 1.25rem)" }}
        >
          <Plus size={26} />
        </button>
      )}
      {toast && (
        <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-[80] max-w-[92vw] -translate-x-1/2 rounded-full bg-slate-950 px-5 py-2.5 text-center text-sm font-black text-white shadow-xl lg:bottom-6">{toast}</div>
      )}
      {legalTab && <SiteInfoModal activeTab={legalTab} setActiveTab={setLegalTab} onClose={() => { setLegalTab(null); leaveTo("/"); }} />}
      {onboardOpen && !onboardDismissed && !auth.recovery && auth.profile && (
        <Suspense fallback={null}><OnboardingModal
          auth={auth}
          species={kb.species}
          groups={groups}
          speciesId={kbDb.speciesId}
          onClose={(saved) => {
            setOnboardDismissed(true);
            if (saved) {
              kbDb.reload();
              community.reload();
              auth.reloadProfile();
            }
          }}
        /></Suspense>
      )}
      {auth.recovery && auth.session && (
        <NewPasswordModal onDone={() => { auth.clearRecovery(); clearViews(); leaveTo("/"); setMemberPage("account"); }} />
      )}
      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
          image={img.tank1}
          onSuccess={() => {
            setAuthOpen(false);
            setToast("Hoş geldin!");
            if (communityMode) {
              // Topluluktayken giriş yapan kullanıcı olduğu yerde kalır
              setProfileUser(null);
              return;
            }
            clearViews();
            leaveTo("/");
            setMemberPage("account");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
      {removeListing && <RemoveListingModal listing={removeListing} onClose={() => setRemoveListing(null)} onDone={async (message) => { setRemoveListing(null); await db.reload(); setToast(message); }} />}
      {promoteListing && <PromoteListingModal listing={promoteListing} onClose={() => setPromoteListing(null)} onDone={(message) => { setPromoteListing(null); setToast(message); }} />}
    </div>
  );
}

function ListingFeed({ listings, onOpen, onProfile }) {
  const [visibleCount, setVisibleCount] = useState(8);
  const visibleListings = listings.slice(0, visibleCount);
  const feedItems = [];

  visibleListings.forEach((item, index) => {
    feedItems.push({ kind: "listing", item });
    const pool = adsFor("feed");
    if ((index + 1) % 5 === 0 && pool.length) {
      feedItems.push({ kind: "ad", ad: pool[Math.floor(index / 5) % pool.length] });
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
            <SeenMarker kind="listing" id={item.id} enabled={isFeatured} />
            {isFeatured && (
              <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-black text-amber-800 shadow-sm">
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm sm:pl-[112px]">
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

function ListingDetail({ item, user, activeImage, setActiveImage, isMember, onBack, onProfile, menuOpen, setMenuOpen, onReport, onAuth, onMessage, onOpenListing }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isVideoSelected = activeImage === "video";
  const imageIndex = typeof activeImage === "number" ? activeImage : 0;
  const currentImage = item.images[imageIndex] || item.images[0];
  const featuredListings = rotate(listings.filter((listing) => featuredListingIds.includes(listing.id) && listing.id !== item.id), "listing");

  return (
    <article className="bg-white px-5 py-5">
      {adsFor("detail").length > 0 && <RotatingDetailAd placement="detail" pageKey={item.id} />}
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
              <button onClick={() => onMessage(user, item.title)} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-900"><MessageCircle size={17} /> Mesaj gönder</button>
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
              <button type="button" onClick={() => onOpenListing(featured)} key={featured.id} className="relative grid min-w-[250px] max-w-[250px] grid-cols-[74px_1fr] gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50">
                <SeenMarker kind="listing" id={featured.id} />
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-cyan-950 text-white"><Pin size={12} fill="currentColor" /></span>
                {featured.images[0] ? <img src={featured.images[0]} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="h-16 w-16 rounded-xl bg-cyan-100" />}
                <span className="min-w-0 pr-6">
                  <span className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{featured.title}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">{featured.city} · {featured.category}</span>
                  <span className="mt-1 block text-sm font-black text-cyan-950">{priceLabel(featured)}</span>
                </span>
              </button>
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

function RightSidebar({ children, minimal = false }) {
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
    ["kvkk", "KVKK"],
    ["blog", "Blog"]
  ];

  return (
    <aside className="hidden h-fit border-r border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:block lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto [scrollbar-width:thin]">
      {!minimal && adsFor("sidebar").length > 0 && <SidebarAd ad={adsFor("sidebar")[0]} />}
      {minimal && children}
      {!minimal && <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <div className="relative h-52 overflow-hidden bg-slate-900 p-5 text-white" style={{ backgroundImage: "linear-gradient(120deg, rgba(8,51,68,.92), rgba(15,23,42,.62)), url(" + slide.image + ")", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="mb-2 text-[12px] font-black uppercase tracking-[0.18em] text-cyan-100/80">Hoş geldin</div>
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
      </div>}
      <div className={(minimal ? "mt-4 border-t border-slate-100 pt-3 " : "mt-3 ") + "flex flex-wrap gap-1.5 opacity-75 transition hover:opacity-100"}>
        {footerLinks.map(([key, label]) =>
          key === "blog" ? (
            <a key={key} href={BLOG_URL} target="_blank" rel="noopener" className="rounded-xl px-2.5 py-2 text-[12px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              {label}
            </a>
          ) : (
            <button key={key} onClick={() => openInfo(key)} className="rounded-xl px-2.5 py-2 text-[12px] font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              {label}
            </button>
          )
        )}
      </div>
      {!minimal && children}
      {infoOpen && <SiteInfoModal activeTab={infoTab} setActiveTab={setInfoTab} onClose={() => setInfoOpen(false)} />}
    </aside>
  );
}

function useAdImpression(ad) {
  useEffect(() => {
    trackAdImpression(ad);
    if (ad) markSeen("ad", ad.dbId || ad.id);
  }, [ad && ad.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Detay sayfası reklam şeridi: bu ziyaretçiye en az gösterilen reklam; aynı sayfa açıkken sabit kalır
function RotatingDetailAd({ placement, pageKey }) {
  const pool = adsFor(placement);
  const ad = useMemo(() => pickLeastSeen(pool, "ad", String(pageKey), (item) => item.dbId || item.id), [placement, pageKey, pool.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return ad ? <DetailBannerAd ad={ad} /> : null;
}

function AdCta({ ad, className }) {
  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); openAd(ad); }} className={className}>
      {ad.cta}
    </button>
  );
}

function SidebarAd({ ad }) {
  useAdImpression(ad);
  return (
    <div onClick={() => openAd(ad)} className={"overflow-hidden rounded-[24px] border border-amber-200 bg-amber-50 shadow-sm " + (ad.url ? "cursor-pointer" : "")}>
      <div className="relative h-28 overflow-hidden">
        <AdImage ad={ad} />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 to-slate-950/10" />
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[12px] font-black uppercase tracking-[0.14em] text-amber-700">Reklam</div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-black text-amber-800">{ad.brand}</div>
        <div className="mt-1 text-sm font-black leading-snug text-slate-900">{ad.title}</div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{ad.text}</p>
        <AdCta ad={ad} className="mt-3 rounded-full bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600" />
      </div>
    </div>
  );
}

function FeedAdCard({ ad }) {
  const [infoOpen, setInfoOpen] = useState(false);
  useAdImpression(ad);
  let host = "";
  try { host = ad.url ? new URL(ad.url).hostname.replace(/^www\./, "") : ""; } catch (err) { host = ""; }

  // Akıştaki paylaşımlarla aynı iskelet: solda marka simgesi, sağda başlık satırı + içerik + alt satır
  return (
    <article onClick={() => openAd(ad)} className={"flex gap-3 border-b border-slate-200 px-4 py-3.5 transition hover:bg-slate-50/70 " + (ad.url ? "cursor-pointer" : "")}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-lg font-black uppercase text-amber-800 ring-1 ring-amber-200" aria-hidden="true">{(ad.brand || "R").slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm sm:text-[15px]">
          <span className="min-w-0 truncate font-black text-slate-900">{ad.brand}</span>
          <span className="shrink-0 text-slate-400">· Sponsorlu</span>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setInfoOpen(true); }}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Bu reklam hakkında"
            aria-label="Bu reklam hakkında"
          >
            <Info size={13} />
          </button>
        </div>

        <h3 className="mt-1 line-clamp-2 text-[16px] font-black leading-snug text-slate-900 sm:text-[18px]">{ad.title}</h3>
        {ad.text && <p className="mt-0.5 line-clamp-3 text-[15px] leading-relaxed text-slate-600 sm:text-base">{ad.text}</p>}

        {ad.image && (
          <div className="mt-2.5 overflow-hidden rounded-2xl border border-slate-200 bg-amber-50">
            <AdImage ad={ad} className="aspect-[16/9] max-h-[340px] w-full object-cover" />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm text-slate-400">{host}</span>
          <AdCta ad={ad} className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600" />
        </div>
      </div>

      {infoOpen && <AdInfoModal onClose={() => setInfoOpen(false)} />}
    </article>
  );
}

function AdInfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Reklam alanı</div>
            <h3 className="mt-1 text-xl font-black">Reklamınız burada görünsün ister misiniz?</h3>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" title="Kapat"><X size={18} /></button>
        </div>
        <p className="text-sm leading-6 text-slate-600">Aquagram aracılığıyla akvaryum hobisine ilgi duyan doğrudan hedef kitlenize ulaşın. Marka, ürün, mağaza veya hizmetinizi ilan akışı içinde doğal ve görünür biçimde konumlandırın.</p>
        <button
          onClick={() => {
            onClose();
            window.dispatchEvent(new CustomEvent("aquagram:open-ads"));
          }}
          className="mt-4 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-black text-white hover:bg-amber-600"
        >
          Reklam ver
        </button>
      </div>
    </div>
  );
}

function DetailBannerAd({ ad }) {
  const [infoOpen, setInfoOpen] = useState(false);
  useAdImpression(ad);
  return (
    <div onClick={() => openAd(ad)} className={"mb-5 rounded-[22px] border border-amber-200 bg-amber-50/70 p-3 shadow-sm transition hover:bg-amber-50 " + (ad.url ? "cursor-pointer" : "")}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-amber-100 ring-1 ring-amber-200/70 sm:h-[72px] sm:w-[72px]">
          <AdImage ad={ad} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.1em] text-amber-700">
              Reklam
              <button type="button" onClick={(event) => { event.stopPropagation(); setInfoOpen(true); }} className="grid h-3.5 w-3.5 place-items-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200" title="Bu reklam hakkında" aria-label="Bu reklam hakkında"><Info size={9} /></button>
            </span>
            {ad.brand && <span className="min-w-0 truncate text-[13px] font-black text-amber-800">{ad.brand}</span>}
          </div>
          <div className="mt-1 line-clamp-2 text-[15px] font-black leading-snug text-slate-950 sm:line-clamp-1">{ad.title}</div>
          {ad.text && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-600 sm:line-clamp-1">{ad.text}</p>}
        </div>
        {ad.cta && <AdCta ad={ad} className="hidden shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 sm:block" />}
      </div>
      {ad.cta && <AdCta ad={ad} className="mt-2.5 w-full rounded-full bg-amber-500 px-4 py-1.5 text-[13px] font-black text-white hover:bg-amber-600 sm:hidden" />}
      {infoOpen && <AdInfoModal onClose={() => setInfoOpen(false)} />}
    </div>
  );
}

function AccountPage({ auth, onSaved }) {
  const profile = auth.profile;
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    const socials = profile.socials || {};
    setForm({
      username: profile.username || "",
      city: profile.city || "",
      district: profile.district || "",
      bio: profile.bio || "",
      hide_from_search: Boolean(profile.hide_from_search),
      socials: { instagram: socials.instagram || "", facebook: socials.facebook || "", x: socials.x || "", web: socials.web || "", youtube: socials.youtube || "" }
    });
  }, [profile]);

  if (!profile || !form) {
    return <div className="mx-auto max-w-5xl p-10 text-center text-sm font-bold text-slate-400">Profil yükleniyor…</div>;
  }

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setSocial = (key, value) => setForm((prev) => ({ ...prev, socials: { ...prev.socials, [key]: value } }));

  async function save(patch = form, message = "Bilgilerin kaydedildi.") {
    setError("");
    setBusy(true);
    const payload = { ...patch };
    if ("username" in payload) payload.username = payload.username.trim().toLowerCase().replace(/^@/, "");
    const { error: err } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    setBusy(false);
    if (err) {
      setError(trError(err));
      return false;
    }
    await auth.reloadProfile();
    onSaved(message);
    return true;
  }

  async function toggleHidden() {
    const next = !form.hide_from_search;
    set("hide_from_search", next);
    const ok = await save({ hide_from_search: next }, next ? "Profilin arama motorlarından gizlendi." : "Profilin arama motorlarında görünebilir.");
    if (!ok) set("hide_from_search", !next);
  }

  async function uploadAvatar(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Profil resmi JPG, PNG ya da WEBP olmalı.");
    if (file.size > 2 * 1024 * 1024) return setError("Profil resmi en fazla 2 MB olabilir.");
    setError("");
    setUploading(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = profile.id + "/" + Date.now() + "." + ext;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      return setError(trError(upErr));
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await save({ avatar_url: data.publicUrl }, "Profil resmin güncellendi.");
    setUploading(false);
  }

  const initials = (profile.username || "?").slice(0, 2).toUpperCase();
  const field = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-cyan-800 focus:bg-white";
  const label = "mb-1.5 block text-sm font-bold text-slate-600";
  const isPro = Boolean(profile.pro_until && new Date(profile.pro_until) > new Date());
  const place = [profile.district, profile.city].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-8">
      <div className="mb-5 px-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Hesabım</h2>
        <p className="mt-1 text-[15px] text-slate-500">Profil bilgilerini, doğrulama durumunu ve hesap ayarlarını yönet.</p>
      </div>
      {auth.isStaff && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          <ShieldCheck size={17} /> {auth.staff.role === "super_admin" ? "Süper yönetici" : "Moderatör"} hesabıyla giriş yaptın.
          <a href="/#/yonetim" className="ml-auto rounded-full bg-amber-900 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-800">Yönetim paneli</a>
        </div>
      )}
      {error && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5">
        {/* 1. Profil şeridi */}
        <section className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-cyan-50/60 p-4 sm:gap-5 sm:p-6">
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading} className="group relative shrink-0" title="Profil resmini değiştir">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-white sm:h-24 sm:w-24" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-cyan-950 text-2xl font-black text-white ring-4 ring-white sm:h-24 sm:w-24">{initials}</div>
            )}
            <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 group-hover:bg-slate-50">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-xl font-black text-slate-950 sm:text-2xl">@{profile.username}</span>
              {profile.phone_verified && <CheckCircle2 size={20} className="shrink-0 text-sky-600" aria-label="Doğrulanmış üye" />}
              {isPro && <ProBadge size="lg" />}
            </div>
            {place && <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {place}</div>}
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading} className="mt-2.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {uploading ? "Yükleniyor…" : profile.avatar_url ? "Profil resmini değiştir" : "Profil resmi ekle"}
            </button>
          </div>
        </section>

        {/* 2. Profil bilgileri */}
        <AccountSection title="Profil bilgileri" desc="Profilinde ve ilanlarında görünen bilgiler.">
          <form onSubmit={(event) => { event.preventDefault(); save(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={label}>Kullanıcı adı</span>
                <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">@</span>
                  <input value={form.username} onChange={(event) => set("username", event.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24))} className={field + " pl-9"} required minLength={3} />
                </div>
              </label>
              <label><span className={label}>Şehir</span><input value={form.city} onChange={(event) => set("city", event.target.value)} maxLength={40} className={field} placeholder="İstanbul" /></label>
              <label><span className={label}>İlçe</span><input value={form.district} onChange={(event) => set("district", event.target.value)} maxLength={40} className={field} placeholder="Kadıköy" /></label>
              <label className="sm:col-span-2"><span className={label}>Hakkında</span><textarea rows={4} value={form.bio} onChange={(event) => set("bio", event.target.value)} maxLength={500} className={field + " resize-y leading-relaxed"} placeholder="Hangi türleri besliyorsun, kaç tankın var?" />
                <span className="mt-1 block text-right text-xs text-slate-400">{form.bio.length} / 500</span>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="submit" disabled={busy} className="rounded-full bg-cyan-950 px-6 py-3 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-60">{busy ? "Kaydediliyor…" : "Bilgileri kaydet"}</button>
            </div>
          </form>
        </AccountSection>

        {/* 3. Doğrulama + mavi tik */}
        <AccountSection title="Doğrulama" desc="Doğrulanmış üyeler ilan ve mesajlarda daha çok güven verir.">
          <VerificationRow icon={<Mail size={18} />} title="E-posta adresi" value={auth.email} verified={auth.emailConfirmed} />
          <VerificationCard auth={auth} onToast={onSaved} />
        </AccountSection>

        {/* 4. Hesap güvenliği */}
        <AccountSecurity auth={auth} onToast={onSaved} />

        {/* 5. Sosyal hesaplar */}
        <AccountSection title="Sosyal hesaplar" desc="Profilinde görünür; hobiciler seni bu hesaplardan da takip edebilir. Hepsi isteğe bağlı.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[["instagram", "Instagram", "Kullanıcı adın (ör. @akvaryumcu)"], ["x", "X (Twitter)", "Kullanıcı adın (ör. @akvaryumcu)"], ["youtube", "YouTube", "Kanal adresin ya da @kanal adın"], ["facebook", "Facebook", "Profil bağlantın"], ["web", "Web sitesi", "https://…"]].map(([key, name, placeholder]) => (
              <label key={key} className={key === "web" ? "sm:col-span-2" : ""}><span className={label}>{name}</span>
                <input placeholder={placeholder} value={form.socials[key]} onChange={(event) => setSocial(key, event.target.value)} maxLength={120} className={field} />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => save({ socials: form.socials }, "Sosyal hesapların kaydedildi.")} disabled={busy} className="rounded-full bg-cyan-950 px-6 py-3 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-60">Kaydet</button>
          </div>
        </AccountSection>

        {/* 6. PRO */}
        <ProCard auth={auth} onToast={onSaved} className="rounded-[24px]" wide />

        {/* 7. Gizlilik + hesap silme */}
        <AccountSection title="Gizlilik ve hesap">
          <button type="button" role="switch" aria-checked={form.hide_from_search} onClick={toggleHidden} disabled={busy} className="flex w-full items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4 text-left">
            <span className="flex gap-3">
              <span className={"mt-0.5 shrink-0 " + (form.hide_from_search ? "text-cyan-800" : "text-slate-400")}>{form.hide_from_search ? <EyeOff size={19} /> : <Eye size={19} />}</span>
              <span>
                <span className="block text-[15px] font-black text-slate-800">Profilimi arama motorlarından gizle</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-slate-500">
                  {form.hide_from_search
                    ? "Profilin ve paylaşımların Google gibi arama motorlarında listelenmez. Site üyeleri seni görmeye devam eder."
                    : "Profilin ve paylaşımların arama motorlarında görünebilir."}
                </span>
              </span>
            </span>
            <span className={"relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition " + (form.hide_from_search ? "bg-cyan-950" : "bg-slate-300")}>
              <span className={"absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all " + (form.hide_from_search ? "left-[22px]" : "left-0.5")} />
            </span>
          </button>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">Hesabını silersen profilin anonimleşir; bu işlem geri alınamaz.</p>
            <button onClick={() => setDeleting(true)} className="flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-50"><Trash2 size={16} /> Hesabımı sil</button>
          </div>
          {deleting && (
            <DeleteAccountDialog
              auth={auth}
              onClose={() => setDeleting(false)}
              onDeleted={() => {
                setDeleting(false);
                onSaved("Hesabın silindi. Aquagram'ı kullandığın için teşekkürler, yolun açık olsun! 🐟");
                navigate("/", { replace: true });
              }}
            />
          )}
        </AccountSection>
      </div>
    </div>
  );
}

function AccountSection({ title, desc, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-black text-slate-950 sm:text-xl">{title}</h3>
      {desc && <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function VerificationRow({ icon, title, value, verified }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3 text-slate-700">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">{icon}</span>
        <div className="min-w-0"><div className="text-[15px] font-black text-slate-800">{title}</div><div className="break-all text-sm text-slate-500">{value}</div></div>
      </div>
      <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-black " + (verified ? "bg-sky-100 text-sky-700" : "bg-slate-200/70 text-slate-500")}>{verified ? "Doğrulandı" : "Bekliyor"}</span>
    </div>
  );
}

function MyListingsPage({ listings = [], endedListings = [], onOpen, onRemove, onPromote, onBumped, onToast, onEdit, onDelete }) {
  const [tab, setTab] = useState("active");
  const [editingListing, setEditingListing] = useState(null);
  const [editingMode, setEditingMode] = useState("edit");

  const activeListings = Array.isArray(listings) ? listings : [];

  const expiredListings = endedListings;

  const savedListings = [];

  const tabs = [
    ["active", "Yayındaki ilanlarım", activeListings.length],
    ["expired", "Yayından kalkan ilanlar", expiredListings.length],
    ["saved", "Kaydettiğim ilanlar", savedListings.length]
  ];

  const currentList =
    tab === "expired" ? expiredListings : tab === "saved" ? savedListings : activeListings;

  function openEditor(item, mode) {
    if (item.dbId && onEdit) return onEdit(item, mode);
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
                      {item.status === "sold" ? "Satıldı / sonuçlandı" : item.status === "removed" ? "Yönetici kaldırdı" : "Yayından kalktı"}
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

                      {onToast && <BumpButton listing={item} small onDone={onBumped} onToast={onToast} />}

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

                      <button onClick={() => onDelete && onDelete(item)} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">
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
                      className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-[12px] font-black text-slate-300"
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
                <textarea rows={5} defaultValue={listing.description || ""} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-base leading-6 outline-none" />
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


function nowTime() {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// Mesaj kutusu doluluğu: normal üye 20 sohbet, her PRO alımında +100
function MessageBoxUsage({ count }) {
  const { status } = useProStatus(true);
  if (!status) return null;
  const limit = status.conversation_limit;
  const used = Math.max(count, status.conversation_count);
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="mt-3 max-w-sm">
      <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
        <span>Mesaj kutusu {status.pro && <ProBadge />}</span>
        <span>{used} / {limit} sohbet</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={"h-full rounded-full " + (pct >= 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-cyan-700")} style={{ width: Math.max(pct, 2) + "%" }} /></div>
      {pct >= 80 && <p className="mt-1 text-xs text-slate-500">{pct >= 100 ? "Kutun dolu; yeni sohbet için eski sohbetlerinden birini sil" : "Kutun dolmak üzere"}{status.pro ? "." : " ya da PRO ile +100 sohbet hakkı al."}</p>}
    </div>
  );
}

function MessagesPage({ conversations, activeId, setActiveId, onSend, onDelete, onRestore, onPurge, onDirectSend, onReview, onReportUser, onToggleBlock }) {
  const [tab, setTab] = useState("active");
  const { status: proStatus } = useProStatus(true);
  const isPro = Boolean(proStatus && proStatus.pro);
  const panelRef = useRef(null);
  const [draft, setDraft] = useState("");
  const selectedConversation = conversations.find((item) => item.id === activeId) || null;
  const setSelectedConversation = (item) => setActiveId(item ? item.id : null);

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


  const visibleConversations = conversations.filter((message) => {
    if (tab === "deleted") {
      return message.deleted;
    }

    return !message.deleted;
  });

  let activeConversation = visibleConversations[0] || null;
  const draftKey = activeConversation ? activeConversation.id : null;
  // Yeni başlatılan konuşmada hazır taslak metni kutuya gelir
  useEffect(() => {
    setDraft(activeConversation && activeConversation.draft && activeConversation.messages.length === 0 ? activeConversation.draft : "");
  }, [draftKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <MessageBoxUsage count={conversations.filter((item) => item.dbId).length} />
      </div>

      <div className="mb-4 inline-flex max-w-full overflow-x-auto rounded-full bg-slate-100 p-1 [scrollbar-width:none]">
        {isPro && (
          <button
            onClick={() => {
              setTab("compose");
              setSelectedConversation(null);
            }}
            className={"flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black " + (tab === "compose" ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")}
          >
            <Send size={13} /> Mesaj gönder <ProBadge />
          </button>
        )}
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

      {tab === "deleted" && visibleConversations.some((item) => item.dbId) && onPurge && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span>Silinmiş sohbetler de mesaj kotana dahildir. Yer açmak için kalıcı olarak sil.</span>
          <button
            onClick={() => {
              const ids = visibleConversations.filter((item) => item.dbId).map((item) => item.dbId);
              if (window.confirm(ids.length + " sohbet kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) onPurge(ids);
            }}
            className="rounded-full bg-red-600 px-3 py-1.5 font-black text-white hover:bg-red-700"
          >
            Tümünü kalıcı sil ({visibleConversations.filter((item) => item.dbId).length})
          </button>
        </div>
      )}

      {tab === "compose" ? (
        <DirectMessageForm onSend={async (otherId, topic, body) => { await onDirectSend(otherId, topic, body); setTab("active"); }} />
      ) : (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          {visibleConversations.length === 0 && <p className="p-6 text-center text-sm text-slate-400">{tab === "deleted" ? "Silinmiş sohbet yok." : "Henüz mesajın yok."}</p>}
          {visibleConversations.map((message) => (
            <button
              key={message.id}
              onClick={() => {
                setSelectedConversation(message);
                // Mobilde liste ile sohbet alt alta: seçilen sohbete kaydır
                if (window.innerWidth < 1024) setTimeout(() => panelRef.current && panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
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
                      <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[12px] font-black text-white">
                        Yeni
                      </span>
                    )}

                    {message.deleted && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-black text-red-700">
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

        <div ref={panelRef} className="min-h-[360px] min-w-0 scroll-mt-20 rounded-[28px] border border-slate-200 bg-white p-4">
          {activeConversation ? (
            <div className="flex h-full flex-col">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
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

                <div className="flex max-w-full flex-wrap gap-2">
                  <button onClick={() => onReportUser(activeConversation)} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">
                    <Flag size={13} className="mr-1 inline" /> Şikâyet et
                  </button>

                  <button onClick={() => onToggleBlock(activeConversation)} className={"rounded-full border px-3 py-2 text-xs font-black " + (activeConversation.blockedByMe ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100")}>
                    {activeConversation.blockedByMe ? "Engeli kaldır" : "Engelle"}
                  </button>

                  {!activeConversation.deleted && (
                    <button onClick={() => onDelete(activeConversation.id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
                      <Trash2 size={13} className="mr-1 inline" /> Sil
                    </button>
                  )}
                  {activeConversation.deleted && activeConversation.dbId && onPurge && (
                    <button onClick={() => window.confirm("Bu sohbet kalıcı olarak silinsin mi? Bu işlem geri alınamaz.") && onPurge([activeConversation.dbId])} className="rounded-full bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700">
                      <Trash2 size={13} className="mr-1 inline" /> Kalıcı sil
                    </button>
                  )}
                </div>
              </div>

              {activeConversation.blockedByMe && (
                <div className="mb-3 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                  Bu kullanıcıyı engelledin: birbirinize mesaj gönderemezsiniz ve yeni konuşma başlatamazsınız. Engeli kaldırmak için yukarıdaki düğmeyi kullan.
                </div>
              )}
              <ReviewStrip conversation={activeConversation} onReview={() => onReview(activeConversation)} />
              <div className="grid flex-1 content-start gap-3">
                {activeConversation.messages.length === 0 && (
                  <div className="rounded-2xl bg-cyan-50/60 p-4 text-center text-sm text-slate-600">
                    <MessageCircle className="mx-auto mb-2 text-cyan-700" size={26} />
                    <strong className="text-slate-900">{activeConversation.user}</strong> ile yeni bir konuşma başlatıyorsun.
                    <span className="block text-xs text-slate-500">Konu: {activeConversation.title}</span>
                  </div>
                )}
                {activeConversation.messages.map((item, index) => {
                  const mine = item.from === "sen";

                  return (
                    <div
                      key={index}
                      className={
                        "max-w-[78%] break-words rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] " +
                        (mine ? "ml-auto bg-cyan-950 text-white" : "bg-slate-100 text-slate-700")
                      }
                    >
                      <div className="mb-1 text-[12px] font-black opacity-70">
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
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && draft.trim() && !activeConversation.blockedByMe) { onSend(activeConversation.id, draft.trim()); setDraft(""); }
                    }}
                    disabled={activeConversation.blockedByMe}
                    className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-700 disabled:opacity-50"
                    placeholder={activeConversation.blockedByMe ? "Engellediğin kullanıcıya mesaj gönderemezsin" : "Mesaj yaz..."}
                  />

                  <button
                    onClick={() => { if (draft.trim()) { onSend(activeConversation.id, draft.trim()); setDraft(""); } }}
                    disabled={!draft.trim() || activeConversation.blockedByMe}
                    className="rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40"
                  >
                    Gönder
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                  <span>Bu sohbet silinmiş mesajlarda. Gelen kutuna geri taşıyabilir ya da yer açmak için kalıcı olarak silebilirsin.</span>
                  {onRestore && (
                    <button onClick={() => { onRestore(activeConversation.id); setSelectedConversation(null); }} className="flex items-center gap-1.5 rounded-full bg-cyan-950 px-4 py-2 text-xs font-black text-white hover:bg-cyan-900">
                      <RotateCcw size={13} /> Mesajları geri getir
                    </button>
                  )}
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
      )}
    </div>
  );
}

// PRO: mesaj panelinden kullanıcı adıyla doğrudan mesaj
function DirectMessageForm({ onSend }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState(null);
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim().replace(/^@/, "").toLowerCase();
    if (target || q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data: me } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, city, avatar_url, phone_verified, pro_until")
        .ilike("username", "%" + q.replace(/[\\%_]/g, (ch) => "\\" + ch) + "%")
        .is("deleted_at", null)
        .order("username")
        .limit(8);
      if (!cancelled) setResults((data || []).filter((row) => !me || !me.user || row.id !== me.user.id));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, target]);

  async function submit(event) {
    event.preventDefault();
    if (!target || !body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend(target.id, topic.trim() || "Profil", body.trim());
    } catch (err) {
      setError(trError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-2xl gap-3 rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-lg font-black"><Send size={18} /> Yeni mesaj <ProBadge /></div>
      <div className="relative grid gap-1 text-xs font-black text-slate-500"><span>Kime</span>
        {target ? (
          <span className="flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-900">
            <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-cyan-950 text-xs font-black text-white">{target.avatar_url ? <img src={target.avatar_url} alt="" className="h-full w-full object-cover" /> : target.username.charAt(0).toUpperCase()}</span>
            <b>@{target.username}</b>
            {target.phone_verified && <VerifiedBadge />}
            {target.pro_until && new Date(target.pro_until) > new Date() && <ProBadge />}
            <span className="flex-1" />
            <button type="button" onClick={() => { setTarget(null); setQuery(""); }} className="rounded-full p-1 text-slate-500 hover:bg-white" aria-label="Alıcıyı değiştir"><X size={15} /></button>
          </span>
        ) : (
          <>
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Kime" placeholder="@kullaniciadi yaz…" autoComplete="off" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700 focus:bg-white" />
            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="listbox">
                {results.map((row) => (
                  <button key={row.id} type="button" role="option" aria-selected="false" onClick={() => { setTarget(row); setResults([]); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-950 text-xs font-black text-white">{row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : row.username.charAt(0).toUpperCase()}</span>
                    <b className="text-slate-900">@{row.username}</b>
                    {row.phone_verified && <VerifiedBadge />}
                    {row.pro_until && new Date(row.pro_until) > new Date() && <ProBadge />}
                    <span className="text-xs font-normal text-slate-400">{row.city || ""}</span>
                  </button>
                ))}
              </div>
            )}
            {query.trim().replace(/^@/, "").length >= 2 && results.length === 0 && <span className="font-normal text-slate-400">Eşleşen üye yok.</span>}
          </>
        )}
      </div>
      <label className="grid gap-1 text-xs font-black text-slate-500">Konu (isteğe bağlı)
        <input value={topic} onChange={(event) => setTopic(event.target.value.slice(0, 80))} placeholder="Ör. Betta yavruları hakkında" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700 focus:bg-white" />
      </label>
      <label className="grid gap-1 text-xs font-black text-slate-500">Mesajın
        <textarea value={body} onChange={(event) => setBody(event.target.value.slice(0, 2000))} rows={5} placeholder="Merhaba!" className="resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-normal text-slate-900 outline-none focus:border-cyan-700 focus:bg-white" />
      </label>
      {error && <div className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
      <div className="flex justify-end">
        <button type="submit" disabled={!target || !body.trim() || busy} className="flex items-center gap-2 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Gönder
        </button>
      </div>
    </form>
  );
}
function UserListingsPage({ user, onBack, onOpen, onProfile, onMessage }) {
  const userId = userIdOf(users, user);
  const dbReviews = useProfileReviews(user.real ? user.id : null, Boolean(user.real));
  const positiveCount = user.real ? dbReviews.stats.positive : user.reviewStats?.positive || 0;
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
                  {user.pro && <ProBadge size="lg" />}
                </div>

                <p className="mt-1 text-sm text-cyan-50/80">
                  {user.city} · {user.joined} üyesi · {user.online ? "Çevrimiçi" : "Son ziyaret: " + user.lastSeen}
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/90">
                  {user.bio || "Bu kullanıcı henüz hakkında bilgisi eklememiş."}
                </p>
              </div>
            </div>

            {user.deleted ? (
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">Silinmiş hesap</span>
            ) : (
              <button onClick={() => onMessage(user, "Profil")} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-950 hover:bg-cyan-50">
                <MessageCircle size={16} /> Mesaj gönder
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">{userListings.length}</div>
            <div className="text-xs font-black text-slate-500">Yayındaki ilan</div>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-emerald-700">{positiveCount}</div>
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
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-black text-amber-800 shadow-sm">
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

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm sm:pl-[112px]">
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
// Görsel / video / anket içeriklerde metin yerine küçük önizleme + açıklama
function MediaThumb({ item, size = "h-11 w-11" }) {
  if (item.images && item.images.length) {
    return (
      <span className={"relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-cyan-800 to-teal-500 " + size}>
        <img src={item.images[0]} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        {item.images.length > 1 && <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-950/70 px-1 text-[12px] font-black text-white">+{item.images.length - 1}</span>}
      </span>
    );
  }
  if (item.video) return <span className={"grid shrink-0 place-items-center rounded-lg bg-slate-900 text-white " + size}><Play size={14} fill="currentColor" /></span>;
  if (item.poll) return <span className={"grid shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-800 " + size}><BarChart3 size={15} /></span>;
  return null;
}

function ProfileModal({ user, userPosts = [], allPosts = [], groups = [], keptSpecies = [], kb, onMessage, onClose, onViewListings, onViewPosts, onOpenPost, onOpenGroup, myId, onToast, onReportReview, onProfileRow }) {
  const dbReviews = useProfileReviews(user.real ? user.id : null, Boolean(user.real));
  const stats = user.real ? dbReviews.stats : user.reviewStats || { positive: 0, neutral: 0, negative: 0 };
  const totalReviews = stats.positive + stats.neutral + stats.negative;
  const hasSocials = user.socials && (user.socials.instagram || user.socials.facebook || user.socials.x);
  const recentPosts = userPosts.slice(0, 3);
  const profileUserId = userIdOf(users, user);
  // Kullanıcının başkalarının (ve kendi) içeriklerine yaptığı en yeni yorumlar
  const recentComments = allPosts
    .flatMap((post) => post.comments.filter((comment) => comment.userId === profileUserId).map((comment) => ({ comment, post })))
    .sort((a, b) => b.comment.createdAt - a.comment.createdAt)
    .slice(0, 3);
  const userGroups = groups.filter((group) => group.memberIds.includes(profileUserId));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full min-w-0 max-w-lg overflow-y-auto overflow-x-hidden rounded-[32px] bg-white p-5 shadow-2xl">
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

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-lg font-black text-slate-950">{user.listingsCount || 0}</div>
            <div className="text-xs font-black text-slate-500">Yayındaki ilan</div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-lg font-black text-slate-950">{userPosts.length}</div>
            <div className="text-xs font-black text-slate-500">Toplam paylaşım</div>
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
          <ReviewSummary stats={stats} />
          {user.real ? (
            <ReviewList data={dbReviews} myId={myId} onProfile={onProfileRow} onReport={onReportReview} onToast={onToast} />
          ) : (
            (user.reviews || []).length > 0 && (
              <ul className="mt-3 grid gap-2">
                {user.reviews.map((text) => <li key={text} className="rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">“{text}”</li>)}
              </ul>
            )
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">Değerlendirmeler, ilan üzerinden yazışıp alışveriş yapan üyeler tarafından Mesajlarım ekranından verilir.</p>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-sm font-black">
            <span className="flex items-center gap-1.5"><BookOpen size={15} /> Beslediği türler</span>
            <span className="text-xs text-slate-400">{keptSpecies.length}</span>
          </div>
          <KeptSpeciesChips slugs={keptSpecies} kb={kb} onOpen={kb.openSpecies} />
        </div>

        {userGroups.length > 0 && (
          <div className="mb-4 rounded-2xl bg-slate-50 p-3">
            <div className="mb-2 text-sm font-black">Gruplar</div>
            <div className="flex flex-wrap gap-1.5">
              {userGroups.map((group) => (
                <button key={group.id} type="button" onClick={() => onOpenGroup(group)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-cyan-50">
                  <GroupIcon group={group} inline /> {group.name}
                  {group.ownerId === profileUserId && <span className="text-amber-700">· kurucu</span>}
                  {group.ownerId !== profileUserId && group.moderatorIds.includes(profileUserId) && <span className="text-cyan-700">· mod</span>}
                </button>
              ))}
            </div>
          </div>
        )}

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

        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 text-sm font-black">Son paylaşımlar</div>

          {recentPosts.length > 0 ? (
            <div className="grid gap-2">
              {recentPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onOpenPost(post)}
                  className="flex w-full min-w-0 items-start gap-2.5 rounded-xl bg-white p-2.5 text-left ring-1 ring-slate-200 transition hover:bg-cyan-50/50 hover:ring-cyan-200"
                >
                  <MediaThumb item={post} />
                  <span className="min-w-0 flex-1">
                    <span className={"line-clamp-2 break-words text-sm " + (post.text ? "text-slate-700" : "font-bold text-slate-500")}>{post.text || mediaLabel(post)}</span>
                    <span className="mt-1.5 flex items-center gap-3 text-xs font-semibold text-slate-400">
                      <span>{timeAgo(post.createdAt)}</span>
                      <span>♥ {post.likes}</span>
                      <span>💬 {post.comments.length}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-2 text-sm text-slate-500 ring-1 ring-slate-200">Henüz paylaşım yok.</p>
          )}
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 text-sm font-black">Son yorumlar</div>

          {recentComments.length > 0 ? (
            <div className="grid gap-2">
              {recentComments.map(({ comment, post }) => (
                <button
                  key={comment.id}
                  type="button"
                  onClick={() => onOpenPost(post)}
                  className="block w-full min-w-0 rounded-xl bg-white p-2.5 text-left ring-1 ring-slate-200 transition hover:bg-cyan-50/50 hover:ring-cyan-200"
                >
                  <span className="flex min-w-0 items-start gap-2.5">
                    {(comment.images && comment.images.length > 0) || comment.video ? <MediaThumb item={comment} size="h-10 w-10" /> : null}
                    <span className={"line-clamp-2 min-w-0 flex-1 break-words text-sm " + (comment.text ? "text-slate-700" : "font-bold text-slate-500")}>{comment.text || commentSnippet(comment)}</span>
                  </span>
                  <span className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-1.5 text-xs text-slate-500">
                    <MediaThumb item={post} size="h-7 w-7" />
                    {!(post.images && post.images.length) && !post.video && !post.poll && <MessageCircle size={12} className="ml-0.5 shrink-0" />}
                    <span className="shrink-0 font-black text-slate-600">{users[post.userId].username}</span>
                    <span className="min-w-0 truncate">{post.text || mediaLabel(post)}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-3 text-xs font-semibold text-slate-400">
                    <span>{timeAgo(comment.createdAt)}</span>
                    <span>♥ {comment.likes}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-2 text-sm text-slate-500 ring-1 ring-slate-200">Henüz yorum yok.</p>
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

        <div className="sticky bottom-[-20px] -mx-5 -mb-5 mt-4 grid gap-2 border-t border-slate-100 bg-white px-5 pb-5 pt-3 sm:grid-cols-3">
          <button
            onClick={onViewPosts}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Paylaşımları
          </button>

          <button
            onClick={onViewListings}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            İlanları
          </button>

          {!user.deleted && (
            <button onClick={() => onMessage(user, "Profil")} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-3 py-3 text-sm font-black text-white hover:bg-cyan-900">
              <MessageCircle size={17} /> Mesaj gönder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const reportReasons = {
  listing: ["Yanıltıcı ilan", "Uygunsuz canlı / ürün", "Sahte fotoğraf", "Satıldı ama yayında", "Diğer"],
  post: ["Spam veya reklam", "Hakaret, taciz ya da nefret söylemi", "Yanıltıcı veya tehlikeli bilgi", "Uygunsuz görsel / video", "Topluluk akışında satış yapılıyor", "Hayvan refahına aykırı içerik", "Diğer"],
  comment: ["Spam veya reklam", "Hakaret, taciz ya da nefret söylemi", "Yanıltıcı veya tehlikeli bilgi", "Uygunsuz görsel / video", "Diğer"],
  review: ["Gerçek bir alışverişe dayanmıyor", "Hakaret veya kişisel bilgi içeriyor", "Haksız / kasıtlı olumsuz değerlendirme", "Diğer"],
  user: ["Dolandırıcılık şüphesi", "Hakaret, taciz ya da tehdit", "Spam / istenmeyen mesaj", "Sahte hesap", "Hayvan refahına aykırı davranış", "Diğer"]
};

const reportCopy = {
  listing: { title: "İlanı bildir", text: "Bu ilanla ilgili kısa bir bildirim gönder." },
  post: { title: "Paylaşımı bildir", text: "Topluluk kurallarına aykırı içerikleri ekibimize ilet." },
  comment: { title: "Yorumu bildir", text: "Topluluk kurallarına aykırı yorumları ekibimize ilet." },
  review: { title: "Değerlendirmeyi bildir", text: "Kurallara aykırı ya da gerçeğe dayanmayan değerlendirmeleri ekibimiz inceler." },
  user: { title: "Kullanıcıyı şikâyet et", text: "Bu üyeyle yaşadığın sorunu kısaca anlat; ekibimiz inceler. Şikâyetin karşı tarafa bildirilmez." }
};

function ReportModal({ target, onClose, onSubmit }) {
  const kind = target.kind || "listing";
  const reasons = reportReasons[kind];
  const copy = reportCopy[kind];
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const author = kind === "post" ? users[target.post.userId] : kind === "comment" ? users[target.comment.userId] : null;
  const preview = kind === "post" ? postSnippet(target.post) : kind === "comment" ? commentSnippet(target.comment) : target.listing && target.listing.title;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black"><Flag size={18} /> {copy.title}</h2>
            <p className="text-sm text-slate-500">{copy.text}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button>
        </div>

        {preview && (
          <div className="mb-4 rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
            {author && <div className="mb-1 text-xs font-black text-slate-500">{author.username}</div>}
            <p className="line-clamp-3 text-slate-700">{preview}</p>
          </div>
        )}

        <div className="mb-1 text-xs font-black text-slate-500">Neden bildiriyorsun?</div>
        <div className="grid gap-1.5">
          {reasons.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReason(option)}
              className={"flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm font-bold transition " + (reason === option ? "border-cyan-950 bg-cyan-50 text-cyan-950" : "border-slate-200 text-slate-700 hover:bg-slate-50")}
            >
              {option}
              <span className={"grid h-4 w-4 place-items-center rounded-full border-2 " + (reason === option ? "border-cyan-950" : "border-slate-300")}>
                {reason === option && <span className="h-1.5 w-1.5 rounded-full bg-cyan-950" />}
              </span>
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-black text-slate-500">Açıklama - opsiyonel</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={300} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-cyan-700" placeholder="Kısaca açıklayın..." />
        </label>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">Bildirimler gizlidir; içerik sahibi kimin bildirdiğini görmez.</p>
        <button onClick={() => onSubmit({ reason, note })} disabled={!reason} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">Bildir</button>
      </div>
    </div>
  );
}

const REMOVE_REASONS = [
  ["sold_here", "Aquagram aracılığıyla sattım / sahiplendirdim / buldum", "sold"],
  ["sold_elsewhere", "Başka bir platform ile sattım / sahiplendirdim / buldum", "sold"],
  ["gave_up", "Vazgeçtim", "expired"]
];

function RemoveListingModal({ listing, onClose, onDone }) {
  const [reason, setReason] = useState(REMOVE_REASONS[0][0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!listing.dbId) return onClose();
    setBusy(true);
    setError("");
    const status = REMOVE_REASONS.find(([key]) => key === reason)[2];
    const { error: err } = await supabase.from("listings").update({ status }).eq("id", listing.dbId);
    setBusy(false);
    if (err) return setError(trError(err));
    onDone("İlan yayından kaldırıldı.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[32px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">İlanı yayından kaldır</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">“{listing.title}” ilanını neden yayından kaldırıyorsun?</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button>
        </div>
        <div className="grid gap-2">
          {REMOVE_REASONS.map(([key, label]) => (
            <label key={key} className={"flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm " + (reason === key ? "border-cyan-950 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
              <input type="radio" checked={reason === key} onChange={() => setReason(key)} className="mt-0.5" />
              <span className="font-bold leading-relaxed">{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">Bu bilgi ilan kalitesini ve başarı oranını ölçmek için kullanılır, kullanıcılara gösterilmez.</div>
        {error && <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Vazgeç</button>
          <button onClick={confirm} disabled={busy} className="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">{busy ? "Kaldırılıyor…" : "Yayından kaldır"}</button>
        </div>
      </div>
    </div>
  );
}

function PromoteListingModal({ listing, onClose, onDone }) {
  const { status: proStatus } = useProStatus(true);
  const [useCredit, setUseCredit] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFeaturedPlans().then((list) => {
      setPlans(list);
      if (list[0]) setPlan(list[0].id);
    });
  }, []);

  async function apply() {
    if (!listing.dbId || !plan) return;
    setBusy(true);
    setError("");
    const row = { listing_id: listing.dbId, plan_id: plan };
    if (useCredit) row.payment_status = "pro_free";
    const { error: err } = await supabase.from("listing_features").insert(row);
    setBusy(false);
    if (err) return setError(trError(err));
    onDone(useCredit ? "PRO hakkınla başvurun alındı. Onaylandığında ilanın öne çıkacak. 💎" : "Başvurun alındı. Onaylandığında ilanın öne çıkacak.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black"><Pin size={18} fill="currentColor" className="text-amber-600" /> İlanı öne çıkar</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">“{listing.title}” ilanın akışta ve ilan listesinde üst sıralarda, “Öne çıkan” etiketiyle görünür.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {plans.map((item) => (
            <button key={item.id} onClick={() => setPlan(item.id)} className={"rounded-2xl border p-4 text-left transition " + (plan === item.id ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:bg-slate-50")}>
              <div className="text-sm font-black text-slate-900">{item.days} gün</div>
              <div className="mt-1 text-2xl font-black text-amber-600">{useCredit ? <><span className="mr-1.5 text-base text-slate-400 line-through">{Number(item.price).toLocaleString("tr-TR")} TL</span>Ücretsiz</> : Number(item.price).toLocaleString("tr-TR") + " TL"}</div>
            </button>
          ))}
          {plans.length === 0 && <div className="col-span-2 py-6 text-center text-sm text-slate-400">Paketler yükleniyor…</div>}
        </div>
        {proStatus && (proStatus.pro || proStatus.features_balance > 0) && (
          <label className={"mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm " + (proStatus.features_left > 0 ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50" : "border-slate-200 bg-slate-50 opacity-70")}>
            <input type="checkbox" checked={useCredit} disabled={proStatus.features_left < 1} onChange={(event) => setUseCredit(event.target.checked)} className="h-4 w-4 accent-amber-500" />
            <span className="flex-1"><b className="flex items-center gap-1.5">PRO ücretsiz hakkımı kullan <ProBadge /></b><span className="text-xs text-slate-500">{proStatus.features_left > 0 ? "Biriken hakkın: " + (proStatus.features_balance ?? proStatus.features_left) + " · bu ay " + proStatus.features_left + " tanesini kullanabilirsin." : (proStatus.features_balance > 0 ? "Bu ayki kullanım sınırına ulaştın (30 günde 2). Biriken " + proStatus.features_balance + " hakkın silinmez." : "Ücretsiz öne çıkarma hakkın kalmadı.")}</span></span>
          </label>
        )}
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          Başvurular yönetici onayından sonra yayına girer. <b>Ödeme sistemi deneme aşamasında:</b> şu an kartından ücret alınmaz.
        </div>
        {error && <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Vazgeç</button>
          <button onClick={apply} disabled={busy || !plan} className="flex-1 rounded-full bg-amber-500 px-4 py-3 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">{busy ? "Gönderiliyor…" : "Başvur"}</button>
        </div>
      </div>
    </div>
  );
}

const MAX_LISTING_PHOTOS = 6;

function AddListingModal({ auth, listing = null, republish = false, species = null, onClose, onCreated }) {
  const raw = listing?.raw || null;
  const [type, setType] = useState(raw ? listing.type : "Satıyorum");
  const [category, setCategory] = useState(raw ? raw.category : species && species.kind === "plant" ? "Bitki" : "Canlı");
  const [selectedOptions, setSelectedOptions] = useState(raw ? raw.tags || [] : []);
  const [allowOffer, setAllowOffer] = useState(raw ? raw.allow_offer : true);
  const [title, setTitle] = useState(raw ? raw.title : species ? species.name : "");
  const [description, setDescription] = useState(raw ? raw.description || "" : "");
  const [price, setPrice] = useState(raw && raw.price != null ? String(Number(raw.price)) : "");
  const [youtube, setYoutube] = useState(raw ? raw.youtube_url || "" : "");
  const [city, setCity] = useState(raw ? raw.city : auth.profile?.city && TR_CITIES.includes(auth.profile.city) ? auth.profile.city : "");
  const [district, setDistrict] = useState(raw ? raw.district || "" : auth.profile?.district || "");
  const [neighborhood, setNeighborhood] = useState(raw ? raw.neighborhood || "" : "");
  const [photos, setPhotos] = useState(() => (raw ? (raw.images || []).map((url) => ({ url, remote: true })) : [])); // { file?, url, remote? }
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const options = categoryOptions[category] || [];
  const districtOptions = Object.keys(locations[city] || {});
  const neighborhoodOptions = (locations[city] || {})[district] || [];

  useEffect(() => () => photos.forEach((photo) => !photo.remote && URL.revokeObjectURL(photo.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const valid = files.filter((file) => /^image\//.test(file.type));
    if (valid.length < files.length) setError("Yalnızca fotoğraf yükleyebilirsin.");
    setPhotos((prev) => [...prev, ...valid.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_LISTING_PHOTOS));
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function makeCover(index) {
    setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  }

  async function submit() {
    setError("");
    if (title.trim().length < 5) return setError("Başlık en az 5 karakter olmalı.");
    if (!city) return setError("İl seçmelisin.");
    if (youtube && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtube.trim())) return setError("YouTube bağlantısı geçerli görünmüyor.");
    const numericPrice = type === "Satıyorum" && price.trim() ? Number(price.replace(/[^\d,]/g, "").replace(",", ".")) : null;
    if (type === "Satıyorum" && !numericPrice && !allowOffer) return setError("Fiyat yaz ya da “Teklif ver” seçeneğini aç.");
    try {
      const fresh = photos.filter((photo) => !photo.remote);
      let uploaded = [];
      if (fresh.length) {
        setBusy("Fotoğraflar yükleniyor (0/" + fresh.length + ")…");
        uploaded = await uploadListingImages(auth.user.id, fresh.map((photo) => photo.file), (done, total) => setBusy("Fotoğraflar yükleniyor (" + done + "/" + total + ")…"));
      }
      let next = 0;
      const images = photos.map((photo) => (photo.remote ? photo.url : uploaded[next++]));
      setBusy(raw ? "Kaydediliyor…" : "İlan yayınlanıyor…");
      const fields = {
          title: title.trim(),
          description: description.trim(),
          category,
          tags: selectedOptions,
          type: TR_TO_TYPE[type],
          city,
          district: district.trim() || null,
          neighborhood: neighborhood.trim() || null,
          price: numericPrice,
          allow_offer: type === "Satıyorum" ? allowOffer : false,
          youtube_url: youtube.trim() || null,
          images,
          species_slugs: Array.from(new Set([...detectSpecies(title + " " + description), ...(species ? [species.slug] : [])]))
      };
      if (republish) {
        fields.status = "active";
        fields.expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
      }
      const request = raw ? supabase.from("listings").update(fields).eq("id", raw.id) : supabase.from("listings").insert(fields);
      const { data, error: err } = await request.select().single();
      if (err) throw err;
      onCreated(data);
    } catch (err) {
      setError(trError(err));
    } finally {
      setBusy("");
    }
  }

  const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-800 focus:bg-white";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-xl font-black">{republish ? "İlanı güncelle ve tekrar yayınla" : raw ? "İlanı düzenle" : "İlan ekle"}</h2>
            <p className="text-sm text-slate-500">Fotoğraf, başlık, açıklama, kategori ve konum yeterli. Alt seçenekler isteğe bağlı.</p>
          </div>
          <button onClick={onClose} disabled={Boolean(busy)} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addPhotos} />
            {photos.length === 0 ? (
              <button type="button" onClick={() => fileRef.current.click()} className="grid h-36 place-items-center rounded-[26px] border-2 border-dashed border-slate-300 bg-slate-50 text-center text-slate-500 hover:border-cyan-700 hover:text-cyan-800">
                <div><Camera className="mx-auto mb-2" size={28} /><strong>Fotoğraf ekle</strong><p className="mt-1 text-xs">En fazla {MAX_LISTING_PHOTOS} fotoğraf · ilki vitrin olur</p></div>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {photos.map((photo, index) => (
                  <div key={photo.url} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute left-1 top-1 rounded-full bg-cyan-950 px-2 py-0.5 text-[12px] font-black text-white">Vitrin</span>
                    ) : (
                      <button type="button" onClick={() => makeCover(index)} className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-black text-slate-700">Vitrin yap</button>
                    )}
                    <button type="button" onClick={() => removePhoto(index)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-950/70 text-white" title="Kaldır"><X size={13} /></button>
                  </div>
                ))}
                {photos.length < MAX_LISTING_PHOTOS && (
                  <button type="button" onClick={() => fileRef.current.click()} className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-cyan-700 hover:text-cyan-800" title="Fotoğraf ekle"><Plus size={22} /></button>
                )}
              </div>
            )}
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className={input} placeholder="Başlık (ör. Kendi üretimim genç Brichardi kolonisi)" />
            <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} className={input} placeholder="Açıklama: adet, boy, durum, takas, teslimat ve diğer notlar." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="İlan tipi" value={type} onChange={setType} options={listingTypes.filter((x) => x !== "Tümü")} />
              <Select label="Kategori" value={category} onChange={(value) => { setCategory(value); setSelectedOptions([]); }} options={categories.filter((x) => x !== "Tümü")} />
              {type === "Satıyorum" && (
                <label>
                  <span className="mb-1 block text-xs font-black text-slate-500">Fiyat (TL)</span>
                  <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d.,]/g, ""))} className={input} placeholder={allowOffer ? "Boş bırakırsan “Teklif ver” görünür" : "Ör. 750"} />
                </label>
              )}
              <Select label="İl" value={city} onChange={(value) => { setCity(value); setDistrict(""); setNeighborhood(""); }} options={TR_CITIES} placeholder="İl seç" />
              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">İlçe (isteğe bağlı)</span>
                <input list="add-listing-districts" value={district} onChange={(event) => { setDistrict(event.target.value); setNeighborhood(""); }} maxLength={40} className={input} placeholder="İlçe" />
                <datalist id="add-listing-districts">{districtOptions.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              <label>
                <span className="mb-1 block text-xs font-black text-slate-500">Mahalle (isteğe bağlı)</span>
                <input list="add-listing-hoods" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} maxLength={60} className={input} placeholder="Mahalle" />
                <datalist id="add-listing-hoods">{neighborhoodOptions.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
            </div>
            {type === "Satıyorum" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-950">
                <input type="checkbox" checked={allowOffer} onChange={(event) => setAllowOffer(event.target.checked)} className="mt-0.5" />
                <span><strong>Teklif ver seçeneği açık</strong><br /><span className="text-cyan-800/80">Fiyat yazmasan bile ilanda “Teklif ver” görünür.</span></span>
              </label>
            )}
            <MultiSelectChips label={category + " için isteğe bağlı seçenekler"} options={options} selected={selectedOptions} onChange={setSelectedOptions} />
            <input value={youtube} onChange={(event) => setYoutube(event.target.value)} className={input} placeholder="YouTube bağlantısı (isteğe bağlı)" />
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
          {error && <div className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-slate-500">İlanın hemen yayına girer ve 30 gün yayında kalır. Kurallara aykırı ilanlar şikâyet üzerine kaldırılır.</p>
            <button onClick={submit} disabled={Boolean(busy)} className="shrink-0 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{busy || (republish ? "Tekrar yayınla" : raw ? "Kaydet" : "Yayınla")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgoTr(value) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "şimdi";
  if (min < 60) return min + " dk";
  const hours = Math.floor(min / 60);
  if (hours < 24) return hours + " sa";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + " g";
  return new Date(value).toLocaleDateString("tr-TR");
}

// "Aquagram Ekibi" mesajının tam metni (bildirimde yalnızca ilk 280 karakter durur)
function TeamMessageModal({ item, onClose }) {
  const [body, setBody] = useState(item.body || "");
  useEffect(() => {
    let cancelled = false;
    if (item.team_message_id) {
      supabase.from("team_messages").select("body").eq("id", item.team_message_id).maybeSingle().then(({ data }) => {
        if (!cancelled && data && data.body) setBody(data.body);
      });
    }
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
  }, [item, onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-[10vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Aquagram Ekibi mesajı" className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <AquagramMark className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-black text-slate-900">Aquagram Ekibi <BadgeCheck size={16} className="text-cyan-600" /></p>
            <p className="text-xs font-bold text-slate-400">{new Date(item.created_at).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" })}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Kapat"><X size={19} /></button>
        </div>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">{body}</p>
        <p className="mt-5 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">Bu mesaja buradan yanıt verilemez. Bize yazmak için sayfanın altındaki <strong>Bize ulaşın</strong> formunu kullanabilirsin.</p>
      </div>
    </div>,
    document.body
  );
}

// Bildirim reklamı: bildirime dokununca açılan reklam kartı (çarpıyla kapanır)
function NotificationAdModal({ ad, onClose }) {
  useAdImpression(ad);
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <NotificationAdCard ad={ad} onClose={onClose} />
    </div>,
    document.body
  );
}

function NotificationAdCard({ ad, onClose, preview = false }) {
  return (
    <div role="dialog" aria-label={"Reklam: " + ad.title} className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-slate-950/60 text-white backdrop-blur hover:bg-slate-950/80" title="Kapat" aria-label="Kapat"><X size={18} /></button>
      <div className="aspect-[16/10] w-full bg-amber-100"><AdImage ad={ad} /></div>
      <div className="p-5">
        <div className="mb-1.5 flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Reklam</span>
          <span className="truncate text-[13px] font-black text-amber-800">{ad.brand}</span>
        </div>
        <h3 className="text-xl font-black leading-snug text-slate-950">{ad.title}</h3>
        {ad.text && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{ad.text}</p>}
        {ad.url ? (
          <button type="button" onClick={() => !preview && openAd(ad)} className="mt-4 w-full rounded-full bg-amber-500 py-3 text-sm font-black text-white hover:bg-amber-600">{ad.cta || "İncele"}</button>
        ) : (
          <button type="button" onClick={onClose} className="mt-4 w-full rounded-full bg-slate-100 py-3 text-sm font-black text-slate-700 hover:bg-slate-200">Kapat</button>
        )}
      </div>
    </div>
  );
}

// Bildirim listesindeki reklam satırı (Reklamlarım önizlemesinde de kullanılır)
function NotificationAdRow({ ad, unread = true, onOpen, onRemove, time = "şimdi" }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter") onOpen && onOpen(); }} className={"flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition hover:bg-amber-50 " + (unread ? "bg-amber-50/60" : "")}>
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-amber-100"><AdImage ad={ad} /></span>
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 flex min-w-0 items-center gap-1.5 text-xs font-black">
          <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] uppercase tracking-[0.1em] text-amber-800">Sponsorlu</span>
          <span className="truncate text-amber-800">{ad.brand}</span>
        </span>
        <span className="line-clamp-2 block text-sm font-bold leading-snug text-slate-800">{ad.title}</span>
        <span className="mt-1 block text-xs font-bold text-slate-400">{time} · dokun ve incele</span>
      </span>
      {onRemove && (
        <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Bildirimi kaldır" aria-label="Bildirimi kaldır"><X size={16} /></button>
      )}
    </div>
  );
}

function NotificationsPage({ notifs, onOpen, onProfile }) {
  const [teamMessage, setTeamMessage] = useState(null);
  const [adOpen, setAdOpen] = useState(null);
  const [sound, setSound] = useState(soundEnabled);
  const icons = { post_like: "❤️", post_comment: "💬", comment_like: "👍", feature_approved: "📌", feature_rejected: "⚠️", group_join: "👋", review: "⭐", system: "🔔", content_removed: "🛡️", content_restored: "✅", ad_approved: "📣", ad_rejected: "⚠️", account_suspended: "⛔", account_restored: "✅", report_resolved: "🛡️", group_closed: "🔒", group_reopened: "🔓", verification_approved: "✔️", verification_rejected: "⚠️", suggestion_approved: "🐟", suggestion_rejected: "🐟", form_suggestion_approved: "📍", form_suggestion_rejected: "📍", team_message: "📨" };
  return (
    <div className="mx-auto max-w-2xl p-5">
      {teamMessage && <TeamMessageModal item={teamMessage} onClose={() => setTeamMessage(null)} />}
      {adOpen && <NotificationAdModal ad={adOpen} onClose={() => setAdOpen(null)} />}
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Bildirimler</h2>
          <p className="mt-1 text-sm text-slate-500">Beğeniler, yorumlar, grup katılımları ve ilan başvuruların.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => { const next = !sound; setSound(next); setSoundEnabled(next); if (next) playNotificationSound(true); }}
            className={"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black " + (sound ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
            title="Site açıkken yeni bildirim gelince kısa bir ses çalar"
          >
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} Ses {sound ? "açık" : "kapalı"}
          </button>
          {notifs.unread > 0 && (
            <button onClick={notifs.markAllRead} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50">Tümünü okundu say</button>
          )}
        </div>
      </div>
      {notifs.items.length === 0 ? (
        <div className="rounded-[24px] bg-slate-50 p-10 text-center">
          <Bell className="mx-auto mb-3 text-slate-300" size={32} />
          <div className="font-black text-slate-700">Henüz bildirimin yok</div>
          <p className="mt-1 text-sm text-slate-500">Paylaşımların beğenildiğinde ya da yorum aldığında burada göreceksin.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          {notifs.items.map((item) => item.type === "ad_notice" ? (
            item.ad ? (
              <NotificationAdRow key={item.id} ad={mapAd(item.ad)} unread={!item.read_at} time={timeAgoTr(item.created_at)} onOpen={() => setAdOpen(mapAd(item.ad))} onRemove={() => notifs.remove(item.id)} />
            ) : (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400">
                <span className="flex-1">Bu sponsorlu içeriğin yayın süresi doldu.</span>
                <button type="button" onClick={() => notifs.remove(item.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100" title="Bildirimi kaldır" aria-label="Bildirimi kaldır"><X size={16} /></button>
              </div>
            )
          ) : (
            <button key={item.id} onClick={() => (item.type === "team_message" ? setTeamMessage(item) : onOpen(item))} className={"flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 " + (item.read_at ? "" : "bg-cyan-50/60")}>
              <span
                onClick={(event) => { if (item.actor) { event.stopPropagation(); onProfile(item.actor); } }}
                className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-950 text-sm font-black text-white"
              >
                {item.type === "team_message" ? <AquagramMark className="h-10 w-10 rounded-full" /> : item.actor && item.actor.avatar_url ? <img src={item.actor.avatar_url} alt="" className="h-full w-full object-cover" /> : (item.actor ? item.actor.username.slice(0, 1).toUpperCase() : "A")}
                <span className="absolute -bottom-0.5 -right-0.5 text-sm">{icons[item.type] || "🔔"}</span>
              </span>
              <span className="min-w-0 flex-1">
                {item.type === "team_message" && <span className="mb-0.5 flex items-center gap-1 text-sm font-black text-slate-900">Aquagram Ekibi <BadgeCheck size={14} className="text-cyan-600" /></span>}
                <span className={"block text-sm leading-snug text-slate-800 " + (item.type === "team_message" ? "line-clamp-2" : "")}>{notificationText(item)}</span>
                {item.post && item.post.text && item.type !== "post_comment" && <span className="mt-0.5 line-clamp-1 block text-xs text-slate-500">“{item.post.text}”</span>}
                <span className="mt-1 block text-xs font-bold text-slate-400">{timeAgoTr(item.created_at)}</span>
              </span>
              {!item.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
