import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Herkese açık site ayarları (duyuru, topluluk kuralları); yönetim panelinden değişir
export function useSiteSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["announcement", "community_rules"])
      .then(({ data }) => {
        if (!cancelled && data) setSettings(Object.fromEntries(data.map((row) => [row.key, row.value])));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return settings;
}

// Bilgi Bankası kategori kapak görselleri: { kategoriId: url } (yönetim panelinden yüklenir)
let coversCache = null;
let coversPromise = null;
export function loadCategoryCovers(force = false) {
  if (!force && coversCache) return Promise.resolve(coversCache);
  if (!force && coversPromise) return coversPromise;
  coversPromise = supabase
    .from("site_settings")
    .select("value")
    .eq("key", "category_covers")
    .maybeSingle()
    .then(({ data }) => {
      coversCache = data && data.value && typeof data.value === "object" ? data.value : {};
      window.dispatchEvent(new CustomEvent("aq:category-covers"));
      return coversCache;
    })
    .catch(() => (coversCache = coversCache || {}));
  return coversPromise;
}
export function useCategoryCovers() {
  const [covers, setCovers] = useState(coversCache || {});
  useEffect(() => {
    const sync = () => setCovers(coversCache || {});
    window.addEventListener("aq:category-covers", sync);
    loadCategoryCovers().then(sync);
    return () => window.removeEventListener("aq:category-covers", sync);
  }, []);
  return covers;
}
