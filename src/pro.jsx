import React, { useCallback, useEffect, useState } from "react";
import { ArrowUp, Check, Crown, Loader2, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";

// Aquagram PRO: rozet, durum, paketler, ilanı üste taşıma

export const PRO_FEATURES = [
  ["⭐", "Ayda 2 ücretsiz öne çıkarma", "İlanını ücretsiz öne çıkar. Kullanmadığın haklar silinmez, üyelik bitse de kullanabilirsin (ayda en fazla 2)."],
  ["📣", "Ayda 1 ücretsiz reklam", "İşletmeni ya da üretimini tanıt. Kullanmadığın hak birikir (ayda en fazla 1)."],
  ["⬆️", "Günde 3 kez üste taşı", "İlanların yeni ilan gibi listelerin ve akışın başına çıksın (normal üyeler günde 1)."],
  ["💬", "+100 sohbet hakkı", "Mesaj kutun 20 sohbetle sınırlı kalmasın; her PRO alımında +100 sohbet."],
  ["💎", "PRO rozeti", "Kullanıcı adının yanında PRO rozeti görünür."]
];

const DEFAULT_PLANS = [
  { id: "pro-1a", months: 1, price: 59 },
  { id: "pro-3a", months: 3, price: 99 },
  { id: "pro-12a", months: 12, price: 199 }
];

const tl = (value) => Number(value).toLocaleString("tr-TR") + " ₺";
export const daysLeft = (until) => (until ? Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000)) : 0);
const fmtDay = (value) => new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export function ProBadge({ size = "sm" }) {
  return (
    <span title="Aquagram PRO üye" className={"inline-flex items-center rounded-md bg-gradient-to-r from-amber-400 to-orange-500 font-black uppercase leading-none tracking-wide text-white shadow-sm " + (size === "lg" ? "px-1.5 py-1 text-[11px]" : "px-1 py-[3px] text-[9px]")}>
      PRO
    </span>
  );
}

// Üyenin PRO durumu ve hakları (veritabanından)
export function useProStatus(enabled = true) {
  const [status, setStatus] = useState(null);
  const reload = useCallback(async () => {
    if (!enabled) return;
    const { data } = await supabase.rpc("my_pro_status");
    setStatus(data || null);
  }, [enabled]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { status, reload };
}

export function useProPlans() {
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "pro_plans").maybeSingle().then(({ data }) => {
      if (data && Array.isArray(data.value) && data.value.length) setPlans(data.value);
    });
  }, []);
  return plans;
}

function monthly(plan) {
  return Math.round((plan.price / plan.months) * 10) / 10;
}

/* Hesabım → PRO kartı */
export function ProCard({ auth, onToast, className = "mt-4 rounded-2xl" }) {
  const { status, reload } = useProStatus(Boolean(auth.profile));
  const plans = useProPlans();
  const [open, setOpen] = useState(false);
  if (!auth.profile) return null;
  const pro = status ? status.pro : Boolean(auth.profile.pro_until && new Date(auth.profile.pro_until) > new Date());
  const until = (status && status.pro_until) || auth.profile.pro_until;
  const left = daysLeft(until);

  return (
    <div className={"overflow-hidden " + className + " " + (pro ? "bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200" : "bg-gradient-to-br from-slate-900 to-cyan-950 text-white")}>
      <div className="p-4">
        <div className="flex items-center gap-2 text-lg font-black"><Crown size={18} className={pro ? "text-amber-600" : "text-amber-300"} /> Aquagram PRO {pro && <ProBadge />}</div>
        {pro ? (
          <>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="text-3xl font-black leading-none text-amber-700">{left}</span>
              <span className="pb-0.5 text-sm font-bold text-amber-900">gün kaldı</span>
            </div>
            <div className="text-xs text-amber-900/70">{fmtDay(until)} tarihine kadar</div>
            {status && (
              <ul className="mt-3 grid gap-1 text-xs text-amber-950">
                <li className="flex justify-between gap-2"><span>Ücretsiz öne çıkarma hakkı</span><b>{status.features_balance ?? status.features_left} <span className="font-normal text-amber-900/60">(bu ay {status.features_left})</span></b></li>
                <li className="flex justify-between gap-2"><span>Ücretsiz reklam hakkı</span><b>{status.ads_balance ?? status.ads_left} <span className="font-normal text-amber-900/60">(bu ay {status.ads_left})</span></b></li>
                <li className="flex justify-between gap-2"><span>Bugün üste taşıma</span><b>{status.bumps_left} / {status.bump_limit}</b></li>
                <li className="flex justify-between gap-2"><span>Mesaj kutusu</span><b>{status.conversation_count} / {status.conversation_limit} sohbet</b></li>
              </ul>
            )}
            <button type="button" onClick={() => setOpen(true)} className="mt-3 w-full rounded-full bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600">Süreyi uzat</button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-relaxed text-cyan-50/80">Ücretsiz öne çıkarma ve reklam, günde 3 kez üste taşıma, +100 sohbet hakkı ve PRO rozeti.</p>
            {status && (status.features_balance > 0 || status.ads_balance > 0) && (
              <p className="mt-2 rounded-xl bg-white/10 px-2.5 py-1.5 text-[11px] text-amber-200">Kullanılmamış hakların duruyor: {status.features_balance} öne çıkarma · {status.ads_balance} reklam (ayda en fazla 2 öne çıkarma ve 1 reklam).</p>
            )}
            {status && <p className="mt-2 text-[11px] text-cyan-50/60">Mesaj kutun: {status.conversation_count} / {status.conversation_limit} sohbet · Bugün üste taşıma: {status.bumps_left} / {status.bump_limit}</p>}
            <button type="button" onClick={() => setOpen(true)} className="mt-3 w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-sm font-black text-white shadow hover:brightness-105">
              PRO'ya yükselt · aylık {tl(monthly(plans[plans.length - 1]))}'den
            </button>
          </>
        )}
      </div>
      {open && (
        <ProPlansDialog
          plans={plans}
          pro={pro}
          onClose={() => setOpen(false)}
          onDone={async (endAt) => {
            setOpen(false);
            await auth.reloadProfile();
            await reload();
            onToast("Aquagram PRO etkin! " + fmtDay(endAt) + " tarihine kadar geçerli. 💎");
          }}
        />
      )}
    </div>
  );
}

