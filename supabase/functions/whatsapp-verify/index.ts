// Aquagram — WhatsApp ile telefon doğrulaması (Twilio Verify, yalnızca WhatsApp kanalı)
// POST { action: "send", phone }  → şartları ve sınırları kontrol eder, WhatsApp'tan 6 haneli kod gönderir
// POST { action: "check", phone, code } → kodu Twilio'ya doğrulatır, onaylanırsa mavi tik verilir
// Gizli değerler: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID
import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function twilio(path: string, params: Record<string, string>) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const service = Deno.env.get("TWILIO_VERIFY_SID")!;
  const res = await fetch("https://verify.twilio.com/v2/Services/" + service + path, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(sid + ":" + token), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, origin, 405);
  if (!Deno.env.get("TWILIO_ACCOUNT_SID") || !Deno.env.get("TWILIO_AUTH_TOKEN") || !Deno.env.get("TWILIO_VERIFY_SID")) {
    return json({ error: "WhatsApp doğrulaması henüz yapılandırılmadı." }, origin);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: auth } = await caller.auth.getUser();
  if (!auth || !auth.user) return json({ error: "Giriş yapmalısın." }, origin, 401);

  let input: { action?: string; phone?: string; code?: string } = {};
  try { input = await req.json(); } catch { /* boş */ }
  const phone = e164(input.phone || "");
  if (!phone) return json({ error: "Geçerli bir cep telefonu numarası gir (5xx xxx xx xx)." }, origin);

  if (input.action === "send") {
    // Şartlar ve sınırlar veritabanında (üyenin kendi oturumuyla)
    const { error } = await caller.rpc("whatsapp_otp_start", { p_phone: phone });
    if (error) return json({ error: error.message }, origin);
    const r = await twilio("/Verifications", { To: phone, Channel: "whatsapp", Locale: "tr" });
    if (!r.ok) {
      console.error("twilio send", r.status, JSON.stringify(r.body));
      const msg = r.body && r.body.code === 60200 ? "Numara geçersiz görünüyor." : r.body && r.body.code === 60203 ? "Bu numaraya çok fazla kod gönderildi, biraz sonra tekrar dene." : "WhatsApp mesajı gönderilemedi. Numaranda WhatsApp olduğundan emin ol.";
      return json({ error: msg }, origin);
    }
    return json({ ok: true }, origin);
  }

  if (input.action === "check") {
    const code = String(input.code || "").replace(/\D/g, "");
    if (!/^\d{4,10}$/.test(code)) return json({ error: "Kodu eksiksiz gir." }, origin);
    const r = await twilio("/VerificationCheck", { To: phone, Code: code });
    if (!r.ok) {
      console.error("twilio check", r.status, JSON.stringify(r.body));
      return json({ error: r.status === 404 ? "Kodun süresi doldu. Yeni kod iste." : "Kod doğrulanamadı. Tekrar dene." }, origin);
    }
    if (r.body.status !== "approved") return json({ error: "Kod hatalı. Tekrar dene." }, origin);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { error } = await admin.rpc("whatsapp_otp_complete", { p_user: auth.user.id, p_phone: phone });
    if (error) return json({ error: error.message }, origin);
    return json({ ok: true, verified: true }, origin);
  }

  return json({ error: "Geçersiz istek." }, origin, 400);
});
