import { useCallback, useEffect, useState } from "react";
import { compressImage, extForType } from "./media-compress";
import { supabase } from "./supabase";

export const TR_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın",
  "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale",
  "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
  "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş",
  "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli",
  "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
  "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Şırnak", "Sivas", "Tekirdağ", "Tokat", "Trabzon",
  "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

// Veritabanı ilan tipi <-> arayüzdeki Türkçe ad
export const TYPE_TO_TR = { sale: "Satıyorum", trade: "Takas", free: "Ücretsiz / Sahiplendirme", wanted: "Arıyorum" };
export const TR_TO_TYPE = Object.fromEntries(Object.entries(TYPE_TO_TR).map(([key, value]) => [value, key]));

// Fotoğrafsız ilanlar için sade yer tutucu görsel
export const LISTING_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cffafe"/><stop offset="1" stop-color="#155e75"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><g fill="none" stroke="#ecfeff" stroke-width="6" stroke-linecap="round" opacity=".85"><path d="M60 205c30-28 60-28 90 0s60 28 90 0 60-28 100-10"/><path d="M60 240c30-28 60-28 90 0s60 28 90 0 60-28 100-10" opacity=".5"/></g><g fill="none" stroke="#ecfeff" stroke-width="5" opacity=".9"><circle cx="250" cy="110" r="16"/><circle cx="285" cy="70" r="9"/><circle cx="225" cy="60" r="6"/></g></svg>'
  );

export function formatPrice(row) {
  if (row.type === "trade") return "Takas";
  if (row.type === "free") return "Ücretsiz";
  if (row.type === "wanted") return "Arıyorum";
  if (row.price == null) return "";
  return Number(row.price).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " TL";
}

// Profil satırını arayüzün kullanıcı nesnesine çevirir
export function profileToUser(profile) {
  const socials = profile.socials || {};
  return {
    id: profile.id,
    real: true,
    username: "@" + profile.username,
    city: profile.city || "",
    bio: profile.bio || "",
    avatar: profile.avatar_url || null,
    verified: Boolean(profile.phone_verified),
    pro: Boolean(profile.pro_until && new Date(profile.pro_until) > new Date()),
    deleted: Boolean(profile.deleted_at) || /^misafir_[0-9a-f]{8}$/.test(String(profile.username || "")),
    joined: profile.created_at ? new Date(profile.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : "",
    lastSeen: "",
    online: false,
    listingsCount: 0,
    socials: { instagram: socials.instagram || "", facebook: socials.facebook || "", x: socials.x || "" },
    reviewStats: { positive: 0, neutral: 0, negative: 0 },
    reviews: []
  };
}

// Veritabanı ilanını arayüzdeki ilan nesnesine çevirir
export function mapListing(row) {
  return {
    id: "db" + row.id,
    dbId: row.id,
    raw: row,
    real: true,
    userId: row.user_id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    tags: row.tags || [],
    type: TYPE_TO_TR[row.type] || "Satıyorum",
    city: row.city,
    district: row.district || "",
    neighborhood: row.neighborhood || "",
    price: formatPrice(row),
    allowOffer: row.allow_offer,
    // Üste taşınan ilan yeni ilan gibi sıralanır
    date: (row.bumped_at || row.created_at || "").slice(0, 10),
    sortAt: new Date(row.bumped_at || row.created_at || 0).getTime(),
    bumpedAt: row.bumped_at && row.bumped_at !== row.created_at ? row.bumped_at : null,
    images: row.images && row.images.length ? row.images : [LISTING_PLACEHOLDER],
    youtube: row.youtube_url || undefined,
    // Süresi geçen ilan, veritabanında henüz "active" olsa bile yayından kalkmış sayılır
    status: row.status === "active" && row.expires_at && new Date(row.expires_at) < new Date() ? "expired" : row.status,
    featured: Boolean(row.featured_until && new Date(row.featured_until) > new Date()),
    speciesSlugs: row.species_slugs || []
  };
}

const SELECT = "*, owner:profiles!listings_user_id_fkey(id, username, city, bio, avatar_url, phone_verified, socials, created_at, pro_until)";

// Yayındaki ilanlar + giriş yapan üyenin kendi ilanları (her durumda)
export function useDbListings(userId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    let request = supabase.from("listings").select(SELECT).order("bumped_at", { ascending: false }).limit(500);
    request = userId ? request.or("status.eq.active,user_id.eq." + userId) : request.eq("status", "active");
    const { data, error: err } = await request;
    if (err) setError(err);
    else {
      setRows(data || []);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, error, reload };
}

// Fotoğrafları yüklemeden önce küçültür ve WebP'ye çevirir (kalite ortak ayardan, %78)
export async function shrinkImage(file, maxSide = 1600) {
  return compressImage(file, maxSide);
}

export async function uploadListingImages(userId, files, onProgress) {
  const urls = [];
  for (let index = 0; index < files.length; index += 1) {
    const blob = await shrinkImage(files[index]);
    const type = blob.type || "image/jpeg";
    const ext = extForType(type);
    const path = userId + "/listings/" + Date.now() + "-" + index + "." + ext;
    const { error } = await supabase.storage.from("listing-media").upload(path, blob, { contentType: type });
    if (error) throw error;
    urls.push(supabase.storage.from("listing-media").getPublicUrl(path).data.publicUrl);
    if (onProgress) onProgress(index + 1, files.length);
  }
  return urls;
}

export async function loadFeaturedPlans() {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "featured_plans").maybeSingle();
  return Array.isArray(data?.value) ? data.value : [];
}
