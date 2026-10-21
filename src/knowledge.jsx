import React, { useEffect, useMemo, useRef, useState } from "react";
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
  MapPin,
  MessageCircle,
  Send,
  Users,
  Search,
  Star,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { Avatar, ImageGrid, Lightbox, MediaComposer, MoreMenu, PageHeader, PostCard, VideoBlock, normalizeTr, timeAgo } from "./community.jsx";
import { DIFFICULTY_COLORS, KB_CATEGORIES, KB_SECTIONS, categoryById, detectSpecies } from "./species.js";
import { supabase, trError } from "./lib/supabase";
import { shrinkImage } from "./lib/listings";
import { useCategoryCovers } from "./lib/settings";

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

export function searchSpecies(species, query) {
  const terms = normalizeTr(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return species.filter((item) => {
    const hay = normalizeTr([item.name, item.latin, ...(item.keywords || []), categoryById(item.category).name].join(" "));
    return terms.every((term) => hay.includes(term));
  });
}

function keepersOf(kb, slug) {
  return Object.entries(kb.keeping)
    .filter(([, slugs]) => slugs.includes(slug))
    .map(([id]) => (/^\d+$/.test(id) ? Number(id) : id));
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
      {label && !round && <span className="absolute bottom-1.5 right-2 rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide">Görsel yakında</span>}
    </div>
  );
}

function DifficultyChip({ value }) {
  return <span className={"rounded-full px-2 py-0.5 text-[11px] font-black " + (DIFFICULTY_COLORS[value] || "bg-slate-100 text-slate-600")}>{value}</span>;
}

