import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Bilgi Bankası makaleleri. Liste hafif sütunlarla bir kez yüklenir; gövde detay açılınca çekilir.
const LIST_COLS = "id, slug, title, excerpt, cover_url, species_slugs, status, published_at";
const FULL_COLS = LIST_COLS + ", body, footnotes, sources, updated_at";

export function mapArticle(row) {
  return {
    dbId: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    cover: row.cover_url || null,
    speciesSlugs: row.species_slugs || [],
    status: row.status,
    publishedAt: row.published_at ? new Date(row.published_at).getTime() : Date.now(),
    ...(row.body !== undefined
      ? {
          body: row.body || "",
          footnotes: Array.isArray(row.footnotes) ? row.footnotes : [],
          sources: Array.isArray(row.sources) ? row.sources : [],
          updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null
        }
      : {})
  };
}

export function useArticles() {
  const [list, setList] = useState(null);
  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("articles")
      .select(LIST_COLS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1000);
    if (!error) setList((data || []).map(mapArticle));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { list: list || [], loaded: list !== null, reload };
}

const fullCache = new Map();
export function useArticle(slug) {
  const [state, setState] = useState(() => (fullCache.has(slug) ? { article: fullCache.get(slug), loading: false } : { article: null, loading: true }));
  useEffect(() => {
    let alive = true;
    if (fullCache.has(slug)) {
      setState({ article: fullCache.get(slug), loading: false });
      return undefined;
    }
    setState({ article: null, loading: true });
    supabase
      .from("articles")
      .select(FULL_COLS)
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const article = data ? mapArticle(data) : null;
        if (article) fullCache.set(slug, article);
        setState({ article, loading: false });
      });
    return () => { alive = false; };
  }, [slug]);
  return state;
}
export function forgetArticle(slug) {
  fullCache.delete(slug);
}

export function readingMinutes(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function articleDate(ms) {
  return new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

// Metni "## Başlık" satırları ve boş satırla ayrılmış paragraflara böler
export function articleBlocks(body) {
  return String(body || "")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (chunk.startsWith("## ") ? { type: "h", text: chunk.slice(3).trim() } : { type: "p", text: chunk }));
}

export function slugifyTr(text) {
  return String(text || "")
    .replace(/['’]/g, "")
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıIİ]/g, "i").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}
