// Ürünlerle ilgili küçük, her yerde kullanılan parçalar (paylaşım kartı, yorum, paylaşım penceresi).
// community.jsx bunu içe aktarır; burada community.jsx içe aktarılmaz (döngüsel bağımlılık olmasın).
import React, { useMemo, useState } from "react";
import { BadgeCheck, Package, Plus, Search, Star, X } from "lucide-react";
import { catalogSnapshot, foldTr, useCatalog } from "./lib/products";
import { navigate } from "./lib/router";

export function Stars({ value = 0, size = 14, className = "" }) {
  return (
    <span className={"inline-flex items-center " + className} aria-label={"5 üzerinden " + (Math.round(value * 10) / 10).toLocaleString("tr-TR")}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-slate-300" strokeWidth={1.8} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill * size }}>
                <Star size={size} className="text-amber-400" fill="currentColor" strokeWidth={1.8} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({ value, onChange, size = 30 }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Çok kötü", "Kötü", "İdare eder", "İyi", "Çok iyi"];
  const shown = hover || value;
  return (
    <div className="flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5"
            aria-label={n + " yıldız"}
          >
            <Star size={size} className={n <= shown ? "text-amber-400" : "text-slate-300"} fill={n <= shown ? "currentColor" : "none"} strokeWidth={1.8} />
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-sm font-black text-slate-700">{labels[shown]}</span>}
    </div>
  );
}

export function openProduct(slug) {
  navigate("/urun/" + slug);
  window.scrollTo({ top: 0 });
}

// Paylaşım kartında ürün etiketleri (ve varsa verilen puan)
export function ProductChips({ slugs, rating, ratedProduct, className = "mt-2.5" }) {
  const cat = useCatalog(Boolean(slugs && slugs.length));
  const list = (slugs || []).map((slug) => cat.productsBySlug[slug]).filter((item) => item && item.status === "published");
  if (!list.length) return null;
  return (
    <div className={"flex flex-wrap items-center gap-1.5 " + className}>
      {list.map((item) => {
        const brand = cat.brandsById[item.brandId];
        const rated = ratedProduct === item.slug && rating;
        return (
          <button
            key={item.slug}
            type="button"
            onClick={(event) => { event.stopPropagation(); openProduct(item.slug); }}
            title="Ürün sayfasına git"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 py-0.5 pl-0.5 pr-2 text-[12px] font-black text-sky-900 ring-1 ring-sky-100 hover:bg-sky-100"
          >
            {item.images[0] ? <img src={item.images[0]} alt="" className="h-5 w-5 shrink-0 rounded-full bg-white object-contain" /> : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white"><Package size={12} /></span>}
            <span className="truncate">{brand ? brand.name + " " : ""}{item.name.replace(brand ? new RegExp("^" + brand.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+", "i") : /^$/, "")}</span>
            {rated ? <Stars value={rating} size={11} /> : null}
          </button>
        );
      })}
    </div>
  );
}

// Yorum yapan hesap, paylaşımdaki ürünlerden birinin markasının resmî hesabı mı?
export function officialBrandFor(userId, productSlugs) {
  const cat = catalogSnapshot();
  if (!userId || !cat.loaded || !productSlugs || !productSlugs.length) return null;
  for (const slug of productSlugs) {
    const product = cat.productsBySlug[slug];
    const brand = product && cat.brandsById[product.brandId];
    if (brand && (cat.brandOwners[brand.id] || null) === userId) return brand;
  }
  return null;
}

export function OfficialBrandBadge({ brand }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] font-black text-sky-800 ring-1 ring-sky-200" title={brand.name + " markasının doğrulanmış hesabı"}>
      <BadgeCheck size={12} /> Resmî {brand.name} yanıtı
    </span>
  );
}

// Paylaşım penceresinde ürün arayıp ekleme
export function ProductPicker({ selected, onAdd }) {
  const cat = useCatalog(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = foldTr(query.trim());
    if (q.length < 2) return [];
    return cat.products
      .filter((item) => item.status === "published" && !selected.includes(item.slug))
      .map((item) => {
        const brand = cat.brandsById[item.brandId];
        const hay = foldTr([brand && brand.name, item.name, item.model, ...(item.keywords || [])].join(" "));
        return { item, brand, hit: q.split(/\s+/).every((word) => hay.includes(word)) };
      })
      .filter((row) => row.hit)
      .slice(0, 6);
  }, [query, cat.products, cat.brandsById, selected]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-black text-sky-800 ring-1 ring-sky-200 hover:bg-sky-50">
        <Plus size={13} /> Ürün ekle
      </button>
    );
  }
  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-3 py-1.5">
        <Search size={15} className="shrink-0 text-slate-400" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün adı, marka ya da model kodu" className="w-full bg-transparent text-sm outline-none" />
        <button type="button" onClick={() => { setOpen(false); setQuery(""); }} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Kapat"><X size={14} /></button>
      </div>
      {results.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.map(({ item, brand }) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => { onAdd(item.slug); setQuery(""); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
            >
              {item.images[0] ? <img src={item.images[0]} alt="" className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-100" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100"><Package size={15} /></span>}
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-900">{item.name}</span>
                <span className="block truncate text-[12px] text-slate-500">{brand ? brand.name : ""}{item.model ? " · " + item.model : ""}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 2 && !results.length && <p className="mt-1 px-1 text-[12px] text-slate-400">Eşleşen ürün yok.</p>}
    </div>
  );
}
