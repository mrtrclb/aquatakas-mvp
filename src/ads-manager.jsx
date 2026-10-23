import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Clock, ExternalLink, Eye, Hourglass, Loader2, MousePointerClick, Pencil, RotateCcw, Square, Upload, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";
import { shrinkImage } from "./lib/listings";
import { AD_PLACEMENTS, mapAd } from "./lib/ads";
import { ProBadge, useProStatus } from "./pro.jsx";

const CTA_OPTIONS = ["İncele", "Detaylar", "Keşfet", "Satın al", "Teklif al", "Oku", "Mağazaya git"];
const EMPTY = { brand: "", title: "", text: "", cta: "İncele", target_url: "", plan_id: "", image: null, imageFile: null };
const LIMITS = { brand: [2, 40], title: [4, 80], text: [0, 160] };

const tl = (value) => Number(value || 0).toLocaleString("tr-TR") + " TL";
const day = (value) => (value ? new Date(value).toLocaleDateString("tr-TR") : "—");

function remaining(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Süresi doldu";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? days + " gün " + hours + " saat" : hours + " saat";
}

function adState(row) {
  if (row.status === "approved") return new Date(row.ends_at) > new Date() ? "live" : "ended";
  return row.status; // pending | rejected | ended
}

const STATE_LABELS = {
  live: ["Yayında", "bg-emerald-50 text-emerald-700"],
  pending: ["İncelemede", "bg-amber-50 text-amber-800"],
  rejected: ["Reddedildi", "bg-red-50 text-red-700"],
  ended: ["Bitti", "bg-slate-100 text-slate-600"]
};

