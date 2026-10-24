// Ürünler: kategoriler, markalar, ürün sayfaları, değerlendirmeler (yıldızlı paylaşımlar), başvurular.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Play,
  Plus,
  Search,
  Star,
  Tag,
  Upload,
  X
} from "lucide-react";
import { Lightbox, PostCard } from "./community.jsx";
import { OfficialBrandBadge, Stars, openProduct } from "./product-bits.jsx";
import {
  detectProducts,
  foldTr,
  loadCatalog,
  loadProductDetails,
  relatedPostsForProduct,
  shuffled,
  slugifyTr,
  useCatalog,
  youtubeId
} from "./lib/products";
import { navigate } from "./lib/router";
import { supabase, trError } from "./lib/supabase";
import { shrinkImage } from "./lib/listings";

/* ------------------------------------------------------------------ */
/* Adresler                                                            */
/* ------------------------------------------------------------------ */

const go = (path) => {
  navigate(path);
  window.scrollTo({ top: 0 });
};
export const openProductsHome = () => go("/urunler");
const openCategory = (id) => go("/urunler/k/" + id);
const openBrands = () => go("/markalar");
const openBrand = (slug) => go("/marka/" + slug);

const TR_COUNT = (n) => Number(n || 0).toLocaleString("tr-TR");
const ratingText = (value) => (Math.round(value * 10) / 10).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const cleanName = (product, brand) => (brand && foldTr(product.name).startsWith(foldTr(brand.name) + " ") ? product.name.slice(brand.name.length + 1) : product.name);
const safeUrl = (url) => (/^https?:\/\//i.test(String(url || "")) ? url : url ? "https://" + url : "");
const hostOf = (url) => {
  try {
    return new URL(safeUrl(url)).hostname.replace(/^www\./, "");
  } catch (err) {
    return url;
  }
};

/* ------------------------------------------------------------------ */
/* Küçük parçalar                                                      */
/* ------------------------------------------------------------------ */

export function ProductImage({ product, category, className = "", contain = true }) {
  const [failed, setFailed] = useState(false);
  const src = product.images && product.images[0];
  if (src && !failed) {
    return (
      <div className={"relative overflow-hidden bg-white " + className}>
        <img src={src} alt={product.name} loading="lazy" onError={() => setFailed(true)} className={"absolute inset-0 h-full w-full " + (contain ? "object-contain p-2" : "object-cover")} />
      </div>
    );
  }
  return (
    <div className={"grid place-items-center bg-gradient-to-br from-sky-50 to-slate-100 text-3xl " + className}>
      <span aria-hidden="true">{(category && category.emoji) || "📦"}</span>
    </div>
  );
}

export function BrandLogo({ brand, size = 44, className = "" }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (brand.logo && !failed) {
    return (
      <span className={"grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 " + className} style={style}>
        <img src={brand.logo} alt={brand.name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain p-1.5" />
      </span>
    );
  }
  return (
    <span className={"grid shrink-0 place-items-center rounded-2xl bg-cyan-950 font-black uppercase text-white " + className} style={{ ...style, fontSize: size * 0.38 }}>
      {brand.name.slice(0, 2)}
    </span>
  );
}

function VerifiedTick({ size = 16 }) {
  return <BadgeCheck size={size} className="shrink-0 text-sky-600" aria-label="Doğrulanmış marka" />;
}

function TopBar({ title, kicker, onBack, right }) {
  return (
    <div className="sticky top-[60px] z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur lg:top-[72px]">
      {onBack && <button onClick={onBack} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Geri" aria-label="Geri"><ArrowLeft size={19} /></button>}
      <div className={"min-w-0 flex-1 " + (onBack ? "" : "px-1")}>
        {kicker && <p className="truncate text-[12px] font-black uppercase tracking-wide text-slate-400">{kicker}</p>}
        <h2 className="truncate text-lg font-black leading-tight text-slate-950">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-sm font-bold text-slate-400">
      <Loader2 size={18} className="animate-spin" /> Yükleniyor…
    </div>
  );
}

function ProductCard({ product, cat, showBrand = true }) {
  const brand = cat.brandsById[product.brandId];
  const category = cat.categories.find((row) => row.id === product.category);
  return (
    <button onClick={() => openProduct(product.slug)} className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white text-left transition hover:border-cyan-300 hover:shadow-sm">
      <ProductImage product={product} category={category} className="aspect-square w-full border-b border-slate-100" />
      <div className="flex min-w-0 flex-1 flex-col p-3">
        {showBrand && brand && <span className="truncate text-[12px] font-black uppercase tracking-wide text-slate-400">{brand.name}</span>}
        <span className="line-clamp-2 text-sm font-black leading-snug text-slate-900 group-hover:text-cyan-900">{cleanName(product, brand)}</span>
        <span className="mt-auto flex items-center gap-1 pt-2 text-[12px] font-bold text-slate-500">
          {product.ratingCount ? (
            <>
              <Stars value={product.rating} size={12} /> <span className="text-slate-700">{ratingText(product.rating)}</span> <span>({product.ratingCount})</span>
            </>
          ) : (
            <span className="text-slate-400">Henüz değerlendirilmedi</span>
          )}
        </span>
      </div>
    </button>
  );
}

function AddTile({ title, text, onClick }) {
  return (
    <button onClick={onClick} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-cyan-200 bg-cyan-50/40 p-4 text-center text-cyan-950 transition hover:border-cyan-400 hover:bg-cyan-50">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-cyan-200"><Plus size={20} /></span>
      <span className="text-sm font-black">{title}</span>
      <span className="text-[12px] leading-snug text-cyan-900/70">{text}</span>
    </button>
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

/* ------------------------------------------------------------------ */
/* Sol menü                                                            */
/* ------------------------------------------------------------------ */

export function ProductsAside({ route, ui }) {
  const cat = useCatalog(true);
  const published = cat.products.filter((row) => row.status === "published");
  const activeCategory = route.category || (route.product && cat.productsBySlug[route.product] ? cat.productsBySlug[route.product].category : null);
  return (
    <aside className="h-fit border-x border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:overflow-auto">
      <button onClick={openProductsHome} className="flex items-center gap-2 text-lg font-black text-slate-950 hover:underline"><Package size={19} /> Ürünler</button>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">Akvaryum ürünleri, markalar ve hobicilerin değerlendirmeleri.</p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-black text-slate-500">Ürün bul</span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-cyan-700 focus-within:bg-white">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input value={ui.search} onChange={(event) => ui.setSearch(event.target.value)} placeholder="Ürün, marka ya da model" className="w-full bg-transparent text-sm outline-none" />
          {ui.search && <button onClick={() => ui.setSearch("")} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200" aria-label="Aramayı temizle"><X size={14} /></button>}
        </div>
      </label>

      <nav className="mt-5 grid gap-0.5">
        {cat.categories.map((row) => (
          <button key={row.id} onClick={() => openCategory(row.id)} className={"flex items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold " + (activeCategory === row.id ? "bg-cyan-50 text-cyan-950" : "text-slate-700 hover:bg-slate-50")}>
            <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true">{row.emoji}</span> <span className="truncate">{row.name}</span></span>
            <span className="text-[12px] text-slate-400">{published.filter((item) => item.category === row.id).length || ""}</span>
          </button>
        ))}
      </nav>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <button onClick={openBrands} className={"flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-black " + (route.brands || route.brand ? "bg-cyan-50 text-cyan-950" : "text-slate-700 hover:bg-slate-50")}>
          <span className="flex items-center gap-2"><Building2 size={16} /> Markalar</span>
          <span className="text-[12px] text-slate-400">{cat.brands.filter((row) => row.status === "published").length || ""}</span>
        </button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Sayfa seçici                                                        */
/* ------------------------------------------------------------------ */

export function ProductsMain({ route, ui, ctx, posts, listings }) {
  const cat = useCatalog(true);
  const [modal, setModal] = useState(null); // { kind: "brand" | "product" | "claim" | "video", ... }

  if (!cat.loaded) return cat.error ? <p className="p-10 text-center text-sm font-bold text-rose-600">{trError(cat.error)}</p> : <Loading />;

  const actions = {
    addBrand: () => (ctx.isMember ? setModal({ kind: "brand" }) : ctx.onAuth()),
    addProduct: (preset = {}) => (ctx.isMember ? setModal({ kind: "product", ...preset }) : ctx.onAuth()),
    claim: (brand) => (ctx.isMember ? setModal({ kind: "claim", brand }) : ctx.onAuth()),
    suggestVideo: (product) => (ctx.isMember ? setModal({ kind: "video", product }) : ctx.onAuth())
  };

  let page;
  if (ui.search.trim() && !route.product && !route.brand) page = <SearchResults query={ui.search} cat={cat} />;
  else if (route.product) {
    const product = cat.productsBySlug[route.product];
    page = product ? <ProductPage key={product.slug} product={product} cat={cat} ctx={ctx} posts={posts} listings={listings} actions={actions} /> : <NotFound text="Ürün bulunamadı" />;
  } else if (route.brand) {
    const brand = cat.brandsBySlug[route.brand];
    page = brand ? <BrandPage key={brand.slug} brand={brand} cat={cat} ctx={ctx} actions={actions} /> : <NotFound text="Marka bulunamadı" />;
  } else if (route.brands) page = <BrandsPage cat={cat} actions={actions} />;
  else if (route.category) {
    const category = cat.categories.find((row) => row.id === route.category);
    page = category ? <CategoryPage key={category.id} category={category} cat={cat} actions={actions} /> : <NotFound text="Kategori bulunamadı" />;
  } else page = <ProductsHome cat={cat} actions={actions} />;

  return (
    <>
      {page}
      {modal && modal.kind === "brand" && <BrandSubmitModal ctx={ctx} onClose={() => setModal(null)} />}
      {modal && modal.kind === "product" && <ProductSubmitModal ctx={ctx} cat={cat} preset={modal} onClose={() => setModal(null)} />}
      {modal && modal.kind === "claim" && <ClaimModal ctx={ctx} brand={modal.brand} onClose={() => setModal(null)} />}
      {modal && modal.kind === "video" && <VideoModal ctx={ctx} product={modal.product} onClose={() => setModal(null)} />}
    </>
  );
}

function NotFound({ text }) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-black">{text}</h2>
      <p className="mt-2 text-sm text-slate-500">Kaldırılmış ya da bağlantı hatalı olabilir.</p>
      <button onClick={openProductsHome} className="mt-5 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Ürünlere dön</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ana sayfa                                                           */
/* ------------------------------------------------------------------ */

function ProductsHome({ cat, actions }) {
  const published = cat.products.filter((row) => row.status === "published");
  const brands = useMemo(() => shuffled(cat.brands.filter((row) => row.status === "published")), [cat.brands]);
  const top = published.filter((row) => row.ratingCount > 0).sort((a, b) => b.ratingCount - a.ratingCount || b.rating - a.rating).slice(0, 8);
  const fresh = published.slice().sort((a, b) => b.addedAt - a.addedAt).slice(0, 8);
  return (
    <div>
      <TopBar title="Ürünler" kicker="Aquagram" />
      <div className="p-4">
        <p className="text-sm leading-relaxed text-slate-600">Filtreden yeme, testten ısıtıcıya: hobicilerin gerçek deneyimleri, puanları ve inceleme videoları.</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {cat.categories.map((row) => {
            const count = published.filter((item) => item.category === row.id).length;
            return (
              <button key={row.id} onClick={() => openCategory(row.id)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-xl" aria-hidden="true">{row.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-900">{row.name}</span>
                  <span className="text-[12px] font-bold text-slate-400">{count ? count + " ürün" : "Yakında"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="border-t border-slate-200 py-4">
        <div className="mb-3 flex items-center justify-between px-4">
          <h3 className="text-base font-black text-slate-900">Markalar</h3>
          <button onClick={openBrands} className="text-sm font-black text-cyan-800 hover:underline">Tümü →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {brands.map((brand) => (
            <button key={brand.slug} onClick={() => openBrand(brand.slug)} className="flex w-[84px] shrink-0 flex-col items-center gap-1.5 text-center">
              <BrandLogo brand={brand} size={64} />
              <span className="flex max-w-full items-center gap-0.5 truncate text-[12px] font-black text-slate-700">{brand.name}{brand.verified && <VerifiedTick size={12} />}</span>
            </button>
          ))}
          <button onClick={actions.addBrand} className="flex w-[84px] shrink-0 flex-col items-center gap-1.5 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-dashed border-cyan-200 text-cyan-900"><Plus size={22} /></span>
            <span className="text-[12px] font-black text-cyan-900">Marka ekle</span>
          </button>
        </div>
      </section>

      {top.length > 0 && (
        <section className="border-t border-slate-200 p-4">
          <h3 className="mb-3 text-base font-black text-slate-900">En çok değerlendirilenler</h3>
          <div className={GRID}>{top.map((row) => <ProductCard key={row.slug} product={row} cat={cat} />)}</div>
        </section>
      )}
      <section className="border-t border-slate-200 p-4">
        <h3 className="mb-3 text-base font-black text-slate-900">Yeni eklenenler</h3>
        <div className={GRID}>
          {fresh.map((row) => <ProductCard key={row.slug} product={row} cat={cat} />)}
          <AddTile title="Ürün ekle" text="Kendi ürününü ya da listede olmayan bir ürünü ekle." onClick={() => actions.addProduct()} />
        </div>
      </section>
    </div>
  );
}

function SearchResults({ query, cat }) {
  const q = foldTr(query.trim());
  const words = q.split(/\s+/).filter(Boolean);
  const products = cat.products.filter((row) => {
    if (row.status !== "published") return false;
    const brand = cat.brandsById[row.brandId];
    const hay = foldTr([brand && brand.name, row.name, row.model, ...(row.keywords || [])].join(" "));
    return words.every((word) => hay.includes(word));
  });
  const brands = cat.brands.filter((row) => row.status === "published" && foldTr(row.name).includes(q));
  return (
    <div>
      <TopBar title={"“" + query.trim() + "” için sonuçlar"} kicker="Ürünler" />
      {brands.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          {brands.map((brand) => (
            <button key={brand.slug} onClick={() => openBrand(brand.slug)} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
              <BrandLogo brand={brand} size={28} className="rounded-full" /> {brand.name}
            </button>
          ))}
        </div>
      )}
      <div className="p-4">
        {products.length ? <div className={GRID}>{products.map((row) => <ProductCard key={row.slug} product={row} cat={cat} />)}</div> : <p className="py-8 text-center text-sm font-semibold text-slate-400">Bu aramayla eşleşen ürün yok.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kategori                                                            */
/* ------------------------------------------------------------------ */

function CategoryPage({ category, cat, actions }) {
  const [brandId, setBrandId] = useState(null);
  const [sort, setSort] = useState("rating");
  const all = cat.products.filter((row) => row.status === "published" && row.category === category.id);
  const brandIds = Array.from(new Set(all.map((row) => row.brandId)));
  const list = all
    .filter((row) => !brandId || row.brandId === brandId)
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "tr") : sort === "new" ? b.addedAt - a.addedAt : b.ratingCount - a.ratingCount || b.rating - a.rating || a.name.localeCompare(b.name, "tr")));
  return (
    <div>
      <TopBar title={category.emoji + " " + category.name} kicker="Ürünler" onBack={openProductsHome} />
      <div className="px-4 pt-3">
        {category.description && <p className="text-sm text-slate-500">{category.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button onClick={() => setBrandId(null)} className={"rounded-full px-3 py-1 text-xs font-black ring-1 " + (!brandId ? "bg-cyan-950 text-white ring-cyan-950" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>Tüm markalar</button>
          {brandIds.map((id) => cat.brandsById[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "tr")).map((brand) => (
            <button key={brand.id} onClick={() => setBrandId(brand.id === brandId ? null : brand.id)} className={"rounded-full px-3 py-1 text-xs font-black ring-1 " + (brandId === brand.id ? "bg-cyan-950 text-white ring-cyan-950" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
              {brand.name}
            </button>
          ))}
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 outline-none" aria-label="Sıralama">
            <option value="rating">En çok değerlendirilen</option>
            <option value="new">En yeni</option>
            <option value="name">Ada göre</option>
          </select>
        </div>
      </div>
      <div className="p-4">
        <div className={GRID}>
          {list.map((row) => <ProductCard key={row.slug} product={row} cat={cat} />)}
          <AddTile title="Ürün ekle" text={"Listede olmayan bir " + category.name.toLocaleLowerCase("tr") + " ürünü ekle."} onClick={() => actions.addProduct({ category: category.id })} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Markalar                                                            */
/* ------------------------------------------------------------------ */

function BrandsPage({ cat, actions }) {
  const brands = useMemo(() => shuffled(cat.brands.filter((row) => row.status === "published")), [cat.brands]);
  const count = (brand) => cat.products.filter((row) => row.status === "published" && row.brandId === brand.id).length;
  return (
    <div>
      <TopBar title="Markalar" kicker="Ürünler" onBack={openProductsHome} />
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4">
        {brands.map((brand) => (
          <button key={brand.slug} onClick={() => openBrand(brand.slug)} className="flex flex-col items-center gap-2 rounded-[22px] border border-slate-200 bg-white p-4 text-center transition hover:border-cyan-300 hover:shadow-sm">
            <BrandLogo brand={brand} size={72} />
            <span className="flex max-w-full items-center gap-1 truncate text-sm font-black text-slate-900">{brand.name}{brand.verified && <VerifiedTick size={14} />}</span>
            <span className="text-[12px] font-bold text-slate-400">{count(brand) ? count(brand) + " ürün" : brand.country || "Marka"}</span>
          </button>
        ))}
        <AddTile title="Marka ekle" text="Kendi markanı ya da listede olmayan bir markayı ekle." onClick={actions.addBrand} />
      </div>
    </div>
  );
}

function BrandPage({ brand, cat, ctx, actions }) {
  const products = cat.products.filter((row) => row.status === "published" && row.brandId === brand.id);
  const categories = cat.categories.filter((row) => products.some((item) => item.category === row.id));
  const dist = brand.distributor || {};
  const isOwner = ctx.isMember && cat.brandOwners[brand.id] === ctx.myDbId;
  const [expanded, setExpanded] = useState(false);
  const longDesc = brand.desc.length > 320;
  return (
    <div>
      <TopBar title={brand.name} kicker="Markalar" onBack={openBrands} />
      <div className="flex gap-4 p-4">
        <BrandLogo brand={brand} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 text-2xl font-black leading-tight text-slate-950">{brand.name}{brand.verified && <VerifiedTick size={20} />}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            {brand.country && <span>📍 {brand.country}</span>}
            {brand.website && <a href={safeUrl(brand.website)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-bold text-cyan-800 hover:underline"><Globe size={14} /> {hostOf(brand.website)}</a>}
            <span>{products.length} ürün</span>
          </div>
          {brand.verified && <p className="mt-1 text-[12px] font-bold text-sky-700">Doğrulanmış marka hesabı · değerlendirmelere resmî yanıt verir</p>}
        </div>
      </div>
      {brand.desc && (
        <div className="px-4 pb-4">
          <p className={"whitespace-pre-line text-[15px] leading-relaxed text-slate-700 " + (!expanded && longDesc ? "line-clamp-4" : "")}>{brand.desc}</p>
          {longDesc && <button onClick={() => setExpanded(!expanded)} className="mt-1 text-sm font-black text-cyan-800 hover:underline">{expanded ? "Daha az" : "Devamını oku"}</button>}
        </div>
      )}

      {(dist.name || dist.website || dist.phone || dist.email) && (
        <section className="mx-4 mb-4 rounded-3xl border border-slate-200 p-4">
          <h3 className="text-[12px] font-black uppercase tracking-wide text-slate-400">Türkiye distribütörü</h3>
          {dist.name && <p className="mt-1 text-base font-black text-slate-900">{dist.name}</p>}
          <div className="mt-2 grid gap-1.5 text-sm">
            {dist.website && <a href={safeUrl(dist.website)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 font-bold text-cyan-800 hover:underline"><Globe size={15} /> {hostOf(dist.website)}</a>}
            {dist.phone && <a href={"tel:" + dist.phone.replace(/[^\d+]/g, "")} className="inline-flex items-center gap-2 font-bold text-slate-700 hover:underline"><Phone size={15} /> {dist.phone}</a>}
            {dist.email && <a href={"mailto:" + dist.email} className="inline-flex items-center gap-2 font-bold text-slate-700 hover:underline"><Mail size={15} /> {dist.email}</a>}
            {dist.address && <p className="text-slate-500">{dist.address}</p>}
          </div>
        </section>
      )}

      {categories.map((category) => (
        <section key={category.id} className="border-t border-slate-200 p-4">
          <h3 className="mb-3 text-base font-black text-slate-900">{category.emoji} {category.name}</h3>
          <div className={GRID}>{products.filter((row) => row.category === category.id).map((row) => <ProductCard key={row.slug} product={row} cat={cat} showBrand={false} />)}</div>
        </section>
      ))}
      <section className="border-t border-slate-200 p-4">
        <div className={GRID}>
          <AddTile title="Ürün ekle" text={brand.name + " markasına listede olmayan bir ürün ekle."} onClick={() => actions.addProduct({ brandId: brand.id })} />
        </div>
      </section>

      {!brand.verified && !isOwner && (
        <p className="border-t border-slate-100 px-4 py-4 text-center text-[12px] text-slate-400">
          Bu markanın yetkilisi misin?{" "}
          <button onClick={() => actions.claim(brand)} className="font-bold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700">Markayı sahiplen</button>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ürün sayfası                                                        */
/* ------------------------------------------------------------------ */

function Gallery({ product, category }) {
  const images = product.images || [];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const track = useRef(null);
  if (!images.length) return <ProductImage product={product} category={category} className="aspect-square w-full self-start rounded-3xl border border-slate-200" />;
  function goTo(next) {
    const target = Math.max(0, Math.min(images.length - 1, next));
    const node = track.current;
    if (node) node.scrollTo({ left: target * node.clientWidth, behavior: "smooth" });
    setIndex(target);
  }
  return (
    <div className="self-start">
      <div className="relative">
        <div
          ref={track}
          onScroll={(event) => {
            const node = event.currentTarget;
            const next = Math.round(node.scrollLeft / Math.max(1, node.clientWidth));
            if (next !== index) setIndex(next);
          }}
          className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto rounded-3xl border border-slate-200 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, i) => (
            <button key={url + i} type="button" onClick={() => setLightbox(i)} className="relative h-full w-full shrink-0 snap-center" aria-label={product.name + " görseli " + (i + 1)}>
              <img src={url} alt={product.name + " " + (i + 1)} loading={i === 0 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-contain p-3" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-slate-200 disabled:opacity-0" aria-label="Önceki görsel"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => goTo(index + 1)} disabled={index === images.length - 1} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-slate-200 disabled:opacity-0" aria-label="Sonraki görsel"><ChevronRight size={18} /></button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2">
          {images.map((url, i) => (
            <button key={url + "-t" + i} type="button" onClick={() => goTo(i)} className={"h-12 w-12 overflow-hidden rounded-xl border bg-white " + (i === index ? "border-cyan-700 ring-2 ring-cyan-700/20" : "border-slate-200")} aria-label={"Görsel " + (i + 1)}>
              <img src={url} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {lightbox !== null && <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function VideoCard({ video, productName }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
        {playing ? (
          <iframe
            src={"https://www.youtube-nocookie.com/embed/" + video.id + "?autoplay=1&rel=0"}
            title={video.title || productName + " videosu"}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label="Videoyu oynat">
            <img src={"https://i.ytimg.com/vi/" + video.id + "/hqdefault.jpg"} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
            <span className="absolute left-1/2 top-1/2 grid h-12 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-red-600 text-white shadow-lg"><Play size={22} fill="currentColor" /></span>
          </button>
        )}
      </div>
      {video.title && <p className="mt-1.5 line-clamp-2 text-[13px] font-bold leading-snug text-slate-700">{video.title}</p>}
    </div>
  );
}

function RatingSummary({ product, reviews }) {
  const dist = [5, 4, 3, 2, 1].map((n) => [n, reviews.filter((post) => post.rating === n).length]);
  const total = reviews.length || 1;
  return (
    <div className="flex items-center gap-5">
      <div className="text-center">
        <p className="text-4xl font-black leading-none text-slate-950">{product.ratingCount ? ratingText(product.rating) : "–"}</p>
        <Stars value={product.rating} size={15} className="mt-1.5" />
        <p className="mt-1 text-[12px] font-bold text-slate-500">{TR_COUNT(product.ratingCount)} değerlendirme</p>
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        {dist.map(([n, count]) => (
          <div key={n} className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
            <span className="w-3 text-right">{n}</span>
            <Star size={11} className="text-amber-400" fill="currentColor" />
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: (count / total) * 100 + "%" }} /></span>
            <span className="w-5 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPage({ product, cat, ctx, posts, listings, actions }) {
  const brand = cat.brandsById[product.brandId];
  const category = cat.categories.find((row) => row.id === product.category);
  const [details, setDetails] = useState(cat.details[product.id] || null);
  const [sort, setSort] = useState("newest");
  const [relTab, setRelTab] = useState(null);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    let alive = true;
    loadProductDetails(product.id).then((data) => alive && setDetails(data)).catch(() => alive && setDetails({ desc: "", facts: [], videos: [] }));
    return () => {
      alive = false;
    };
  }, [product.id]);

  const reviews = useMemo(
    () => posts.filter((post) => post.ratedProduct === product.slug).sort((a, b) => (sort === "top" ? b.likes - a.likes || b.createdAt - a.createdAt : b.createdAt - a.createdAt)),
    [posts, product.slug, sort]
  );
  const related = useMemo(() => relatedPostsForProduct(posts, product.slug).filter((post) => post.ratedProduct !== product.slug).sort((a, b) => b.createdAt - a.createdAt), [posts, product.slug]);
  const relatedListings = useMemo(() => (listings || []).filter((item) => detectProducts(item.title + " " + (item.description || "")).includes(product.slug)), [listings, product.slug]);
  const questions = related.filter((post) => post.kind === "question");
  const contents = related.filter((post) => post.kind !== "question");
  const tabs = [["listings", "İlanlar", relatedListings.length, Tag], ["posts", "Paylaşımlar", contents.length, MessageCircle], ["questions", "Sorular", questions.length, HelpCircle]];
  const tab = relTab || (tabs.find((row) => row[2] > 0) || tabs[1])[0];
  const relList = tab === "listings" ? relatedListings : tab === "posts" ? contents : questions;
  const myReview = ctx.isMember ? reviews.find((post) => post.userId === ctx.myDbId) : null;
  const facts = details ? details.facts : [];
  const videos = details ? details.videos : [];
  const shortName = cleanName(product, brand);

  const rate = () => ctx.onCompose(null, { product, rate: true });
  const compose = (kind) => ctx.onCompose(null, { product, kind });

  return (
    <div>
      <TopBar title={shortName} kicker={(category ? category.name : "Ürün") + (brand ? " · " + brand.name : "")} onBack={() => (category ? openCategory(category.id) : openProductsHome())} />

      {ctx.adsFor && ctx.adsFor("product").length > 0 && ctx.RotatingDetailAd && (
        <div className="px-4 pt-4 [&>div]:mb-0"><ctx.RotatingDetailAd placement="product" pageKey={product.slug} /></div>
      )}

      <div className="grid gap-4 p-4 sm:grid-cols-[240px_1fr]">
        <Gallery product={product} category={category} />
        <div className="min-w-0">
          {brand && (
            <button onClick={() => openBrand(brand.slug)} className="flex items-center gap-2 text-sm font-black text-slate-600 hover:text-cyan-900">
              <BrandLogo brand={brand} size={26} className="rounded-lg" /> {brand.name} {brand.verified && <VerifiedTick size={14} />}
            </button>
          )}
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950">{shortName}</h1>
          {product.model && <p className="text-sm font-bold text-slate-400">Model: {product.model}</p>}
          <button onClick={() => document.getElementById("degerlendirmeler") && document.getElementById("degerlendirmeler").scrollIntoView({ behavior: "smooth" })} className="mt-2 flex items-center gap-1.5 text-sm font-bold text-slate-600">
            <Stars value={product.rating} size={16} />
            {product.ratingCount ? <><span className="font-black text-slate-900">{ratingText(product.rating)}</span> <span>· {product.ratingCount} değerlendirme</span></> : <span className="text-slate-400">Henüz değerlendirilmedi</span>}
          </button>
          {details ? (
            details.desc && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{details.desc}</p>
          ) : (
            <div className="mt-3 h-16 animate-pulse rounded-2xl bg-slate-100" />
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button onClick={rate} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-cyan-950 px-3.5 py-2 text-[13px] font-black text-white hover:bg-cyan-900">
              <Star size={15} /> {myReview ? "Yeni değerlendirme yaz" : "Değerlendir"}
            </button>
            <button onClick={() => compose("question")} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 py-2 text-[13px] font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              <HelpCircle size={15} /> Soru sor
            </button>
          </div>
        </div>
      </div>

      {facts.length > 0 && (
        <section className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
          <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800">Ürün künyesi</h3>
          <dl className="grid sm:grid-cols-2">
            {facts.map(([label, value], index) => (
              <div key={label + index} className={"flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-sm " + (index % 2 === 0 ? "sm:border-r" : "")}>
                <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
                <dd className="text-right font-black text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="px-4 py-2 text-[12px] text-slate-400">Teknik değerler üretici bilgilerine dayanır; model yılına göre değişebilir.</p>
        </section>
      )}

      {(videos.length > 0 || details) && (
        <section className="mx-4 mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800">İnceleme ve kullanım videoları</h3>
            <button onClick={() => actions.suggestVideo(product)} className="text-[12px] font-black text-cyan-800 hover:underline">+ Video öner</button>
          </div>
          {videos.length ? (
            <div className="grid gap-3 sm:grid-cols-2">{videos.slice(0, 4).map((video) => <VideoCard key={video.id} video={video} productName={product.name} />)}</div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Bu ürün için henüz video eklenmedi. Faydalı bir inceleme ya da kurulum videosu biliyorsan öner.</p>
          )}
        </section>
      )}

      <section className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
        <div className="border-b border-slate-100 bg-slate-50 px-4 pt-2.5">
          <h3 className="text-sm font-black text-slate-800">{shortName} ile ilgili</h3>
          <div className="mt-1 flex">
            {tabs.map(([key, label, count, Icon]) => (
              <button key={key} onClick={() => { setRelTab(key); setLimit(5); }} className={"relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-black " + (tab === key ? "text-slate-950" : "text-slate-500 hover:text-slate-800")}>
                <Icon size={14} /> {label} <span className="rounded-full bg-white px-1.5 text-[12px] text-slate-500 ring-1 ring-slate-200">{count}</span>
                {tab === key && <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-cyan-700" />}
              </button>
            ))}
          </div>
        </div>
        {relList.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {tab === "listings" ? "Bu ürünle ilgili açık ilan yok." : tab === "posts" ? "Bu üründen bahseden paylaşım yok." : "Bu ürün hakkında soru sorulmamış."}
            {tab !== "listings" && <> <button onClick={() => compose(tab === "questions" ? "question" : "post")} className="font-black text-cyan-800 hover:underline">{tab === "questions" ? "İlk soruyu sor" : "İlk paylaşımı yap"}</button></>}
          </p>
        ) : tab === "listings" ? (
          <div className="divide-y divide-slate-100">
            {relList.slice(0, limit).map((item) => (
              <button key={item.id} onClick={() => ctx.onOpenListing && ctx.onOpenListing(item)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                  <span className="text-xs text-slate-500">{item.type} · {item.city}{item.district ? " / " + item.district : ""}</span>
                </span>
                {ctx.priceLabel && <span className="shrink-0 text-sm font-black text-cyan-950">{ctx.priceLabel(item)}</span>}
              </button>
            ))}
          </div>
        ) : (
          <div>{relList.slice(0, limit).map((post) => <PostCard key={post.id} post={post} ctx={ctx} />)}</div>
        )}
        {relList.length > limit && <button onClick={() => setLimit(limit + 10)} className="w-full border-t border-slate-100 py-2.5 text-sm font-black text-cyan-800 hover:bg-slate-50">Daha fazla göster</button>}
      </section>

      <section id="degerlendirmeler" className="border-t border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h3 className="text-base font-black text-slate-900">Kullanıcı deneyimleri <span className="text-slate-400">({reviews.length})</span></h3>
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            {[["newest", "En yeni"], ["top", "En faydalı"]].map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
            ))}
          </div>
        </div>
        <div className="mx-4 mb-3 rounded-3xl border border-slate-200 p-4">
          <RatingSummary product={product} reviews={reviews} />
          <button onClick={rate} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white hover:bg-cyan-900">
            <Star size={16} /> Bu ürünle deneyimini paylaş
          </button>
          <p className="mt-2 text-center text-[12px] leading-snug text-slate-400">Değerlendirmen akışta da paylaşılır. Kişisel deneyimini anlat; hakaret ve kanıtsız iddialar kaldırılır.</p>
        </div>
        {reviews.length ? reviews.map((post) => <PostCard key={post.id} post={post} ctx={ctx} />) : (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">Henüz değerlendirme yok. İlk deneyimi sen paylaş!</p>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Başvuru pencereleri                                                 */
/* ------------------------------------------------------------------ */

function Modal({ title, onClose, children, label }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-[6vh] backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-label={label || title} className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Kapat"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-black text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-slate-400">{hint}</span>}
    </label>
  );
}

const INPUT = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:bg-white";

async function uploadImages(userId, files, folder, bucket = "community-media") {
  const urls = [];
  for (const file of files) {
    const blob = await shrinkImage(file, 1600);
    const type = blob.type || "image/jpeg";
    const path = userId + "/" + folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: type });
    if (error) throw error;
    urls.push(bucket === "community-media" ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : path);
  }
  return urls;
}

function ImagePicker({ files, setFiles, max, label = "Görsel ekle" }) {
  const input = useRef(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);
  return (
    <div className="flex flex-wrap gap-2">
      {previews.map((url, i) => (
        <span key={url} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <img src={url} alt="" className="h-full w-full object-contain" />
          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="Görseli kaldır"><X size={12} /></button>
        </span>
      ))}
      {files.length < max && (
        <button type="button" onClick={() => input.current && input.current.click()} className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-dashed border-slate-200 text-center text-[11px] font-black text-slate-500 hover:border-cyan-300">
          <span><Upload size={16} className="mx-auto mb-1" />{label}</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(event) => { const picked = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/")); event.target.value = ""; setFiles([...files, ...picked].slice(0, max)); }} />
    </div>
  );
}

// Ücret / PRO hakkı seçimi (ödeme sistemi gelene kadar başvuru ekip onayına düşer)
function usePayment(kind) {
  const [state, setState] = useState({ credits: 0, price: null });
  const [usePro, setUsePro] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from("my_profile").select("brand_credits, product_credits").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "catalog_prices").maybeSingle()
    ]).then(([profile, prices]) => {
      if (!alive) return;
      const credits = profile.data ? (kind === "brand" ? profile.data.brand_credits : profile.data.product_credits) || 0 : 0;
      const price = prices.data && prices.data.value ? Number(prices.data.value[kind]) || 0 : null;
      setState({ credits, price });
      setUsePro(credits > 0);
    });
    return () => {
      alive = false;
    };
  }, [kind]);
  return { ...state, usePro, setUsePro };
}

function PaymentBox({ pay, kind }) {
  const what = kind === "brand" ? "marka" : "ürün";
  return (
    <div className="mb-3 rounded-2xl bg-slate-50 p-3 text-sm">
      {pay.credits > 0 && (
        <label className="mb-2 flex items-start gap-2">
          <input type="checkbox" checked={pay.usePro} onChange={(event) => pay.setUsePro(event.target.checked)} className="mt-1" />
          <span><strong>PRO hakkımı kullan</strong> <span className="text-slate-500">({pay.credits} {what} ekleme hakkın var)</span></span>
        </label>
      )}
      {!pay.usePro && (
        <p className="text-slate-600">
          {what === "marka" ? "Marka" : "Ürün"} ekleme ücreti: <strong>{pay.price != null ? pay.price.toLocaleString("tr-TR") + " ₺" : "…"}</strong>.{" "}
          <span className="text-slate-500">12 aylık PRO üyelikle 1 marka ve 5 ürün ekleme hakkı kazanırsın.</span>
        </p>
      )}
      <p className="mt-1 text-[12px] text-slate-400">Başvurun ekip incelemesinden sonra yayına girer; reddedilirse ödeme ya da kullanılan hak iade edilir.</p>
    </div>
  );
}

function BrandSubmitModal({ ctx, onClose }) {
  const pay = usePayment("brand");
  const [form, setForm] = useState({ name: "", website: "", country: "", description: "", dname: "", dweb: "", dphone: "", demail: "" });
  const [logo, setLogo] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const ok = form.name.trim().length >= 2 && form.description.trim().length >= 20 && logo.length === 1;

  async function submit(event) {
    event.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setError("");
    try {
      const [logoUrl] = await uploadImages(ctx.myDbId, logo, "catalog");
      const distributor = Object.fromEntries([["name", form.dname], ["website", form.dweb], ["phone", form.dphone], ["email", form.demail]].filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
      const { error: err } = await supabase.from("brands").insert({
        slug: slugifyTr(form.name) + "-" + Math.random().toString(36).slice(2, 6),
        name: form.name.trim(),
        website: form.website.trim() || null,
        country: form.country.trim() || null,
        description: form.description.trim(),
        logo_url: logoUrl,
        distributor,
        submitted_by: ctx.myDbId,
        payment_status: pay.usePro ? "pro_free" : null
      });
      if (err) throw err;
      setDone(true);
      loadCatalog(true);
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Modal title="Başvurun alındı" onClose={onClose}>
        <p className="text-sm leading-relaxed text-slate-600">Marka başvurun ekibe iletildi. Onaylanınca bildirim alacaksın ve marka hesabı olarak ürün değerlendirmelerine resmî yanıt verebileceksin. Bu arada markana ürün de ekleyebilirsin.</p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white">Tamam</button>
      </Modal>
    );
  }
  return (
    <Modal title="Marka ekle" onClose={onClose}>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">Listede olmayan bir markayı ya da kendi markanı ekle. Ekip inceler; uygun bulursa yayına alır.</p>
      <form onSubmit={submit}>
        <Field label="Marka adı *"><input value={form.name} onChange={set("name")} maxLength={60} className={INPUT} /></Field>
        <Field label="Logo *" hint="Kare, sade arka planlı bir logo en iyi görünür."><ImagePicker files={logo} setFiles={setLogo} max={1} label="Logo" /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Web sitesi"><input value={form.website} onChange={set("website")} placeholder="ornek.com" className={INPUT} /></Field>
          <Field label="Ülke"><input value={form.country} onChange={set("country")} placeholder="Türkiye" className={INPUT} /></Field>
        </div>
        <Field label="Tanıtım *" hint="En az 20 karakter."><textarea value={form.description} onChange={set("description")} rows={4} maxLength={2000} className={INPUT} /></Field>
        <p className="mb-2 text-xs font-black text-slate-600">Türkiye distribütörü (varsa)</p>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Firma adı"><input value={form.dname} onChange={set("dname")} className={INPUT} /></Field>
          <Field label="Web sitesi"><input value={form.dweb} onChange={set("dweb")} className={INPUT} /></Field>
          <Field label="Telefon"><input value={form.dphone} onChange={set("dphone")} className={INPUT} /></Field>
          <Field label="E-posta"><input value={form.demail} onChange={set("demail")} className={INPUT} /></Field>
        </div>
        <PaymentBox pay={pay} kind="brand" />
        {error && <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={!ok || busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} Başvuruyu gönder
        </button>
      </form>
    </Modal>
  );
}

function ProductSubmitModal({ ctx, cat, preset, onClose }) {
  const pay = usePayment("product");
  const brandOptions = cat.brands.filter((row) => row.status === "published" || row.status === "pending").sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const [form, setForm] = useState({ brandId: preset.brandId || "", category: preset.category || "", name: "", model: "", description: "", facts: "" });
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const ok = form.brandId && form.category && form.name.trim().length >= 2 && form.description.trim().length >= 20 && images.length >= 1;

  async function submit(event) {
    event.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setError("");
    try {
      const urls = await uploadImages(ctx.myDbId, images, "catalog");
      const facts = form.facts.split("\n").map((line) => line.split(":")).filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join(":").trim()).map((parts) => [parts[0].trim().slice(0, 40), parts.slice(1).join(":").trim().slice(0, 80)]).slice(0, 12);
      const brand = cat.brandsById[Number(form.brandId)];
      const { error: err } = await supabase.from("products").insert({
        slug: slugifyTr((brand ? brand.name + " " : "") + form.name) + "-" + Math.random().toString(36).slice(2, 6),
        brand_id: Number(form.brandId),
        category_id: form.category,
        name: form.name.trim(),
        model_code: form.model.trim() || null,
        description: form.description.trim(),
        facts,
        images: urls,
        submitted_by: ctx.myDbId,
        payment_status: pay.usePro ? "pro_free" : null
      });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Modal title="Başvurun alındı" onClose={onClose}>
        <p className="text-sm leading-relaxed text-slate-600">Ürün başvurun ekibe iletildi. Onaylanınca bildirim alacaksın ve ürün sayfası yayına girecek.</p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white">Tamam</button>
      </Modal>
    );
  }
  return (
    <Modal title="Ürün ekle" onClose={onClose}>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">Listede olmayan bir ürünü ya da kendi ürününü ekle. Markası listede yoksa önce markayı ekle.</p>
      <form onSubmit={submit}>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Marka *">
            <select value={form.brandId} onChange={set("brandId")} className={INPUT}>
              <option value="">Seç</option>
              {brandOptions.map((row) => <option key={row.id} value={row.id}>{row.name}{row.status === "pending" ? " (onay bekliyor)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Kategori *">
            <select value={form.category} onChange={set("category")} className={INPUT}>
              <option value="">Seç</option>
              {cat.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-x-3 sm:grid-cols-[1fr_140px]">
          <Field label="Ürün adı *"><input value={form.name} onChange={set("name")} maxLength={120} className={INPUT} /></Field>
          <Field label="Model kodu"><input value={form.model} onChange={set("model")} maxLength={40} className={INPUT} /></Field>
        </div>
        <Field label="Görseller * (en fazla 3)"><ImagePicker files={images} setFiles={setImages} max={3} /></Field>
        <Field label="Açıklama *" hint="En az 20 karakter."><textarea value={form.description} onChange={set("description")} rows={4} maxLength={4000} className={INPUT} /></Field>
        <Field label="Teknik özellikler" hint="Her satıra bir özellik: “Debi: 1000 l/sa”"><textarea value={form.facts} onChange={set("facts")} rows={3} className={INPUT} placeholder={"Debi: 1000 l/sa\nAkvaryum hacmi: 100–250 l"} /></Field>
        <PaymentBox pay={pay} kind="product" />
        {error && <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={!ok || busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} Başvuruyu gönder
        </button>
      </form>
    </Modal>
  );
}

function ClaimModal({ ctx, brand, onClose }) {
  const [form, setForm] = useState({ company: "", contact: "", title: "", phone: "", email: "", note: "" });
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const input = useRef(null);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const ok = form.company.trim().length >= 2 && form.contact.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && docs.length >= 1;

  async function submit(event) {
    event.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setError("");
    try {
      const paths = [];
      for (const file of docs) {
        const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf";
        const path = ctx.myDbId + "/" + brand.id + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6) + "." + ext;
        const { error: upErr } = await supabase.storage.from("brand-claims").upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        paths.push(path);
      }
      const { error: err } = await supabase.from("brand_claims").insert({
        brand_id: brand.id,
        user_id: ctx.myDbId,
        company: form.company.trim(),
        contact_name: form.contact.trim(),
        title: form.title.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim(),
        note: form.note.trim() || null,
        documents: paths
      });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Modal title="Başvurun alındı" onClose={onClose}>
        <p className="text-sm leading-relaxed text-slate-600">Belgelerini inceleyip sana bildirim göndereceğiz. Onaylanırsa {brand.name} sayfasında doğrulanmış rozeti görünür ve değerlendirmelere resmî yanıt verebilirsin.</p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white">Tamam</button>
      </Modal>
    );
  }
  return (
    <Modal title={"Markayı sahiplen: " + brand.name} onClose={onClose}>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">Markanın üreticisi ya da resmî Türkiye distribütörüysen hesabını marka hesabı olarak doğrulayabilirsin. Sahiplenme ücretsizdir. Doğrulama için yetkini gösteren belge istenir (ör. vergi levhası ve distribütörlük sözleşmesi ya da yetki yazısı). Belgeler yalnızca doğrulama için kullanılır ve gizli tutulur.</p>
      <form onSubmit={submit}>
        <Field label="Firma unvanı *"><input value={form.company} onChange={set("company")} maxLength={120} className={INPUT} /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Yetkili adı soyadı *"><input value={form.contact} onChange={set("contact")} maxLength={80} className={INPUT} /></Field>
          <Field label="Görevi"><input value={form.title} onChange={set("title")} maxLength={80} className={INPUT} /></Field>
          <Field label="Kurumsal e-posta *"><input type="email" value={form.email} onChange={set("email")} maxLength={120} className={INPUT} /></Field>
          <Field label="Telefon"><input value={form.phone} onChange={set("phone")} maxLength={30} className={INPUT} /></Field>
        </div>
        <Field label="Belgeler * (PDF ya da görsel, en fazla 3)">
          <div className="flex flex-wrap items-center gap-2">
            {docs.map((file, i) => (
              <span key={file.name + i} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                <FileText size={13} /> <span className="truncate">{file.name}</span>
                <button type="button" onClick={() => setDocs(docs.filter((_, j) => j !== i))} aria-label="Belgeyi kaldır"><X size={12} /></button>
              </span>
            ))}
            {docs.length < 3 && <button type="button" onClick={() => input.current && input.current.click()} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50"><Upload size={13} /> Belge ekle</button>}
            <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(event) => { const picked = Array.from(event.target.files || []).filter((file) => file.size <= 10 * 1024 * 1024); event.target.value = ""; setDocs([...docs, ...picked].slice(0, 3)); }} />
          </div>
        </Field>
        <Field label="Not"><textarea value={form.note} onChange={set("note")} rows={2} maxLength={1000} className={INPUT} /></Field>
        {error && <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={!ok || busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} Başvuruyu gönder
        </button>
      </form>
    </Modal>
  );
}

function VideoModal({ ctx, product, onClose }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const id = youtubeId(url);
  async function submit(event) {
    event.preventDefault();
    if (!id || busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("product_video_suggestions").insert({ product_id: product.id, user_id: ctx.myDbId, youtube_id: id, title: title.trim() || null });
    if (err) setError(/duplicate|unique/i.test(err.message) ? "Bu video zaten önerilmiş." : trError(err));
    else setDone(true);
    setBusy(false);
  }
  if (done) {
    return (
      <Modal title="Teşekkürler!" onClose={onClose}>
        <p className="text-sm text-slate-600">Video önerin ekibe iletildi; uygun bulunursa ürün sayfasına eklenir.</p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white">Tamam</button>
      </Modal>
    );
  }
  return (
    <Modal title="Video öner" onClose={onClose}>
      <p className="mb-4 text-xs text-slate-500">{product.name} için faydalı bir inceleme, kurulum ya da kullanım videosu öner (YouTube).</p>
      <form onSubmit={submit}>
        <Field label="YouTube bağlantısı *"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={INPUT} /></Field>
        {id && <img src={"https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"} alt="" className="mb-3 aspect-video w-full rounded-2xl object-cover" />}
        <Field label="Kısa başlık"><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Ör. Kurulum ve ilk çalıştırma" className={INPUT} /></Field>
        {error && <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={!id || busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} Öner
        </button>
      </form>
    </Modal>
  );
}

export { OfficialBrandBadge };
