import React, { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, X } from "lucide-react";
import { supabase, siteUrl, trError } from "./lib/supabase";
import { useCaptcha } from "./lib/captcha";
import { LEGAL_VERSION, LegalModal } from "./legal.jsx";

// ---------------------------------------------------------------------------
// Oturum + profil + ekip yetkisi
// ---------------------------------------------------------------------------
export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState(null); // { role, permissions } | null
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    // E-posta bağlantısıyla gelindiyse adres çubuğunda #access_token=…&type=signup|recovery olur
    const hash = window.location.hash;
    if (/type=recovery/.test(hash)) setRecovery(true);
    if (/type=email_change/.test(hash)) setJustConfirmed("email_change");
    else if (/type=signup|type=email/.test(hash)) setJustConfirmed("signup");

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id || null;

  async function reloadProfile() {
    if (!userId) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data || null);
    return data;
  }

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setStaff(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Profil kayıttan hemen sonra tetikleyiciyle oluşur; nadiren bir an gecikebilir
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) {
          if (!cancelled) setProfile(data);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      const { data: role } = await supabase.rpc("my_staff_role");
      if (!cancelled) setStaff(Array.isArray(role) && role[0] ? role[0] : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setStaff(null);
  }

  return {
    ready,
    session,
    user: session?.user || null,
    email: session?.user?.email || "",
    emailConfirmed: Boolean(session?.user?.email_confirmed_at),
    profile,
    staff,
    isStaff: Boolean(staff),
    recovery,
    clearRecovery: () => setRecovery(false),
    justConfirmed,
    clearJustConfirmed: () => setJustConfirmed(false),
    reloadProfile,
    signOut
  };
}

// Kullanıcı adını veritabanı kuralına uygun hale getirir: küçük harf, rakam, nokta, alt çizgi
export function normalizeUsername(value) {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u" };
  return value
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (ch) => map[ch])
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-800 focus:bg-white";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-slate-400">{hint}</span>}
    </label>
  );
}

