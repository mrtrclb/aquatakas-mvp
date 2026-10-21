import React, { useEffect, useRef } from "react";

// Öne çıkan ilan ve reklam rotasyonu: bu ziyaretçiye en az gösterilen önce, eşitlerde rastgele.
// Sayaçlar ziyaretçinin tarayıcısında tutulur; sayfa her yüklendiğinde sıra yeniden hesaplanır.
const STORE = "aq_rotation_v1";
const MAX_KEYS = 400;
let counts = {};
try {
  counts = JSON.parse(localStorage.getItem(STORE) || "{}") || {};
} catch {
  counts = {};
}
// Sayfa yüklenirken alınan anlık görüntü: oturum içinde görüldükçe liste sırası zıplamasın
const snapshot = JSON.parse(JSON.stringify(counts));
const ties = new Map();
const marked = new Set();

function tie(key) {
  if (!ties.has(key)) ties.set(key, Math.random());
  return ties.get(key);
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(counts));
  } catch {
    /* gizli sekme vb. — sayaçlar yalnızca bellekte kalır */
  }
}

export function seenCount(kind, id, live = false) {
  const src = live ? counts : snapshot;
  return (src[kind] && src[kind][String(id)]) || 0;
}

// Liste sırası: az görülen önce, eşitlerde bu sayfa yüklemesine özgü rastgele sıra
export function rotate(items, kind, idOf = (item) => item.id) {
  return items
    .slice()
    .sort((a, b) => seenCount(kind, idOf(a)) - seenCount(kind, idOf(b)) || tie(kind + ":" + idOf(a)) - tie(kind + ":" + idOf(b)));
}

// Tek gösterimlik alan (detay şeridi): o an en az görülenlerden biri; aynı sayfa için sabit kalır
export function pickLeastSeen(items, kind, salt = "", idOf = (item) => item.id) {
  if (!items.length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const item of items) {
    const score = seenCount(kind, idOf(item), true) + tie(kind + ":" + idOf(item) + ":" + salt) * 0.999;
    if (score < bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

// Bir öğe ekranda görüldüğünde sayacı artar (sayfa yüklemesi başına bir kez)
export function markSeen(kind, id) {
  if (id == null) return;
  const key = kind + ":" + id;
  if (marked.has(key)) return;
  marked.add(key);
  const bucket = counts[kind] || (counts[kind] = {});
  bucket[String(id)] = (bucket[String(id)] || 0) + 1;
  if (Object.keys(bucket).length > MAX_KEYS) counts[kind] = { [String(id)]: bucket[String(id)] };
  save();
}

// Kartın içine konan görünmez işaretçi: kart ekranda görünürse sayılır (kapsayıcı "relative" olmalı)
export function SeenMarker({ kind, id, enabled = true }) {
  const ref = useSeenOnView(kind, id, enabled);
  return enabled ? React.createElement("span", { ref, "aria-hidden": true, className: "pointer-events-none absolute inset-0" }) : null;
}

// Öğe en az yarısı görünür olduğunda "görüldü" sayılır
export function useSeenOnView(kind, id, enabled = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled || id == null) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      markSeen(kind, id);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          markSeen(kind, id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [kind, id, enabled]);
  return ref;
}
