import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
const SpeciesMap = lazy(() => import("./species-map.jsx"));
const MapPicker = lazy(() => import("./species-map.jsx").then((mod) => ({ default: mod.MapPicker })));
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Upload,
  Clock,
  Fish,
  Flag,
  Pencil,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Link2,
  Users,
  Search,
  Star,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { Avatar, ImageGrid, Lightbox, MediaComposer, MoreMenu, PageHeader, PostCard, RichText, VideoBlock, normalizeTr, timeAgo } from "./community.jsx";
import { LinkPreviewCard, firstUrl } from "./link-preview.jsx";
import { FORM_KINDS } from "./lib/knowledge";
import { DIFFICULTY_COLORS, IUCN, IUCN_ORDER, KB_CATEGORIES, KB_SECTIONS, TR_STATUS, categoryById, detectSpecies } from "./species.js";
import { supabase, trError } from "./lib/supabase";
import { shrinkImage } from "./lib/listings";
import { useCategoryCovers } from "./lib/settings";
import { RecentArticles, SpeciesArticlesButton } from "./articles.jsx";

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

// Sonuçlar ilgiye göre sıralanır: adın başı > ad > Latince ad > lokalite/varyete adları > anahtar kelimeler > kategori
export function searchSpecies(species, query) {
  const terms = normalizeTr(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = [];
  species.forEach((item) => {
    const name = normalizeTr(item.name);
    const latin = normalizeTr(item.latin);
    const forms = normalizeTr((item.forms || []).flatMap((form) => [form.name, ...form.aliases]).join(" "));
    const keywords = normalizeTr((item.keywords || []).join(" "));
    const category = normalizeTr(categoryById(item.category).name);
    let score = 0;
    for (const term of terms) {
      const words = (text) => text.split(/[\s/()\-–,.]+/);
      const best =
        name.startsWith(term) ? 100 :
        words(name).some((word) => word.startsWith(term)) ? 80 :
        name.includes(term) ? 60 :
        latin.startsWith(term) || words(latin).some((word) => word.startsWith(term)) ? 50 :
        latin.includes(term) ? 40 :
        forms.includes(term) ? 30 :
        keywords.includes(term) ? 20 :
        category.includes(term) ? 10 : 0;
      if (!best) return; // her terim bir yerde geçmeli
      score += best;
    }
    scored.push({ item, score });
  });
  return scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "tr")).map(({ item }) => item);
}

function keepersOf(kb, slug) {
  return Object.entries(kb.keeping)
    .filter(([, slugs]) => slugs.includes(slug))
    .map(([id]) => (/^\d+$/.test(id) ? Number(id) : id));
}

function fansOf(kb, slug) {
  return Object.values(kb.favorites || {}).filter((slugs) => (slugs || []).includes(slug)).length;
}

// Bir ilan/paylaşımın bu türle ilgili olup olmadığı: paylaşımda kayıtlı türler ya da metinden otomatik tanıma
export function relatedListings(listings, slug) {
  return listings.filter((item) => (item.speciesSlugs || []).includes(slug) || detectSpecies(item.title + " " + item.description).includes(slug));
}
export function relatedPosts(posts, slug) {
  return posts.filter((post) => (post.speciesSlugs || []).includes(slug) || detectSpecies(post.text).includes(slug));
}

