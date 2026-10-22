import React, { useCallback, useEffect, useState } from "react";
import { Flag, Frown, Loader2, Meh, Smile, Star, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";

export const RATINGS = {
  positive: { label: "Olumlu", icon: Smile, tone: "text-emerald-700", ring: "border-emerald-500 bg-emerald-50 text-emerald-800", chip: "bg-emerald-50 text-emerald-700" },
  neutral: { label: "Nötr", icon: Meh, tone: "text-slate-700", ring: "border-slate-500 bg-slate-100 text-slate-800", chip: "bg-slate-100 text-slate-700" },
  negative: { label: "Olumsuz", icon: Frown, tone: "text-red-700", ring: "border-red-500 bg-red-50 text-red-800", chip: "bg-red-50 text-red-700" }
};

const PROFILE_COLS = "id, username, avatar_url";

// Bir üyenin aldığı değerlendirmeler: sayılar + son değerlendirmeler (yorumcu profilleriyle)
export function useProfileReviews(userId, enabled = true) {
  const [state, setState] = useState({ loaded: false, stats: { positive: 0, neutral: 0, negative: 0 }, items: [], profiles: {} });

  const reload = useCallback(async () => {
    if (!userId || !enabled) return;
    const count = (rating) =>
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewee_id", userId).eq("rating", rating).eq("is_hidden", false);
    const [pos, neu, neg, list] = await Promise.all([
      count("positive"),
      count("neutral"),
      count("negative"),
      supabase.from("reviews").select("*").eq("reviewee_id", userId).eq("is_hidden", false).order("created_at", { ascending: false }).limit(20)
    ]);
    const items = list.data || [];
    let profiles = {};
    const ids = Array.from(new Set(items.map((row) => row.reviewer_id)));
    if (ids.length) {
      const { data } = await supabase.from("profiles").select(PROFILE_COLS).in("id", ids);
      profiles = Object.fromEntries((data || []).map((row) => [row.id, row]));
    }
    setState({ loaded: true, stats: { positive: pos.count || 0, neutral: neu.count || 0, negative: neg.count || 0 }, items, profiles });
  }, [userId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

/* Değerlendirme penceresi --------------------------------------------- */

export function ReviewModal({ conversation, onClose, onSaved }) {
  const existing = conversation.myReview;
  const [rating, setRating] = useState(existing ? existing.rating : "");
  const [comment, setComment] = useState(existing ? existing.comment || "" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!rating || busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_review", { p_conversation_id: conversation.dbId, p_rating: rating, p_comment: comment.trim() || null });
    setBusy(false);
    if (err) return setError(trError(err));
    onSaved(existing ? "Değerlendirmen güncellendi" : "Değerlendirmen için teşekkürler!");
    return undefined;
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-label="Alışverişi değerlendir" className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Alışverişi değerlendir</h2>
            <p className="mt-0.5 text-sm text-slate-500">{conversation.user} · {conversation.title}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="Pencereyi kapat" title="Pencereyi kapat"><X size={18} /></button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">Değerlendirmen karşı tarafın profilinde herkese açık görünür. Yalnızca gerçekten yaşadığın alışverişi anlat; kişisel bilgi paylaşma.</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(RATINGS).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRating(key)}
                className={"flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-black transition " + (rating === key ? meta.ring : "border-slate-200 text-slate-600 hover:border-slate-300")}
              >
                <Icon size={26} /> {meta.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Kısa bir yorum (isteğe bağlı): canlılar sağlıklı mıydı, iletişim nasıldı?"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-cyan-700"
        />
        {error && <div className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
        <button onClick={save} disabled={!rating || busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
          {busy && <Loader2 size={16} className="animate-spin" />} {existing ? "Değerlendirmeyi güncelle" : "Değerlendirmeyi gönder"}
        </button>
      </div>
    </div>
  );
}

/* Mesajlaşma ekranındaki şerit ----------------------------------------- */

export function ReviewStrip({ conversation, onReview }) {
  if (!conversation || !conversation.real || !conversation.listingId) return null;
  if (!conversation.bothSent) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Star size={14} /> İki taraf da yazıştıktan sonra bu alışverişi değerlendirebilirsiniz.
      </div>
    );
  }
  const mine = conversation.myReview;
  const meta = mine ? RATINGS[mine.rating] : null;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-700">
        <Star size={15} className="text-cyan-800" />
        {mine ? (
          <>Değerlendirmen: <strong className={meta.tone}>{meta.label}</strong></>
        ) : (
          <>Bu ilan üzerinden alışveriş yaptınız mı?</>
        )}
      </span>
      <button onClick={onReview} className="rounded-full bg-cyan-950 px-3 py-1.5 text-xs font-black text-white hover:bg-cyan-900">
        {mine ? "Değiştir" : "Değerlendir"}
      </button>
    </div>
  );
}

/* Profildeki özet ve liste --------------------------------------------- */

export function ReviewSummary({ stats }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {Object.entries(RATINGS).map(([key, meta]) => (
        <div key={key} className="rounded-xl bg-white p-2 text-center ring-1 ring-slate-200">
          <div className={"text-lg font-black " + meta.tone}>{stats[key] || 0}</div>
          <div className="text-xs font-bold text-slate-500">{meta.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ReviewList({ data, myId, onProfile, onReport, onToast }) {
  const [replying, setReplying] = useState(null);
  const [text, setText] = useState("");
  if (!data.loaded) return <div className="flex items-center gap-2 py-3 text-xs font-bold text-slate-400"><Loader2 size={14} className="animate-spin" /> Yükleniyor…</div>;
  if (!data.items.length) return <p className="mt-2 text-sm text-slate-500">Henüz değerlendirme yok.</p>;

  async function sendReply(review) {
    const { error } = await supabase.rpc("reply_review", { p_review_id: review.id, p_reply: text });
    if (error) return onToast(trError(error));
    setReplying(null);
    onToast("Yanıtın eklendi");
    return data.reload();
  }

  return (
    <ul className="mt-3 grid gap-2">
      {data.items.map((review) => {
        const meta = RATINGS[review.rating];
        const reviewer = data.profiles[review.reviewer_id];
        const isMine = myId && review.reviewee_id === myId;
        return (
          <li key={review.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={"rounded-full px-2 py-0.5 font-black " + meta.chip}>{meta.label}</span>
              <button type="button" onClick={() => reviewer && onProfile(reviewer)} className="font-black text-slate-800 hover:underline">{reviewer ? "@" + reviewer.username : "Silinmiş üye"}</button>
              <span className="text-slate-400">{review.reviewer_role === "buyer" ? "alıcı" : "satıcı"} · {new Date(review.created_at).toLocaleDateString("tr-TR")}</span>
              {myId && review.reviewer_id !== myId && (
                <button type="button" onClick={() => onReport(review)} className="ml-auto text-slate-400 hover:text-amber-700" title="Değerlendirmeyi bildir" aria-label="Değerlendirmeyi bildir"><Flag size={13} /></button>
              )}
            </div>
            {review.listing_title && <div className="mt-1 text-[12px] font-bold text-slate-400">İlan: {review.listing_title}</div>}
            {review.comment && <p className="mt-1 text-sm leading-relaxed text-slate-700">{review.comment}</p>}
            {review.reply && (
              <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"><strong className="text-slate-800">Yanıt:</strong> {review.reply}</div>
            )}
            {isMine && replying !== review.id && (
              <button type="button" onClick={() => { setReplying(review.id); setText(review.reply || ""); }} className="mt-1.5 text-xs font-black text-cyan-800 hover:underline">
                {review.reply ? "Yanıtı düzenle" : "Yanıtla"}
              </button>
            )}
            {replying === review.id && (
              <div className="mt-2">
                <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-base outline-none focus:border-cyan-700" placeholder="Kısa ve saygılı bir yanıt yaz" />
                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" onClick={() => setReplying(null)} className="rounded-full px-3 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">Vazgeç</button>
                  <button type="button" onClick={() => sendReply(review)} className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-black text-white hover:bg-cyan-900">Kaydet</button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
