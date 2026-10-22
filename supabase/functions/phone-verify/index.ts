// Aquagram — SMS ile telefon doğrulaması (Firebase Phone Auth)
// POST { action: "start", phone }  → şartları ve sınırları kontrol eder (SMS'i tarayıcı Firebase ile gönderir)
// POST { action: "complete", idToken } → Firebase kimlik belgesini doğrular, numara eşleşirse mavi tik verilir
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const FIREBASE_PROJECT = "aquagram-tr";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
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
const json = (body: unknown, origin: string | null, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

function e164(phone: string) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? "+90" + d : null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, origin, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: auth } = await caller.auth.getUser();
  if (!auth || !auth.user) return json({ error: "Giriş yapmalısın." }, origin, 401);

  let input: { action?: string; phone?: string; idToken?: string } = {};
  try { input = await req.json(); } catch { /* boş */ }

  if (input.action === "start") {
    const phone = e164(input.phone || "");
    if (!phone) return json({ error: "Geçerli bir cep telefonu numarası gir (5xx xxx xx xx)." }, origin);
    const { error } = await caller.rpc("whatsapp_otp_start", { p_phone: phone });
    if (error) return json({ error: error.message }, origin);
    return json({ ok: true, phone }, origin);
  }

  // SMS gönderilemediyse (Firebase hatası) son kayıt geri alınır; deneme günlük haktan düşmez
  if (input.action === "undo") {
    const phone = e164(input.phone || "");
    if (!phone) return json({ ok: true }, origin);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    await admin.rpc("whatsapp_otp_undo", { p_user: auth.user.id, p_phone: phone });
    return json({ ok: true }, origin);
  }

  if (input.action === "complete") {
    let phone: string | null = null;
    try {
      const { payload } = await jwtVerify(String(input.idToken || ""), JWKS, {
        issuer: "https://securetoken.google.com/" + FIREBASE_PROJECT,
        audience: FIREBASE_PROJECT
      });
      phone = e164(String((payload as Record<string, unknown>).phone_number || ""));
    } catch (err) {
      console.error("firebase token", (err as Error).message);
      return json({ error: "Doğrulama belgesi geçersiz. Yeni kod iste." }, origin);
    }
    if (!phone) return json({ error: "Doğrulanan numara okunamadı." }, origin);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { error } = await admin.rpc("whatsapp_otp_complete", { p_user: auth.user.id, p_phone: phone });
    if (error) return json({ error: error.message }, origin);
    return json({ ok: true, verified: true }, origin);
  }

  return json({ error: "Geçersiz istek." }, origin, 400);
});