function SpeciesCard({ species, kb }) {
  const keepers = keepersOf(kb, species.slug).length;
  const comments = kb.comments.filter((comment) => comment.slug === species.slug).length;
  const me = kb.currentUserId;
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
      <SpeciesImage species={species} className="h-28 text-base" />
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-black leading-snug text-slate-900 group-hover:underline">{species.name}</h3>
          <DifficultyChip value={species.difficulty} />
        </div>
        <p className="mt-0.5 text-xs italic text-slate-500">{species.latin}</p>
        <div className="mt-auto flex items-center gap-3 pt-2 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1"><Fish size={12} /> {keepers} besleyen</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} /> {comments}</span>
          {species.rare && <span className="text-violet-600">💎 nadir</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={(event) => act(event, kb.onToggleKeep)}
            aria-pressed={myKeep}
            title={myKeep ? "Beslediğin türlerden çıkar" : "Beslediğim türlere ekle"}
            className={"flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-black transition " + (myKeep ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-cyan-50 text-cyan-900 hover:bg-cyan-100")}
          >
            {myKeep ? <Check size={12} /> : <Fish size={12} />} Besliyorum
          </button>
          <button
            type="button"
            onClick={(event) => act(event, kb.onToggleFav)}
            aria-pressed={myFav}
            aria-label={myFav ? "Favorilerimden çıkar" : "Favori türlerime ekle"}
            title={myFav ? "Favorilerimden çıkar" : "Favori türlerime ekle"}
            className={"grid w-9 shrink-0 place-items-center rounded-full transition " + (myFav ? "bg-amber-400 text-white hover:bg-amber-500" : "bg-amber-50 text-amber-600 hover:bg-amber-100")}
          >
            <Star size={13} fill={myFav ? "currentColor" : "none"} />
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
          <span className="text-[11px] text-slate-500">{myKeep.length} besliyor · {myFav.length} favori</span>
        </button>
      )}

      <nav className="mt-5 grid gap-1">
        {KB_SECTIONS.map((section) => {
          const cats = KB_CATEGORIES.filter((cat) => cat.section === section.id);
          const isOpen = open === section.id;
          return (
            <div key={section.id}>
              <button onClick={() => { setOpen(isOpen ? null : section.id); kb.openSection(section.id); }} className={"flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-black " + (activeSection === section.id && !route.mine ? "text-cyan-950" : "text-slate-700") + " hover:bg-slate-50"}>
                <span>{section.emoji}</span> <span className="flex-1">{section.name}</span>
                <ChevronRight size={15} className={"text-slate-400 transition " + (isOpen ? "rotate-90" : "")} />
              </button>
              {isOpen && (
                <div className="mb-1 ml-4 grid border-l border-slate-200 pl-2">
                  {cats.map((cat) => (
                    <button key={cat.id} onClick={() => kb.openCategory(cat.id)} className={"flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] font-bold " + (activeCategory === cat.id ? "bg-cyan-50 text-cyan-950" : "text-slate-600 hover:bg-slate-50")}>
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[11px] text-slate-400">{kb.species.filter((item) => item.category === cat.id).length}</span>
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
          <span>🩺 Hastalıklar</span> <span className="text-[11px] font-black text-cyan-800">Gruba git →</span>
        </button>
        <div className="flex items-center justify-between rounded-xl px-2 py-2 text-sm font-bold text-slate-400">
          <span>📚 Makaleler</span> <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black">Yakında</span>
        </div>
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
      <span className="text-[11px] leading-snug text-cyan-900/70">Burada olmayan bir türü bilgileri ve fotoğrafıyla öner; ekip inceleyip ekler.</span>
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
                <span className="text-[11px] font-bold text-slate-400">{count} tür</span>
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
          <p className="text-[11px] font-black uppercase tracking-wide text-white/80">{section.name}</p>
          <h2 className="truncate text-xl font-black leading-tight sm:text-2xl">{category.name}</h2>
        </div>
      </div>
    </div>
  );
}

export function KbCategoryPage({ kb, categoryId }) {
  const category = categoryById(categoryId);
  const [difficulty, setDifficulty] = useState("Tümü");
  const [sort, setSort] = useState("az");
  if (!category) return <p className="p-10 text-center text-sm text-slate-500">Kategori bulunamadı.</p>;
  const list = kb.species
    .filter((item) => item.category === category.id && (difficulty === "Tümü" || item.difficulty === difficulty))
    .sort((a, b) => (sort === "popular" ? keepersOf(kb, b.slug).length - keepersOf(kb, a.slug).length : a.name.localeCompare(b.name, "tr")));
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
          {[["az", "A-Z"], ["popular", "En çok beslenen"]].map(([key, label]) => (
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
          {(kb.keeping[comment.userId] || []).includes(comment.slug) && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Bu türü besliyor</span>}
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
              className="w-full resize-none rounded-2xl border border-cyan-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-full px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100">Vazgeç</button>
              <button onClick={save} disabled={!canSave} className="rounded-full bg-cyan-950 px-4 py-1.5 text-xs font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">Kaydet</button>
            </div>
          </div>
        ) : (
          comment.text && <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">{comment.text}</p>
        )}
        {hasMedia && (
          <div className="max-w-md">
            <ImageGrid images={images} onOpen={(index) => setLightbox(index)} />
            <VideoBlock video={comment.video} />
          </div>
        )}
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
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><Users size={15} /> Bu türü besleyenler <span className="text-slate-400">({sorted.length})</span></h3>
        <span className="text-[11px] font-semibold text-slate-400">Takas, yavru ve deneyim için ulaş</span>
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
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-black text-white">{index + 1}/{images.length}</span>
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
              <Icon size={14} /> {label} <span className="rounded-full bg-white px-1.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{count}</span>
              {tab === key && <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-cyan-700" />}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          {tab === "listings" ? "Bu türle ilgili açık ilan yok." : tab === "posts" ? "Bu türle ilgili paylaşım yok." : "Bu tür hakkında soru sorulmamış."}
          {tab !== "listings" && <> <button onClick={() => ctx.onCompose(null)} className="font-black text-cyan-800 hover:underline">{tab === "questions" ? "İlk soruyu sor" : "İlk paylaşımı yap"}</button></>}
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
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Tür adı geçen ilan ve paylaşımlar buraya otomatik eklenir.</p>
    </section>
  );
}

export function SpeciesPage({ species, kb, ctx, listings, posts }) {
  const [sort, setSort] = useState("newest");
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
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-400">{category.name}</p>
          <h2 className="truncate text-lg font-black leading-tight">{species.name}</h2>
        </div>
      </div>

      {ctx.adsFor && ctx.adsFor("species").length > 0 && (
        <div className="px-4 pt-4 [&>div]:mb-0">
          <ctx.DetailBannerAd ad={ctx.adsFor("species")[species.slug.length % ctx.adsFor("species").length]} />
        </div>
      )}
      <div className="grid gap-4 p-4 sm:grid-cols-[220px_1fr]">
        <SpeciesGallery species={species} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyChip value={species.difficulty} />
            {species.temperament && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">{species.temperament}</span>}
            {species.rare && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-black text-violet-700">💎 Nadir</span>}
          </div>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950">{species.name}</h1>
          <p className="text-sm italic text-slate-500">{species.latin}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{species.desc}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => (ctx.isMember ? kb.onToggleKeep(species.slug) : ctx.onAuth())}
              className={"flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition " + (myKeep ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-cyan-950 text-white hover:bg-cyan-900")}
            >
              {myKeep ? <><Check size={15} /> Besliyorum</> : <><Fish size={15} /> Beslediğim türlere ekle</>}
            </button>
            <button
              onClick={() => (ctx.isMember ? kb.onToggleFav(species.slug) : ctx.onAuth())}
              className={"flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black ring-1 transition " + (myFav ? "bg-amber-50 text-amber-800 ring-amber-300" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")}
            >
              <Star size={15} fill={myFav ? "currentColor" : "none"} /> {myFav ? "Favorilerimde" : "Favori türlerime ekle"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            {keepers.length > 0 && (
              <span className="flex -space-x-2">
                {keepers.filter((id) => ctx.users[id]).slice(0, 5).map((id) => <span key={id} className="rounded-full ring-2 ring-white"><Avatar user={ctx.users[id]} size={24} onClick={() => ctx.onProfile(ctx.users[id])} /></span>)}
              </span>
            )}
            <span><strong className="text-slate-900">{keepers.length}</strong> üye bu türü besliyor</span>
          </div>
        </div>
      </div>

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
        <p className="px-4 py-2 text-[11px] text-slate-400">Değerler hobide yaygın kabul gören aralıklardır; hat, lokasyon ve bireye göre değişebilir.</p>
      </section>

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
            {label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{count}</span>
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

export function KbWidgets({ kb }) {
  const recent = kb.species.slice().sort((a, b) => b.addedAt - a.addedAt).slice(0, 6);
  const lastCommented = [];
  kb.comments
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((comment) => {
      if (lastCommented.length < 6 && !lastCommented.some((item) => item.slug === comment.slug)) lastCommented.push(comment);
    });

  const Row = ({ species, meta }) => (
    <button onClick={() => kb.openSpecies(species)} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-slate-50">
      <SpeciesImage species={species} round label={false} className="h-9 w-9 shrink-0 text-[9px]" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black text-slate-800">{species.name}</span>
        <span className="block truncate text-[11px] text-slate-400">{meta}</span>
      </span>
    </button>
  );

  return (
    <div className="mt-4 grid gap-4">
      <section className="rounded-[28px] border border-slate-200 p-4">
        <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black text-slate-900"><Clock size={15} className="text-cyan-700" /> Son eklenen profiller</h3>
        <div className="grid">{recent.map((item) => <Row key={item.slug} species={item} meta={item.latin} />)}</div>
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
