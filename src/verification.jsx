import React, { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, Clock, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";

// Mavi tik şartları: profil resmi, kullanıcı adı, doğrulanmış e-posta, telefon numarası (ekip teyit eder)
export function VerificationCard({ auth, onToast }) {
  const profile = auth.profile;
  const [last, setLast] = useState(undefined); // en son talep (undefined: yükleniyor)
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("phone"); // phone | code (WhatsApp)
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [wait, setWait] = useState(0); // yeniden gönderme için kalan saniye
  const [manual, setManual] = useState(false); // WhatsApp'ı olmayanlar için elle talep

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const reload = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from("verification_requests").select("id, phone, status, reject_reason, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(1);
    setLast((data && data[0]) || null);
  }, [profile]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!profile) return null;

  if (profile.phone_verified) {
    return (
      <div className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
        <div className="mb-1 flex items-center gap-2 font-black"><BadgeCheck size={17} /> Doğrulanmış üye</div>
        Kullanıcı adının yanında mavi tik görünüyor.
      </div>
    );
  }

  const checks = [
    ["Profil resmi", Boolean(profile.avatar_url)],
    ["Kullanıcı adı", Boolean(profile.username)],
    ["Doğrulanmış e-posta", auth.emailConfirmed],
    ["WhatsApp numarası", step === "code" || (last && last.status === "pending")]
  ];
  const ready = checks.slice(0, 3).every(([, ok]) => ok);
  const pending = last && last.status === "pending";
  const recentlyRejected = last && last.status === "rejected" && Date.now() - new Date(last.created_at).getTime() < 86400000;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("request_verification", { p_phone: phone });
    setBusy(false);
    if (err) return setError(trError(err));
    onToast("Doğrulama talebin alındı; ekibimiz numaranı teyit ettikten sonra mavi tik eklenecek.");
    setPhone("");
    return reload();
  }

  async function callWhatsApp(body) {
    const { data, error: err } = await supabase.functions.invoke("whatsapp-verify", { body });
    if (err) throw new Error("Bağlantı kurulamadı. Biraz sonra tekrar dene.");
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  async function sendCode(event) {
    if (event) event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await callWhatsApp({ action: "send", phone });
      setSentTo(normalize(phone));
      setStep("code");
      setCode("");
      setWait(60);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  async function checkCode(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await callWhatsApp({ action: "check", phone: sentTo, code });
      await auth.reloadProfile();
      onToast("Numaran doğrulandı, mavi tikin eklendi! ✅");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  const pretty = (digits) => "+90 " + digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6, 8) + " " + digits.slice(8, 10);

  return (
    <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-relaxed text-sky-950">
      <div className="mb-1 flex items-center gap-2 text-[15px] font-black"><ShieldCheck size={18} /> Mavi tik (doğrulanmış üye)</div>
      <p className="text-sm text-sky-900/80">Doğrulanmış üyeler ilan ve mesajlarda güven verir. Şartları tamamla, numaranı WhatsApp'tan gelen kodla doğrula; mavi tikin hemen eklensin.</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {checks.map(([label, ok]) => (
          <li key={label} className={"flex items-center gap-2 text-sm font-bold " + (ok ? "text-emerald-700" : "text-slate-500")}>
            <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-full " + (ok ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>{ok ? <Check size={12} /> : <X size={12} />}</span>
            {label}
          </li>
        ))}
      </ul>
      {!auth.emailConfirmed && <p className="mt-2 text-sm text-slate-500">E-postandaki doğrulama bağlantısına tıklaman gerekiyor.</p>}
      {!profile.avatar_url && <p className="mt-2 text-sm text-slate-500">Yukarıdaki fotoğraf simgesine dokunarak bir profil resmi ekle.</p>}

      {last === undefined ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" /> Yükleniyor…</div>
      ) : pending ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-sky-100">
          <Clock size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <span>Talebin inceleniyor ({last.phone}). Sonuç bildirim olarak gelecek.</span>
        </div>
      ) : (
        <>
          {last && last.status === "rejected" && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
              Önceki talep onaylanmadı{last.reject_reason ? ": " + last.reject_reason : "."} {recentlyRejected && "24 saat sonra yeniden başvurabilirsin."}
            </div>
          )}
          {!manual && step === "phone" && (
            <form onSubmit={sendCode} className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">Cep telefonu (WhatsApp)
                <span className="flex items-center rounded-2xl border border-slate-200 bg-white px-4">
                  <span className="text-base font-bold text-slate-400">+90</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, "").slice(0, 14))}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="5xx xxx xx xx"
                    className="w-full bg-transparent px-2 py-3 text-base font-normal text-slate-900 outline-none"
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={!ready || !/^5\d{9}$/.test(normalize(phone)) || busy}
                className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white enabled:hover:bg-emerald-700 disabled:opacity-40 sm:mb-[1px]"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={16} />} WhatsApp'tan kod gönder
              </button>
              <span className="text-xs text-slate-500 sm:col-span-2">Kod WhatsApp'tan gelir. Numaran diğer üyelere gösterilmez; yalnızca doğrulama için kullanılır.</span>
            </form>
          )}
          {!manual && step === "code" && (
            <form onSubmit={checkCode} className="mt-4 grid gap-2.5">
              <p className="text-sm text-slate-700"><b>{pretty(sentTo)}</b> numarasına WhatsApp'tan 6 haneli bir kod gönderdik.</p>
              <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  aria-label="Doğrulama kodu"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xl font-black tracking-[0.5em] text-slate-900 outline-none focus:border-sky-600"
                  autoFocus
                />
                <button type="submit" disabled={code.length !== 6 || busy} className="flex items-center justify-center gap-2 rounded-full bg-sky-700 px-5 py-3 text-sm font-black text-white enabled:hover:bg-sky-800 disabled:opacity-40">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Doğrula
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
                <button type="button" onClick={() => { setStep("phone"); setError(""); }} className="text-slate-500 hover:text-slate-800">Numarayı değiştir</button>
                <button type="button" onClick={() => sendCode()} disabled={wait > 0 || busy} className="text-sky-700 hover:text-sky-900 disabled:text-slate-400">
                  {wait > 0 ? "Kodu tekrar gönder (" + wait + " sn)" : "Kodu tekrar gönder"}
                </button>
              </div>
            </form>
          )}
          {manual && (
            <form onSubmit={submit} className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">Cep telefonu
                <span className="flex items-center rounded-2xl border border-slate-200 bg-white px-4">
                  <span className="text-base font-bold text-slate-400">+90</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, "").slice(0, 14))}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="5xx xxx xx xx"
                    className="w-full bg-transparent px-2 py-3 text-base font-normal text-slate-900 outline-none"
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={!ready || !/^5\d{9}$/.test(normalize(phone)) || busy || recentlyRejected}
                className="flex items-center justify-center gap-2 rounded-full bg-sky-700 px-5 py-3 text-sm font-black text-white enabled:hover:bg-sky-800 disabled:opacity-40 sm:mb-[1px]"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Elle doğrulama talebi gönder
              </button>
              <span className="text-xs text-slate-500 sm:col-span-2">Ekibimiz numaranı arayarak ya da mesajla teyit eder; birkaç gün sürebilir.</span>
            </form>
          )}
          {error && <div className="mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
          <button type="button" onClick={() => { setManual(!manual); setError(""); }} className="mt-3 text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800">
            {manual ? "WhatsApp ile doğrulamaya dön" : "WhatsApp'ın yok mu? Elle doğrulama talebi gönder"}
          </button>
        </>
      )}
    </div>
  );
}

function normalize(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}
