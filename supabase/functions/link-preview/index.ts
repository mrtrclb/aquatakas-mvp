// Aquagram — bağlantı önizlemesi: bir web sayfasının başlık, açıklama ve görselini (Open Graph) döndürür.
// Yalnızca herkese açık http(s) adresleri; yerel/özel ağ adresleri engellenir. Yanıtlar 1 gün önbelleğe alınabilir.

const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?aquagram\.com\.tr$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const MAX_BYTES = 600_000;
const TIMEOUT_MS = 6000;

function cors(origin: string | null) {
  const ok = origin && ALLOWED_ORIGINS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "https://aquagram.com.tr",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    Vary: "Origin"
  };
}

function json(body: unknown, status: number, origin: string | null, cache = true) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache ? "public, max-age=86400" : "no-store" }
  });
}

// Özel/yerel ağ adreslerini engelle (SSRF koruması)
function isPrivateHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (h.includes(":")) return h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:");
  return !h.includes(".");
}

async function resolvesPublic(host: string) {
  if (isPrivateHost(host)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return true;
  // deno-lint-ignore no-explicit-any
  const resolve = (Deno as any).resolveDns as undefined | ((h: string, t: string) => Promise<string[]>);
  if (typeof resolve !== "function") return true; // DNS sorgusu desteklenmiyorsa ad kontrolü yeterli
  let records: string[] = [];
  let failures = 0;
  for (const type of ["A", "AAAA"]) {
    try {
      records = records.concat(await resolve(host, type));
    } catch (err) {
      failures += 1;
      const name = err && typeof err === "object" ? String((err as Error).name) : "";
      if (name === "PermissionDenied" || name === "NotSupported" || name === "NotCapable") return true;
    }
  }
  if (!records.length) return failures < 2; // her iki sorgu da hata verdiyse adres yok sayılır
  return records.every((ip) => !isPrivateHost(ip));
}

function decode(text: string) {
  return text
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ").trim();
}

function meta(html: string, keys: string[]) {
  for (const key of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=(["'])([\\s\\S]*?)\\1`, "i");
    const re2 = new RegExp(`<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]*(?:property|name)=["']${key}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m && m[2].trim()) return decode(m[2]);
  }
  return "";
}

const clip = (text: string, n: number) => (text.length > n ? text.slice(0, n - 1).trimEnd() + "…" : text);

async function fetchLimited(url: string, accept = "text/html,application/xhtml+xml") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = url;
    for (let hop = 0; hop < 4; hop++) {
      const target = new URL(current);
      if (!/^https?:$/.test(target.protocol) || !(await resolvesPublic(target.hostname))) throw new Error("blocked");
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AquagramBot/1.0; +https://aquagram.com.tr)", Accept: accept, "Accept-Language": "tr,en;q=0.8" }
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, current).toString();
        continue;
      }
      if (!res.ok || !res.body) throw new Error("status " + res.status);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (size < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      reader.cancel().catch(() => {});
      const buf = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) { buf.set(c.subarray(0, Math.min(c.length, size - offset)), offset); offset += c.length; if (offset >= size) break; }
      return { finalUrl: current, text: new TextDecoder("utf-8", { fatal: false }).decode(buf), type: res.headers.get("content-type") || "" };
    }
    throw new Error("redirects");
  } finally {
    clearTimeout(timer);
  }
}

// Platformların resmi oEmbed uçları (sayfayı kazımaktan daha güvenilir)
const OEMBED: [RegExp, (u: string) => string][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, (u) => "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(u)],
  [/(^|\.)(twitter|x)\.com$/, (u) => "https://publish.twitter.com/oembed?omit_script=1&dnt=1&url=" + encodeURIComponent(u.replace("//x.com", "//twitter.com"))],
  [/(^|\.)vimeo\.com$/, (u) => "https://vimeo.com/api/oembed.json?url=" + encodeURIComponent(u)],
  [/(^|\.)tiktok\.com$/, (u) => "https://www.tiktok.com/oembed?url=" + encodeURIComponent(u)]
];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "GET") return json({ error: "method" }, 405, origin, false);

  const raw = new URL(req.url).searchParams.get("url") || "";
  let target: URL;
  try {
    target = new URL(raw);
    if (!/^https?:$/.test(target.protocol) || raw.length > 2000 || isPrivateHost(target.hostname)) throw new Error();
  } catch {
    return json({ error: "Geçersiz adres" }, 400, origin, false);
  }
  const host = target.hostname.replace(/^www\./, "").toLowerCase();
  const base = { url: target.toString(), host, site: host, title: "", description: "", image: "", author: "" };

  try {
    const oembed = OEMBED.find(([re]) => re.test(host));
    if (oembed) {
      const { text } = await fetchLimited(oembed[1](target.toString()), "application/json");
      const data = JSON.parse(text);
      const tweet = typeof data.html === "string" && /twitter/.test(host + data.provider_name)
        ? decode(String(data.html).replace(/<a[^>]*>pic\.twitter\.com[^<]*<\/a>/g, "").match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1]?.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "") || "")
        : "";
      return json({
        ...base,
        site: data.provider_name || host,
        title: clip(decode(String(tweet ? (data.author_name || "") : data.title || "")), 160),
        description: clip(tweet, 300),
        image: data.thumbnail_url || "",
        author: data.author_name || ""
      }, 200, origin);
    }

    const { finalUrl, text, type } = await fetchLimited(target.toString());
    if (!/html/i.test(type)) return json(base, 200, origin);
    const head = text.slice(0, 200_000);
    const title = meta(head, ["og:title", "twitter:title"]) || decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description = meta(head, ["og:description", "twitter:description", "description"]);
    let image = meta(head, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    if (image) {
      try { image = new URL(image, finalUrl).toString(); } catch { image = ""; }
      if (!/^https:\/\//.test(image)) image = "";
    }
    return json({
      ...base,
      site: meta(head, ["og:site_name", "application-name"]) || host,
      title: clip(title, 160),
      description: clip(description, 300),
      image
    }, 200, origin);
  } catch {
    // Sayfa okunamazsa (giriş duvarı, zaman aşımı) yalnızca alan adı döner; istemci basit kart gösterir
    return json(base, 200, origin);
  }
});
