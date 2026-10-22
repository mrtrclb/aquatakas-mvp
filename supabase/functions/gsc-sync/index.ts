// Aquagram — Google Search Console verisini çekip gsc_* tablolarına yazar.
// Yalnızca ekip üyeleri çağırabilir (yönetim paneli → İstatistikler → Yenile; panel açılınca 12 saatten eskiyse kendiliğinden).
// Gerekli gizli değer: GSC_SERVICE_ACCOUNT = Google Cloud hizmet hesabı JSON anahtarının tamamı.
// Hizmet hesabı Search Console'da https://aquagram.com.tr/ mülküne "Kısıtlı" kullanıcı olarak eklenmiş olmalı.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://aquagram.com.tr/";
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?aquagram\.com\.tr$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

function cors(origin: string | null) {
  const ok = origin && ALLOWED_ORIGINS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "https://aquagram.com.tr",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    Vary: "Origin"
  };
}
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// Hizmet hesabıyla Google erişim belirteci (RS256 imzalı JWT → OAuth token)
async function googleToken(sa: { client_email: string; private_key: string; token_uri?: string }) {
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: tokenUri, iat: now, exp: now + 3600 }));
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + b64url(signature) })
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error("Google kimlik doğrulaması başarısız: " + (body.error_description || body.error || res.status));
  return body.access_token as string;
}

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function query(token: string, startDate: string, endDate: string, dimensions: string[], rowLimit = 100): Promise<Row[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(SITE) + "/searchAnalytics/query", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, dataState: "final" })
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message || String(res.status);
    if (res.status === 403) throw new Error("Search Console izni yok: hizmet hesabını mülke kullanıcı olarak ekleyin. (" + msg + ")");
    throw new Error("Search Console sorgusu başarısız: " + msg);
  }
  return body.rows || [];
}

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Çağıran ekip üyesi mi?
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: role } = await caller.rpc("my_staff_role");
  if (!Array.isArray(role) || !role[0]) return json({ error: "Yetkiniz yok" }, 403, origin);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const raw = Deno.env.get("GSC_SERVICE_ACCOUNT");
  if (!raw) {
    await admin.from("gsc_sync").upsert({ id: 1, synced_at: new Date().toISOString(), ok: false, message: "GSC_SERVICE_ACCOUNT gizli değeri tanımlı değil." });
    return json({ ok: false, error: "GSC_SERVICE_ACCOUNT gizli değeri tanımlı değil." }, 200, origin);
  }

  try {
    const sa = JSON.parse(raw);
    const token = await googleToken(sa);
    // Search Console verisi ~2-3 gün gecikmeli; son 3 günü dışarıda bırak
    const end = day(-3);
    const curStart = day(-30), prevStart = day(-58), prevEnd = day(-31);
    const [daily, ...tops] = await Promise.all([
      query(token, day(-92), end, ["date"], 500),
      query(token, curStart, end, ["query"], 100),
      query(token, prevStart, prevEnd, ["query"], 100),
      query(token, curStart, end, ["page"], 100),
      query(token, prevStart, prevEnd, ["page"], 100),
      query(token, curStart, end, ["device"], 10),
      query(token, prevStart, prevEnd, ["device"], 10),
      query(token, curStart, end, ["country"], 20),
      query(token, prevStart, prevEnd, ["country"], 20)
    ]);
    const kinds: [string, string][] = [["query", "cur"], ["query", "prev"], ["page", "cur"], ["page", "prev"], ["device", "cur"], ["device", "prev"], ["country", "cur"], ["country", "prev"]];
    const topRows = tops.flatMap((rows, i) =>
      rows.map((r) => ({ kind: kinds[i][0], period: kinds[i][1], key: (r.keys || [""])[0].slice(0, 500), clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position }))
    );
    const dailyRows = daily.map((r) => ({ day: (r.keys || [""])[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position }));

    if (dailyRows.length) {
      const { error } = await admin.from("gsc_daily").upsert(dailyRows);
      if (error) throw error;
    }
    const { error: delErr } = await admin.from("gsc_top").delete().neq("kind", "");
    if (delErr) throw delErr;
    if (topRows.length) {
      const { error } = await admin.from("gsc_top").insert(topRows);
      if (error) throw error;
    }
    await admin.from("gsc_sync").upsert({ id: 1, synced_at: new Date().toISOString(), ok: true, message: null, range_start: day(-92), range_end: end });
    return json({ ok: true, days: dailyRows.length, rows: topRows.length }, 200, origin);
  } catch (err) {
    const message = (err as Error).message || String(err);
    await admin.from("gsc_sync").upsert({ id: 1, synced_at: new Date().toISOString(), ok: false, message });
    return json({ ok: false, error: message }, 200, origin);
  }
});
