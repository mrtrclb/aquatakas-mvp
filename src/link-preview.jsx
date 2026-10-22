import React, { useEffect, useState } from "react";
import { ExternalLink, Globe, Loader2, Play } from "lucide-react";

// Paylaşım metnindeki bağlantılar için önizleme kartı (YouTube, X, Instagram, Facebook, TikTok ve diğer siteler)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kqgcaegwewdsivkbrjjr.supabase.co";
const ENDPOINT = SUPABASE_URL + "/functions/v1/link-preview?url=";

export const URL_RE = /https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?…]/gi;

// Metindeki ilk bağlantı (yoksa null)
export function firstUrl(text) {
  const match = String(text || "").match(URL_RE);
  return match ? match[0] : null;
}

export function youTubeId(url) {
  const m = (url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const PLATFORMS = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, { name: "YouTube", color: "bg-red-600", short: "▶" }],
  [/(^|\.)(x|twitter)\.com$/, { name: "X (Twitter)", color: "bg-slate-950", short: "𝕏" }],
  [/(^|\.)instagram\.com$/, { name: "Instagram", color: "bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600", short: "IG" }],
  [/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/, { name: "Facebook", color: "bg-blue-600", short: "f" }],
  [/(^|\.)tiktok\.com$/, { name: "TikTok", color: "bg-slate-900", short: "♪" }],
  [/(^|\.)vimeo\.com$/, { name: "Vimeo", color: "bg-sky-500", short: "v" }]
];

export function platformOf(url) {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\.|^m\./, "").toLowerCase();
  } catch (err) {
    return null;
  }
  const hit = PLATFORMS.find(([re]) => re.test(host));
  return { host, ...(hit ? hit[1] : { name: host, color: "bg-cyan-900", short: null }), known: Boolean(hit) };
}

// Sayfa başına önbellek + aynı adres için tek istek
const cache = new Map();
function loadPreview(url) {
  if (cache.has(url)) return cache.get(url);
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem("aq-lp:" + url) || "null");
  } catch (err) {
    stored = null;
  }
  const promise = stored
    ? Promise.resolve(stored)
    : fetch(ENDPOINT + encodeURIComponent(url))
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            try {
              sessionStorage.setItem("aq-lp:" + url, JSON.stringify(data));
            } catch (err) {
              // depolama dolu ya da kapalı
            }
          }
          return data;
        })
        .catch(() => null);
  cache.set(url, promise);
  return promise;
}

export function useLinkPreview(url) {
  const [state, setState] = useState({ url: null, data: null, loading: false });
  useEffect(() => {
    if (!url) {
      setState({ url: null, data: null, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState({ url, data: null, loading: true });
    loadPreview(url).then((data) => {
      if (!cancelled) setState({ url, data, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state.url === url ? state : { url, data: null, loading: Boolean(url) };
}

function pathLabel(url) {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, "");
    return path && path !== "/" ? path.slice(0, 60) : "";
  } catch (err) {
    return "";
  }
}

// Paylaşımda gösterilen kart. compact: yazarken (composer) gösterilen küçük sürüm
export function LinkPreviewCard({ url, compact = false, onRemove }) {
  const platform = platformOf(url);
  const { data, loading } = useLinkPreview(url);
  const [playing, setPlaying] = useState(false);
  if (!platform) return null;
  const ytId = youTubeId(url);
  const title = (data && data.title) || "";
  const description = (data && data.description) || "";
  const image = (data && data.image) || (ytId ? "https://img.youtube.com/vi/" + ytId + "/hqdefault.jpg" : "");
  const site = (data && data.site) || platform.name;
  const stop = (event) => event.stopPropagation();

  // YouTube: oynatılabilir video kartı
  if (ytId && !compact) {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white" onClick={stop}>
        <div className="bg-black">
          {playing ? (
            <iframe title={title || "YouTube videosu"} src={"https://www.youtube-nocookie.com/embed/" + ytId + "?autoplay=1"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full" />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="relative block aspect-video w-full" aria-label="Videoyu oynat">
              <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-0 grid place-items-center bg-slate-950/20">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-lg"><Play size={26} fill="currentColor" /></span>
              </span>
            </button>
          )}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="block px-3 py-2 hover:bg-slate-50">
          <span className="block text-[12px] font-black uppercase tracking-wide text-slate-400">YouTube{data && data.author ? " · " + data.author : ""}</span>
          <span className="line-clamp-2 text-sm font-black text-slate-900">{title || "YouTube videosu"}</span>
        </a>
      </div>
    );
  }

  const showImage = image && !compact;
  const fallbackTitle = platform.known ? platform.name + " gönderisi" : platform.host;
  return (
    <div className={"relative overflow-hidden rounded-2xl border border-slate-200 bg-white " + (compact ? "mb-3" : "mt-3")} onClick={stop}>
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={"flex hover:bg-slate-50 " + (showImage && !platform.known ? "flex-col" : "items-stretch")}>
        {showImage ? (
          platform.known ? (
            <img src={image} alt="" loading="lazy" className="w-28 shrink-0 object-cover sm:w-36" />
          ) : (
            <img src={image} alt="" loading="lazy" className="aspect-[1.91/1] w-full object-cover" />
          )
        ) : (
          <span className={"grid w-16 shrink-0 place-items-center text-xl font-black text-white " + platform.color} aria-hidden="true">
            {platform.short || <Globe size={22} />}
          </span>
        )}
        <span className={"min-w-0 flex-1 px-3 py-2.5 " + (onRemove ? "pr-10" : "")}>
          <span className="flex items-center gap-1 text-[12px] font-black uppercase tracking-wide text-slate-400">
            {platform.known && (showImage || compact) && <span className={"inline-block h-2 w-2 rounded-full " + platform.color} />}
            {site}
            {loading && <Loader2 size={11} className="animate-spin" />}
          </span>
          <span className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{title || (loading ? "Önizleme hazırlanıyor…" : fallbackTitle)}</span>
          {description ? (
            <span className={"mt-0.5 text-xs leading-relaxed text-slate-500 " + (compact ? "line-clamp-1" : "line-clamp-2")}>{description}</span>
          ) : (
            !loading && <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">{platform.host + pathLabel(url)} <ExternalLink size={11} className="shrink-0" /></span>
          )}
        </span>
      </a>
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-0.5 text-xs font-black text-white hover:bg-slate-950" title="Önizlemeyi kaldır">
          ✕
        </button>
      )}
    </div>
  );
}
