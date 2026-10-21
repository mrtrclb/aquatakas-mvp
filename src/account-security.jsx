import React, { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { supabase, siteUrl, trError } from "./lib/supabase";
import { useCaptcha } from "./lib/captcha";

// Hesabım → Hesap güvenliği: e-posta adresini ve şifreyi değiştirme
export function AccountSecurity({ auth, onToast }) {
  const [tab, setTab] = useState(null); // "email" | "password" | null
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-lg font-black">Hesap güvenliği</h3>
      <div className="grid gap-2">
        <Row icon={<Mail size={16} />} title="E-posta adresi" value={auth.email} open={tab === "email"} onToggle={() => setTab(tab === "email" ? null : "email")} action="Değiştir" />
        {auth.user && auth.user.new_email && (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <b>{auth.user.new_email}</b> adresine geçiş bekliyor. Onay bağlantılarına tıklayınca değişiklik tamamlanır.
          </p>
        )}
        {tab === "email" && <EmailForm auth={auth} onDone={(message) => { setTab(null); onToast(message); }} />}
        <Row icon={<KeyRound size={16} />} title="Şifre" value="••••••••" open={tab === "password"} onToggle={() => setTab(tab === "password" ? null : "password")} action="Değiştir" />
        {tab === "password" && <PasswordForm auth={auth} onDone={(message) => { setTab(null); onToast(message); }} />}
      </div>
    </div>
  );
}

function Row({ icon, title, value, open, onToggle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-slate-700">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0"><div className="font-black">{title}</div><div className="break-all text-xs text-slate-500">{value}</div></div>
      </div>
      <button type="button" onClick={onToggle} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-100">
        {open ? "Vazgeç" : action}
      </button>
    </div>
  );
}

const field = "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-700";

// Mevcut şifreyi doğrular (oturumu değiştirmeden aynı kullanıcıyla yeniden giriş)
async function checkPassword(email, password, captcha) {
  const captchaToken = await captcha.getToken();
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error) throw new Error(/invalid login credentials/i.test(error.message) ? "Mevcut şifren hatalı." : error.message);
}

function EmailForm({ auth, onDone }) {
  const captcha = useCaptcha();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = email.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next) && next !== (auth.email || "").toLowerCase() && password.length >= 6;

  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await checkPassword(auth.email, password, captcha);
      const { error: err } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: siteUrl() });
      if (err) throw err;
      onDone("Onay bağlantısı gönderildi. Hem eski hem yeni adresine gelen e-postalardaki bağlantıya tıkla; ikisi de onaylanınca e-postan değişir.");
    } catch (err) {
      setError(err.message === "Mevcut şifren hatalı." ? err.message : trError(err));
    }
    captcha.reset();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-slate-200 p-3">
      <label className="grid gap-1 text-xs font-black text-slate-500">Yeni e-posta adresi
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={field} placeholder="yeni@ornek.com" required />
      </label>
      <label className="grid gap-1 text-xs font-black text-slate-500">Mevcut şifren
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={field} required />
      </label>
      <p className="text-xs leading-relaxed text-slate-500">Güvenliğin için eski ve yeni adresine birer onay e-postası gider. İkisi de onaylanana kadar mevcut adresinle giriş yapmaya devam edersin.</p>
      <div ref={captcha.box} className="flex justify-center empty:hidden" />
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
      <button type="submit" disabled={!valid || busy} className="flex items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
        {busy && <Loader2 size={15} className="animate-spin" />} Onay bağlantısı gönder
      </button>
    </form>
  );
}

function PasswordForm({ auth, onDone }) {
  const captcha = useCaptcha();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mismatch = again.length > 0 && again !== next;
  const valid = current.length >= 6 && next.length >= 8 && next === again && next !== current;

  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await checkPassword(auth.email, current, captcha);
      const { error: err } = await supabase.auth.updateUser({ password: next });
      if (err) throw err;
      onDone("Şifren değiştirildi.");
    } catch (err) {
      setError(err.message === "Mevcut şifren hatalı." ? err.message : trError(err));
    }
    captcha.reset();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-slate-200 p-3">
      <label className="grid gap-1 text-xs font-black text-slate-500">Mevcut şifre
        <input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" className={field} required />
      </label>
      <label className="grid gap-1 text-xs font-black text-slate-500">Yeni şifre (en az 8 karakter)
        <input type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" className={field} minLength={8} required />
      </label>
      <label className="grid gap-1 text-xs font-black text-slate-500">Yeni şifre (tekrar)
        <input type="password" value={again} onChange={(event) => setAgain(event.target.value)} autoComplete="new-password" className={field} required />
      </label>
      {mismatch && <p className="text-xs font-bold text-red-600">Şifreler aynı değil.</p>}
      <div ref={captcha.box} className="flex justify-center empty:hidden" />
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
      <button type="submit" disabled={!valid || busy} className="flex items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
        {busy && <Loader2 size={15} className="animate-spin" />} Şifreyi değiştir
      </button>
    </form>
  );
}