function PasswordInput({ value, onChange, placeholder = "••••••••", autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass + " pr-11"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" title={show ? "Gizle" : "Göster"}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Giriş / kayıt / şifre sıfırlama penceresi
// ---------------------------------------------------------------------------
export function AuthModal({ mode, setMode, onClose, onSuccess, image }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [termsAt, setTermsAt] = useState(null); // Kullanım Koşulları okunup kabul edildi
  const [kvkkAt, setKvkkAt] = useState(null); // Aydınlatma Metni okundu
  const [legalOpen, setLegalOpen] = useState(null); // "terms" | "kvkk"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null); // "signup" | "reset"
  const captcha = useCaptcha();

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isReset = mode === "reset";

  useEffect(() => {
    setError("");
  }, [mode]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) {
        const captchaToken = await captcha.getToken();
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } });
        if (err) throw err;
        onSuccess();
      } else if (isRegister) {
        const name = normalizeUsername(username);
        if (name.length < 3) throw new Error("username_check");
        if (password.length < 8) throw new Error("Password should be at least 8 characters");
        if (!termsAt || !kvkkAt) {
          setError(!termsAt ? "Devam etmek için Kullanım Koşulları'nı okuyup kabul etmelisin." : "Devam etmek için KVKK Aydınlatma Metni'ni okumalısın.");
          return;
        }
        const { data: taken } = await supabase.from("profiles").select("id").eq("username", name).maybeSingle();
        if (taken) throw new Error("profiles_username_key");
        const captchaToken = await captcha.getToken();
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: name, city: city.trim(), terms_version: LEGAL_VERSION, terms_accepted_at: termsAt, kvkk_read_at: kvkkAt },
            emailRedirectTo: siteUrl(),
            captchaToken
          }
        });
        if (err) throw err;
        // Supabase, kayıtlı bir e-postayla tekrar kayıt olunursa sessizce boş kimlik döner
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error("User already registered");
        }
        if (data.session) onSuccess();
        else setSent("signup");
      } else if (isReset) {
        const captchaToken = await captcha.getToken();
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl(), captchaToken });
        if (err) throw err;
        setSent("reset");
      }
    } catch (err) {
      setError(trError(err));
    } finally {
      captcha.reset();
      setBusy(false);
    }
  }

  const title = isLogin ? "Giriş yap" : isRegister ? "Kayıt ol" : "Şifreni sıfırla";
  const subtitle = isLogin
    ? "Hesabına giriş yaparak ilan verebilir, paylaşım yapabilir ve mesajlaşabilirsin."
    : isRegister
      ? "Ücretsiz hesap oluştur, akvaryum hobicileri topluluğuna katıl."
      : "Hesabına bağlı e-posta adresini yaz, sana yeni şifre belirleme bağlantısı gönderelim.";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-2xl md:grid-cols-[1.05fr_1fr]">
        <div
          className="relative hidden min-h-[600px] overflow-hidden bg-slate-950 p-8 text-white md:block"
          style={{
            backgroundImage: "linear-gradient(135deg, rgba(8,51,68,.92), rgba(15,23,42,.68)), url(" + image + ")",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Aquagram</div>
          <h2 className="max-w-md text-4xl font-black leading-tight tracking-tight">Akvaryum hobicilerinin buluşma noktası</h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-cyan-50/85">
            İlan ver, takas et, sahiplendir. Deneyimlerini paylaş, soru sor, beslediğin türleri ekle ve aynı türü besleyen hobicilerle tanış.
          </p>
        </div>

        <div className="relative max-h-[92vh] overflow-y-auto p-6 sm:p-8 md:p-10">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" title="Kapat">
            <X size={18} />
          </button>

          <div className="mx-auto max-w-md">
            {sent ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-cyan-50 text-cyan-800"><Mail size={28} /></div>
                <h3 className="text-2xl font-black tracking-tight">E-postanı kontrol et</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  <b className="text-slate-900">{email}</b> adresine{" "}
                  {sent === "signup" ? "bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladığında hesabın açılır ve otomatik giriş yaparsın." : "şifre sıfırlama bağlantısı gönderdik. Bağlantıya tıklayıp yeni şifreni belirleyebilirsin."}
                </p>
                <p className="mt-3 text-xs text-slate-400">E-posta birkaç dakika içinde gelmezse gereksiz (spam) klasörüne de bak.</p>
                <button onClick={onClose} className="mt-6 rounded-full bg-cyan-950 px-6 py-3 text-sm font-black text-white hover:bg-cyan-900">Tamam</button>
              </div>
            ) : (
              <>
                <div className="mb-6 pr-8">
                  <div className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-slate-400">Hoş geldin</div>
                  <h3 className="text-3xl font-black tracking-tight text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
                </div>

                {!isReset && (
                  <div className="mb-6 flex rounded-full bg-slate-100 p-1">
                    {[["login", "Giriş Yap"], ["register", "Kayıt Ol"]].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMode(key)}
                        className={"flex-1 rounded-full px-4 py-2.5 text-sm font-black transition " + (mode === key ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                  {isRegister && (
                    <Field label="Kullanıcı adı" hint="Küçük harf, rakam, nokta ve alt çizgi; 3-24 karakter. Daha sonra değiştirebilirsin.">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">@</span>
                        <input value={username} onChange={(event) => setUsername(normalizeUsername(event.target.value))} className={inputClass + " pl-8"} placeholder="kullaniciadi" autoComplete="username" required />
                      </div>
                    </Field>
                  )}

                  <Field label="E-posta adresi">
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="ornek@mail.com" autoComplete="email" required />
                  </Field>

                  {isRegister && (
                    <Field label="Şehir (isteğe bağlı)" hint="Yakınındaki ilanları ve hobicileri göstermek için kullanılır.">
                      <input value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} placeholder="İstanbul" maxLength={40} />
                    </Field>
                  )}

                  {!isReset && (
                    <Field label="Şifre" hint={isRegister ? "En az 8 karakter." : null}>
                      <PasswordInput value={password} onChange={setPassword} autoComplete={isRegister ? "new-password" : "current-password"} />
                    </Field>
                  )}

                  {isLogin && (
                    <div className="flex justify-end pt-1">
                      <button type="button" onClick={() => setMode("reset")} className="text-xs font-black text-cyan-800 hover:text-cyan-950">Şifremi unuttum</button>
                    </div>
                  )}

                  {isRegister && (
                    <div className="grid gap-2 pt-1">
                      {[
                        ["terms", termsAt, "Kullanım Koşulları", "’nı (topluluk ve ilan kuralları dahil) okudum, anladım ve kabul ediyorum."],
                        ["kvkk", kvkkAt, "KVKK Aydınlatma Metni", "’ni okudum ve anladım."]
                      ].map(([key, done, label, rest]) => (
                        <div key={key} className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={Boolean(done)}
                            aria-label={label}
                            onClick={() => (done ? (key === "terms" ? setTermsAt(null) : setKvkkAt(null)) : setLegalOpen(key))}
                            className={"mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border " + (done ? "border-cyan-950 bg-cyan-950 text-white" : "border-slate-300 bg-white")}
                          >
                            {done && <CheckCircle2 size={11} />}
                          </button>
                          <span>
                            <button type="button" onClick={() => setLegalOpen(key)} className="font-black text-cyan-800 underline decoration-cyan-800/30 underline-offset-2 hover:text-cyan-950">{label}</button>
                            {rest}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div ref={captcha.box} className="flex justify-center empty:hidden" />
                  {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

                  <button type="submit" disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-cyan-900 disabled:opacity-60">
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    {isLogin ? "Giriş yap" : isRegister ? "Hesap oluştur" : "Sıfırlama bağlantısı gönder"}
                  </button>
                </form>

                {isReset ? (
                  <button type="button" onClick={() => setMode("login")} className="mt-4 w-full text-center text-sm font-black text-slate-500 hover:text-slate-800">Giriş ekranına dön</button>
                ) : (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">yakında</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {["Google ile devam et", "Apple ile devam et"].map((label) => (
                        <button key={label} type="button" disabled className="cursor-not-allowed rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-400" title="Yakında">
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {legalOpen && (
        <LegalModal
          docKey={legalOpen}
          mustRead
          onClose={() => setLegalOpen(null)}
          onAccept={() => {
            const now = new Date().toISOString();
            if (legalOpen === "terms") setTermsAt(now);
            else setKvkkAt(now);
            setLegalOpen(null);
            setError("");
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// E-postadaki sıfırlama bağlantısıyla gelen kullanıcı yeni şifresini belirler
// ---------------------------------------------------------------------------
export function NewPasswordModal({ onDone }) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı.");
    if (password !== again) return setError("Şifreler birbiriyle aynı değil.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(trError(err));
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={28} /></div>
            <h3 className="text-xl font-black">Şifren güncellendi</h3>
            <p className="mt-2 text-sm text-slate-500">Yeni şifrenle giriş yaptın.</p>
            <button onClick={onDone} className="mt-5 rounded-full bg-cyan-950 px-6 py-3 text-sm font-black text-white">Devam et</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="text-2xl font-black tracking-tight">Yeni şifre belirle</h3>
            <p className="text-sm text-slate-500">Hesabın için yeni bir şifre seç.</p>
            <Field label="Yeni şifre" hint="En az 8 karakter."><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" /></Field>
            <Field label="Yeni şifre (tekrar)"><PasswordInput value={again} onChange={setAgain} autoComplete="new-password" /></Field>
            {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-5 py-3.5 text-sm font-black text-white disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />} Şifreyi kaydet
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Aquagram logosu: yuvarlak köşeli kutu içinde dalga + kabarcık
export function AquagramMark({ className = "h-10 w-10 lg:h-11 lg:w-11" }) {
  return (
    <div className={"relative grid shrink-0 place-items-center rounded-2xl bg-cyan-950 text-white " + className}>
      <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 19c3.2-3 6.3-3 9.5 0s6.3 3 9.5 0 6-3 7-2.5" />
        <path d="M3 25.5c3.2-3 6.3-3 9.5 0s6.3 3 9.5 0 6-3 7-2.5" opacity=".5" />
        <circle cx="21" cy="11" r="2.4" strokeWidth="2.2" />
        <circle cx="25.5" cy="5" r="1.4" strokeWidth="2" />
      </svg>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400" />
    </div>
  );
}