export function ProPlansDialog({ plans, pro, onClose, onDone }) {
  const [planId, setPlanId] = useState(plans[1] ? plans[1].id : plans[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = plans[0];

  async function buy() {
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("buy_pro", { p_plan: planId });
    setBusy(false);
    if (err) return setError(trError(err));
    return onDone(data);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()} role="dialog" aria-modal="true" aria-label="Aquagram PRO">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white text-slate-900 shadow-2xl">
        <div className="relative bg-gradient-to-br from-slate-900 via-cyan-950 to-cyan-800 px-5 pb-5 pt-6 text-white">
          <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label="Kapat"><X size={17} /></button>
          <div className="flex items-center gap-2 text-2xl font-black"><Crown className="text-amber-300" size={24} /> Aquagram PRO</div>
          <p className="mt-1 text-sm text-cyan-50/80">{pro ? "Yeni süre mevcut sürenin üstüne eklenir; her ay için 2 öne çıkarma + 1 reklam hakkı ve +100 sohbet hakkı mevcut haklarına eklenir." : "Hobini bir üst seviyeye taşı."}</p>
        </div>
        <div className="grid gap-2 p-4">
          <ul className="grid gap-2">
            {PRO_FEATURES.map(([emoji, head, text]) => (
              <li key={head} className="flex gap-2.5 text-sm">
                <span className="text-lg leading-none" aria-hidden="true">{emoji}</span>
                <span><b className="block text-slate-900">{head}</b><span className="text-xs text-slate-500">{text}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid gap-2" role="radiogroup" aria-label="PRO paketi">
            {plans.map((plan) => {
              const active = plan.id === planId;
              const save = base && plan.months > 1 ? Math.round((1 - plan.price / (base.price * plan.months)) * 100) : 0;
              return (
                <button key={plan.id} type="button" role="radio" aria-checked={active} onClick={() => setPlanId(plan.id)} className={"flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition " + (active ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300")}>
                  <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 " + (active ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300")}>{active && <Check size={12} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{plan.months === 12 ? "12 ay (1 yıl)" : plan.months + " ay"}</span>
                    <span className="block text-xs text-slate-500">aylık {tl(monthly(plan))}</span>
                  </span>
                  {save > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">%{save} tasarruf</span>}
                  <span className="text-base font-black">{tl(plan.price)}</span>
                </button>
              );
            })}
          </div>
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">Online ödeme yakında eklenecek; şimdilik PRO ödeme alınmadan hemen etkinleşir. Süre bitince otomatik yenilenmez.</p>
          {error && <div className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
          <button type="button" onClick={buy} disabled={busy} className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-white shadow hover:brightness-105 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />} {pro ? "Süreyi uzat" : "PRO'ya yükselt"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* İlanı üste taşı düğmesi (İlanlarım ve ilan detayı) */
export function BumpButton({ listing, onDone, onToast, small = false }) {
  const [busy, setBusy] = useState(false);
  if (!listing || !listing.dbId || listing.status !== "active") return null;
  async function bump(event) {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("bump_listing", { p_listing: listing.dbId });
    setBusy(false);
    if (error) return onToast(trError(error));
    onToast("İlanın en üste taşındı ⬆️ · bugün " + (data && data.left != null ? data.left + " hakkın kaldı" : ""));
    return onDone && onDone();
  }
  return (
    <button type="button" onClick={bump} disabled={busy} title="İlanı yeni ilan gibi listelerin en üstüne taşı" className={"inline-flex items-center justify-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 font-black text-cyan-900 hover:bg-cyan-100 disabled:opacity-60 " + (small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm")}>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />} Üste taşı
    </button>
  );
}
