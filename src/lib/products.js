// Ürünler ve markalar: hafif katalog (tek sefer yüklenir, tüm sayfalar paylaşır), ürün ayrıntısı,
// paylaşım metinlerinde geçen ürünleri tanıma (model kodu, ürün adı, anahtar kelime — çıplak marka adı değil).
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const BRAND_COLS = "id, slug, name, logo_url, description, country, website, distributor, keywords, status, created_at";
const PRODUCT_LIGHT_COLS = "id, slug, brand_id, category_id, name, model_code, keywords, images, rating_avg, rating_count, status, created_at";
const PRODUCT_DETAIL_COLS = "id, description, facts, videos";

const lower = (text) => (text || "").toLocaleLowerCase("tr");
export const foldTr = (text) => lower(text).replace(/ı/g, "i");
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function slugifyTr(text) {
  const table = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  return lower(text)
    .replace(/[çğıöşüâîû]/g, (ch) => table[ch])
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function mapBrand(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logo: row.logo_url || "",
    desc: row.description || "",
    country: row.country || "",
    website: row.website || "",
    distributor: row.distributor && typeof row.distributor === "object" ? row.distributor : {},
    keywords: row.keywords || [],
    status: row.status,
    verified: false
  };
}

export function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    brandId: row.brand_id,
    category: row.category_id,
    name: row.name,
    model: row.model_code || "",
    keywords: row.keywords || [],
    images: (row.images || []).filter(Boolean),
    rating: Number(row.rating_avg) || 0,
    ratingCount: row.rating_count || 0,
    status: row.status,
    addedAt: row.created_at ? new Date(row.created_at).getTime() : 0
  };
}