export default function AdsManagerPage({ auth, onToast, previews }) {
  const myId = auth.user && auth.user.id;
  const [rows, setRows] = useState(null);
  const [plans, setPlans] = useState([]);
  const { status: proStatus, reload: reloadPro } = useProStatus(true);
  const [useCredit, setUseCredit] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState("live");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const formRef = useRef(null);

  const reload = useCallback(async () => {
    const [adsRes, planRes] = await Promise.all([
      supabase.from("my_ads").select("*").eq("advertiser_id", myId).order("created_at", { ascending: false }),
      supabase.from("site_settings").select("value").eq("key", "ad_plans").maybeSingle()
    ]);
    setRows(adsRes.data || []);
    const list = (planRes.data && Array.isArray(planRes.data.value) && planRes.data.value) || [];
    setPlans(list);
    setForm((prev) => (prev.plan_id || !list.length ? prev : { ...prev, plan_id: list[0].id }));
  }, [myId]);

  useEffect(() => {
    if (myId) reload();
  }, [myId, reload]);

  const groups = useMemo(() => {
    const out = { live: [], pending: [], rejected: [], ended: [] };
    (rows || []).forEach((row) => out[adState(row)].push(row));
    return out;
  }, [rows]);

  // İlk açılışta dolu olan ilk sekmeye geç
  useEffect(() => {
    if (!rows) return;
    if (!groups[tab].length) {
      const first = ["live", "pending", "rejected", "ended"].find((key) => groups[key].length);
      if (first) setTab(first);
    }
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = plans.find((item) => item.id === form.plan_id) || null;
  const placement = editingId ? (rows || []).find((row) => row.id === editingId)?.placement : plan && plan.placement;
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const problems = [];
  if (form.brand.trim().length < LIMITS.brand[0]) problems.push("marka adı");
  if (form.title.trim().length < LIMITS.title[0]) problems.push("başlık (en az 4 karakter)");
  if (form.target_url && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(form.target_url.trim())) problems.push("geçerli bir hedef bağlantı (https://…)");
  if (!editingId && !plan) problems.push("reklam paketi");
  if (!form.image) problems.push("görsel");

  function pickImage(event) {
    const file = (event.target.files || [])[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Görsel JPG, PNG ya da WEBP olmalı.");
    if (file.size > 8 * 1024 * 1024) return setError("Görsel en fazla 8 MB olabilir.");
    setError("");
    setForm((prev) => ({ ...prev, image: URL.createObjectURL(file), imageFile: file }));
  }

  function fillFrom(row, asEdit) {
    setForm({
      brand: row.brand,
      title: row.title,
      text: row.text || "",
      cta: row.cta || "İncele",
      target_url: row.target_url || "",
      plan_id: plans.some((item) => item.id === row.plan_id) ? row.plan_id : plans[0] ? plans[0].id : "",
      image: row.image_url,
      imageFile: null
    });
    setEditingId(asEdit ? row.id : null);
    setError("");
    formRef.current && formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    setForm({ ...EMPTY, plan_id: plans[0] ? plans[0].id : "" });
    setEditingId(null);
    setError("");
  }

  async function uploadImage() {
    if (!form.imageFile) return form.image;
    const blob = await shrinkImage(form.imageFile, 1600, 0.85);
    const type = blob.type || "image/jpeg";
    const path = myId + "/ads/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const { error: upErr } = await supabase.storage.from("ad-media").upload(path, blob, { contentType: type });
    if (upErr) throw upErr;
    return supabase.storage.from("ad-media").getPublicUrl(path).data.publicUrl;
  }

  async function submit() {
    if (problems.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const imageUrl = await uploadImage();
      const fields = {
        brand: form.brand.trim(),
        title: form.title.trim(),
        text: form.text.trim(),
        cta: form.cta,
        target_url: form.target_url.trim() || null,
        image_url: imageUrl
      };
      const { error: err } = editingId
        ? await supabase.from("ads").update(fields).eq("id", editingId)
        : await supabase.from("ads").insert({ ...fields, plan_id: form.plan_id, ...(useCredit ? { payment_status: "pro_free" } : {}) });
      if (err) throw err;
      if (useCredit) {
        setUseCredit(false);
        reloadPro();
      }
      onToast(editingId ? "Başvuru güncellendi" : "Reklamın incelemeye gönderildi; onaylanınca yayına girer.");
      resetForm();
      setTab("pending");
      await reload();
    } catch (err) {
      setError(trError(err));
    }
    setBusy(false);
  }

  async function endAd(row) {
    const { error: err } = await supabase.rpc("end_my_ad", { p_id: row.id });
    setConfirm(null);
    if (err) return onToast(trError(err));
    onToast(row.status === "pending" ? "Başvuru geri çekildi" : "Reklam yayından kaldırıldı");
    if (editingId === row.id) resetForm();
    return reload();
  }

  const previewAd = {
    id: "preview",
    brand: form.brand.trim() || "Marka adı",
    title: form.title.trim() || "Reklam başlığı",
    text: form.text.trim() || "Kısa açıklama burada görünür.",
    cta: form.cta,
    image: form.image,
    url: null
  };
  const { FeedAdCard, SidebarAd, DetailBannerAd, NotificationAdRow, NotificationAdCard } = previews;

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black tracking-tight">Reklamlarım</h2>
        <p className="mt-1 text-sm text-slate-500">Reklam görselini, marka bilgisini ve hedef bağlantını gir; ekibimiz inceledikten sonra seçtiğin alanda yayına girer.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div ref={formRef} className="rounded-[28px] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">{editingId ? "Başvuruyu düzenle" : "Yeni reklam oluştur"}</h3>
            {editingId && <button onClick={resetForm} className="text-xs font-black text-slate-500 hover:text-slate-800">Vazgeç</button>}
          </div>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              className="group relative grid h-40 place-items-center overflow-hidden rounded-[24px] border-2 border-dashed border-amber-300 bg-amber-50 text-center text-amber-800 hover:bg-amber-100/60"
            >
              {form.image ? (
                <>
                  <img src={form.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="relative rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-700 opacity-0 shadow transition group-hover:opacity-100">Görseli değiştir</span>
                </>
              ) : (
                <div><Upload className="mx-auto mb-2" size={28} /><strong>Görsel yükle</strong><p className="mt-1 text-xs">JPG, PNG ya da WEBP · en fazla 8 MB · yatay görsel önerilir</p></div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />

            <Field label="Firma / marka adı" count={form.brand.length} max={LIMITS.brand[1]}>
              <input value={form.brand} onChange={set("brand")} maxLength={LIMITS.brand[1]} placeholder="Örn. AquaLeaf" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-700" />
            </Field>
            <Field label="Reklam başlığı" count={form.title.length} max={LIMITS.title[1]}>
              <input value={form.title} onChange={set("title")} maxLength={LIMITS.title[1]} placeholder="Örn. Bitkili tanklar için bakım seti" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-700" />
            </Field>
            <Field label="Kısa açıklama" count={form.text.length} max={LIMITS.text[1]}>
              <textarea value={form.text} onChange={set("text")} maxLength={LIMITS.text[1]} rows={3} placeholder="Ürün ya da hizmetini bir iki cümleyle anlat" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-base outline-none focus:border-cyan-700" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
              <Field label="Hedef bağlantı">
                <input value={form.target_url} onChange={set("target_url")} placeholder="https://" inputMode="url" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-700" />
              </Field>
              <Field label="Düğme yazısı">
                <select value={form.cta} onChange={set("cta")} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-700">
                  {CTA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </Field>
            </div>

            {!editingId && (
              <div>
                <div className="mb-1.5 text-xs font-black text-slate-500">Reklam paketi</div>
                <select
                  value={form.plan_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, plan_id: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-cyan-700"
                  aria-label="Reklam paketi"
                >
                  {plans.map((item) => {
                    const meta = AD_PLACEMENTS[item.placement] || { label: item.placement };
                    return <option key={item.id} value={item.id}>{meta.label} · {item.days} gün · {tl(item.price)}</option>;
                  })}
                </select>
                {plan && AD_PLACEMENTS[plan.placement] && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{AD_PLACEMENTS[plan.placement].hint}</p>}
                {proStatus && (proStatus.pro || proStatus.ads_balance > 0) && (
                  <label className={"mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm " + (proStatus.ads_left > 0 ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50" : "border-slate-200 bg-slate-50 opacity-70")}>
                    <input type="checkbox" checked={useCredit} disabled={proStatus.ads_left < 1} onChange={(event) => setUseCredit(event.target.checked)} className="h-4 w-4 accent-amber-500" />
                    <span className="flex-1"><b className="flex items-center gap-1.5">PRO ücretsiz reklam hakkımı kullan <ProBadge /></b><span className="text-xs text-slate-500">{proStatus.ads_left > 0 ? "Biriken hakkın: " + (proStatus.ads_balance ?? 1) + " · seçtiğin paket ücretsiz olur (30 günde 1)." : (proStatus.ads_balance > 0 ? "Bu ayki kullanım sınırına ulaştın (30 günde 1). Biriken " + proStatus.ads_balance + " hakkın silinmez." : "Ücretsiz reklam hakkın kalmadı.")}</span></span>
                  </label>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
              Süre, reklam onaylandığı anda başlar. Görselde yoğun metin, telefon numarası ve fiyat bilgisi kullanmamaya özen göster; yanıltıcı ya da akvaryum hobisiyle ilgisiz reklamlar reddedilir.{" "}
              <span className="font-bold text-slate-600">Online ödeme yakında eklenecek; şimdilik başvurular ödeme alınmadan değerlendiriliyor.</span>
            </div>

            {error && <div className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
            {problems.length > 0 && (form.brand || form.title || form.image) && (
              <p className="text-xs font-bold text-slate-400">Eksik: {problems.join(", ")}</p>
            )}
            <button
              onClick={submit}
              disabled={problems.length > 0 || busy}
              className="flex items-center justify-center gap-2 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {editingId ? "Değişiklikleri kaydet" : "İnceleme için gönder"}
            </button>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-1 text-lg font-black">Canlı önizleme</h3>
            <p className="mb-3 text-xs text-slate-500">{placement ? (AD_PLACEMENTS[placement] || {}).label + " alanında böyle görünür" : "Paket seç"}</p>
            {placement === "notification" && NotificationAdRow ? (
              <div className="pointer-events-none grid gap-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">1 · Üyenin bildirimlerinde</p>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><NotificationAdRow ad={previewAd} /></div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">2 · Dokununca açılan kart</p>
                  <div className="flex justify-center rounded-2xl bg-slate-900/50 p-4"><NotificationAdCard ad={previewAd} preview onClose={() => {}} /></div>
                </div>
              </div>
            ) : (
            <div className="pointer-events-none overflow-hidden rounded-2xl bg-white">
              {placement === "feed" ? <FeedAdCard ad={previewAd} /> : ["detail", "post", "species", "article"].includes(placement) ? <div className="p-2 [&>div]:mb-0"><DetailBannerAd ad={previewAd} /></div> : <SidebarAd ad={previewAd} />}
            </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-slate-100 p-1">
          {[["live", "Yayında"], ["pending", "İncelemede"], ["rejected", "Reddedilen"], ["ended", "Biten"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={"shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black transition " + (tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
              {label} <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[12px] text-slate-600">{groups[key].length}</span>
            </button>
          ))}
        </div>
        {!rows ? (
          <div className="flex items-center gap-2 p-6 text-sm font-bold text-slate-400"><Loader2 size={16} className="animate-spin" /> Yükleniyor…</div>
        ) : !groups[tab].length ? (
          <div className="rounded-[24px] bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
            {tab === "live" ? "Şu an yayında reklamın yok." : tab === "pending" ? "İncelemede başvurun yok." : tab === "rejected" ? "Reddedilen başvurun yok." : "Biten reklamın yok."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groups[tab].map((row) => (
              <MyAdCard
                key={row.id}
                row={row}
                state={adState(row)}
                onEdit={() => fillFrom(row, true)}
                onRepeat={() => fillFrom(row, false)}
                onEnd={() => setConfirm(row)}
              />
            ))}
          </div>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setConfirm(null)}>
          <div role="dialog" className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black">{confirm.status === "pending" ? "Başvuruyu geri çek" : "Reklamı durdur"}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {confirm.status === "pending" ? "Başvuru incelemeden çıkarılır." : "Reklam hemen yayından kalkar; kalan süre iade edilmez ve tekrar başlatılamaz."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirm(null)} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Vazgeç</button>
              <button onClick={() => endAd(confirm)} className="rounded-full bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700">{confirm.status === "pending" ? "Geri çek" : "Durdur"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, count, max, children }) {
  return (
    <label className="grid gap-1">
      <span className="flex justify-between text-xs font-black text-slate-500">
        {label}
        {max ? <span className={count > max - 10 ? "text-amber-700" : "text-slate-400"}>{count}/{max}</span> : null}
      </span>
      {children}
    </label>
  );
}

function MyAdCard({ row, state, onEdit, onRepeat, onEnd }) {
  const ad = mapAd(row);
  const [label, tone] = STATE_LABELS[state];
  const ctr = row.impressions ? ((row.clicks / row.impressions) * 100).toFixed(1).replace(".", ",") + "%" : "—";
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative h-28 bg-amber-50">
        {ad.image ? <img src={ad.image} alt="" className="h-full w-full object-cover" /> : null}
        <span className={"absolute right-3 top-3 rounded-full px-2 py-1 text-[12px] font-black " + tone}>{label}</span>
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[12px] font-black uppercase tracking-[0.12em] text-slate-600">{(AD_PLACEMENTS[row.placement] || {}).label} · {row.days} gün</span>
      </div>
      <div className="p-3">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">{row.brand}</div>
        <div className="text-sm font-black text-slate-900">{row.title}</div>
        {row.text && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{row.text}</p>}

        {(state === "live" || state === "ended") && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat icon={Eye} label={row.placement === "notification" ? "Ulaşan üye" : "Gösterim"} value={(row.placement === "notification" ? row.deliveries || 0 : row.impressions).toLocaleString("tr-TR")} />
            <Stat icon={MousePointerClick} label="Tıklama" value={row.clicks.toLocaleString("tr-TR")} />
            <Stat icon={BarChart3} label="Tıklama oranı" value={ctr} />
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
          {state === "live" && <span className="flex items-center gap-1"><Hourglass size={13} /> Kalan: {remaining(row.ends_at)}</span>}
          {state === "live" && <span>{day(row.starts_at)} – {day(row.ends_at)}</span>}
          {state === "ended" && row.starts_at && <span>{day(row.starts_at)} – {day(row.ends_at)}</span>}
          {state === "pending" && <span className="flex items-center gap-1"><Clock size={13} /> {day(row.created_at)} tarihinde gönderildi</span>}
          <span>{tl(row.price)}</span>
        </div>
        {state === "rejected" && row.reject_reason && (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800"><strong>Reddedilme nedeni:</strong> {row.reject_reason}</div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {state === "pending" && <SmallBtn icon={Pencil} onClick={onEdit}>Düzenle</SmallBtn>}
          {state === "pending" && <SmallBtn icon={X} danger onClick={onEnd}>Geri çek</SmallBtn>}
          {state === "live" && <SmallBtn icon={Square} danger onClick={onEnd}>Durdur</SmallBtn>}
          {state === "rejected" && <SmallBtn icon={Pencil} onClick={onRepeat}>Düzenleyip yeniden gönder</SmallBtn>}
          {state === "ended" && <SmallBtn icon={RotateCcw} onClick={onRepeat}>Yeniden yayınla</SmallBtn>}
          {state === "live" && ad.url && (
            <a href={ad.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"><ExternalLink size={13} /> Bağlantıyı aç</a>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-[12px] font-black uppercase tracking-wide text-slate-400"><Icon size={11} /> {label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function SmallBtn({ icon: Icon, children, onClick, danger }) {
  return (
    <button onClick={onClick} className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black " + (danger ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-slate-200 text-slate-700 hover:bg-slate-50")}>
      <Icon size={13} /> {children}
    </button>
  );
}
