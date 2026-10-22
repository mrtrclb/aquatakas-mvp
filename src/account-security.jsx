import React, { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { supabase, siteUrl, trError } from "./lib/supabase";
import { useCaptcha } from "./lib/captcha";

// Hesabım → Hesap güvenliği: e-posta adresini ve şifreyi değiştirme
export function AccountSecurity({ auth, onToast }) {
  const [tab, setTab] = useState(null); // "email" | "password" | null
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-black text-slate-950 sm:text-xl">Hesap güvenliği</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">Giriş için kullandığın e-posta adresi ve şifre.</p>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Row icon={<Mail size={18} />} title="E-posta adresi" value={auth.email} open={tab === "email"} onToggle={() => setTab(tab === "email" ? null : "email")} action="Değiştir" />
        <Row icon={<KeyRound size={18} />} title="Şifre" value="••••••••" open={tab === "password"} onToggle={() => setTab(tab === "password" ? null : "password")} action="Değiştir" />
      </div>
      {auth.user && auth.user.new_email && (
        <p className="mt-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <b>{auth.user.new_email}</b> adresine geçiş bekliyor. Onay bağlantılarına tıklayınca değişiklik tamamlanır.
        </p>
      )}
      {tab === "email" && <div className="mt-3"><EmailForm auth={auth} onDone={(message) => { setTab(null); onToast(message); }} /></div>}
      {tab === "password" && <div className="mt-3"><PasswordForm auth={auth} onDone={(message) => { setTab(null); onToast(message); }} /></div>}
    </section>
  );
}

function Row({ icon, title, value, open, onToggle, action }) {
  return (
    <div className={"flex items-center justify-between gap-3 rounded-2xl p-3.5 " + (open ? "bg-cyan-50 ring-1 ring-cyan-100" : "bg-slate-50")}>
      <div className="flex min-w-0 flex-1 items-center gap-3 text-slate-700">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">{icon}</span>
        <div className="min-w-0"><div className="text-[15px] font-black text-slate-800">{title}</div><div className="break-all text-sm text-slate-500">{value}</div></div>
      </div>
      <button type="button" onClick={onToggle} className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">
        {open ? "Vazgeç" : action}
      </button>
    </div>
  );
}

const field = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-normal text-slate-900 outline-none focus:border-cyan-700";

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
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <label className="grid gap-1.5 text-sm font-bold text-slate-600">Yeni e-posta adresi
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={field} placeholder="yeni@ornek.com" required />
      </label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-600">Mevcut şifren
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={field} required />
      </label>
      <p className="text-sm leading-relaxed text-slate-500">Güvenliğin için eski ve yeni adresine birer onay e-postası gider. İkisi de onaylanana kadar mevcut adresinle giriş yapmaya devam edersin.</p>
      <div ref={captcha.box} className="flex justify-center empty:hidden" />
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
      <button type="submit" disabled={!valid || busy} className="flex items-center justify-center gap-2 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40 sm:justify-self-end">
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
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 p-4">
      <label className="grid gap-1.5 text-sm font-bold text-slate-600">Mevcut şifre
        <input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" className={field} required />
      </label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-600">Yeni şifre (en az 8 karakter)
        <input type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" className={field} minLength={8} required />
      </label>
      <label className="grid gap-1.5 text-sm font-bold text-slate-600">Yeni şifre (tekrar)
        <input type="password" value={again} onChange={(event) => setAgain(event.target.value)} autoComplete="new-password" className={field} required />
      </label>
      {mismatch && <p className="text-xs font-bold text-red-600">Şifreler aynı değil.</p>}
      <div ref={captcha.box} className="flex justify-center empty:hidden" />
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
      <button type="submit" disabled={!valid || busy} className="flex items-center justify-center gap-2 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40 sm:justify-self-end">
        {busy && <Loader2 size={15} className="animate-spin" />} Şifreyi değiştir
      </button>
    </form>
  );
}

// Hesabımı sil: şifre + "SİL" onayıyla. Profil anonimleşir, paylaşımlar "misafir_…" adıyla kalır.
export function DeleteAccountDialog({ auth, onClose, onDeleted }) {
  const captcha = useCaptcha();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = password.length >= 6 && confirm.trim().toLocaleUpperCase("tr") === "SİL";

  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await checkPassword(auth.email, password, captcha);
      const { error: err } = await supabase.rpc("delete_my_account");
      if (err) throw err;
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      onDeleted();
    } catch (err) {
      setError(err.message === "Mevcut şifren hatalı." ? err.message : trError(err));
      captcha.reset();
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()} role="dialog" aria-modal="true" aria-label="Hesabımı sil">
      <form onSubmit={submit} className="grid w-full max-w-md gap-3 rounded-[28px] bg-white p-5 shadow-2xl">
        <h2 className="text-xl font-black text-slate-950">Hesabını silmek istediğine emin misin?</h2>
        <ul className="grid gap-1.5 rounded-2xl bg-red-50 p-3 text-xs leading-relaxed text-red-900">
          <li>• E-posta adresin, şifren, profil bilgilerin, beslediğin ve favori türlerin, kayıtların ve bildirimlerin <b>kalıcı olarak silinir</b>.</li>
          <li>• Yayındaki ilanların ve reklamların kaldırılır, mesajlaşmaların kapanır.</li>
          <li>• Paylaşım, yorum, tür deneyimi ve değerlendirmelerin sitede kalır ama kim olduğun görünmez; <b>“misafir_…”</b> şeklinde anonim bir kullanıcı adıyla gösterilir. Bunları tamamen kaldırmak istiyorsan önce kendin silebilirsin.</li>
          <li>• Bu işlem geri alınamaz.</li>
        </ul>
        <label className="grid gap-1.5 text-sm font-bold text-slate-600">Şifren
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className={field} required />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-600">Onaylamak için <span className="text-red-700">SİL</span> yaz
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} className={field} autoComplete="off" required />
        </label>
        <div ref={captcha.box} className="flex justify-center empty:hidden" />
        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-100">Vazgeç</button>
          <button type="submit" disabled={!valid || busy} className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-black text-white enabled:hover:bg-red-700 disabled:opacity-40">
            {busy && <Loader2 size={15} className="animate-spin" />} Hesabımı kalıcı olarak sil
          </button>
        </div>
      </form>
    </div>
  );
}