/* ---------------- Tanıma ---------------- */
// Ürün adı (marka adı çıkarılmış hâli de), model kodu ve anahtar kelimeler. Kısa ifadeler tam kelime.
const matcher = (word) => {
  const w = escapeRe(foldTr(word).replace(/['’]/g, "").trim());
  return new RegExp("(^|[^\\p{L}\\p{N}])" + w + "(?![\\p{L}\\p{N}])", "u");
};

function buildMatchers(products, brandsById) {
  return products.map((item) => {
    const brand = brandsById[item.brandId];
    const words = new Set();
    const add = (word) => {
      const clean = String(word || "").trim();
      if (clean.length >= 4) words.add(clean);
    };
    add(item.name);
    if (brand && foldTr(item.name).startsWith(foldTr(brand.name) + " ")) add(item.name.slice(brand.name.length + 1));
    if (item.model) {
      add(item.model);
      if (brand) add(brand.name + " " + item.model);
    }
    (item.keywords || []).forEach(add);
    return { slug: item.slug, patterns: Array.from(words).map(matcher) };
  });
}

/* ---------------- Paylaşılan katalog ---------------- */
const store = {
  loaded: false,
  loading: null,
  categories: [],
  brands: [],
  products: [],
  brandsById: {},
  brandOwners: {},
  brandsBySlug: {},
  productsBySlug: {},
  details: {},
  matchers: [],
  listeners: new Set()
};

function emit() {
  store.version = (store.version || 0) + 1;
  store.listeners.forEach((fn) => fn(store.version));
}

export async function loadCatalog(force = false) {
  if (store.loading && !force) return store.loading;
  store.loading = (async () => {
    const [cats, brands, products, accounts] = await Promise.all([
      supabase.from("product_categories").select("id, name, emoji, description, position").order("position"),
      supabase.from("brands").select(BRAND_COLS).order("name"),
      supabase.from("products").select(PRODUCT_LIGHT_COLS).order("name"),
      supabase.from("brand_accounts").select("brand_id, owner_id")
    ]);
    if (cats.error || brands.error || products.error) {
      store.loading = null;
      throw cats.error || brands.error || products.error;
    }
    store.brandOwners = Object.fromEntries((accounts.data || []).map((row) => [row.brand_id, row.owner_id]));
    store.categories = cats.data || [];
    store.brands = (brands.data || []).map((row) => ({ ...mapBrand(row), verified: Boolean(store.brandOwners[row.id]) }));
    store.products = (products.data || []).map(mapProduct);
    store.brandsById = Object.fromEntries(store.brands.map((row) => [row.id, row]));
    store.brandsBySlug = Object.fromEntries(store.brands.map((row) => [row.slug, row]));
    store.productsBySlug = Object.fromEntries(store.products.map((row) => [row.slug, row]));
    store.matchers = buildMatchers(store.products.filter((row) => row.status === "published"), store.brandsById);
    store.loaded = true;
    emit();
    return store;
  })();
  return store.loading;
}

export function useCatalog(enabled = true) {
  const [, setVersion] = useState(0);
  const [error, setError] = useState(null);
  useEffect(() => {
    store.listeners.add(setVersion);
    if (enabled && !store.loaded) loadCatalog().catch(setError);
    return () => store.listeners.delete(setVersion);
  }, [enabled]);
  return { ...store, error, reload: () => loadCatalog(true).catch(setError) };
}

export function catalogSnapshot() {
  return store;
}

export async function loadProductDetails(id) {
  if (store.details[id]) return store.details[id];
  const { data, error } = await supabase.from("products").select(PRODUCT_DETAIL_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  const details = {
    desc: (data && data.description) || "",
    facts: Array.isArray(data && data.facts) ? data.facts.filter((pair) => Array.isArray(pair) && pair[0]) : [],
    videos: Array.isArray(data && data.videos) ? data.videos.filter((video) => video && /^[A-Za-z0-9_-]{11}$/.test(video.id)) : []
  };
  store.details[id] = details;
  return details;
}

export function forgetProductDetails(id) {
  delete store.details[id];
}

// Metinde geçen yayındaki ürünler (slug listesi)
export function detectProducts(text) {
  const hay = foldTr(text).replace(/['’]/g, "").replace(/_/g, " ");
  if (!hay.trim() || !store.matchers.length) return [];
  return store.matchers.filter((m) => m.patterns.some((re) => re.test(hay))).map((m) => m.slug);
}

export function productBySlug(slug) {
  return store.productsBySlug[slug] || null;
}

// Bir paylaşımın bu ürünle ilgili olup olmadığı: kayıtlı ürünler ya da metinden tanıma
export function relatedPostsForProduct(posts, slug) {
  return posts.filter((post) => (post.productSlugs || []).includes(slug) || detectProducts(post.text || "").includes(slug));
}

// YouTube bağlantısından video kimliği
export function youtubeId(url) {
  const text = String(url || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  const m = text.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Her açılışta farklı (rastgele) sıra; aynı oturumda kararlı
const SEED = Math.random();
export function shuffled(list, key = (item) => item.slug) {
  const score = (value) => {
    let h = 0;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
    const x = Math.sin(h * 0.0001 + SEED * 1000) * 10000;
    return x - Math.floor(x);
  };
  return list.slice().sort((a, b) => score(key(a)) - score(key(b)));
}

export const USAGE_PERIODS = ["1 aydan az", "1–6 ay", "6–12 ay", "1–2 yıl", "2 yıldan fazla"];

// /urunler, /urunler/k/<kategori>, /markalar, /marka/<ad>, /urun/<ad>
export function parseProductRoute(path) {
  if (path === "/urunler") return { home: true };
  if (path === "/markalar") return { brands: true };
  const cat = path.match(/^\/urunler\/k\/([^/]+)$/);
  if (cat) return { category: decodeURIComponent(cat[1]) };
  const brand = path.match(/^\/marka\/([^/]+)$/);
  if (brand) return { brand: decodeURIComponent(brand[1]) };
  const product = path.match(/^\/urun\/([^/]+)$/);
  if (product) return { product: decodeURIComponent(product[1]) };
  return null;
}
