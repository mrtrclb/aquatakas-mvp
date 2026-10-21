import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  ExternalLink,
  Fish,
  Flag,
  Hash,
  History,
  LayoutDashboard,
  Loader2,
  Megaphone,
  Menu,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  UsersRound,
  X
} from "lucide-react";
import { useAuth, AquagramMark } from "./auth";
import { supabase, trError } from "./lib/supabase";

/* ------------------------------------------------------------------ */
/* Sabitler                                                            */
/* ------------------------------------------------------------------ */

export const PERMISSIONS = [
  ["reports", "Şikâyetler"],
  ["content", "İçerik kaldırma"],
  ["users", "Kullanıcılar"],
  ["groups", "Gruplar"],
  ["tags", "Etiketler"],
  ["species", "Türler"],
  ["ads", "Öne çıkarma ve reklam"],
  ["settings", "Ayarlar"]
];

const SECTIONS = [
  { id: "ozet", label: "Özet", icon: LayoutDashboard, perm: null },
  { id: "sikayetler", label: "Şikâyetler", icon: Flag, perm: "reports", stat: "reports_open" },
  { id: "one-cikarma", label: "Öne çıkarma", icon: Pin, perm: "ads", stat: "features_pending" },
  { id: "reklamlar", label: "Reklamlar", icon: Megaphone, perm: "ads", stat: "ads_pending" },
  { id: "kullanicilar", label: "Kullanıcılar", icon: Users, perm: "users" },
  { id: "icerik", label: "Kaldırılan içerik", icon: Trash2, perm: "content" },
  { id: "etiketler", label: "Etiketler", icon: Hash, perm: "tags" },
  { id: "gruplar", label: "Gruplar", icon: UsersRound, perm: "groups" },
  { id: "turler", label: "Türler", icon: Fish, perm: "species", stat: "species_suggestions_pending" },
  { id: "ayarlar", label: "Ayarlar", icon: Settings, perm: "settings" },
  { id: "ekip", label: "Ekip ve yetkiler", icon: ShieldCheck, perm: "super" },
  { id: "kayit", label: "İşlem kaydı", icon: History, perm: null }
];

const TARGET_LABELS = {
  listing: "İlan",
  post: "Paylaşım",
  comment: "Yorum",
  species_comment: "Tür deneyimi",
  message: "Mesaj",
  user: "Kullanıcı",
  group: "Grup",
  ad: "Reklam",
  tag: "Etiket",
  setting: "Ayar",
  species: "Tür",
  species_suggestion: "Tür önerisi"
};

const ACTION_LABELS = {
  "content.remove": "İçerik kaldırıldı",
  "content.restore": "İçerik geri alındı",
  "report.resolved": "Şikâyet kapatıldı",
  "report.dismissed": "Şikâyet reddedildi",
  "feature.approve": "Öne çıkarma onaylandı",
  "feature.reject": "Öne çıkarma reddedildi",
  "ad.approve": "Reklam onaylandı",
  "ad.reject": "Reklam reddedildi",
  "user.suspend": "Kullanıcı askıya alındı",
  "user.unsuspend": "Askı kaldırıldı",
  "user.phone_verified": "Telefon doğrulaması değişti",
  "staff.set": "Ekip yetkisi verildi",
  "staff.deactivate": "Ekip yetkisi kaldırıldı",
  "tag.ban": "Etiket yasaklandı",
  "tag.unban": "Etiket yasağı kaldırıldı",
  "tag.merge": "Etiketler birleştirildi",
  "group.close": "Grup kapatıldı",
  "group.reopen": "Grup yeniden açıldı",
  "species_comment.remove": "Tür deneyimi kaldırıldı",
  "settings.update": "Ayar değişti",
  "species.update": "Tür güncellendi",
  "species_suggestion.review": "Tür önerisi sonuçlandı"
};

const REMOVE_REASONS = ["Spam veya reklam", "Hakaret / taciz", "Yanıltıcı veya tehlikeli bilgi", "Uygunsuz görsel", "Kurallara aykırı satış", "Hayvan refahına aykırı"];
const PROFILE_COLS = "id, username, city, avatar_url, phone_verified, suspended_until, suspension_reason, created_at";
const FOREVER = "2999-12-31T00:00:00Z";

