import React, { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, Clock, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";

// Mavi tik şartları: profil resmi, kullanıcı adı, doğrulanmış e-posta, telefon numarası (ekip teyit eder)
export function VerificationCard({ auth, onToast }) {
  const profile = auth.profile;
  const [last, setLast] = useState(undefined); // en son talep (undefined: yükleniyor)
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900">
        <div className="mb-1 flex items-center gap-2 font-black"><BadgeCheck size={17} /> Doğrulanmış üye</div>
        Kullanıcı adının yanında mavi tik görünüyor.
      </div>
    );
  }

  const checks = [
    ["Profil resmi", Boolean(profile.avatar_url)],
    ["Kullanıcı adı", Boolean(profile.username)],
    ["Doğrulanmış e-posta", auth.emailConfirmed],
    ["Telefon numarası", /^5\d{9}$/.test(normalize(phone)) || (last && last.status === "pending")]
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

  return (
    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-sm leading-relaxed text-sky-950">
      <div className="mb-1 flex items-center gap-2 font-black"><ShieldCheck size={17} /> Mavi tik (doğrulanmış üye)</div>
      <p className="text-xs text-sky-900/80">Doğrulanmış üyeler ilan ve mesajlarda güven verir. Şartları tamamla, talepte bulun; ekibimiz telefon numaranı teyit etsin.</p>
      <ul className="mt-2 grid gap-1">
        {checks.map(([label, ok]) => (
          <li key={label} className={"flex items-center gap-1.5 text-xs font-bold " + (ok ? "text-emerald-700" : "text-slate-500")}>
            <span className={"grid h-4 w-4 place-items-center rounded-full " + (ok ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>{ok ? <Check size={10} /> : <X size={10} />}</span>
            {label}
          </li>
        ))}
      </ul>
      {!auth.emailConfirmed && <p className="mt-2 text-xs text-slate-500">E-postandaki doğrulama bağlantısına tıklaman gerekiyor.</p>}
      {!profile.avatar_url && <p className="mt-2 text-xs text-slate-500">Yukarıdan bir profil resmi ekle.</p>}

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
          <form onSubmit={submit} className="mt-3 grid gap-2">
            <label className="grid gap-1 text-xs font-black text-slate-600">Cep telefonu
              <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3">
                <span className="text-sm font-bold text-slate-400">+90</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^0-9 ]/g, "").slice(0, 14))}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="5xx xxx xx xx"
                  className="w-full bg-transparent px-2 py-2 text-sm font-normal text-slate-900 outline-none"
                />
              </span>
              <span className="font-normal text-slate-500">Numaran diğer üyelere gösterilmez; yalnızca doğrulama için kullanılır.</span>
            </label>
            {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div>}
            <button
              type="submit"
              disabled={!ready || !/^5\d{9}$/.test(normalize(phone)) || busy || recentlyRejected}
              className="flex items-center justify-center gap-2 rounded-full bg-sky-700 px-4 py-2.5 text-sm font-black text-white enabled:hover:bg-sky-800 disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Mavi tik talebinde bulun
            </button>
          </form>
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
