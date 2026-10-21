import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const AD_PLACEMENTS = {
  feed: { label: "Akış içi", hint: "Ana sayfa, topluluk ve ilan akışında her birkaç gönderide bir" },
  sidebar: { label: "Yan sütun", hint: "Sağ sütunun en üstünde, masaüstünde sürekli görünür" },
  detail: { label: "İlan detayı", hint: "İlan detay sayfasının üstünde geniş şerit" }
};

export function mapAd(row) {
  return {
    id: "db-ad-" + row.id,
    dbId: row.id,
    brand: row.brand,
    title: row.title,
    text: row.text || "",
    cta: row.cta || "İncele",
    image: row.image_url || null,
    url: row.target_url || null,
    placement: row.placement
  };
}

// Şu an yayında olan reklamlar (onaylı ve süresi dolmamış), yerleşime göre gruplu
export function useLiveAds() {
  const [ads, setAds] = useState({ feed: [], sidebar: [], detail: [] });
  useEffect(() => {
    let cancelled = false;
    const nowIso = new Date().toISOString();
    supabase
      .from("ads")
      .select("id, brand, title, text, cta, image_url, target_url, placement, starts_at, ends_at")
      .eq("status", "approved")
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .limit(60)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const next = { feed: [], sidebar: [], detail: [] };
        // Her yüklemede farklı sırada: reklam verenler arasında adil dağılım
        data
          .map((row) => ({ row, key: Math.random() }))
          .sort((a, b) => a.key - b.key)
          .forEach(({ row }) => next[row.placement] && next[row.placement].push(mapAd(row)));
        setAds(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ads;
}

// Gösterim: aynı reklam bir oturumda bir kez sayılır
const seen = new Set();
export function trackAdImpression(ad) {
  if (!ad || !ad.dbId || seen.has(ad.dbId)) return;
  seen.add(ad.dbId);
  supabase.rpc("track_ad", { p_id: ad.dbId, p_click: false }).then(() => {}, () => {});
}

export function openAd(ad) {
  if (!ad) return;
  if (ad.dbId) supabase.rpc("track_ad", { p_id: ad.dbId, p_click: true }).then(() => {}, () => {});
  if (ad.url && /^https?:\/\//.test(ad.url)) window.open(ad.url, "_blank", "noopener,noreferrer");
}