const fmtDate = (value) => (value ? new Date(value).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const fmtDay = (value) => (value ? new Date(value).toLocaleDateString("tr-TR") : "—");
const tl = (value) => (value == null ? "—" : Number(value).toLocaleString("tr-TR") + " ₺");
const isSuspended = (profile) => profile && profile.suspended_until && new Date(profile.suspended_until) > new Date();

/* ------------------------------------------------------------------ */
/* Ortak yardımcılar                                                   */
/* ------------------------------------------------------------------ */

const AdminCtx = createContext(null);
const useAdmin = () => useContext(AdminCtx);

function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

async function must(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

async function profilesByIds(ids) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};
  const rows = await must(supabase.from("profiles").select(PROFILE_COLS).in("id", unique));
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

function siteLink(path) {
  return window.location.pathname + "#" + path;
}

/* ------------------------------------------------------------------ */
/* Küçük bileşenler                                                    */
/* ------------------------------------------------------------------ */

function Btn({ children, onClick, tone = "default", disabled, small, type = "button", title }) {
  const tones = {
    default: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
    primary: "bg-cyan-950 text-white hover:bg-cyan-900",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghostDanger: "bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700"
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={"inline-flex items-center justify-center gap-1.5 rounded-full font-black transition disabled:opacity-40 " + (small ? "px-3 py-1.5 text-xs " : "px-4 py-2 text-sm ") + tones[tone]}
    >
      {children}
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    cyan: "bg-cyan-50 text-cyan-800",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700"
  };
  return <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black " + tones[tone]}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={"rounded-[22px] border border-slate-200 bg-white p-4 " + className}>{children}</div>;
}

function Section({ title, subtitle, actions, children }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-slate-100 p-1">
      {items.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={"shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black transition " + (value === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
        >
          {label}
          {count ? <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{count}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Empty({ children }) {
  return <div className="rounded-[22px] bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">{children}</div>;
}

function LoadState({ state, children }) {
  if (state.loading && !state.data) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm font-bold text-slate-400">
        <Loader2 className="animate-spin" size={18} /> Yükleniyor…
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="rounded-[22px] bg-rose-50 p-5 text-sm font-bold text-rose-700">
        {trError(state.error)}
        <button onClick={state.reload} className="ml-3 underline">Tekrar dene</button>
      </div>
    );
  }
  return children(state.data);
}

function Person({ profile, sub }) {
  if (!profile) return <span className="text-sm text-slate-400">Silinmiş üye</span>;
  return (
    <a href={"#/yonetim/kullanicilar/" + profile.id} className="flex min-w-0 items-center gap-2 hover:underline" title="Kullanıcıyı yönet">
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-950 text-[11px] font-black text-white">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.username.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-800">@{profile.username}</span>
        {sub && <span className="block truncate text-[11px] text-slate-400">{sub}</span>}
      </span>
    </a>
  );
}

/* Gerekçe / onay penceresi ------------------------------------------- */

function ReasonDialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.initial || "");
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const ok = !dialog.required || value.trim().length >= 2;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose(null)}>
      <div role="dialog" aria-label={dialog.title} className="w-full max-w-md rounded-[26px] bg-white p-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black">{dialog.title}</h2>
          <button onClick={() => onClose(null)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" title="Pencereyi kapat" aria-label="Pencereyi kapat"><X size={18} /></button>
        </div>
        {dialog.text && <p className="mb-3 text-sm text-slate-500">{dialog.text}</p>}
        {dialog.input !== false && (
          <>
            {dialog.presets && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {dialog.presets.map((preset) => (
                  <button key={preset} type="button" onClick={() => setValue(preset)} className={"rounded-full px-2.5 py-1 text-xs font-bold ring-1 " + (value === preset ? "bg-cyan-950 text-white ring-cyan-950" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
                    {preset}
                  </button>
                ))}
              </div>
            )}
            <textarea
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder={dialog.placeholder || (dialog.required ? "Gerekçe yaz (zorunlu)" : "Not ekle (isteğe bağlı)")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700"
            />
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={() => onClose(null)}>Vazgeç</Btn>
          <Btn tone={dialog.danger ? "danger" : "primary"} disabled={!ok} onClick={() => onClose(value.trim())}>{dialog.confirm || "Onayla"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ana bileşen                                                         */
/* ------------------------------------------------------------------ */

function readRoute() {
  const match = window.location.hash.match(/^#\/yonetim(?:\/([^/?]+))?(?:\/([^/?]+))?/);
  return { section: (match && match[1]) || "ozet", param: match && match[2] ? decodeURIComponent(match[2]) : null };
}

export default function AdminApp() {
  const auth = useAuth();
  const [route, setRoute] = useState(readRoute);
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      setNavOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const staff = auth.staff;
  const perms = useMemo(() => new Set((staff && staff.permissions) || []), [staff]);
  const isSuper = Boolean(staff && staff.role === "super_admin");
  const can = useCallback((perm) => (perm === "super" ? isSuper : !perm || isSuper || perms.has(perm)), [isSuper, perms]);

  const refreshStats = useCallback(async () => {
    if (!staff) return;
    const { data } = await supabase.rpc("admin_dashboard_stats");
    let adsPending = 0;
    if (can("ads")) {
      const { count } = await supabase.from("ads").select("id", { count: "exact", head: true }).eq("status", "pending");
      adsPending = count || 0;
    }
    setStats(data ? { ...data, ads_pending: adsPending } : null);
  }, [staff, can]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const ask = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);

  // RPC/sorgu çalıştırır, sonucu bildirir; başarılıysa true döner
  const act = useCallback(
    async (promise, okMessage) => {
      const { error } = await promise;
      if (error) {
        setToast(trError(error));
        return false;
      }
      if (okMessage) setToast(okMessage);
      refreshStats();
      return true;
    },
    [refreshStats]
  );

  if (!auth.ready || (auth.session && !auth.profile)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-bold text-slate-400">
        <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Yönetim paneli açılıyor…</span>
      </div>
    );
  }

  if (!auth.session || !staff) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-5">
        <Card className="max-w-sm text-center">
          <ShieldCheck className="mx-auto mb-3 text-slate-300" size={36} />
          <h1 className="text-lg font-black">Yönetim paneli</h1>
          <p className="mt-1 text-sm text-slate-500">
            {auth.session ? "Bu sayfayı görmek için ekip yetkin olmalı." : "Bu sayfayı görmek için ekip hesabınla giriş yapmalısın."}
          </p>
          <a href={window.location.pathname + "#/"} className="mt-4 inline-flex rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white">Siteye dön</a>
        </Card>
      </div>
    );
  }

  const visible = SECTIONS.filter((item) => can(item.perm));
  const current = visible.find((item) => item.id === route.section) || visible[0];
  const ctx = { auth, can, isSuper, act, ask, notify: setToast, stats, refreshStats, param: route.param };

  const nav = (
    <nav className="grid gap-0.5">
      {visible.map((item) => {
        const Icon = item.icon;
        const count = item.stat && stats ? stats[item.stat] : 0;
        return (
          <a
            key={item.id}
            href={"#/yonetim/" + item.id}
            className={"flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-black transition " + (current.id === item.id ? "bg-cyan-50 text-cyan-950" : "text-slate-600 hover:bg-slate-50")}
          >
            <Icon size={17} />
            <span className="flex-1">{item.label}</span>
            {count > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[11px] text-white">{count}</span>}
          </a>
        );
      })}
    </nav>
  );

  const views = {
    ozet: DashboardSection,
    sikayetler: ReportsSection,
    "one-cikarma": FeaturesSection,
    reklamlar: AdsSection,
    kullanicilar: UsersSection,
    icerik: RemovedContentSection,
    etiketler: TagsSection,
    gruplar: GroupsSection,
    turler: SpeciesSection,
    ayarlar: SettingsSection,
    ekip: StaffSection,
    kayit: AuditSection
  };
  const View = views[current.id];

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-[60px] max-w-7xl items-center gap-3 px-4">
            <button onClick={() => setNavOpen((value) => !value)} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 lg:hidden" title="Menü"><Menu size={20} /></button>
            <a href="#/yonetim" className="flex items-center gap-2">
              <AquagramMark />
              <span className="leading-tight">
                <span className="block text-base font-black">Aquagram</span>
                <span className="block text-[11px] font-black uppercase tracking-wide text-amber-700">Yönetim paneli</span>
              </span>
            </a>
            <div className="flex-1" />
            <Badge tone={isSuper ? "amber" : "cyan"}><ShieldCheck size={12} /> {isSuper ? "Süper yönetici" : "Moderatör"}</Badge>
            <span className="hidden text-sm font-black text-slate-700 sm:inline">@{auth.profile.username}</span>
            <a href={window.location.pathname + "#/"} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Siteye dön</span>
            </a>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[230px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[76px] rounded-[22px] border border-slate-200 bg-white p-2">{nav}</div>
          </aside>
          {navOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setNavOpen(false)}>
              <div className="h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-3 shadow-2xl">{nav}</div>
            </div>
          )}
          <main className="min-w-0">
            <View key={current.id} />
          </main>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[90] max-w-[90vw] -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl">{toast}</div>
        )}
        {dialog && (
          <ReasonDialog
            dialog={dialog}
            onClose={(value) => {
              dialog.resolve(value);
              setDialog(null);
            }}
          />
        )}
      </div>
    </AdminCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Özet                                                                */
/* ------------------------------------------------------------------ */

function DashboardSection() {
  const { stats, can } = useAdmin();
  const tiles = [
    ["Toplam üye", stats && stats.members_total, "Son 7 gün: " + (stats ? stats.members_7d : "…"), "kullanicilar", "users"],
    ["Yayındaki ilan", stats && stats.listings_active, "Son 7 gün: " + (stats ? stats.listings_7d : "…"), null, null],
    ["Paylaşım (7 gün)", stats && stats.posts_7d, "Topluluk akışı", null, null],
    ["Açık şikâyet", stats && stats.reports_open, "İncelenmeyi bekliyor", "sikayetler", "reports", true],
    ["Öne çıkarma başvurusu", stats && stats.features_pending, "Onay bekliyor", "one-cikarma", "ads", true],
    ["Reklam başvurusu", stats && stats.ads_pending, "Onay bekliyor", "reklamlar", "ads", true],
    ["Tür önerisi", stats && stats.species_suggestions_pending, "Onay bekliyor", "turler", "species", true],
    ["Askıdaki üye", stats && stats.suspended_users, "Şu an askıda", "kullanicilar", "users"]
  ];
  return (
    <Section title="Özet" subtitle="Sitenin genel durumu ve bekleyen işler.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, value, sub, link, perm, alert]) => {
          const body = (
            <Card className={"h-full transition " + (link && can(perm) ? "hover:border-cyan-300 hover:shadow-sm" : "")}>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div>
              <div className={"mt-1 text-3xl font-black " + (alert && value > 0 ? "text-rose-600" : "text-slate-900")}>{value == null ? "…" : value.toLocaleString("tr-TR")}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>
            </Card>
          );
          return link && can(perm) ? <a key={label} href={"#/yonetim/" + link}>{body}</a> : <div key={label}>{body}</div>;
        })}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Şikâyetler                                                          */
/* ------------------------------------------------------------------ */

const REMOVABLE = new Set(["listing", "post", "comment", "species_comment"]);

async function loadReportTargets(groups) {
  const idsOf = (type) => groups.filter((group) => group.type === type).map((group) => group.id);
  const out = {};
  const num = (ids) => ids.map(Number).filter((id) => Number.isFinite(id));

  const postIds = num(idsOf("post"));
  if (postIds.length) {
    (await must(supabase.from("posts").select("id, slug, text, images, user_id, is_removed, removed_reason").in("id", postIds))).forEach((row) => {
      out["post:" + row.id] = { text: row.text, image: (row.images || [])[0], userId: row.user_id, removed: row.is_removed, href: "/paylasim/" + row.slug };
    });
  }
  const commentIds = num(idsOf("comment"));
  if (commentIds.length) {
    const rows = await must(supabase.from("comments").select("id, post_id, text, images, user_id, is_removed").in("id", commentIds));
    const parents = rows.length ? await must(supabase.from("posts").select("id, slug").in("id", rows.map((row) => row.post_id))) : [];
    const slugOf = Object.fromEntries(parents.map((row) => [row.id, row.slug]));
    rows.forEach((row) => {
      out["comment:" + row.id] = { text: row.text, image: (row.images || [])[0], userId: row.user_id, removed: row.is_removed, href: slugOf[row.post_id] ? "/paylasim/" + slugOf[row.post_id] : null };
    });
  }
  const listingIds = num(idsOf("listing"));
  if (listingIds.length) {
    (await must(supabase.from("listings").select("id, title, description, images, user_id, status").in("id", listingIds))).forEach((row) => {
      out["listing:" + row.id] = { title: row.title, text: row.description, image: (row.images || [])[0], userId: row.user_id, removed: row.status === "removed", status: row.status, href: "/ilan/" + row.id };
    });
  }
  const speciesCommentIds = num(idsOf("species_comment"));
  if (speciesCommentIds.length) {
    const rows = await must(supabase.from("species_comments").select("id, species_id, text, images, user_id, is_removed").in("id", speciesCommentIds));
    const species = rows.length ? await must(supabase.from("species").select("id, slug, name").in("id", rows.map((row) => row.species_id))) : [];
    const byId = Object.fromEntries(species.map((row) => [row.id, row]));
    rows.forEach((row) => {
      const sp = byId[row.species_id];
      out["species_comment:" + row.id] = { title: sp ? sp.name : null, text: row.text, image: (row.images || [])[0], userId: row.user_id, removed: row.is_removed, href: sp ? "/tur/" + sp.slug : null };
    });
  }
  const userIds = idsOf("user");
  if (userIds.length) {
    (await must(supabase.from("profiles").select(PROFILE_COLS).in("id", userIds))).forEach((row) => {
      out["user:" + row.id] = { title: "@" + row.username, userId: row.id, removed: isSuspended(row), suspended: isSuspended(row) };
    });
  }
  const groupIds = idsOf("group");
  if (groupIds.length) {
    (await must(supabase.from("groups").select("id, slug, name, description, owner_id, is_closed").in("id", groupIds))).forEach((row) => {
      out["group:" + row.id] = { title: row.name, text: row.description, userId: row.owner_id, removed: row.is_closed, href: "/grup/" + row.slug };
    });
  }
  return out;
}

function ReportsSection() {
  const { act, ask, can } = useAdmin();
  const [status, setStatus] = useState("open");
  const state = useLoad(async () => {
    const rows = await must(supabase.from("reports").select("*").eq("status", status).order("created_at", { ascending: false }).limit(300));
    const byKey = {};
    rows.forEach((row) => {
      const key = row.target_type + ":" + row.target_id;
      if (!byKey[key]) byKey[key] = { key, type: row.target_type, id: row.target_id, reports: [] };
      byKey[key].reports.push(row);
    });
    const groups = Object.values(byKey);
    const targets = await loadReportTargets(groups);
    const profiles = await profilesByIds([...rows.map((row) => row.reporter_id), ...rows.map((row) => row.resolved_by), ...Object.values(targets).map((t) => t.userId)]);
    return { groups, targets, profiles };
  }, [status]);

  async function resolve(group, mode) {
    const first = group.reports[0];
    const remove = mode === "remove";
    const reasons = Array.from(new Set(group.reports.map((row) => row.reason)));
    const note = await ask(
      remove
        ? { title: "İçeriği kaldır ve kapat", text: "İçerik yayından kaldırılır, bu içerikle ilgili tüm açık şikâyetler kapanır.", presets: Array.from(new Set([...reasons, ...REMOVE_REASONS])).slice(0, 8), required: true, confirm: "Kaldır", danger: true }
        : mode === "resolved"
          ? { title: "Şikâyeti kapat", text: "İçerik yerinde kalır; şikâyet haklı bulunup kapatılır (ör. kullanıcı uyarıldı).", confirm: "Kapat" }
          : { title: "Şikâyeti reddet", text: "İçerik kurallara uygun bulundu; şikâyet reddedilir.", confirm: "Reddet" }
    );
    if (note === null) return;
    const ok = await act(
      supabase.rpc("admin_resolve_report", { p_report_id: first.id, p_status: mode === "dismissed" ? "dismissed" : "resolved", p_resolution: note || null, p_remove_content: remove }),
      remove ? "İçerik kaldırıldı, şikâyet kapatıldı" : mode === "dismissed" ? "Şikâyet reddedildi" : "Şikâyet kapatıldı"
    );
    if (ok) state.reload();
  }

  return (
    <Section title="Şikâyetler" subtitle="Aynı içerik için gelen şikâyetler tek kartta toplanır; karar verince hepsi birlikte kapanır.">
      <Tabs value={status} onChange={setStatus} items={[["open", "Açık"], ["resolved", "Kapatılan"], ["dismissed", "Reddedilen"]]} />
      <LoadState state={state}>
        {(data) =>
          !data.groups.length ? (
            <Empty>{status === "open" ? "Bekleyen şikâyet yok 🎉" : "Kayıt yok."}</Empty>
          ) : (
            <div className="grid gap-3">
              {data.groups.map((group) => {
                const target = data.targets[group.key];
                const author = target ? data.profiles[target.userId] : null;
                const last = group.reports[0];
                return (
                  <Card key={group.key}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="violet">{TARGET_LABELS[group.type] || group.type}</Badge>
                      <Badge tone="rose"><Flag size={11} /> {group.reports.length} şikâyet</Badge>
                      {target && target.removed && <Badge tone="amber">{group.type === "user" ? "Askıda" : group.type === "group" ? "Kapalı" : "Kaldırıldı"}</Badge>}
                      <span className="text-xs text-slate-400">Son: {fmtDate(last.created_at)}</span>
                      <div className="flex-1" />
                      {target && target.href && (
                        <a href={siteLink(target.href)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cyan-800 hover:underline">
                          Sitede aç <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <div className="mt-3 flex gap-3 rounded-2xl bg-slate-50 p-3">
                      {target && target.image && <img src={target.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
                      <div className="min-w-0 flex-1">
                        {!target ? (
                          <p className="text-sm text-slate-500">{group.type === "message" ? "Mesaj içerikleri gizlidir; yalnızca konuşmanın tarafları görebilir." : "İçerik bulunamadı (silinmiş olabilir)."} <span className="text-slate-400">#{group.id}</span></p>
                        ) : (
                          <>
                            {target.title && <div className="text-sm font-black text-slate-900">{target.title}</div>}
                            {target.text && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-sm text-slate-700">{target.text}</p>}
                            {author && <div className="mt-2"><Person profile={author} sub={group.type === "group" ? "Kurucu" : "İçerik sahibi"} /></div>}
                          </>
                        )}
                      </div>
                    </div>

                    <ul className="mt-3 grid gap-1.5">
                      {group.reports.map((report) => {
                        const reporter = data.profiles[report.reporter_id];
                        return (
                          <li key={report.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                            <span className="font-black text-slate-800">{report.reason}</span>
                            {report.note && <span className="text-slate-600">“{report.note}”</span>}
                            <span className="text-xs text-slate-400">— {reporter ? "@" + reporter.username : "üye"} · {fmtDate(report.created_at)}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {status === "open" ? (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {REMOVABLE.has(group.type) && can("content") && target && !target.removed && (
                          <Btn small tone="danger" onClick={() => resolve(group, "remove")}><Trash2 size={13} /> Kaldır ve kapat</Btn>
                        )}
                        {group.type === "user" && can("users") && (
                          <a href={"#/yonetim/kullanicilar/" + group.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Users size={13} /> Kullanıcıyı yönet</a>
                        )}
                        {group.type === "group" && can("groups") && (
                          <a href="#/yonetim/gruplar" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><UsersRound size={13} /> Gruplara git</a>
                        )}
                        <Btn small onClick={() => resolve(group, "resolved")}><Check size={13} /> Haklı, kapat</Btn>
                        <Btn small onClick={() => resolve(group, "dismissed")}><X size={13} /> Reddet</Btn>
                      </div>
                    ) : (
                      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        {last.resolution ? <span className="font-bold text-slate-700">Karar notu: {last.resolution} · </span> : null}
                        {data.profiles[last.resolved_by] ? "@" + data.profiles[last.resolved_by].username : "Ekip"} · {fmtDate(last.resolved_at)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        }
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Öne çıkarma başvuruları                                             */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const map = { pending: ["Bekliyor", "amber"], approved: ["Onaylandı", "emerald"], rejected: ["Reddedildi", "rose"], ended: ["Bitti", "slate"] };
  const [label, tone] = map[status] || [status, "slate"];
  return <Badge tone={tone}>{label}</Badge>;
}

const PAYMENT_LABELS = { simulated_paid: "Deneme ödemesi", paid: "Ödendi", refunded: "İade edildi", failed: "Başarısız" };

function FeaturesSection() {
  const { act, ask } = useAdmin();
  const [status, setStatus] = useState("pending");
  const state = useLoad(async () => {
    const rows = await must(supabase.from("listing_features").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200));
    const listings = rows.length ? await must(supabase.from("listings").select("id, title, images, city, price, type, status, featured_until").in("id", rows.map((row) => row.listing_id))) : [];
    const profiles = await profilesByIds(rows.map((row) => row.user_id));
    return { rows, listings: Object.fromEntries(listings.map((row) => [row.id, row])), profiles };
  }, [status]);

  async function review(row, approve) {
    let reason = null;
    if (!approve) {
      reason = await ask({ title: "Başvuruyu reddet", text: "Gerekçe ilan sahibine bildirim olarak gider.", presets: ["Fotoğraflar yetersiz", "İlan kurallara aykırı", "Ödeme doğrulanamadı"], required: true, confirm: "Reddet", danger: true });
      if (reason === null) return;
    }
    if (await act(supabase.rpc("admin_review_feature", { p_id: row.id, p_approve: approve, p_reason: reason }), approve ? "Öne çıkarma onaylandı" : "Başvuru reddedildi")) state.reload();
  }

  return (
    <Section title="Öne çıkarma başvuruları" subtitle="Onaylanan ilan, plan süresi boyunca öne çıkan ilanlarda gösterilir; ilan sahibine bildirim gider.">
      <Tabs value={status} onChange={setStatus} items={[["pending", "Bekleyen"], ["approved", "Onaylanan"], ["rejected", "Reddedilen"]]} />
      <LoadState state={state}>
        {(data) =>
          !data.rows.length ? (
            <Empty>{status === "pending" ? "Bekleyen başvuru yok." : "Kayıt yok."}</Empty>
          ) : (
            <div className="grid gap-3">
              {data.rows.map((row) => {
                const listing = data.listings[row.listing_id];
                return (
                  <Card key={row.id} className="flex flex-wrap items-center gap-4">
                    {listing && listing.images && listing.images[0] ? (
                      <img src={listing.images[0]} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-100 text-slate-300"><Pin /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={row.status} />
                        <Badge tone="cyan">{row.days} gün · {tl(row.price)}</Badge>
                        <Badge>{PAYMENT_LABELS[row.payment_status] || row.payment_status}</Badge>
                      </div>
                      <a href={siteLink("/ilan/" + row.listing_id)} target="_blank" rel="noreferrer" className="mt-1 block truncate text-base font-black hover:underline">{listing ? listing.title : "İlan #" + row.listing_id}</a>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <Person profile={data.profiles[row.user_id]} />
                        <span>Başvuru: {fmtDate(row.created_at)}</span>
                        {row.ends_at && <span>Bitiş: {fmtDay(row.ends_at)}</span>}
                        {row.reject_reason && <span className="font-bold text-rose-600">Gerekçe: {row.reject_reason}</span>}
                      </div>
                    </div>
                    {row.status === "pending" && (
                      <div className="flex gap-2">
                        <Btn tone="success" small onClick={() => review(row, true)}><Check size={13} /> Onayla</Btn>
                        <Btn tone="ghostDanger" small onClick={() => review(row, false)}><X size={13} /> Reddet</Btn>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        }
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Reklamlar                                                           */
/* ------------------------------------------------------------------ */

const PLACEMENT_LABELS = { feed: "Akış içi", sidebar: "Yan sütun", detail: "İlan detayı" };

function AdsSection() {
  const { act, ask } = useAdmin();
  const [status, setStatus] = useState("pending");
  const state = useLoad(async () => {
    const rows = await must(supabase.from("ads").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200));
    const profiles = await profilesByIds(rows.map((row) => row.advertiser_id));
    return { rows, profiles };
  }, [status]);

  async function review(row, approve) {
    let reason = null;
    if (!approve) {
      reason = await ask({ title: "Reklamı reddet", presets: ["Görsel uygunsuz", "Yanıltıcı içerik", "Bağlantı çalışmıyor", "Ödeme doğrulanamadı"], required: true, confirm: "Reddet", danger: true });
      if (reason === null) return;
    }
    if (await act(supabase.rpc("admin_review_ad", { p_id: row.id, p_approve: approve, p_reason: reason }), approve ? "Reklam onaylandı, yayına girdi" : "Reklam reddedildi")) state.reload();
  }

  return (
    <Section title="Reklamlar" subtitle="Onaylanan reklam hemen yayına girer ve plan süresi bitince kendiliğinden kalkar.">
      <Tabs value={status} onChange={setStatus} items={[["pending", "Bekleyen"], ["approved", "Yayında / onaylı"], ["rejected", "Reddedilen"], ["ended", "Biten"]]} />
      <LoadState state={state}>
        {(data) =>
          !data.rows.length ? (
            <Empty>{status === "pending" ? "Bekleyen reklam başvurusu yok." : "Kayıt yok."}</Empty>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.rows.map((row) => (
                <Card key={row.id} className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status} />
                    <Badge tone="cyan">{PLACEMENT_LABELS[row.placement] || row.placement}</Badge>
                    <Badge>{row.days} gün · {tl(row.price)}</Badge>
                    <Badge>{PAYMENT_LABELS[row.payment_status] || row.payment_status}</Badge>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
                    {row.image_url && <img src={row.image_url} alt="" className="h-32 w-full object-cover" />}
                    <div className="p-3">
                      <div className="text-[11px] font-black uppercase tracking-wide text-amber-700">{row.brand}</div>
                      <div className="font-black text-slate-900">{row.title}</div>
                      {row.text && <p className="mt-0.5 text-sm text-slate-600">{row.text}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {row.cta && <span className="rounded-full bg-amber-400 px-3 py-1 font-black text-slate-900">{row.cta}</span>}
                        {row.target_url && <a href={row.target_url} target="_blank" rel="noreferrer noopener" className="truncate font-bold text-cyan-800 hover:underline">{row.target_url}</a>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <Person profile={data.profiles[row.advertiser_id]} />
                    <span>{fmtDate(row.created_at)}</span>
                    {row.status === "approved" && <span>{fmtDay(row.starts_at)} – {fmtDay(row.ends_at)} · {row.impressions} gösterim · {row.clicks} tık</span>}
                    {row.reject_reason && <span className="font-bold text-rose-600">Gerekçe: {row.reject_reason}</span>}
                  </div>
                  {row.status === "pending" && (
                    <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                      <Btn tone="success" small onClick={() => review(row, true)}><Check size={13} /> Onayla</Btn>
                      <Btn tone="ghostDanger" small onClick={() => review(row, false)}><X size={13} /> Reddet</Btn>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
        }
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Kullanıcılar                                                        */
/* ------------------------------------------------------------------ */

function UsersSection() {
  const { param } = useAdmin();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim().replace(/^@/, "")), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const state = useLoad(async () => {
    let request = supabase.from("profiles").select(PROFILE_COLS).order("created_at", { ascending: false }).limit(100);
    if (term) request = request.ilike("username", "%" + term.replace(/[%_]/g, "") + "%");
    if (filter === "suspended") request = request.gt("suspended_until", new Date().toISOString());
    if (filter === "unverified") request = request.eq("phone_verified", false);
    return must(request);
  }, [term, filter]);

  if (param) return <UserDetail userId={param} />;

  return (
    <Section title="Kullanıcılar" subtitle="Üyeleri ara, askıya al, telefon doğrulamasını yönet.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
          <Search size={16} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı adı ara" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <Tabs value={filter} onChange={setFilter} items={[["all", "Tümü"], ["suspended", "Askıda"], ["unverified", "Doğrulanmamış"]]} />
      </div>
      <LoadState state={state}>
        {(rows) =>
          !rows.length ? (
            <Empty>Eşleşen üye yok.</Empty>
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              {rows.map((row) => (
                <a key={row.id} href={"#/yonetim/kullanicilar/" + row.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-950 text-xs font-black text-white">
                    {row.avatar_url ? <img src={row.avatar_url} alt="" className="h-full w-full object-cover" /> : row.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-900">@{row.username}</span>
                    <span className="block text-xs text-slate-500">{row.city || "Şehir yok"} · Katılım {fmtDay(row.created_at)}</span>
                  </span>
                  {row.phone_verified ? <Badge tone="emerald">Doğrulanmış</Badge> : <Badge>Doğrulanmamış</Badge>}
                  {isSuspended(row) && <Badge tone="rose">Askıda · {new Date(row.suspended_until).getFullYear() > 2900 ? "süresiz" : fmtDay(row.suspended_until)}</Badge>}
                </a>
              ))}
            </Card>
          )
        }
      </LoadState>
    </Section>
  );
}

function UserDetail({ userId }) {
  const { act, ask, isSuper } = useAdmin();
  const state = useLoad(async () => {
    const profile = await must(supabase.from("profiles").select(PROFILE_COLS + ", bio, district").eq("id", userId).maybeSingle());
    if (!profile) return { profile: null };
    const [privateInfo, listings, posts, comments, reportsAgainst] = await Promise.all([
      supabase.rpc("admin_user_private_info", { p_user_id: userId }),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("target_type", "user").eq("target_id", userId)
    ]);
    let staffRow = null;
    if (isSuper) {
      const { data } = await supabase.from("staff").select("role, permissions, active").eq("user_id", userId).maybeSingle();
      staffRow = data;
    }
    const audit = await must(supabase.from("admin_audit_log").select("*").eq("target_type", "user").eq("target_id", userId).order("created_at", { ascending: false }).limit(20));
    return {
      profile,
      email: privateInfo.data && privateInfo.data[0],
      counts: { listings: listings.count || 0, posts: posts.count || 0, comments: comments.count || 0, reports: reportsAgainst.count || 0 },
      staff: staffRow,
      audit
    };
  }, [userId]);

  async function suspend(days) {
    const label = days ? days + " gün" : "süresiz";
    const reason = await ask({ title: "Askıya al (" + label + ")", text: "Askıdaki üye paylaşım, yorum, ilan ve mesaj gönderemez.", presets: ["Spam", "Hakaret / taciz", "Dolandırıcılık şüphesi", "Tekrarlayan kural ihlali"], required: true, confirm: "Askıya al", danger: true });
    if (reason === null) return;
    const until = days ? new Date(Date.now() + days * 86400000).toISOString() : FOREVER;
    if (await act(supabase.rpc("admin_suspend_user", { p_user_id: userId, p_until: until, p_reason: reason }), "Üye askıya alındı")) state.reload();
  }
  async function unsuspend() {
    if (await act(supabase.rpc("admin_suspend_user", { p_user_id: userId, p_until: null, p_reason: null }), "Askı kaldırıldı")) state.reload();
  }
  async function setVerified(value) {
    if (await act(supabase.rpc("admin_set_phone_verified", { p_user_id: userId, p_verified: value }), value ? "Telefon doğrulandı olarak işaretlendi" : "Doğrulama kaldırıldı")) state.reload();
  }

  return (
    <div>
      <a href="#/yonetim/kullanicilar" className="mb-3 inline-flex items-center gap-1.5 text-sm font-black text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Kullanıcılar</a>
      <LoadState state={state}>
        {(data) =>
          !data.profile ? (
            <Empty>Kullanıcı bulunamadı.</Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="grid gap-4">
                <Card>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-cyan-950 text-xl font-black text-white">
                      {data.profile.avatar_url ? <img src={data.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : data.profile.username.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-2xl font-black">@{data.profile.username}</h1>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {data.profile.phone_verified ? <Badge tone="emerald">Telefon doğrulanmış</Badge> : <Badge>Telefon doğrulanmamış</Badge>}
                        {isSuspended(data.profile) && <Badge tone="rose">Askıda</Badge>}
                        {data.staff && data.staff.active && <Badge tone="amber"><ShieldCheck size={11} /> {data.staff.role === "super_admin" ? "Süper yönetici" : "Moderatör"}</Badge>}
                      </div>
                    </div>
                  </div>
                  {data.profile.bio && <p className="mt-3 text-sm text-slate-600">{data.profile.bio}</p>}
                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-black uppercase text-slate-400">E-posta</dt><dd className="font-bold text-slate-800">{data.email ? data.email.email : "—"}</dd></div>
                    <div><dt className="text-xs font-black uppercase text-slate-400">E-posta doğrulama</dt><dd className="font-bold text-slate-800">{data.email && data.email.email_confirmed_at ? fmtDay(data.email.email_confirmed_at) : "Doğrulanmadı"}</dd></div>
                    <div><dt className="text-xs font-black uppercase text-slate-400">Konum</dt><dd className="font-bold text-slate-800">{[data.profile.city, data.profile.district].filter(Boolean).join(" / ") || "—"}</dd></div>
                    <div><dt className="text-xs font-black uppercase text-slate-400">Son giriş</dt><dd className="font-bold text-slate-800">{data.email ? fmtDate(data.email.last_sign_in_at) : "—"}</dd></div>
                    <div><dt className="text-xs font-black uppercase text-slate-400">Katılım</dt><dd className="font-bold text-slate-800">{fmtDay(data.profile.created_at)}</dd></div>
                  </dl>
                </Card>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[["İlan", data.counts.listings], ["Paylaşım", data.counts.posts], ["Yorum", data.counts.comments], ["Hakkında şikâyet", data.counts.reports]].map(([label, value]) => (
                    <Card key={label}>
                      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
                      <div className="text-2xl font-black">{value}</div>
                    </Card>
                  ))}
                </div>
                <Card>
                  <h2 className="mb-2 font-black">Bu üyeyle ilgili işlemler</h2>
                  {!data.audit.length ? <p className="text-sm text-slate-500">Kayıt yok.</p> : (
                    <ul className="grid gap-1.5 text-sm">
                      {data.audit.map((row) => (
                        <li key={row.id} className="flex flex-wrap gap-2">
                          <span className="font-black">{ACTION_LABELS[row.action] || row.action}</span>
                          {row.details && row.details.reason && <span className="text-slate-600">“{row.details.reason}”</span>}
                          <span className="text-xs text-slate-400">{fmtDate(row.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <div className="grid content-start gap-4">
                <Card>
                  <h2 className="mb-1 font-black">Askıya alma</h2>
                  {isSuspended(data.profile) ? (
                    <>
                      <p className="text-sm text-slate-600">
                        {new Date(data.profile.suspended_until).getFullYear() > 2900 ? "Süresiz askıda." : fmtDate(data.profile.suspended_until) + " tarihine kadar askıda."}
                      </p>
                      {data.profile.suspension_reason && <p className="mt-1 text-sm font-bold text-rose-700">Gerekçe: {data.profile.suspension_reason}</p>}
                      <div className="mt-3"><Btn small tone="primary" onClick={unsuspend}><RotateCcw size={13} /> Askıyı kaldır</Btn></div>
                    </>
                  ) : (
                    <>
                      <p className="mb-3 text-sm text-slate-500">Askıdaki üye giriş yapabilir ama içerik üretemez.</p>
                      <div className="flex flex-wrap gap-2">
                        {[1, 7, 30].map((days) => <Btn key={days} small onClick={() => suspend(days)}>{days} gün</Btn>)}
                        <Btn small tone="ghostDanger" onClick={() => suspend(null)}><Ban size={13} /> Süresiz</Btn>
                      </div>
                    </>
                  )}
                </Card>
                <Card>
                  <h2 className="mb-1 font-black">Telefon doğrulaması</h2>
                  <p className="mb-3 text-sm text-slate-500">SMS doğrulaması gelene kadar elle işaretlenebilir; profilde doğrulanmış rozeti görünür.</p>
                  {data.profile.phone_verified ? (
                    <Btn small onClick={() => setVerified(false)}>Doğrulamayı kaldır</Btn>
                  ) : (
                    <Btn small tone="success" onClick={() => setVerified(true)}><Check size={13} /> Doğrulanmış işaretle</Btn>
                  )}
                </Card>
                {isSuper && (
                  <a href={"#/yonetim/ekip/" + userId} className="block">
                    <Card className="hover:border-cyan-300">
                      <h2 className="font-black">Ekip yetkisi</h2>
                      <p className="text-sm text-slate-500">Bu üyeyi moderatör yap ya da yetkilerini düzenle →</p>
                    </Card>
                  </a>
                )}
              </div>
            </div>
          )
        }
      </LoadState>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kaldırılan içerik                                                   */
/* ------------------------------------------------------------------ */

function RemovedContentSection() {
  const { act } = useAdmin();
  const [type, setType] = useState("post");
  const state = useLoad(async () => {
    let rows = [];
    if (type === "post") {
      rows = (await must(supabase.from("posts").select("id, slug, text, images, user_id, removed_reason, updated_at, created_at").eq("is_removed", true).order("updated_at", { ascending: false }).limit(100))).map((row) => ({ ...row, href: "/paylasim/" + row.slug }));
    } else if (type === "comment") {
      rows = await must(supabase.from("comments").select("id, post_id, text, images, user_id, removed_reason, created_at").eq("is_removed", true).order("created_at", { ascending: false }).limit(100));
    } else if (type === "listing") {
      rows = (await must(supabase.from("listings").select("id, title, description, images, user_id, removed_reason, updated_at, created_at").eq("status", "removed").order("updated_at", { ascending: false }).limit(100))).map((row) => ({ ...row, text: row.description, href: "/ilan/" + row.id }));
    } else {
      rows = await must(supabase.from("species_comments").select("id, species_id, text, images, user_id, removed_reason, created_at").eq("is_removed", true).order("created_at", { ascending: false }).limit(100));
    }
    const profiles = await profilesByIds(rows.map((row) => row.user_id));
    return { rows, profiles };
  }, [type]);

  async function restore(row) {
    if (await act(supabase.rpc("admin_restore_content", { p_type: type, p_id: row.id }), "İçerik geri yayına alındı")) state.reload();
  }

  return (
    <Section title="Kaldırılan içerik" subtitle="Yanlışlıkla kaldırılan içeriği buradan geri yayına alabilirsin.">
      <Tabs value={type} onChange={setType} items={[["post", "Paylaşımlar"], ["comment", "Yorumlar"], ["listing", "İlanlar"], ["species_comment", "Tür deneyimleri"]]} />
      <LoadState state={state}>
        {(data) =>
          !data.rows.length ? (
            <Empty>Kaldırılmış içerik yok.</Empty>
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              {data.rows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  {row.images && row.images[0] && <img src={row.images[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    {row.title && <div className="font-black">{row.title}</div>}
                    <p className="line-clamp-2 text-sm text-slate-700">{row.text || "(metin yok)"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <Person profile={data.profiles[row.user_id]} />
                      {row.removed_reason && <span className="font-bold text-rose-600">Gerekçe: {row.removed_reason}</span>}
                      <span>{fmtDate(row.updated_at || row.created_at)}</span>
                    </div>
                  </div>
                  <Btn small onClick={() => restore(row)}><RotateCcw size={13} /> Geri al</Btn>
                </div>
              ))}
            </Card>
          )
        }
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Etiketler                                                           */
/* ------------------------------------------------------------------ */

const cleanTag = (value) => value.trim().replace(/^#+/, "").toLocaleLowerCase("tr");

function TagsSection() {
  const { act, ask } = useAdmin();
  const [tab, setTab] = useState("popular");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const state = useLoad(async () => {
    const [counts, banned] = await Promise.all([
      must(supabase.from("tag_counts").select("tag, post_count, last_used_at").order("post_count", { ascending: false }).limit(300)),
      must(supabase.from("banned_tags").select("*").order("created_at", { ascending: false }))
    ]);
    return { counts, banned };
  }, []);

  async function ban(tag) {
    const reason = await ask({ title: "#" + tag + " etiketini yasakla", text: "Etiket mevcut paylaşımlardan silinir, yeni paylaşımlarda etiket olarak tanınmaz.", presets: ["Uygunsuz", "Spam", "Yasa dışı canlı ticareti"], confirm: "Yasakla", danger: true });
    if (reason === null) return;
    if (await act(supabase.rpc("admin_ban_tag", { p_tag: tag, p_reason: reason || null }), "#" + tag + " yasaklandı")) state.reload();
  }
  async function unban(tag) {
    if (await act(supabase.rpc("admin_unban_tag", { p_tag: tag }), "#" + tag + " yasağı kaldırıldı")) state.reload();
  }
  async function merge(event) {
    event.preventDefault();
    const a = cleanTag(from);
    const b = cleanTag(to);
    if (!a || !b || a === b) return;
    const ok = await ask({ title: "#" + a + " → #" + b, text: "#" + a + " geçen tüm paylaşımlar ve takipler #" + b + " etiketine taşınır.", input: false, confirm: "Birleştir" });
    if (ok === null) return;
    if (await act(supabase.rpc("admin_merge_tag", { p_from: a, p_to: b }), "#" + a + " → #" + b + " birleştirildi")) {
      setFrom("");
      setTo("");
      state.reload();
    }
  }

  return (
    <Section title="Etiketler" subtitle="Popüler etiketleri izle, uygunsuz olanları yasakla, yazım farklarını birleştir.">
      <Card className="mb-4">
        <form onSubmit={merge} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">Birleştirilecek
            <input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="#bitkilitank" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700" />
          </label>
          <span className="pb-2 font-black text-slate-400">→</span>
          <label className="grid gap-1 text-xs font-black text-slate-500">Hedef etiket
            <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="#bitkili" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700" />
          </label>
          <Btn type="submit" tone="primary" disabled={!cleanTag(from) || !cleanTag(to) || cleanTag(from) === cleanTag(to)}>Birleştir</Btn>
        </form>
      </Card>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} items={[["popular", "Kullanılan etiketler"], ["banned", "Yasaklı etiketler"]]} />
        {tab === "popular" && (
          <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
            <Search size={16} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Etiket ara" className="w-full bg-transparent text-sm outline-none" />
          </label>
        )}
      </div>
      <LoadState state={state}>
        {(data) => {
          if (tab === "banned") {
            const list = data.banned.filter((row) => row.active);
            return !list.length ? <Empty>Yasaklı etiket yok.</Empty> : (
              <Card className="divide-y divide-slate-100 p-0">
                {list.map((row) => (
                  <div key={row.tag} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="font-black text-slate-900">#{row.tag}</span>
                    {row.reason && <span className="text-sm text-slate-500">{row.reason}</span>}
                    <span className="text-xs text-slate-400">{fmtDay(row.created_at)}</span>
                    <div className="flex-1" />
                    <Btn small onClick={() => unban(String(row.tag))}><RotateCcw size={13} /> Yasağı kaldır</Btn>
                  </div>
                ))}
              </Card>
            );
          }
          const q = cleanTag(query);
          const list = data.counts.filter((row) => !q || String(row.tag).includes(q));
          return !list.length ? <Empty>{q ? "Eşleşen etiket yok." : "Henüz etiket kullanılmamış."}</Empty> : (
            <Card className="divide-y divide-slate-100 p-0">
              {list.map((row) => (
                <div key={row.tag} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <a href={siteLink("/etiketler")} target="_blank" rel="noreferrer" className="font-black text-cyan-900 hover:underline">#{row.tag}</a>
                  <Badge>{row.post_count} paylaşım</Badge>
                  <span className="text-xs text-slate-400">Son: {fmtDay(row.last_used_at)}</span>
                  <div className="flex-1" />
                  <Btn small onClick={() => setFrom("#" + row.tag)}>Birleştir…</Btn>
                  <Btn small tone="ghostDanger" onClick={() => ban(String(row.tag))}><Ban size={13} /> Yasakla</Btn>
                </div>
              ))}
            </Card>
          );
        }}
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Gruplar                                                             */
/* ------------------------------------------------------------------ */

function GroupsSection() {
  const { act, ask } = useAdmin();
  const [filter, setFilter] = useState("open");
  const state = useLoad(async () => {
    const rows = await must(supabase.from("groups").select("*").order("member_count", { ascending: false }));
    const profiles = await profilesByIds(rows.map((row) => row.owner_id));
    return { rows, profiles };
  }, []);

  async function setClosed(group, closed) {
    const reason = closed
      ? await ask({ title: group.name + " grubunu kapat", text: "Kapalı grup listelerde görünmez, yeni üye ve paylaşım alamaz. Kurucu grubu görmeye devam eder.", presets: ["Kurallara aykırı içerik", "Spam grup", "Kurucu talebi", "Tekrarlanan grup"], required: true, confirm: "Kapat", danger: true })
      : "";
    if (reason === null) return;
    if (await act(supabase.rpc("admin_set_group_closed", { p_group_id: group.id, p_closed: closed, p_reason: reason || null }), closed ? "Grup kapatıldı" : "Grup yeniden açıldı")) state.reload();
  }

  return (
    <Section title="Gruplar" subtitle="Resmi gruplar ve üyelerin kurduğu gruplar.">
      <LoadState state={state}>
        {(data) => {
          const list = data.rows.filter((row) => (filter === "closed" ? row.is_closed : filter === "member" ? !row.is_official && !row.is_closed : filter === "official" ? row.is_official : !row.is_closed));
          const count = (fn) => data.rows.filter(fn).length;
          return (
            <>
              <Tabs value={filter} onChange={setFilter} items={[["open", "Açık (" + count((r) => !r.is_closed) + ")"], ["official", "Resmi (" + count((r) => r.is_official) + ")"], ["member", "Üye grupları (" + count((r) => !r.is_official && !r.is_closed) + ")"], ["closed", "Kapalı (" + count((r) => r.is_closed) + ")"]]} />
              {!list.length ? <Empty>Grup yok.</Empty> : (
                <Card className="divide-y divide-slate-100 p-0">
                  {list.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className={"grid h-10 w-10 place-items-center rounded-xl text-lg " + (row.color || "bg-slate-100")}>{row.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={siteLink("/grup/" + row.slug)} target="_blank" rel="noreferrer" className="font-black hover:underline">{row.name}</a>
                          {row.is_official && <Badge tone="cyan">Resmi</Badge>}
                          {row.is_closed && <Badge tone="rose">Kapalı</Badge>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{row.member_count} üye · {row.post_count} paylaşım</span>
                          {row.owner_id && <Person profile={data.profiles[row.owner_id]} sub="Kurucu" />}
                          <span>{fmtDay(row.created_at)}</span>
                        </div>
                      </div>
                      {row.is_closed ? (
                        <Btn small onClick={() => setClosed(row, false)}><RotateCcw size={13} /> Yeniden aç</Btn>
                      ) : (
                        !row.is_official && <Btn small tone="ghostDanger" onClick={() => setClosed(row, true)}><Ban size={13} /> Kapat</Btn>
                      )}
                    </div>
                  ))}
                </Card>
              )}
            </>
          );
        }}
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Türler                                                              */
/* ------------------------------------------------------------------ */

function SpeciesSection() {
  const { act, ask } = useAdmin();
  const [tab, setTab] = useState("suggestions");
  const [query, setQuery] = useState("");
  const state = useLoad(async () => {
    const [suggestions, species, categories] = await Promise.all([
      must(supabase.from("species_suggestions").select("*").order("created_at", { ascending: false }).limit(200)),
      must(supabase.from("species").select("id, slug, name, latin, category_id, status, is_rare, keeper_count, comment_count").order("name")),
      must(supabase.from("kb_categories").select("id, name"))
    ]);
    const profiles = await profilesByIds(suggestions.map((row) => row.user_id));
    return { suggestions, species, categories: Object.fromEntries(categories.map((row) => [row.id, row.name])), profiles };
  }, []);

  async function review(row, approve) {
    const note = approve
      ? await ask({ title: "Öneriyi onayla", text: "Öneri onaylandı olarak işaretlenir. Tür sayfası içerik ekibince hazırlanıp eklenir.", input: false, confirm: "Onayla" })
      : await ask({ title: "Öneriyi reddet", presets: ["Zaten mevcut", "Yanlış / eksik bilgi", "Akvaryum türü değil"], confirm: "Reddet", danger: true, input: false });
    if (note === null) return;
    if (await act(supabase.from("species_suggestions").update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() }).eq("id", row.id), approve ? "Öneri onaylandı" : "Öneri reddedildi")) state.reload();
  }
  async function toggleStatus(row) {
    const next = row.status === "published" ? "draft" : "published";
    if (await act(supabase.from("species").update({ status: next }).eq("id", row.id), next === "published" ? row.name + " yayında" : row.name + " taslağa alındı")) state.reload();
  }
  async function toggleRare(row) {
    if (await act(supabase.from("species").update({ is_rare: !row.is_rare }).eq("id", row.id), row.is_rare ? "Nadir işareti kaldırıldı" : "Nadir olarak işaretlendi")) state.reload();
  }

  return (
    <Section title="Türler" subtitle="Üyelerin tür önerileri ve Bilgi Bankası'ndaki türlerin yayın durumu.">
      <LoadState state={state}>
        {(data) => {
          const pending = data.suggestions.filter((row) => row.status === "pending");
          return (
            <>
              <Tabs value={tab} onChange={setTab} items={[["suggestions", "Tür önerileri", pending.length], ["species", "Türler (" + data.species.length + ")"]]} />
              {tab === "suggestions" ? (
                !data.suggestions.length ? <Empty>Henüz tür önerisi yok.</Empty> : (
                  <Card className="divide-y divide-slate-100 p-0">
                    {data.suggestions.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black">{row.name}</span>
                            {row.latin && <span className="text-sm italic text-slate-500">{row.latin}</span>}
                            <StatusBadge status={row.status} />
                            {row.category_id && <Badge>{data.categories[row.category_id] || row.category_id}</Badge>}
                          </div>
                          {row.note && <p className="mt-1 text-sm text-slate-600">{row.note}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <Person profile={data.profiles[row.user_id]} />
                            <span>{fmtDate(row.created_at)}</span>
                          </div>
                        </div>
                        {row.status === "pending" && (
                          <div className="flex gap-2">
                            <Btn small tone="success" onClick={() => review(row, true)}><Check size={13} /> Onayla</Btn>
                            <Btn small tone="ghostDanger" onClick={() => review(row, false)}><X size={13} /> Reddet</Btn>
                          </div>
                        )}
                      </div>
                    ))}
                  </Card>
                )
              ) : (
                <>
                  <label className="mb-3 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tür ara (Türkçe ya da Latince)" className="w-full bg-transparent text-sm outline-none" />
                  </label>
                  <Card className="divide-y divide-slate-100 p-0">
                    {data.species
                      .filter((row) => !query.trim() || (row.name + " " + row.latin).toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")))
                      .map((row) => (
                        <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <a href={siteLink("/tur/" + row.slug)} target="_blank" rel="noreferrer" className="font-black hover:underline">{row.name}</a>
                            <span className="ml-2 text-sm italic text-slate-500">{row.latin}</span>
                            <div className="text-xs text-slate-500">{data.categories[row.category_id] || row.category_id} · {row.keeper_count} besleyen · {row.comment_count} deneyim</div>
                          </div>
                          {row.status === "draft" && <Badge tone="amber">Taslak</Badge>}
                          <Btn small onClick={() => toggleRare(row)}>{row.is_rare ? "💎 Nadir" : "Nadir işaretle"}</Btn>
                          <Btn small onClick={() => toggleStatus(row)}>{row.status === "published" ? "Taslağa al" : "Yayınla"}</Btn>
                        </div>
                      ))}
                  </Card>
                </>
              )}
            </>
          );
        }}
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Ayarlar                                                             */
/* ------------------------------------------------------------------ */

function SettingsSection() {
  const { act } = useAdmin();
  const state = useLoad(async () => {
    const rows = await must(supabase.from("site_settings").select("key, value, updated_at, updated_by"));
    return Object.fromEntries(rows.map((row) => [row.key, row]));
  }, []);
  return (
    <Section title="Ayarlar" subtitle="Değişiklikler kaydedildiği anda sitede geçerli olur.">
      <LoadState state={state}>{(data) => <SettingsForm data={data} act={act} reload={state.reload} />}</LoadState>
    </Section>
  );
}

function SettingsForm({ data, act, reload }) {
  const value = (key, fallback) => (data[key] ? data[key].value : fallback);
  const [announcement, setAnnouncement] = useState(() => ({ text: "", active: false, link: "", ...value("announcement", {}) }));
  const [rules, setRules] = useState(() => value("community_rules", []));
  const [words, setWords] = useState(() => value("banned_words", []).join(", "));
  const [featured, setFeatured] = useState(() => value("featured_plans", []));
  const [adPlans, setAdPlans] = useState(() => value("ad_plans", []));
  const [saving, setSaving] = useState("");

  async function save(key, payload, message) {
    setSaving(key);
    const ok = await act(supabase.from("site_settings").upsert({ key, value: payload, updated_at: new Date().toISOString() }), message);
    setSaving("");
    if (ok) reload();
  }
  const updatedLabel = (key) => (data[key] && data[key].updated_at ? "Son değişiklik: " + fmtDate(data[key].updated_at) : "");
  const planRow = (list, setList, index, field, parse) => (event) => setList(list.map((item, i) => (i === index ? { ...item, [field]: parse(event.target.value) } : item)));
  const validPlans = (list) => list.every((item) => item.days > 0 && item.price >= 0 && Number.isFinite(item.price));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <h2 className="font-black">Duyuru bandı</h2>
        <p className="mb-3 text-xs text-slate-500">Açıkken sitenin en üstünde herkese görünür. {updatedLabel("announcement")}</p>
        <textarea value={announcement.text} onChange={(event) => setAnnouncement({ ...announcement, text: event.target.value })} rows={2} maxLength={200} placeholder="Örn. Bu hafta sonu bakım çalışması yapılacak." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700" />
        <input value={announcement.link || ""} onChange={(event) => setAnnouncement({ ...announcement, link: event.target.value })} placeholder="Bağlantı (isteğe bağlı, https://...)" className="mt-2 w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700" />
        <label className="mt-3 flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={Boolean(announcement.active)} onChange={(event) => setAnnouncement({ ...announcement, active: event.target.checked })} className="h-4 w-4 accent-cyan-900" />
          Duyuru yayında
        </label>
        <div className="mt-3">
          <Btn tone="primary" small disabled={saving === "announcement" || (announcement.active && !announcement.text.trim()) || (announcement.link && !/^https?:\/\//.test(announcement.link))} onClick={() => save("announcement", { text: announcement.text.trim(), active: announcement.active, link: (announcement.link || "").trim() }, "Duyuru kaydedildi")}>Kaydet</Btn>
        </div>
      </Card>

      <Card>
        <h2 className="font-black">Topluluk kuralları</h2>
        <p className="mb-3 text-xs text-slate-500">Topluluk sayfasının yan sütununda görünür. {updatedLabel("community_rules")}</p>
        <div className="grid gap-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex gap-2">
              <input value={rule} maxLength={140} onChange={(event) => setRules(rules.map((item, i) => (i === index ? event.target.value : item)))} className="w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700" />
              <button onClick={() => setRules(rules.filter((_, i) => i !== index))} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" title="Kuralı sil"><X size={15} /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {rules.length < 10 && <Btn small onClick={() => setRules([...rules, ""])}><Plus size={13} /> Kural ekle</Btn>}
          <Btn tone="primary" small disabled={saving === "community_rules"} onClick={() => save("community_rules", rules.map((rule) => rule.trim()).filter(Boolean), "Kurallar kaydedildi")}>Kaydet</Btn>
        </div>
      </Card>

      <Card>
        <h2 className="font-black">Yasaklı kelimeler</h2>
        <p className="mb-3 text-xs text-slate-500">Virgülle ayır. Bu kelimelerle başlayan ifadeler paylaşım, yorum, tür deneyimi, ilan ve grup metinlerinde kabul edilmez. {updatedLabel("banned_words")}</p>
        <textarea value={words} onChange={(event) => setWords(event.target.value)} rows={3} placeholder="kelime1, kelime2" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700" />
        <div className="mt-3">
          <Btn tone="primary" small disabled={saving === "banned_words"} onClick={() => save("banned_words", Array.from(new Set(words.split(",").map((word) => word.trim().toLocaleLowerCase("tr")).filter(Boolean))), "Yasaklı kelimeler kaydedildi")}>Kaydet</Btn>
        </div>
      </Card>

      <Card>
        <h2 className="font-black">Fiyatlar</h2>
        <p className="mb-3 text-xs text-slate-500">Yeni başvurularda geçerli olur; mevcut başvurular etkilenmez.</p>
        <div className="mb-1 text-xs font-black uppercase text-slate-400">İlan öne çıkarma</div>
        {featured.map((plan, index) => (
          <div key={plan.id} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="w-16 font-black">{plan.id}</span>
            <input type="number" min={1} value={plan.days} onChange={planRow(featured, setFeatured, index, "days", Number)} className="w-20 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 outline-none" /> gün
            <input type="number" min={0} value={plan.price} onChange={planRow(featured, setFeatured, index, "price", Number)} className="w-24 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 outline-none" /> ₺
          </div>
        ))}
        <Btn tone="primary" small disabled={saving === "featured_plans" || !validPlans(featured)} onClick={() => save("featured_plans", featured, "Öne çıkarma fiyatları kaydedildi")}>Kaydet</Btn>
        <div className="mb-1 mt-4 text-xs font-black uppercase text-slate-400">Reklam</div>
        {adPlans.map((plan, index) => (
          <div key={plan.id} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="w-24 font-black">{PLACEMENT_LABELS[plan.placement] || plan.id}</span>
            <input type="number" min={1} value={plan.days} onChange={planRow(adPlans, setAdPlans, index, "days", Number)} className="w-20 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 outline-none" /> gün
            <input type="number" min={0} value={plan.price} onChange={planRow(adPlans, setAdPlans, index, "price", Number)} className="w-24 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 outline-none" /> ₺
          </div>
        ))}
        <Btn tone="primary" small disabled={saving === "ad_plans" || !validPlans(adPlans)} onClick={() => save("ad_plans", adPlans, "Reklam fiyatları kaydedildi")}>Kaydet</Btn>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ekip ve yetkiler                                                    */
/* ------------------------------------------------------------------ */

function StaffSection() {
  const { act, auth, param } = useAdmin();
  const [username, setUsername] = useState("");
  const [editing, setEditing] = useState(null); // { profile, permissions:Set, active }
  const state = useLoad(async () => {
    const rows = await must(supabase.from("staff").select("*").order("created_at"));
    const profiles = await profilesByIds(rows.map((row) => row.user_id));
    return { rows, profiles };
  }, []);

  // Kullanıcı detayından gelindiyse o üyeyi düzenlemeye aç
  useEffect(() => {
    if (!param || !state.data) return;
    (async () => {
      const existing = state.data.rows.find((row) => row.user_id === param);
      const profile = state.data.profiles[param] || (await must(supabase.from("profiles").select(PROFILE_COLS).eq("id", param).maybeSingle()));
      if (profile) setEditing({ profile, permissions: new Set(existing ? existing.permissions : ["reports"]), isNew: !existing || !existing.active, role: existing ? existing.role : "moderator" });
    })().catch(() => {});
  }, [param, state.data]);

  async function findUser(event) {
    event.preventDefault();
    const name = username.trim().replace(/^@/, "");
    if (!name) return;
    const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("username", name).maybeSingle();
    if (!data) return act(Promise.resolve({ error: { message: "@" + name + " bulunamadı" } }));
    const existing = state.data && state.data.rows.find((row) => row.user_id === data.id);
    setEditing({ profile: data, permissions: new Set(existing ? existing.permissions : ["reports"]), isNew: !existing || !existing.active, role: existing ? existing.role : "moderator" });
    setUsername("");
    return undefined;
  }

  async function saveStaff(active) {
    const ok = await act(
      supabase.rpc("admin_set_staff", { p_user_id: editing.profile.id, p_permissions: Array.from(editing.permissions), p_active: active }),
      active ? "@" + editing.profile.username + " yetkileri kaydedildi" : "@" + editing.profile.username + " ekipten çıkarıldı"
    );
    if (ok) {
      setEditing(null);
      if (param) window.location.hash = "#/yonetim/ekip";
      state.reload();
    }
  }

  return (
    <Section title="Ekip ve yetkiler" subtitle="Moderatörlere yalnızca ihtiyaç duydukları yetkileri ver. Bu sayfayı yalnızca süper yönetici görür.">
      <Card className="mb-4">
        <form onSubmit={findUser} className="flex flex-wrap items-center gap-2">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@kullaniciadi" className="min-w-[200px] flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-cyan-700" />
          <Btn type="submit" tone="primary" disabled={!username.trim()}><Plus size={14} /> Moderatör ekle</Btn>
        </form>
      </Card>

      {editing && (
        <Card className="mb-4 border-cyan-300">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Person profile={editing.profile} sub={editing.isNew ? "Yeni moderatör" : "Yetkileri düzenle"} />
            <button onClick={() => setEditing(null)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" title="Düzenlemeyi kapat" aria-label="Düzenlemeyi kapat"><X size={17} /></button>
          </div>
          {editing.role === "super_admin" ? (
            <p className="text-sm text-slate-600">Süper yöneticinin tüm yetkileri vardır, buradan değiştirilemez.</p>
          ) : editing.profile.id === auth.user.id ? (
            <p className="text-sm text-slate-600">Kendi yetkini buradan değiştiremezsin.</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {PERMISSIONS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-cyan-900"
                      checked={editing.permissions.has(key)}
                      onChange={(event) => {
                        const next = new Set(editing.permissions);
                        event.target.checked ? next.add(key) : next.delete(key);
                        setEditing({ ...editing, permissions: next });
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn tone="primary" small disabled={!editing.permissions.size} onClick={() => saveStaff(true)}><Check size={13} /> {editing.isNew ? "Moderatör yap" : "Kaydet"}</Btn>
                {!editing.isNew && <Btn tone="ghostDanger" small onClick={() => saveStaff(false)}><X size={13} /> Ekipten çıkar</Btn>}
              </div>
            </>
          )}
        </Card>
      )}

      <LoadState state={state}>
        {(data) => (
          <Card className="divide-y divide-slate-100 p-0">
            {data.rows.map((row) => {
              const profile = data.profiles[row.user_id];
              return (
                <div key={row.user_id} className={"flex flex-wrap items-center gap-3 px-4 py-3 " + (row.active ? "" : "opacity-50")}>
                  <div className="min-w-[160px] flex-1"><Person profile={profile} sub={"Ekleme: " + fmtDay(row.created_at)} /></div>
                  {row.role === "super_admin" ? (
                    <Badge tone="amber">Süper yönetici · tüm yetkiler</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {!row.active && <Badge tone="rose">Pasif</Badge>}
                      {row.permissions.map((perm) => <Badge key={perm} tone="cyan">{(PERMISSIONS.find(([key]) => key === perm) || [perm, perm])[1]}</Badge>)}
                    </div>
                  )}
                  {row.role !== "super_admin" && profile && (
                    <Btn small onClick={() => setEditing({ profile, permissions: new Set(row.permissions), isNew: !row.active, role: row.role })}>Düzenle</Btn>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </LoadState>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* İşlem kaydı                                                         */
/* ------------------------------------------------------------------ */

function AuditSection() {
  const [filter, setFilter] = useState("all");
  const state = useLoad(async () => {
    let request = supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
    if (filter !== "all") request = request.like("action", filter + ".%");
    const rows = await must(request);
    const userTargets = rows.filter((row) => row.target_type === "user").map((row) => row.target_id);
    const profiles = await profilesByIds([...rows.map((row) => row.actor_id), ...userTargets]);
    return { rows, profiles };
  }, [filter]);

  const detailText = (row) => {
    const d = row.details || {};
    const parts = [];
    if (d.reason) parts.push("“" + d.reason + "”");
    if (d.resolution) parts.push("“" + d.resolution + "”");
    if (d.into) parts.push("→ #" + d.into);
    if (d.until) parts.push(new Date(d.until).getFullYear() > 2900 ? "süresiz" : "bitiş " + fmtDay(d.until));
    if (Array.isArray(d.permissions)) parts.push(d.permissions.map((perm) => (PERMISSIONS.find(([key]) => key === perm) || [perm, perm])[1]).join(", "));
    if (d.removed) parts.push("içerik kaldırıldı");
    if (typeof d.verified === "boolean") parts.push(d.verified ? "doğrulandı" : "doğrulama kaldırıldı");
    if (d.key) parts.push(d.key);
    if (d.status) parts.push(d.status);
    return parts.join(" · ");
  };
  const targetText = (row, profiles) => {
    if (row.target_type === "user" && profiles[row.target_id]) return "@" + profiles[row.target_id].username;
    if (row.target_type === "tag") return "#" + row.target_id;
    return (TARGET_LABELS[row.target_type] || row.target_type || "") + (row.target_id ? " #" + String(row.target_id).slice(0, 8) : "");
  };

  return (
    <Section title="İşlem kaydı" subtitle="Ekibin yaptığı tüm yönetim işlemleri; silinemez.">
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[["all", "Tümü"], ["report", "Şikâyet"], ["content", "İçerik"], ["user", "Kullanıcı"], ["feature", "Öne çıkarma"], ["ad", "Reklam"], ["tag", "Etiket"], ["group", "Grup"], ["staff", "Ekip"], ["settings", "Ayar"]]}
      />
      <LoadState state={state}>
        {(data) =>
          !data.rows.length ? <Empty>Henüz işlem yok.</Empty> : (
            <Card className="divide-y divide-slate-100 p-0">
              {data.rows.map((row) => {
                const actor = data.profiles[row.actor_id];
                return (
                  <div key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                    <span className="w-32 shrink-0 text-xs text-slate-400">{fmtDate(row.created_at)}</span>
                    <span className="font-black text-slate-800">{actor ? "@" + actor.username : "Sistem"}</span>
                    <span className="font-bold text-slate-700">{ACTION_LABELS[row.action] || row.action}</span>
                    <span className="text-slate-500">{targetText(row, data.profiles)}</span>
                    <span className="min-w-0 flex-1 text-slate-500">{detailText(row)}</span>
                  </div>
                );
              })}
            </Card>
          )
        }
      </LoadState>
    </Section>
  );
}