/* Görsel yer tutucu: kategori renk geçişi + simge */
export function SpeciesImage({ species, className = "", round = false, label = true }) {
  const category = categoryById(species.category);
  const cover = species.images && species.images[0];
  if (cover) {
    return (
      <div className={"relative overflow-hidden bg-slate-100 " + (round ? "rounded-full " : "") + className}>
        <img src={cover} alt={species.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={"relative grid place-items-center overflow-hidden bg-gradient-to-br text-white " + category.tone + " " + (round ? "rounded-full " : "") + className}>
      <span className="select-none text-[2.4em] drop-shadow-sm">{category.emoji}</span>
      {label && !round && <span className="absolute bottom-1.5 right-2 rounded-full bg-black/25 px-1.5 py-0.5 text-[12px] font-black uppercase tracking-wide">Görsel yakında</span>}
    </div>
  );
}

function DifficultyChip({ value }) {
  return <span className={"rounded-full px-2 py-0.5 text-[12px] font-black " + (DIFFICULTY_COLORS[value] || "bg-slate-100 text-slate-600")}>{value}</span>;
}

function SpeciesCard({ species, kb }) {
  const keepers = keepersOf(kb, species.slug).length;
  const comments = kb.comments.filter((comment) => comment.slug === species.slug).length;
  const me = kb.currentUserId;
  const isTr = categoryById(species.category).protected;
  const myKeep = Boolean(me) && (kb.keeping[me] || []).includes(species.slug);
  const myFav = Boolean(me) && (kb.favorites[me] || []).includes(species.slug);
  const act = (event, fn) => {
    event.stopPropagation();
    if (!me) return kb.onAuth && kb.onAuth();
    return fn(species.slug);
  };
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => kb.openSpecies(species)}
      onKeyDown={(event) => event.key === "Enter" && kb.openSpecies(species)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left transition hover:border-cyan-200 hover:shadow-lg"
    >
      <div className="relative">
        <SpeciesImage species={species} className="h-28 text-base sm:h-32" />
        {isTr ? (
          species.iucn && <span className="absolute left-2 top-2 shadow-sm"><IucnChip code={species.iucn} short /></span>
        ) : (
          <span className="absolute left-2 top-2 shadow-sm [&>span]:ring-1 [&>span]:ring-white/70"><DifficultyChip value={species.difficulty} /></span>
        )}
        {species.rare && <span className="absolute right-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[11px] font-black text-violet-700 shadow-sm" title="Nadir tür">💎 Nadir</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <h3 className="line-clamp-2 break-words text-sm font-black leading-snug text-slate-900 group-hover:underline">{species.name}</h3>
        <p className="mt-0.5 truncate text-xs italic text-slate-500" title={species.latin}>{species.latin}</p>
        {isTr && species.trStatus && <p className="mt-1 text-[12px] font-bold text-slate-500">{species.trStatus === "endemik" ? "🇹🇷 " : ""}{TR_STATUS[species.trStatus]}{species.basins.length ? " · " + species.basins.slice(0, 2).join(", ") + (species.basins.length > 2 ? "…" : "") : ""}</p>}
        <div className="mt-auto flex min-h-[18px] items-center gap-3 whitespace-nowrap pt-2 text-[12px] font-bold text-slate-400">
          {keepers > 0 && <span className="flex items-center gap-1" title={keepers + " üye besliyor"}><Fish size={12} /> {keepers} besleyen</span>}
          {comments > 0 && <span className="flex items-center gap-1" title={comments + " deneyim"}><MessageCircle size={12} /> {comments}</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          {!isTr && <button
            type="button"
            onClick={(event) => act(event, kb.onToggleKeep)}
            aria-pressed={myKeep}
            title={myKeep ? "Beslediğin türlerden çıkar" : "Beslediğim türlere ekle"}
            className={"flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[12px] font-black transition " + (myKeep ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-cyan-50 text-cyan-900 hover:bg-cyan-100")}
          >
            {myKeep ? <Check size={12} /> : <Fish size={12} />} Besliyorum
          </button>}
          <button
            type="button"
            onClick={(event) => act(event, kb.onToggleFav)}
            aria-pressed={myFav}
            aria-label={myFav ? "Favorilerimden çıkar" : "Favori türlerime ekle"}
            title={myFav ? "Favorilerimden çıkar" : "Favori türlerime ekle"}
            className={(isTr ? "flex flex-1 items-center justify-center gap-1 py-1.5 text-[12px] font-black " : "grid w-9 shrink-0 place-items-center ") + "rounded-full transition " + (myFav ? "bg-amber-400 text-white hover:bg-amber-500" : "bg-amber-50 text-amber-700 hover:bg-amber-100")}
          >
            <Star size={13} fill={myFav ? "currentColor" : "none"} />{isTr && (myFav ? " Favorimde" : " Favorilere ekle")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sol menü                                                            */
/* ------------------------------------------------------------------ */

export function KbAside({ kb, ctx, route }) {
  const activeCategory = route.category || (route.species ? route.species.category : null);
  const activeSection = activeCategory ? categoryById(activeCategory).section : route.section || "tatlisu";
  const [open, setOpen] = useState(activeSection);
  const myKeep = ctx.isMember ? kb.keeping[ctx.currentUserId] || [] : [];
  const myFav = ctx.isMember ? kb.favorites[ctx.currentUserId] || [] : [];

  return (
    <aside className="h-fit border-x border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:overflow-auto">
      <button onClick={() => kb.openHome()} className="flex items-center gap-2 text-lg font-black text-slate-950 hover:underline"><BookOpen size={19} /> Bilgi Bankası</button>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">Tür rehberi, bakım künyeleri ve hobicilerin deneyimleri.</p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-black text-slate-500">Tür bul</span>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-cyan-700 focus-within:bg-white">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input value={kb.search} onChange={(event) => kb.setSearch(event.target.value)} placeholder="Türkçe ya da Latince ad" className="w-full bg-transparent text-sm outline-none" />
          {kb.search && <button onClick={() => kb.setSearch("")} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200"><X size={14} /></button>}
        </div>
      </label>

      {ctx.isMember && (
        <button onClick={kb.openMine} className={"mt-4 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-black transition " + (route.mine ? "bg-cyan-50 text-cyan-950" : "bg-slate-50 text-slate-700 hover:bg-cyan-50")}>
          <span className="flex items-center gap-2"><Fish size={16} /> Türlerim</span>
          <span className="text-[12px] text-slate-500">{myKeep.length} besliyor · {myFav.length} favori</span>
        </button>
      )}

      <nav className="mt-5 grid gap-1">
        {KB_SECTIONS.map((section) => {
          const cats = KB_CATEGORIES.filter((cat) => cat.section === section.id);
          const isOpen = open === section.id;
          return (
            <div key={section.id}>
              <button onClick={() => { setOpen(isOpen ? null : section.id); kb.openSection(section.id); }} className={"flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-black " + (activeSection === section.id && !route.mine && !route.articles && !route.article ? "text-cyan-950" : "text-slate-700") + " hover:bg-slate-50"}>
                <span>{section.emoji}</span> <span className="flex-1">{section.name}</span>
                <ChevronRight size={15} className={"text-slate-400 transition " + (isOpen ? "rotate-90" : "")} />
              </button>
              {isOpen && (
                <div className="mb-1 ml-4 grid border-l border-slate-200 pl-2">
                  {cats.map((cat) => (
                    <button key={cat.id} onClick={() => kb.openCategory(cat.id)} className={"flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] font-bold " + (activeCategory === cat.id ? "bg-cyan-50 text-cyan-950" : "text-slate-600 hover:bg-slate-50")}>
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[12px] text-slate-400">{kb.species.filter((item) => item.category === cat.id).length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-5 grid gap-1 border-t border-slate-100 pt-4">
        <button onClick={() => ctx.onOpenGroup(ctx.groupById("hastaliklar"))} className="flex items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
          <span>🩺 Hastalıklar</span> <span className="text-[12px] font-black text-cyan-800">Gruba git →</span>
        </button>
        <button onClick={() => kb.openArticles()} data-testid="kb-articles-link" className={"flex items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-bold " + (route.articles || route.article ? "bg-cyan-50 text-cyan-950" : "text-slate-700 hover:bg-slate-50")}>
          <span>📚 Makaleler</span> <span className="text-[12px] text-slate-400">{kb.articles.length || ""}</span>
        </button>
      </div>
    </aside>
  );
}

/* Tür öner: listelerin sonunda her zaman görünen kutucuk ---------------- */

function SuggestCard({ kb, categoryId = "", query = "" }) {
  return (
    <button
      type="button"
      onClick={() => kb.onSuggest({ category: categoryId, name: query })}
      className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 p-4 text-center text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-50"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-cyan-800 shadow-sm"><Plus size={22} /></span>
      <span className="text-sm font-black">Tür öner</span>
      <span className="text-[12px] leading-snug text-cyan-900/70">Burada olmayan bir türü bilgileri ve fotoğrafıyla öner; ekip inceleyip ekler.</span>
    </button>
  );
}

const SUGGEST_MAX_IMAGES = 4;

export function SuggestSpeciesModal({ initial = {}, userId, onClose, onDone }) {
  const [form, setForm] = useState({ name: initial.name || "", latin: "", category_id: initial.category || "", note: "" });
  const [images, setImages] = useState([]); // { url, file }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const ok = form.name.trim().length >= 2 && form.category_id && form.note.trim().length >= 10;

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(event) {
    const files = Array.from(event.target.files || []).filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    event.target.value = "";
    setImages((prev) => [...prev, ...files.map((file) => ({ url: URL.createObjectURL(file), file }))].slice(0, SUGGEST_MAX_IMAGES));
  }

  async function submit(event) {
    event.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setError("");
    try {
      const urls = [];
      for (const image of images) {
        const blob = await shrinkImage(image.file, 1600, 0.85);
        const type = blob.type || "image/jpeg";
        const path = userId + "/suggestions/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const { error: upErr } = await supabase.storage.from("community-media").upload(path, blob, { contentType: type });
        if (upErr) throw upErr;
        urls.push(supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl);
      }
      const { error: err } = await supabase.from("species_suggestions").insert({
        user_id: userId,
        name: form.name.trim(),
        latin: form.latin.trim() || null,
        category_id: form.category_id,
        note: form.note.trim(),
        images: urls
      });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-700";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form role="dialog" aria-label="Tür öner" onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-xl font-black">Tür öner</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="Pencereyi kapat" title="Pencereyi kapat"><X size={18} /></button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">Bilgi Bankası'nda olmayan bir türü öner. Ekip önerini inceler; uygun bulursa tür profilini hazırlayıp yayına alır ve sana bildirim gelir.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">Türkçe / yaygın adı
            <input className={input} value={form.name} onChange={set("name")} maxLength={80} placeholder="Örn. Ember Tetra" required />
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500">Latince adı (biliyorsan)
            <input className={input + " italic"} value={form.latin} onChange={set("latin")} maxLength={120} placeholder="Hyphessobrycon amandae" />
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Kategori
            <select className={input} value={form.category_id} onChange={set("category_id")} required>
              <option value="">Seç</option>
              {KB_SECTIONS.map((section) => (
                <optgroup key={section.id} label={section.name}>
                  {KB_CATEGORIES.filter((cat) => cat.section === section.id).map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Bilgiler
            <textarea className={input} rows={4} value={form.note} onChange={set("note")} maxLength={1000} placeholder="Neden eklenmeli? Bildiğin bakım bilgileri: boy, sıcaklık, pH, huy, tank hacmi, kaynak..." required />
            <span className="text-right font-normal text-slate-400">{form.note.length}/1000</span>
          </label>
        </div>
        <div className="mt-1">
          <div className="mb-1.5 text-xs font-black text-slate-500">Fotoğraflar (isteğe bağlı, en fazla {SUGGEST_MAX_IMAGES}) · kendi çektiğin ya da kullanım izni olan görseller</div>
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <span key={image.url} className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                <img src={image.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-slate-600" aria-label="Fotoğrafı kaldır" title="Fotoğrafı kaldır"><X size={12} /></button>
              </span>
            ))}
            {images.length < SUGGEST_MAX_IMAGES && (
              <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="grid h-16 w-16 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-cyan-700 hover:text-cyan-800" aria-label="Fotoğraf ekle" title="Fotoğraf ekle"><Upload size={18} /></button>
            )}
          </div>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
        </div>
        {error && <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        <button type="submit" disabled={!ok || busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} Öneriyi gönder
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ana sayfa (bölüm + kategori kartları)                               */
/* ------------------------------------------------------------------ */

function SearchResults({ kb, query }) {
  const results = searchSpecies(kb.species, query);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-cyan-50/60 px-4 py-3">
        <p className="text-sm text-slate-600"><strong className="text-slate-900">“{query}”</strong> için {results.length} tür</p>
        <button onClick={() => kb.setSearch("")} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50">Temizle</button>
      </div>
      {results.length ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">{results.map((item) => <SpeciesCard key={item.slug} species={item} kb={kb} />)}<SuggestCard kb={kb} query={query} /></div>
      ) : (
        <div className="p-4">
          <p className="mb-3 text-center text-sm font-semibold text-slate-400">Bu ada uyan tür bulunamadı. Latince adla da deneyebilirsin ya da türü öner.</p>
          <div className="mx-auto max-w-[220px]"><SuggestCard kb={kb} query={query} /></div>
        </div>
      )}
    </div>
  );
}

export function KbHome({ kb, section = "tatlisu" }) {
  const cats = KB_CATEGORIES.filter((cat) => cat.section === section);
  const query = kb.search.trim();

  return (
    <div>
      <PageHeader title="Bilgi Bankası" subtitle={kb.species.length + " tür profili · hobicilerin deneyimleriyle"} />
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 [scrollbar-width:none]">
        {KB_SECTIONS.map((item) => (
          <button key={item.id} onClick={() => { kb.setSearch(""); kb.openSection(item.id); }} className={"flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition " + (!query && section === item.id ? "bg-cyan-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
            <span>{item.emoji}</span> {item.name}
          </button>
        ))}
      </div>
      {query ? (
        <SearchResults kb={kb} query={query} />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 p-5 sm:grid-cols-3 xl:grid-cols-4">
          {cats.map((cat) => {
            const count = kb.species.filter((item) => item.category === cat.id).length;
            return (
              <button key={cat.id} onClick={() => kb.openCategory(cat.id)} className="group flex flex-col items-center text-center">
                <span className={"grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br text-4xl shadow-sm ring-4 ring-white transition group-hover:scale-105 group-hover:shadow-lg sm:h-28 sm:w-28 " + cat.tone}>{cat.emoji}</span>
                <span className="mt-2 text-sm font-black leading-snug text-slate-800 group-hover:text-cyan-800">{cat.name}</span>
                <span className="text-[12px] font-bold text-slate-400">{count} tür</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kategori sayfası                                                    */
/* ------------------------------------------------------------------ */

// Kategori başlık bandı: yönetimden yüklenen kapak görseli + koyu geçiş; görsel yoksa kategorinin kendi renk geçişi
function CategoryBand({ category, section, onBack }) {
  const covers = useCategoryCovers();
  const cover = covers[category.id];
  const [failed, setFailed] = useState(false);
  const showImage = cover && !failed;
  return (
    <div className={"sticky top-[60px] z-20 overflow-hidden border-b border-slate-200 lg:top-[72px] " + (showImage ? "bg-slate-900" : "bg-gradient-to-r " + category.tone)} data-testid="category-band">
      {showImage && <img src={cover} alt="" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />}
      <div className={"absolute inset-0 " + (showImage ? "bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/5" : "bg-gradient-to-r from-black/25 via-black/5 to-transparent")} />
      {!showImage && <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 right-4 select-none text-7xl opacity-30 sm:text-8xl">{category.emoji}</span>}
      <div className="relative flex min-h-[76px] items-center gap-3 px-3 py-3 sm:min-h-[92px]">
        <button onClick={onBack} className="rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30" title="Geri"><ArrowLeft size={19} /></button>
        <div className="min-w-0 text-white [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">
          <p className="text-[12px] font-black uppercase tracking-wide text-white/80">{section.name}</p>
          <h2 className="truncate text-xl font-black leading-tight sm:text-2xl">{category.name}</h2>
        </div>
      </div>
    </div>
  );
}

export function KbCategoryPage({ kb, categoryId }) {
  if (categoryById(categoryId).protected) return <TrCategoryPage kb={kb} categoryId={categoryId} />;
  return <RegularCategoryPage kb={kb} categoryId={categoryId} />;
}

function RegularCategoryPage({ kb, categoryId }) {
  const category = categoryById(categoryId);
  const [difficulty, setDifficulty] = useState("Tümü");
  const [sort, setSort] = useState("az");
  if (!category) return <p className="p-10 text-center text-sm text-slate-500">Kategori bulunamadı.</p>;
  const list = kb.species
    .filter((item) => item.category === category.id && (difficulty === "Tümü" || item.difficulty === difficulty))
    .sort((a, b) => {
      const diff = sort === "popular" ? keepersOf(kb, b.slug).length - keepersOf(kb, a.slug).length : sort === "favorite" ? fansOf(kb, b.slug) - fansOf(kb, a.slug) : 0;
      return diff || a.name.localeCompare(b.name, "tr"); // eşitlikte A-Z
    });
  const section = KB_SECTIONS.find((item) => item.id === category.section);

  return (
    <div>
      <CategoryBand category={category} section={section} onBack={() => kb.openSection(category.section)} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex gap-1">
          {["Tümü", "Kolay", "Orta", "Zor"].map((value) => (
            <button key={value} onClick={() => setDifficulty(value)} className={"rounded-full px-3 py-1 text-xs font-black " + (difficulty === value ? "bg-cyan-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{value}</button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
          {[["az", "A-Z"], ["popular", "En çok beslenen"], ["favorite", "En çok favorilenen"]].map(([key, label]) => (
            <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">{list.map((item) => <SpeciesCard key={item.slug} species={item} kb={kb} />)}<SuggestCard kb={kb} categoryId={categoryId} /></div>
      ) : (
        <div className="p-4">
          <p className="mb-3 text-center text-sm font-semibold text-slate-400">Bu filtreye uyan tür yok.</p>
          <div className="mx-auto max-w-[220px]"><SuggestCard kb={kb} categoryId={categoryId} /></div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tür sayfası                                                         */
/* ------------------------------------------------------------------ */

function SpeciesComment({ comment, kb, ctx }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text || "");
  const [lightbox, setLightbox] = useState(null);
  const user = ctx.users[comment.userId];
  const UserName = ctx.UserName;
  const mine = ctx.isMember && comment.userId === ctx.currentUserId;
  const images = comment.images || [];
  const hasMedia = images.length > 0 || Boolean(comment.video);
  const canSave = (draft.trim() || hasMedia) && draft.trim() !== (comment.text || "");
  const menuItems = mine
    ? [
        { label: "Düzenle", icon: Pencil, onClick: () => { setDraft(comment.text || ""); setEditing(true); } },
        { label: "Sil", icon: Trash2, danger: true, onClick: () => kb.onDeleteComment(comment.id) }
      ]
    : [{ label: "Bildir", icon: Flag, onClick: () => (ctx.isMember ? ctx.onReport({ kind: "comment", comment }) : ctx.onAuth()) }];

  function save() {
    if (!canSave) return;
    kb.onEditComment(comment.id, draft.trim());
    setEditing(false);
  }

  return (
    <div className="flex gap-3 border-b border-slate-100 px-4 py-3">
      <Avatar user={user} size={36} onClick={() => ctx.onProfile(user)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <button onClick={() => ctx.onProfile(user)} className="font-black text-slate-900 hover:underline"><UserName user={user} /></button>
          <span className="text-slate-400">· {timeAgo(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-xs text-slate-400">· düzenlendi</span>}
          {(kb.keeping[comment.userId] || []).includes(comment.slug) && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-black text-emerald-700">Bu türü besliyor</span>}
          {!editing && <MoreMenu items={menuItems} size={17} />}
        </div>
        {editing ? (
          <div className="mt-1.5">
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }}
              rows={3}
              maxLength={600}
              className="w-full resize-none rounded-2xl border border-cyan-300 bg-white px-3 py-2 text-base outline-none focus:border-cyan-600"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-full px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100">Vazgeç</button>
              <button onClick={save} disabled={!canSave} className="rounded-full bg-cyan-950 px-4 py-1.5 text-xs font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">Kaydet</button>
            </div>
          </div>
        ) : (
          comment.text && <p className="mt-0.5 whitespace-pre-wrap break-words text-[16px] leading-relaxed sm:text-[17px] text-slate-800"><RichText text={comment.text} onTag={ctx.onSearch} /></p>
        )}
        {hasMedia && (
          <div className="max-w-md">
            <ImageGrid images={images} onOpen={(index) => setLightbox(index)} />
            <VideoBlock video={comment.video} />
          </div>
        )}
        {!editing && !hasMedia && comment.text && firstUrl(comment.text) && <div className="max-w-md"><LinkPreviewCard url={firstUrl(comment.text)} compact /></div>}
        {lightbox !== null && <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} />}
        <button onClick={() => (ctx.isMember ? kb.onLikeComment(comment.id) : ctx.onAuth())} className={"mt-1.5 flex items-center gap-1.5 text-xs font-semibold " + (comment.likedByMe ? "text-rose-600" : "text-slate-500 hover:text-rose-600")}>
          <Heart size={15} fill={comment.likedByMe ? "currentColor" : "none"} /> {comment.likes} faydalı
        </button>
      </div>
    </div>
  );
}

/* Besleyenler: şehir, aynı şehir rozeti, mesaj butonu */
function KeeperRow({ userId, species, ctx, kb }) {
  const user = ctx.users[userId];
  const UserName = ctx.UserName;
  const me = ctx.isMember ? ctx.users[ctx.currentUserId] : null;
  const isMe = ctx.isMember && userId === ctx.currentUserId;
  const sameCity = me && !isMe && me.city === user.city;
  const otherCount = (kb.keeping[userId] || []).length - 1;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Avatar user={user} size={40} onClick={() => ctx.onProfile(user)} />
      <button onClick={() => ctx.onProfile(user)} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-black text-slate-900"><UserName user={user} />{isMe && <span className="text-xs font-bold text-slate-400">(sen)</span>}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span className="flex items-center gap-0.5"><MapPin size={11} /> {user.city}</span>
          {sameCity && <span className="rounded-full bg-cyan-50 px-1.5 font-black text-cyan-800">Aynı şehirde</span>}
          {otherCount > 0 && <span>+{otherCount} tür daha</span>}
        </span>
      </button>
      {!isMe && !user.deleted && (
        <button
          onClick={() => ctx.onMessage(user, species.name + " hakkında")}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-cyan-950 px-3 py-1.5 text-xs font-black text-white hover:bg-cyan-900"
        >
          <Send size={13} /> <span className="hidden sm:inline">Mesaj gönder</span><span className="sm:hidden">Mesaj</span>
        </button>
      )}
    </div>
  );
}

const KEEPERS_PREVIEW = 5;
const KEEPERS_PAGE = 20;

function sortKeepers(keepers, ctx) {
  const me = ctx.isMember ? ctx.users[ctx.currentUserId] : null;
  // Önce sen, sonra aynı şehirdekiler, sonra diğerleri
  return keepers
    .filter((id) => ctx.users[id])
    .slice()
    .sort((a, b) => {
      if (ctx.isMember && (a === ctx.currentUserId || b === ctx.currentUserId)) return a === ctx.currentUserId ? -1 : 1;
      return me ? (ctx.users[b].city === me.city) - (ctx.users[a].city === me.city) : 0;
    });
}

function KeepersSection({ keepers, species, kb, ctx }) {
  const [open, setOpen] = useState(false);
  const sorted = sortKeepers(keepers, ctx);
  return (
    <section className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><Users size={15} /> Bu türü besleyenler {sorted.length > 0 && <span className="text-slate-400">({sorted.length})</span>}</h3>
        <span className="text-[12px] font-semibold text-slate-400">Takas, yavru ve deneyim için ulaş</span>
      </div>
      {sorted.length ? (
        <div className="divide-y divide-slate-100">
          {sorted.slice(0, KEEPERS_PREVIEW).map((id) => <KeeperRow key={id} userId={id} species={species} ctx={ctx} kb={kb} />)}
        </div>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-slate-400">Henüz kimse eklemedi. İlk sen ekle!</p>
      )}
      {sorted.length > KEEPERS_PREVIEW && (
        <button onClick={() => setOpen(true)} className="w-full border-t border-slate-100 py-2.5 text-xs font-black text-cyan-800 hover:bg-slate-50">
          Herkesi gör ({sorted.length})
        </button>
      )}
      {open && <KeepersModal keepers={sorted} species={species} kb={kb} ctx={ctx} onClose={() => setOpen(false)} />}
    </section>
  );
}

// Kompakt pencere: aşağı kaydırdıkça 20'şer kişi daha yüklenir; ada ya da şehre göre aranabilir
function KeepersModal({ keepers, species, kb, ctx, onClose }) {
  const [count, setCount] = useState(KEEPERS_PAGE);
  const [query, setQuery] = useState("");
  const sentinel = useRef(null);
  const scroller = useRef(null);
  const q = normalizeTr(query.trim());
  const filtered = q ? keepers.filter((id) => normalizeTr(ctx.users[id].username + " " + (ctx.users[id].city || "")).includes(q)) : keepers;
  const visible = filtered.slice(0, count);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    setCount(KEEPERS_PAGE);
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [q]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !scroller.current || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((value) => (value < filtered.length ? value + KEEPERS_PAGE : value));
      },
      { root: scroller.current, rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-label="Bu türü besleyenler" className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black">{species.name} besleyenler</h3>
            <p className="text-xs text-slate-500">{keepers.length} üye</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" title="Pencereyi kapat" aria-label="Pencereyi kapat"><X size={17} /></button>
        </div>
        {keepers.length > 8 && (
          <label className="mx-4 mt-3 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={15} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı adı ya da şehir" className="w-full bg-transparent text-sm outline-none" />
          </label>
        )}
        <div ref={scroller} className="mt-1 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
          {visible.map((id) => <KeeperRow key={id} userId={id} species={species} ctx={ctx} kb={kb} />)}
          {!filtered.length && <p className="p-6 text-center text-sm text-slate-400">Eşleşen üye yok.</p>}
          <div ref={sentinel} className="h-6" />
          {visible.length < filtered.length && <p className="pb-3 text-center text-xs font-bold text-slate-400">Yükleniyor…</p>}
        </div>
      </div>
    </div>
  );
}

/* Tür görselleri: kaydırmalı galeri (dokunarak kaydırma, oklar, noktalar, tam ekran) */
function SpeciesGallery({ species }) {
  const images = species.images || [];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const track = useRef(null);

  useEffect(() => {
    setIndex(0);
    if (track.current) track.current.scrollLeft = 0;
  }, [species.slug]);

  if (images.length === 0) return <SpeciesImage species={species} className="aspect-video w-full self-start rounded-3xl text-3xl sm:aspect-square" />;

  function go(next) {
    const target = Math.max(0, Math.min(images.length - 1, next));
    const node = track.current;
    if (node) node.scrollTo({ left: target * node.clientWidth, behavior: "smooth" });
    setIndex(target);
  }

  return (
    <div className="relative self-start">
      <div
        ref={track}
        onScroll={(event) => {
          const node = event.currentTarget;
          const next = Math.round(node.scrollLeft / Math.max(1, node.clientWidth));
          if (next !== index) setIndex(next);
        }}
        className="flex aspect-video w-full snap-x snap-mandatory overflow-x-auto rounded-3xl bg-slate-100 [scrollbar-width:none] sm:aspect-square [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          <button key={url + i} type="button" onClick={() => setLightbox(i)} className="relative h-full w-full shrink-0 snap-center" aria-label={species.name + " görseli " + (i + 1)}>
            <img src={url} alt={species.name + " " + (i + 1)} loading={i === 0 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow disabled:opacity-0" aria-label="Önceki görsel"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === images.length - 1} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow disabled:opacity-0" aria-label="Sonraki görsel"><ChevronRight size={18} /></button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1">
            {images.map((url, i) => (
              <button key={url + "-dot-" + i} type="button" onClick={() => go(i)} className={"h-1.5 rounded-full transition-all " + (i === index ? "w-4 bg-white" : "w-1.5 bg-white/60")} aria-label={"Görsel " + (i + 1)} />
            ))}
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[12px] font-black text-white">{index + 1}/{images.length}</span>
        </>
      )}
      {lightbox !== null && <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/* İlanlar / Paylaşımlar / Sorular */
function RelatedSection({ species, listings, posts, ctx }) {
  const questions = posts.filter((post) => post.kind === "question");
  const contents = posts.filter((post) => post.kind !== "question");
  const tabs = [["listings", "İlanlar", listings.length, Tag], ["posts", "Paylaşımlar", contents.length, MessageCircle], ["questions", "Sorular", questions.length, HelpCircle]];
  const firstWithData = (tabs.find((tab) => tab[2] > 0) || tabs[0])[0];
  const [tab, setTab] = useState(firstWithData);
  const [limit, setLimit] = useState(4);
  const list = tab === "listings" ? listings : tab === "posts" ? contents : questions;

  return (
    <section className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-4 pt-2.5">
        <h3 className="text-sm font-black text-slate-800">{species.name} ile ilgili</h3>
        <div className="mt-1 flex">
          {tabs.map(([key, label, count, Icon]) => (
            <button key={key} onClick={() => { setTab(key); setLimit(4); }} className={"relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-black " + (tab === key ? "text-slate-950" : "text-slate-500 hover:text-slate-800")}>
              <Icon size={14} /> {label} <span className="rounded-full bg-white px-1.5 text-[12px] text-slate-500 ring-1 ring-slate-200">{count}</span>
              {tab === key && <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-cyan-700" />}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          {tab === "listings" ? "Bu türle ilgili açık ilan yok." : tab === "posts" ? "Bu türle ilgili paylaşım yok." : "Bu tür hakkında soru sorulmamış."}
          {tab === "listings" ? (
            ctx.onAddListing && <> <button onClick={() => ctx.onAddListing(species)} className="font-black text-cyan-800 hover:underline">İlk ilanı ver</button></>
          ) : (
            <> <button onClick={() => ctx.onCompose(null, { species, kind: tab === "questions" ? "question" : "post" })} className="font-black text-cyan-800 hover:underline">{tab === "questions" ? "İlk soruyu sor" : "İlk paylaşımı yap"}</button></>
          )}
        </p>
      ) : tab === "listings" ? (
        <div className="divide-y divide-slate-100">
          {list.slice(0, limit).map((item) => (
            <button key={item.id} onClick={() => ctx.onOpenListing(item)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-500">{item.type} · {item.city} / {item.district}</span>
              </span>
              <span className="shrink-0 text-sm font-black text-cyan-950">{ctx.priceLabel(item)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div>{list.slice(0, limit).map((post) => <PostCard key={post.id} post={post} ctx={ctx} />)}</div>
      )}
      {list.length > limit && (
        <button onClick={() => setLimit((value) => value + 6)} className="w-full border-t border-slate-100 py-2.5 text-xs font-black text-cyan-800 hover:bg-slate-50">Daha fazla göster ({list.length - limit})</button>
      )}
      <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-400">Tür adı geçen ilan ve paylaşımlar buraya otomatik eklenir.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lokaliteler ve varyeteler                                           */
/* ------------------------------------------------------------------ */

const FORM_ORDER = ["lokalite", "varyete", "ticari"];
const FORM_TONE = { lokalite: "bg-emerald-50 text-emerald-800 ring-emerald-200", varyete: "bg-violet-50 text-violet-800 ring-violet-200", ticari: "bg-amber-50 text-amber-800 ring-amber-200" };
const FORM_PREVIEW = 3;

function SuggestFormModal({ species, userId, onClose, onDone }) {
  const [form, setForm] = useState({ name: "", kind: "lokalite", origin: "", aliases: "", note: "", source_url: "" });
  const [point, setPoint] = useState(null); // { lat, lng }
  const [showMap, setShowMap] = useState(false);
  const [images, setImages] = useState([]); // { url, file }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const exists = (species.forms || []).some((item) => normalizeTr(item.name) === normalizeTr(form.name.trim()));
  const ok = form.name.trim().length >= 2 && form.note.trim().length >= 10 && !exists;

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(event) {
    const files = Array.from(event.target.files || []).filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    event.target.value = "";
    setImages((prev) => [...prev, ...files.map((file) => ({ url: URL.createObjectURL(file), file }))].slice(0, SUGGEST_MAX_IMAGES));
  }

  async function submit(event) {
    event.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setError("");
    try {
      const urls = [];
      for (const image of images) {
        const blob = await shrinkImage(image.file, 1600, 0.85);
        const type = blob.type || "image/jpeg";
        const path = userId + "/suggestions/form-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const { error: upErr } = await supabase.storage.from("community-media").upload(path, blob, { contentType: type });
        if (upErr) throw upErr;
        urls.push(supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl);
      }
      let source = form.source_url.trim();
      if (source && !/^https?:\/\//i.test(source)) source = "https://" + source;
      const { error: err } = await supabase.from("species_form_suggestions").insert({
        species_id: species.dbId,
        user_id: userId,
        name: form.name.trim(),
        kind: form.kind,
        origin: form.origin.trim(),
        aliases: form.aliases.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8),
        note: form.note.trim(),
        source_url: source || null,
        lat: form.kind === "lokalite" && point ? point.lat : null,
        lng: form.kind === "lokalite" && point ? point.lng : null,
        images: urls
      });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-700";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form role="dialog" aria-label="Lokalite / varyete öner" onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Lokalite / varyete öner</h2>
            <p className="text-sm font-bold text-slate-500">{species.name} <span className="font-normal italic">{species.latin}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="Pencereyi kapat" title="Pencereyi kapat"><X size={18} /></button>
        </div>
        <p className="mb-4 mt-2 text-xs leading-relaxed text-slate-500">Bu türün listede olmayan bir lokalitesini, varyetesini ya da ticari adını öner. Ekip inceler; uygun bulursa tür sayfasına eklenir ve sana bildirim gelir.</p>
        <div className="mb-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Tür">
          {FORM_ORDER.map((kind) => (
            <button key={kind} type="button" role="radio" aria-checked={form.kind === kind} onClick={() => setForm((prev) => ({ ...prev, kind }))}
              className={"rounded-2xl px-2 py-2 ring-1 transition " + (form.kind === kind ? FORM_TONE[kind] + " ring-2" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
              <span className="block text-center text-sm font-black">{FORM_KINDS[kind].label}</span>
            </button>
          ))}
        </div>
        <p className="-mt-1.5 mb-3 text-[12px] text-slate-500">{FORM_KINDS[form.kind].hint}.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">Adı
            <input className={input} value={form.name} onChange={set("name")} maxLength={80} placeholder={form.kind === "lokalite" ? "Örn. Blue Flash" : form.kind === "varyete" ? "Örn. Albino" : "Örn. Red Dragon"} required />
            {exists && <span className="font-bold text-amber-700">Bu ad listede zaten var.</span>}
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500">{form.kind === "lokalite" ? "Bulunduğu yer" : "Köken (biliyorsan)"}
            <input className={input} value={form.origin} onChange={set("origin")} maxLength={200} placeholder={form.kind === "lokalite" ? "Örn. Malavi Gölü, Mbenji Adası" : "Örn. Asya çiftlik üretimi"} />
          </label>
          {form.kind === "lokalite" && (
            <div className="sm:col-span-2">
              {showMap ? (
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-500">
                    <span>Haritada yerini işaretle (yaklaşık yeterli)</span>
                    {point && <button type="button" onClick={() => setPoint(null)} className="font-black text-red-700 hover:underline">İşareti kaldır</button>}
                  </div>
                  <Suspense fallback={<div className="h-[220px] animate-pulse rounded-2xl bg-slate-100" />}>
                    <MapPicker height={220} value={point} onPick={setPoint} areas={species.ranges || []}
                      context={(species.forms || []).filter((item) => item.lat != null).map((item) => ({ lat: item.lat, lng: item.lng, title: item.name }))} />
                  </Suspense>
                  <span className="text-[11px] text-slate-400">{point ? "Seçilen nokta: " + point.lat.toFixed(3) + ", " + point.lng.toFixed(3) : "Haritaya dokunarak nokta koy. Gri noktalar listedeki lokaliteler."}</span>
                </div>
              ) : (
                <button type="button" onClick={() => setShowMap(true)} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50"><MapPin size={13} /> Haritada işaretle (isteğe bağlı)</button>
              )}
            </div>
          )}
          <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Diğer adları (virgülle ayır, isteğe bağlı)
            <input className={input} value={form.aliases} onChange={set("aliases")} maxLength={300} placeholder="Örn. OB, Orange Blotch" />
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Açıklama
            <textarea className={input} rows={4} value={form.note} onChange={set("note")} maxLength={1000} placeholder="Ayırt edici özellikleri: renk, desen, boy farkı; hobide nasıl bilinir, nereden gelir..." required />
            <span className="text-right font-normal text-slate-400">{form.note.length}/1000</span>
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Kaynak bağlantısı (isteğe bağlı)
            <input className={input} value={form.source_url} onChange={set("source_url")} maxLength={500} inputMode="url" placeholder="https://..." />
          </label>
        </div>
        <div className="mt-1">
          <div className="mb-1.5 text-xs font-black text-slate-500">Fotoğraflar (isteğe bağlı, en fazla {SUGGEST_MAX_IMAGES}) · kendi çektiğin ya da kullanım izni olan görseller</div>
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <span key={image.url} className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                <img src={image.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))} className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-slate-600" aria-label="Fotoğrafı kaldır" title="Fotoğrafı kaldır"><X size={12} /></button>
              </span>
            ))}
            {images.length < SUGGEST_MAX_IMAGES && (
              <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="grid h-16 w-16 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-cyan-700 hover:text-cyan-800" aria-label="Fotoğraf ekle" title="Fotoğraf ekle"><Upload size={18} /></button>
            )}
          </div>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
        </div>
        {error && <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        <button type="submit" disabled={!ok || busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} Öneriyi gönder
        </button>
      </form>
    </div>
  );
}

function DistributionSection({ species, focus }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const points = (species.forms || [])
    .filter((form) => form.lat != null && form.lng != null)
    .map((form) => ({
      id: form.dbId, lat: form.lat, lng: form.lng,
      title: form.kind === "lokalite" ? "'" + form.name + "'" : form.name,
      origin: form.origin,
      image: form.images[0] || (species.images || [])[0] || "",
      imageNote: !form.images[0] && (species.images || [])[0] ? "Görsel türün genel fotoğrafıdır" : ""
    }));
  const areas = species.ranges || [];
  // Harita kütüphanesi yalnızca bölüm ekrana yaklaşınca yüklenir
  const hasData = points.length > 0 || areas.length > 0;
  useEffect(() => {
    if (!hasData || !ref.current || visible) return undefined;
    if (!("IntersectionObserver" in window)) { setVisible(true); return undefined; }
    const io = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && setVisible(true), { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible, hasData]);
  useEffect(() => {
    if (focus) { setVisible(true); ref.current && ref.current.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }, [focus]);
  if (!points.length && !areas.length) return null;
  return (
    <section id="dagilim" ref={ref} className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <h3 className="text-sm font-black text-slate-800">Doğadaki dağılımı</h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
          {areas.length > 0 && <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-cyan-600/30" /> Yaygın görüldüğü bölge</span>}
          {points.length > 0 && <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-white" /> Lokalite ({points.length})</span>}
        </p>
      </div>
      {visible ? (
        <Suspense fallback={<div className="h-[300px] animate-pulse bg-slate-100" />}>
          <SpeciesMap points={points} areas={areas} focus={focus} />
        </Suspense>
      ) : <div className="h-[300px] bg-slate-100" />}
      <p className="px-4 py-2 text-[12px] text-slate-400">Konumlar yaklaşıktır; lokalite adları çoğu zaman bir ada, resif, köy ya da nehir kesimini anlatır. Doğadan toplama yerlerini paylaşırken yaşam alanlarını korumayı unutmayalım.</p>
    </section>
  );
}

function FormsSection({ species, ctx, onLocate }) {
  const forms = species.forms || [];
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { images, index }
  const [suggest, setSuggest] = useState(false);
  const openSuggest = () => (ctx.isMember ? setSuggest(true) : ctx.onAuth());
  const modal = suggest && (
    <SuggestFormModal species={species} userId={ctx.currentUserId} onClose={() => setSuggest(false)}
      onDone={() => { setSuggest(false); ctx.onToast && ctx.onToast("Önerin ekibe iletildi, teşekkürler! Sonucu bildirim olarak alacaksın."); }} />
  );
  if (!species.dbId) return null;
  if (!forms.length) {
    return (
      <div className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-3xl border border-dashed border-slate-300 px-4 py-3">
        <p className="text-sm text-slate-500">Bu türün bilinen bir lokalitesi ya da varyetesi mi var?</p>
        <button type="button" onClick={openSuggest} className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50"><Plus size={14} /> Öner</button>
        {modal}
      </div>
    );
  }
  const sorted = forms.slice().sort((a, b) => FORM_ORDER.indexOf(a.kind) - FORM_ORDER.indexOf(b.kind) || a.position - b.position || a.name.localeCompare(b.name, "tr"));
  const shown = open ? sorted : sorted.slice(0, FORM_PREVIEW);
  const kinds = FORM_ORDER.filter((kind) => sorted.some((form) => form.kind === kind));
  const latinBase = (species.latin || "").replace(/\s*'.*$/, "");
  return (
    <section id="lokaliteler" className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-800">Lokaliteler ve varyeteler <span className="text-slate-400">({forms.length})</span></h3>
          <button type="button" onClick={openSuggest} className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50" title="Lokalite / varyete öner"><Plus size={13} /> Öner</button>
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
          {kinds.map((kind) => FORM_KINDS[kind].label + ": " + FORM_KINDS[kind].hint.toLocaleLowerCase("tr")).join(" · ")}
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {shown.map((form) => (
          <li key={form.dbId} id={"form-" + form.dbId} className="flex gap-3 px-4 py-3">
            {form.images.length > 0 ? (
              <button type="button" onClick={() => setLightbox({ images: form.images, index: 0 })} className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100" title="Görseli büyüt">
                <img src={form.images[0]} alt={species.name + " " + form.name} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-black text-slate-900">{form.kind === "lokalite" ? "'" + form.name + "'" : form.name}</span>
                <span className={"rounded-full px-2 py-0.5 text-[11px] font-black ring-1 " + FORM_TONE[form.kind]}>{FORM_KINDS[form.kind].label}</span>
                {form.lat != null && onLocate && (
                  <button type="button" onClick={() => onLocate(form.dbId)} className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-black text-cyan-800 hover:bg-cyan-50" title="Haritada göster"><MapPin size={12} /> Haritada</button>
                )}
              </div>
              {form.kind === "lokalite" && latinBase && <p className="text-[12px] italic text-slate-400">{latinBase} '{form.name}'</p>}
              {form.origin && <p className="mt-0.5 flex items-start gap-1 text-sm text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" /> {form.origin}</p>}
              {form.aliases.length > 0 && <p className="mt-0.5 text-sm text-slate-500">Diğer adlar: {form.aliases.join(", ")}</p>}
              {form.note && <p className="mt-1 text-sm leading-relaxed text-slate-700">{form.note}</p>}
            </div>
          </li>
        ))}
      </ul>
      {sorted.length > FORM_PREVIEW && (
        <button type="button" onClick={() => setOpen((value) => !value)} className="w-full border-t border-slate-100 px-4 py-2.5 text-sm font-black text-cyan-800 hover:bg-cyan-50">
          {open ? "Daha az göster" : "Tümünü göster (" + sorted.length + ")"}
        </button>
      )}
      <p className="border-t border-slate-100 px-4 py-2 text-[12px] text-slate-400">Farklı lokaliteleri aynı tankta melezlemeden tutmak, hattın saflığını korumanın temelidir.</p>
      {lightbox && <Lightbox images={lightbox.images} start={lightbox.index} onClose={() => setLightbox(null)} />}
      {modal}
    </section>
  );
}

// Bilimsel ad notu: masaüstünde üzerine gelince, telefonda dokununca açılır
function NameNoteInfo({ note }) {
  const [pos, setPos] = useState(null); // açıkken pencerenin ekrandaki yeri
  const ref = useRef(null);
  const show = () => {
    const rect = ref.current.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 16));
    setPos({ top: rect.bottom + 8, left, width });
  };
  const hide = () => setPos(null);
  useEffect(() => {
    if (!pos) return undefined;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) hide(); };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [pos]);
  return (
    <span ref={ref} className="ml-1.5 inline-block align-[0.15em]" onPointerEnter={(event) => event.pointerType === "mouse" && show()} onPointerLeave={(event) => event.pointerType === "mouse" && hide()}>
      <button type="button" onClick={() => (pos ? hide() : show())} className="grid h-6 w-6 place-items-center rounded-full bg-sky-100 text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-200" aria-label="Bilimsel ad notu" aria-expanded={Boolean(pos)}>
        <Info size={14} strokeWidth={2.6} />
      </button>
      {pos && createPortal(
        <span role="tooltip" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }} className="z-50 block rounded-2xl bg-slate-900 p-3 text-left text-[13px] font-medium leading-relaxed tracking-normal text-white shadow-xl">
          <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-sky-300">Bilimsel ad notu</span>
          {note}
        </span>,
        document.body
      )}
    </span>
  );
}

// Tür sayfası paylaşımı: mesaj olarak gönder, bağlantıyı kopyala, WhatsApp
function SpeciesShareButton({ species, ctx }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const ref = useRef(null);
  const url = "https://aquagram.com.tr/tur/" + species.slug;
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  function copy() {
    setOpen(false);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => ctx.onToast("Bağlantı kopyalandı"), () => ctx.onToast(url));
    else ctx.onToast(url);
  }
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Paylaş" aria-haspopup="menu" aria-expanded={open}><Share2 size={19} /></button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); if (ctx.isMember) setSending(true); else ctx.onAuth(); }} className={item}><Send size={16} className="text-cyan-800" /> Mesaj olarak gönder</button>
          <button type="button" role="menuitem" onClick={copy} className={item}><Link2 size={16} className="text-slate-500" /> Bağlantıyı kopyala</button>
          <a role="menuitem" href={"https://wa.me/?text=" + encodeURIComponent(species.name + " (" + species.latin + ") — Aquagram: " + url)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={item}><MessageCircle size={16} className="text-emerald-600" /> WhatsApp'ta paylaş</a>
        </div>
      )}
      {/* Başlık çubuğu backdrop-blur kullandığı için pencere body'ye taşınır; yoksa çubuğun içine sıkışır */}
      {sending && createPortal(<SendSpeciesModal species={species} url={url} ctx={ctx} onClose={() => setSending(false)} />, document.body)}
    </div>
  );
}

function SendSpeciesModal({ species, url, ctx, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const q = query.trim().replace(/^@/, "").toLowerCase();
    if (target || q.length < 2) { setResults([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Adın herhangi bir yerinde geçenler; adı yazılanla başlayanlar önce
      const clean = q.replace(/[%_\\]/g, "");
      let request = supabase.from("profiles").select("id, username, avatar_url, city").ilike("username", "%" + clean + "%").order("username").limit(20);
      if (ctx.myDbId) request = request.neq("id", ctx.myDbId);
      const { data } = await request;
      const rows = (data || []).sort((a, b) => Number(!a.username.toLowerCase().startsWith(clean)) - Number(!b.username.toLowerCase().startsWith(clean))).slice(0, 6);
      if (!cancelled) setResults(rows);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, target, ctx.myDbId]);

  async function send() {
    if (!target) return setError("Önce bir üye seç.");
    setBusy(true);
    setError("");
    try {
      const body = (note.trim() ? note.trim() + "\n\n" : "") + species.name + " (" + species.latin + ")\n" + url;
      const ok = await ctx.sendLinkToUser(target.id, species.name + " hakkında", body);
      if (ok) {
        ctx.onToast("@" + target.username + " kullanıcısına gönderildi");
        onClose();
      }
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  const avatar = (user) =>
    user.avatar_url ? (
      <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
    ) : (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-900 text-xs font-black uppercase text-white">{user.username.slice(0, 1)}</span>
    );
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-[10vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Mesaj olarak gönder</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Kapat"><X size={19} /></button>
        </div>
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
          <SpeciesImage species={species} className="h-12 w-12 shrink-0 rounded-xl" label={false} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{species.name}</p>
            <p className="truncate text-xs italic text-slate-500">{species.latin}</p>
          </div>
        </div>
        <label className="mb-1 block text-xs font-black text-slate-500">Kime?</label>
        {target ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-700 bg-cyan-50/60 p-2">
            {avatar(target)}
            <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">@{target.username}</span>
            <button type="button" onClick={() => { setTarget(null); setQuery(""); }} className="rounded-full p-1.5 text-slate-500 hover:bg-white" title="Değiştir"><X size={15} /></button>
          </div>
        ) : (
          <div className="relative">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-cyan-700">
              <Search size={16} className="text-slate-400" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Üye adı yaz, ör. @mavilikler" className="w-full bg-transparent text-base outline-none sm:text-sm" />
            </label>
            {results.length > 0 && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                {results.map((user) => (
                  <button key={user.id} type="button" onClick={() => { setTarget(user); setResults([]); }} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                    {avatar(user)}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900">@{user.username}</span>
                      {user.city && <span className="block truncate text-xs text-slate-500">{user.city}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query.trim().replace(/^@/, "").length >= 2 && results.length === 0 && <p className="mt-1.5 text-xs text-slate-400">Bu adla bir üye bulunamadı. Kullanıcı adını (@ olmadan) yazmayı dene.</p>}
          </div>
        )}
        <label className="mb-1 mt-4 block text-xs font-black text-slate-500">Not ekle <span className="font-bold text-slate-400">(isteğe bağlı)</span></label>
        <textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 500))} rows={3} placeholder="Ör. Şu türe bir bak, senin tanka çok yakışır." className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base outline-none focus:border-cyan-700 sm:text-sm" />
        {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-100">Vazgeç</button>
          <button type="button" onClick={send} disabled={!target || busy} className="flex items-center gap-1.5 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Gönder
          </button>
        </div>
      </div>
    </div>
  );
}

export function SpeciesPage(props) {
  if (categoryById(props.species.category).protected) return <TrSpeciesPage {...props} />;
  return <RegularSpeciesPage {...props} />;
}

function RegularSpeciesPage({ species, kb, ctx, listings, posts }) {
  const [sort, setSort] = useState("newest");
  const [mapFocus, setMapFocus] = useState(null);
  const category = categoryById(species.category);
  const keepers = keepersOf(kb, species.slug);
  const myKeep = ctx.isMember && (kb.keeping[ctx.currentUserId] || []).includes(species.slug);
  const myFav = ctx.isMember && (kb.favorites[ctx.currentUserId] || []).includes(species.slug);
  const comments = kb.comments
    .filter((comment) => comment.slug === species.slug)
    .sort((a, b) => (sort === "top" ? b.likes - a.likes : b.createdAt - a.createdAt));
  const linkedListings = useMemo(() => relatedListings(listings, species.slug), [listings, species]);
  const linkedPosts = useMemo(() => relatedPosts(posts, species.slug).sort((a, b) => b.createdAt - a.createdAt), [posts, species]);
  const me = ctx.isMember ? ctx.users[ctx.currentUserId] : null;

  return (
    <div>
      <div className="sticky top-[60px] z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur lg:top-[72px]">
        <button onClick={() => kb.openCategory(category.id)} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Geri"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black uppercase tracking-wide text-slate-400">{category.name}</p>
          <h2 className="truncate text-lg font-black leading-tight">{species.name}</h2>
        </div>
        <SpeciesShareButton species={species} ctx={ctx} />
      </div>

      {ctx.adsFor && ctx.adsFor("species").length > 0 && (
        <div className="px-4 pt-4 [&>div]:mb-0">
          {ctx.RotatingDetailAd ? <ctx.RotatingDetailAd placement="species" pageKey={species.slug} /> : <ctx.DetailBannerAd ad={ctx.adsFor("species")[0]} />}
        </div>
      )}
      <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr]">
        <SpeciesGallery species={species} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyChip value={species.difficulty} />
            {species.temperament && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-black text-slate-600">{species.temperament}</span>}
            {species.rare && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[12px] font-black text-violet-700">💎 Nadir</span>}
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950">
            {species.name}
            {species.nameNote && <NameNoteInfo note={species.nameNote} />}
          </h1>
          <p className="text-sm italic text-slate-500">{species.latin}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{species.desc}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => (ctx.isMember ? kb.onToggleKeep(species.slug) : ctx.onAuth())}
              className={"flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-black transition " + (myKeep ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-cyan-950 text-white hover:bg-cyan-900")}
            >
              {myKeep ? <><Check size={15} /> Besliyorum</> : <><Fish size={15} /> Beslediklerime ekle</>}
            </button>
            <button
              onClick={() => (ctx.isMember ? kb.onToggleFav(species.slug) : ctx.onAuth())}
              className={"flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-black ring-1 transition " + (myFav ? "bg-amber-50 text-amber-800 ring-amber-300" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")}
            >
              <Star size={15} fill={myFav ? "currentColor" : "none"} /> {myFav ? "Favorilerimde" : "Favorilere ekle"}
            </button>
            <SpeciesArticlesButton kb={kb} slug={species.slug} />
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            {keepers.length > 0 && (
              <span className="flex -space-x-2">
                {keepers.filter((id) => ctx.users[id]).slice(0, 5).map((id) => <span key={id} className="rounded-full ring-2 ring-white"><Avatar user={ctx.users[id]} size={24} onClick={() => ctx.onProfile(ctx.users[id])} /></span>)}
              </span>
            )}
            {keepers.length > 0 && <span><strong className="text-slate-900">{keepers.length}</strong> üye bu türü besliyor</span>}
          </div>
        </div>
      </div>

      {(species.notice || (categoryById(species.category) || {}).notice) && (
        <div className="mx-4 mb-4 flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="species-notice" role="note">
          <span aria-hidden="true" className="text-base leading-5">⚠️</span>
          <p className="leading-6">{species.notice || categoryById(species.category).notice}</p>
        </div>
      )}

      <section className="mx-4 mb-4 overflow-hidden rounded-3xl border border-slate-200">
        <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800">Bakım künyesi</h3>
        <dl className="grid sm:grid-cols-2">
          {species.facts.map(([label, value], index) => (
            <div key={label} className={"flex items-start justify-between gap-3 px-4 py-2.5 text-sm " + (index % 2 === 0 ? "sm:border-r" : "") + " border-b border-slate-100"}>
              <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
              <dd className="text-right font-black text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="px-4 py-2 text-[12px] text-slate-400">Değerler hobide yaygın kabul gören aralıklardır; hat, lokasyon ve bireye göre değişebilir.</p>
      </section>

      <DistributionSection species={species} focus={mapFocus} />
      <FormsSection species={species} ctx={ctx} onLocate={(id) => setMapFocus({ id, n: Date.now() })} />

      <KeepersSection keepers={keepers} species={species} kb={kb} ctx={ctx} />
      <RelatedSection species={species} listings={linkedListings} posts={linkedPosts} ctx={ctx} />

      <section className="border-t border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h3 className="text-base font-black text-slate-900">Üye deneyimleri <span className="text-slate-400">({comments.length})</span></h3>
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            {[["newest", "En yeni"], ["top", "En faydalı"]].map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
            ))}
          </div>
        </div>
        {me ? (
          <MediaComposer
            me={me}
            maxLength={600}
            submitLabel="Paylaş"
            className="border-y border-slate-100 bg-slate-50/50"
            placeholder="Bu türle deneyimini paylaş: tank hacmi, tankmate'ler, üretim notları... Foto ya da video da ekleyebilirsin."
            onSubmit={(data) => kb.onComment(species.slug, data)}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 border-y border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-600">Deneyimini paylaşmak için giriş yap.</p>
            <button onClick={ctx.onAuth} className="rounded-full bg-cyan-950 px-4 py-2 text-xs font-black text-white hover:bg-cyan-900">Giriş yap</button>
          </div>
        )}
        {comments.length ? comments.map((comment) => <SpeciesComment key={comment.id} comment={comment} kb={kb} ctx={ctx} />) : (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">Henüz deneyim paylaşılmamış. İlk yorumu sen yaz!</p>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Türkiye'nin Tatlı Su Balıkları (korunan kategori)                   */
/* ------------------------------------------------------------------ */

const TR_SOURCE = { text: "Kaya vd. (2026)", url: "https://doi.org/10.4194/TRJFAS29729" };

function IucnChip({ code, short = false }) {
  const meta = IUCN[code];
  if (!meta) return null;
  return (
    <span className={"rounded-full px-2 py-0.5 text-[12px] font-black ring-1 " + meta.tone} title={"IUCN Kırmızı Liste: " + meta.label}>
      {short ? code : "IUCN: " + code + " · " + meta.label}
    </span>
  );
}

// Metindeki [1] gibi atıfları kaynakçaya bağlar
function Cited({ text }) {
  return String(text || "").split(/(\[\d+\])/).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
    return (
      <button key={i} type="button" onClick={() => { const el = document.getElementById("kaynak-" + m[1]); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }}
        className="align-super text-[11px] font-black text-cyan-700 hover:underline" aria-label={"Kaynak " + m[1]}>[{m[1]}]</button>
    );
  });
}

function TrCategoryPage({ kb, categoryId }) {
  const category = categoryById(categoryId);
  const section = KB_SECTIONS.find((item) => item.id === category.section);
  const [status, setStatus] = useState("");
  const [iucn, setIucn] = useState("");
  const [basin, setBasin] = useState("");
  const [sort, setSort] = useState("az");
  const all = kb.species.filter((item) => item.category === category.id);
  const basins = Array.from(new Set(all.flatMap((item) => item.basins || []))).sort((a, b) => a.localeCompare(b, "tr"));
  const codes = IUCN_ORDER.filter((code) => all.some((item) => item.iucn === code));
  const statuses = Object.keys(TR_STATUS).filter((key) => all.some((item) => item.trStatus === key));
  const list = all
    .filter((item) => (!status || item.trStatus === status) && (!iucn || item.iucn === iucn) && (!basin || (item.basins || []).includes(basin)))
    .sort((a, b) => (sort === "risk" ? IUCN_ORDER.indexOf(a.iucn) - IUCN_ORDER.indexOf(b.iucn) : 0) || a.name.localeCompare(b.name, "tr"));
  const chip = (active) => "shrink-0 rounded-full px-3 py-1 text-xs font-black " + (active ? "bg-cyan-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200");
  return (
    <div>
      <CategoryBand category={category} section={section} onBack={() => kb.openSection(category.section)} />
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-[15px] leading-relaxed text-slate-700">
          Türkiye'de 390 tatlı su balığı türü bilinir: 367'si yerli, 23'ü sonradan gelip yerleşmiş yabancı türdür. Yerli türlerin 202'si yalnızca Türkiye'de yaşar{" "}
          <a href={TR_SOURCE.url} target="_blank" rel="noopener" className="font-bold text-cyan-800 underline decoration-cyan-800/30 underline-offset-2">({TR_SOURCE.text})</a>.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["390", "tür"], ["367", "yerli"], ["202", "endemik"]].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-2 py-2.5 ring-1 ring-slate-100">
              <div className="text-xl font-black text-slate-900">{value}</div>
              <div className="text-[12px] font-bold text-slate-500">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
          Bu bölüm tanıtım ve biyotop bilgisi içindir; buradaki türler doğadan toplanmamalı, alınıp satılmamalıdır. Bilgiler kaynaklıdır; bir hata görürsen tür sayfasından düzeltme önerebilirsin. Şimdiye kadar {all.length} tür eklendi.
        </p>
      </div>
      <div className="grid gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          <button onClick={() => setStatus("")} className={chip(!status)}>Tümü</button>
          {statuses.map((key) => <button key={key} onClick={() => setStatus(key)} className={chip(status === key)}>{TR_STATUS[key]}</button>)}
          <span className="mx-1 w-px shrink-0 bg-slate-200" />
          {codes.map((code) => <button key={code} onClick={() => setIucn(iucn === code ? "" : code)} className={chip(iucn === code)} title={IUCN[code].label}>{code}</button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <select value={basin} onChange={(event) => setBasin(event.target.value)} className="min-w-0 max-w-[60%] rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 outline-none" aria-label="Havza">
            <option value="">Tüm havzalar</option>
            {basins.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            {[["az", "A-Z"], ["risk", "Koruma durumu"]].map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">{list.map((item) => <SpeciesCard key={item.slug} species={item} kb={kb} />)}</div>
      ) : (
        <p className="p-10 text-center text-sm font-semibold text-slate-400">Bu filtreye uyan tür yok.</p>
      )}
    </div>
  );
}

function TrDistribution({ species }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const areas = species.ranges || [];
  useEffect(() => {
    if (!areas.length || !ref.current || visible) return undefined;
    if (!("IntersectionObserver" in window)) { setVisible(true); return undefined; }
    const io = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && setVisible(true), { rootMargin: "300px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible, areas.length]);
  if (!areas.length) return null;
  return (
    <section id="dagilim" ref={ref} className="mx-4 mb-6 overflow-hidden rounded-3xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <h3 className="text-sm font-black text-slate-800">Türkiye'deki dağılımı</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-500"><span className="inline-block h-3 w-3 rounded-full bg-cyan-600/30" /> Bilinen yayılış alanları (yaklaşık)</p>
      </div>
      {visible ? (
        <Suspense fallback={<div className="h-[280px] animate-pulse bg-slate-100" />}>
          <SpeciesMap areas={areas} height={280} />
        </Suspense>
      ) : <div className="h-[280px] bg-slate-100" />}
      <p className="px-4 py-2 text-[12px] text-slate-400">Yalnızca havza düzeyinde gösterilir; kesin konum paylaşılmaz.</p>
    </section>
  );
}

function TrCorrectionModal({ species, ctx, onClose, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const me = ctx.users[ctx.currentUserId];
  async function send(event) {
    event.preventDefault();
    if (text.trim().length < 10 || busy) return;
    setBusy(true);
    setError("");
    const { data } = await supabase.auth.getUser();
    const email = data && data.user && data.user.email;
    const body = "[Tür düzeltmesi] " + species.name + " (" + species.latin + ")\nhttps://aquagram.com.tr/tur/" + species.slug + "\n\n" + text.trim();
    const { error: err } = await supabase.rpc("submit_contact", { p_name: me ? "@" + me.username : "Üye", p_email: email || "", p_topic: "oneri", p_body: body.slice(0, 4000) });
    setBusy(false);
    if (err) return setError(trError(err));
    return onDone();
  }
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 sm:place-items-center" onClick={onClose}>
      <form onSubmit={send} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">Düzeltme öner</h3>
            <p className="text-sm text-slate-500">{species.name} · <i>{species.latin}</i></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Kapat"><X size={18} /></button>
        </div>
        <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 2000))} rows={6} autoFocus
          className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-800 focus:bg-white"
          placeholder="Hangi bilgi hatalı ya da eksik? Varsa kaynağını (makale, kitap, bağlantı) da yaz." />
        {error && <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
        <button type="submit" disabled={text.trim().length < 10 || busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gönder
        </button>
      </form>
    </div>,
    document.body
  );
}

function TrSpeciesPage({ species, kb, ctx }) {
  const [sort, setSort] = useState("newest");
  const [correct, setCorrect] = useState(false);
  const category = categoryById(species.category);
  const myFav = ctx.isMember && (kb.favorites[ctx.currentUserId] || []).includes(species.slug);
  const comments = kb.comments
    .filter((comment) => comment.slug === species.slug)
    .sort((a, b) => (sort === "top" ? b.likes - a.likes : b.createdAt - a.createdAt));
  const me = ctx.isMember ? ctx.users[ctx.currentUserId] : null;
  const sections = species.sections || [];
  const refs = species.refs || [];
  const fbRef = refs.findIndex((ref) => /^FishBase/.test(ref.text)) + 1;
  const images = species.images || [];
  const btn = "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-black ring-1 transition ";
  return (
    <div>
      <div className="sticky top-[60px] z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur lg:top-[72px]">
        <button onClick={() => kb.openCategory(category.id)} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Geri"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-black uppercase tracking-wide text-slate-400">{category.emoji} {category.name}</p>
          <h2 className="truncate text-lg font-black leading-tight">{species.name}</h2>
        </div>
        <SpeciesShareButton species={species} ctx={ctx} />
      </div>

      {ctx.adsFor && ctx.adsFor("species").length > 0 && (
        <div className="px-4 pt-4 [&>div]:mb-0">
          {ctx.RotatingDetailAd ? <ctx.RotatingDetailAd placement="species" pageKey={species.slug} /> : <ctx.DetailBannerAd ad={ctx.adsFor("species")[0]} />}
        </div>
      )}

      <header className={"border-b border-slate-100 px-4 pb-4 pt-5 " + (images.length ? "grid gap-4 sm:grid-cols-[1fr_180px]" : "")}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {species.trStatus && <span className={"rounded-full px-2 py-0.5 text-[12px] font-black ring-1 " + (species.trStatus === "endemik" ? "bg-red-50 text-red-800 ring-red-200" : "bg-slate-100 text-slate-700 ring-slate-200")}>{species.trStatus === "endemik" ? "🇹🇷 " : ""}{TR_STATUS[species.trStatus]}</span>}
            {species.iucn && <IucnChip code={species.iucn} />}
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-slate-950 sm:text-[28px]">
            {species.name}
            {species.nameNote && <NameNoteInfo note={species.nameNote} />}
          </h1>
          <p className="text-[15px] text-slate-500"><i>{species.latin}</i>{species.authority ? " " + species.authority : ""}</p>
          {species.basins.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {species.basins.map((name) => <span key={name} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[12px] font-bold text-cyan-900 ring-1 ring-cyan-100">{name}</span>)}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button onClick={() => (ctx.isMember ? kb.onToggleFav(species.slug) : ctx.onAuth())} className={btn + (myFav ? "bg-amber-50 text-amber-800 ring-amber-300" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")}>
              <Star size={15} fill={myFav ? "currentColor" : "none"} /> {myFav ? "Favorilerimde" : "Favorilere ekle"}
            </button>
            <button onClick={() => (ctx.isMember ? setCorrect(true) : ctx.onAuth())} className={btn + "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"}><Pencil size={14} /> Düzeltme öner</button>
            <SpeciesArticlesButton kb={kb} slug={species.slug} />
          </div>
        </div>
        {images.length > 0 && <div className="sm:order-last"><SpeciesGallery species={species} /></div>}
      </header>

      <article className="px-4 py-5 text-[16px] leading-[1.75] text-slate-800">
        {species.desc && <p><Cited text={species.desc} /></p>}
        {sections.slice(0, 1).map((item) => (
          <section key={item.title} className="mt-6">
            <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
            <p className="mt-2"><Cited text={item.body} /></p>
          </section>
        ))}
      </article>

      <TrDistribution species={species} />

      {sections.length > 1 && (
        <article className="px-4 pb-1 text-[16px] leading-[1.75] text-slate-800">
          {sections.slice(1).map((item) => (
            <section key={item.title} className="mb-6">
              <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
              <p className="mt-2"><Cited text={item.body} /></p>
            </section>
          ))}
        </article>
      )}

      <section className="mx-4 mb-6 overflow-hidden rounded-3xl border border-slate-200">
        <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800">Biyotop künyesi</h3>
        {species.facts.length > 0 && (
          <dl className="grid sm:grid-cols-2">
            {species.facts.map(([label, value], index) => (
              <div key={label} className={"flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-sm " + (index % 2 === 0 ? "sm:border-r" : "")}>
                <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
                <dd className="text-right font-black text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="px-4 py-2.5 text-[13px] leading-relaxed text-slate-500">
          {species.facts.length > 0 && fbRef > 0 && <p className="mb-1 text-[12px] text-slate-400">Boy ve ortam bilgisi: FishBase <Cited text={"[" + fbRef + "]"} /></p>}
          {!species.facts.length && <p className="mb-1 text-[12px] text-slate-400">Bu tür için kaynaklı biyotop verisi henüz eklenmedi.</p>}
          <p>{species.iucn === "EX"
            ? "Bu türün nesli tükenmiş kabul edilir; bilgiler tarihî kayıtlara dayanır."
            : "Doğal popülasyonlarını korumak için doğadan toplanmamalı, alınıp satılmamalıdır. Bilgiler tanıtım ve biyotop amaçlıdır."}</p>
        </div>
      </section>

      {refs.length > 0 && (
        <section className="mx-4 mb-6 rounded-3xl border border-slate-200 px-4 py-3">
          <h3 className="text-sm font-black text-slate-800">Kaynakça</h3>
          <ol className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-slate-600">
            {refs.map((ref, i) => (
              <li key={i} id={"kaynak-" + (i + 1)} className="flex gap-2 scroll-mt-28">
                <span className="font-black text-cyan-700">[{i + 1}]</span>
                <span className="min-w-0 break-words">{ref.text}{ref.url && <> <a href={ref.url} target="_blank" rel="noopener" className="font-bold text-cyan-800 underline decoration-cyan-800/30 underline-offset-2">Bağlantı</a></>}</span>
              </li>
            ))}
          </ol>
          {species.updatedAt && <p className="mt-3 border-t border-slate-100 pt-2 text-[12px] text-slate-400">Son içerik güncellemesi: {new Date(species.updatedAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</p>}
        </section>
      )}

      <section className="border-t border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h3 className="text-base font-black text-slate-900">Gözlemler ve katkılar <span className="text-slate-400">({comments.length})</span></h3>
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            {[["newest", "En yeni"], ["top", "En faydalı"]].map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
            ))}
          </div>
        </div>
        {me ? (
          <MediaComposer
            me={me}
            maxLength={600}
            submitLabel="Paylaş"
            className="border-y border-slate-100 bg-slate-50/50"
            placeholder="Doğada gözlemin, fotoğrafın ya da bir kaynakla ilgili notun mu var? Paylaş. Kesin konum (kaynak adı, köy, koordinat) yazma."
            onSubmit={(data) => kb.onComment(species.slug, data)}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 border-y border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-600">Katkıda bulunmak için giriş yap.</p>
            <button onClick={ctx.onAuth} className="rounded-full bg-cyan-950 px-4 py-2 text-xs font-black text-white hover:bg-cyan-900">Giriş yap</button>
          </div>
        )}
        {comments.length ? comments.map((comment) => <SpeciesComment key={comment.id} comment={comment} kb={kb} ctx={ctx} />) : (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">Henüz katkı yok.</p>
        )}
      </section>
      {correct && (
        <TrCorrectionModal species={species} ctx={ctx} onClose={() => setCorrect(false)}
          onDone={() => { setCorrect(false); ctx.onToast && ctx.onToast("Önerin ekibe iletildi, teşekkürler!"); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Türlerim                                                            */
/* ------------------------------------------------------------------ */

export function KbMinePage({ kb, ctx }) {
  const [tab, setTab] = useState("keep");
  const keep = (kb.keeping[ctx.currentUserId] || []).map((slug) => kb.species.find((item) => item.slug === slug)).filter(Boolean);
  const fav = (kb.favorites[ctx.currentUserId] || []).map((slug) => kb.species.find((item) => item.slug === slug)).filter(Boolean);
  const list = tab === "keep" ? keep : fav;
  return (
    <div>
      <PageHeader title="Türlerim" subtitle="Beslediğin türler profilinde görünür; favoriler yalnızca sana özel." />
      <div className="flex border-b border-slate-200">
        {[["keep", "Beslediğim türler", keep.length], ["fav", "Favori türlerim", fav.length]].map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)} className={"relative flex-1 py-3 text-sm font-black hover:bg-slate-50 " + (tab === key ? "text-slate-950" : "text-slate-500")}>
            {label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[12px] text-slate-600">{count}</span>
            {tab === key && <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-cyan-700" />}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">{list.map((item) => <SpeciesCard key={item.slug} species={item} kb={kb} />)}</div>
      ) : (
        <div className="p-10 text-center">
          <Fish size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-black text-slate-700">{tab === "keep" ? "Henüz beslediğin bir tür eklemedin" : "Favori türün yok"}</p>
          <p className="mt-1 text-sm text-slate-500">Tür sayfalarındaki butonlarla ekleyebilirsin.</p>
          <button onClick={() => kb.openHome()} className="mt-4 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Tür rehberine git</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sağ sütun                                                           */
/* ------------------------------------------------------------------ */

// Bir türün son hareketi: içerik düzenlemesi / kabul edilen öneri (veritabanı), ya da türle ilgili yeni paylaşım, soru, ilan
function useRecentlyUpdated(kb, posts, listings) {
  return useMemo(() => {
    const latest = {};
    const bump = (slug, at, reason) => {
      if (!slug || !at) return;
      if (!latest[slug] || at > latest[slug].at) latest[slug] = { at, reason };
    };
    kb.species.forEach((item) => bump(item.slug, Math.max(item.updatedAt || 0, item.addedAt ? Math.floor(item.addedAt) : 0), item.updatedAt > item.addedAt + 1000 ? "güncellendi" : "eklendi"));
    (posts || []).forEach((post) => {
      const slugs = new Set([...(post.speciesSlugs || []), ...detectSpecies(post.text || "")]);
      slugs.forEach((slug) => bump(slug, post.createdAt, post.kind === "question" ? "soru soruldu" : "paylaşım yapıldı"));
    });
    (listings || []).forEach((item) => {
      const slugs = new Set([...(item.speciesSlugs || []), ...detectSpecies((item.title || "") + " " + (item.description || ""))]);
      slugs.forEach((slug) => bump(slug, item.createdAt, "ilan eklendi"));
    });
    return kb.species
      .filter((item) => latest[item.slug])
      .map((item) => ({ species: item, ...latest[item.slug] }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 5);
  }, [kb.species, posts, listings]);
}

export function KbWidgets({ kb, posts, listings }) {
  const recent = useRecentlyUpdated(kb, posts, listings);
  const lastCommented = [];
  kb.comments
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((comment) => {
      if (lastCommented.length < 5 && !lastCommented.some((item) => item.slug === comment.slug)) lastCommented.push(comment);
    });

  const Row = ({ species, meta }) => (
    <button onClick={() => kb.openSpecies(species)} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-slate-50">
      <SpeciesImage species={species} round label={false} className="h-9 w-9 shrink-0 text-[12px]" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black text-slate-800">{species.name}</span>
        <span className="block truncate text-[12px] text-slate-400">{meta}</span>
      </span>
    </button>
  );

  return (
    <div className="mt-4 grid gap-4">
      <section className="rounded-[28px] border border-slate-200 p-4">
        <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black text-slate-900"><Clock size={15} className="text-cyan-700" /> Son güncellenen profiller</h3>
        <div className="grid">{recent.map(({ species, at, reason }) => <Row key={species.slug} species={species} meta={timeAgo(at) + " önce " + reason} />)}</div>
      </section>
      <section className="rounded-[28px] border border-slate-200 p-4">
        <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black text-slate-900"><MessageCircle size={15} className="text-cyan-700" /> Son yorumlanan profiller</h3>
        <div className="grid">
          {lastCommented.map((comment) => {
            const species = kb.species.find((item) => item.slug === comment.slug);
            return species ? <Row key={comment.id} species={species} meta={timeAgo(comment.createdAt) + " önce yorumlandı"} /> : null;
          })}
        </div>
      </section>
      <RecentArticles kb={kb} />
    </div>
  );
}

/* Profil kartı için: beslediği türler */
export function KeptSpeciesChips({ slugs, kb, onOpen }) {
  const list = slugs.map((slug) => kb.species.find((item) => item.slug === slug)).filter(Boolean);
  if (!list.length) return <p className="rounded-xl bg-white p-2 text-sm text-slate-500 ring-1 ring-slate-200">Henüz tür eklenmemiş.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((item) => (
        <button key={item.slug} onClick={() => onOpen(item)} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-cyan-50">
          <SpeciesImage species={item} round label={false} className="h-5 w-5 text-[6px]" />
          {item.name}
        </button>
      ))}
    </div>
  );
}
