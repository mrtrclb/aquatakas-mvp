import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
const MapPicker = lazy(() => import("./species-map.jsx").then((mod) => ({ default: mod.MapPicker })));
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronLeft,
  Crown,
  ChevronRight,
  ExternalLink,
  Fish,
  Flag,
  Hash,
  History,
  LayoutDashboard,
  Loader2,
  Mail,
  Megaphone,
  Menu,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Settings,
  HardDrive,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  UsersRound,
  X
} from "lucide-react";
import { useAuth, AquagramMark } from "./auth";
import { supabase, trError } from "./lib/supabase";
import { shrinkImage } from "./lib/listings";
import { loadCategoryCovers } from "./lib/settings";
import { KB_CATEGORIES } from "./species.js";
import { forgetArticle, slugifyTr } from "./lib/articles";

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
  ["settings", "Ayarlar"],
  ["contact", "İletişim mesajları"]
];

// Her yetkinin tam olarak neye izin verdiği (Ekip ve yetkiler sayfasında gösterilir)
export const PERMISSION_HELP = {
  reports: "Gelen şikâyetleri görür; şikâyeti haklı bulup kapatır ya da reddeder. Tek başına içerik kaldıramaz.",
  content: "Paylaşım, yorum, ilan, tür deneyimi ve değerlendirmeleri yayından kaldırır, kaldırılanları geri alır; kaldırılmış içerikleri görebilir. Şikâyetlerde \"Kaldır ve kapat\" için Şikâyetler yetkisiyle birlikte verilmeli.",
  users: "Üyelerin e-posta adresini ve son girişini görür, üyeleri askıya alır ya da askıyı kaldırır, mavi tik taleplerini (telefon numarası dahil) inceler ve onaylar.",
  groups: "Tüm grupları (kapalılar dahil) görür, grupları kapatır/yeniden açar, resmi ve üye gruplarının görselini, açıklamasını ve kurallarını düzenler.",
  tags: "Etiketleri yasaklar, yasağı kaldırır, yazım farkı olan etiketleri birleştirir.",
  species: "Bilgi Bankası'na tür ekler, türleri düzenler, yayından kaldırır; üyelerin tür önerilerini onaylar ya da reddeder.",
  ads: "İlan öne çıkarma ve reklam başvurularını görür, onaylar ya da gerekçeyle reddeder.",
  settings: "Duyuru bandını, topluluk kurallarını, yasaklı kelimeleri ve öne çıkarma/reklam fiyatlarını değiştirir; disk ve e-posta kullanımını görür.",
  contact: "Bize ulaşın formundan gelen mesajları (gönderenin adı ve e-posta adresi dahil) okur, yanıtlandı ya da kapatıldı olarak işaretler."
};

const SECTIONS = [
  { id: "ozet", label: "Özet", icon: LayoutDashboard, perm: null },
  { id: "sikayetler", label: "Şikâyetler", icon: Flag, perm: "reports", stat: "reports_open" },
  { id: "iletisim", label: "İletişim", icon: Mail, perm: "contact", stat: "contact_open" },
  { id: "one-cikarma", label: "Öne çıkarma", icon: Pin, perm: "ads", stat: "features_pending" },
  { id: "reklamlar", label: "Reklamlar", icon: Megaphone, perm: "ads", stat: "ads_pending" },
  { id: "kullanicilar", label: "Kullanıcılar", icon: Users, perm: "users", stat: "verifications_pending" },
  { id: "pro", label: "PRO üyeler", icon: Crown, perm: "users" },
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
  review: "Değerlendirme",
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
  "species_suggestion.review": "Tür önerisi sonuçlandı",
  "verification.approve": "Mavi tik onaylandı",
  "verification.reject": "Mavi tik talebi reddedildi"
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
  return path;
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
  return <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-black " + tones[tone]}>{children}</span>;
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
          {count ? <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[12px] text-white">{count}</span> : null}
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
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-950 text-[12px] font-black text-white">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.username.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-800">@{profile.username}</span>
        {sub && <span className="block truncate text-[12px] text-slate-400">{sub}</span>}
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-cyan-700"
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
          <a href="/" className="mt-4 inline-flex rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white">Siteye dön</a>
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
            {count > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[12px] text-white">{count}</span>}
          </a>
        );
      })}
    </nav>
  );

  const views = {
    ozet: DashboardSection,
    sikayetler: ReportsSection,
    iletisim: ContactSection,
    "one-cikarma": FeaturesSection,
    reklamlar: AdsSection,
    kullanicilar: UsersSection,
    pro: ProSection,
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
                <span className="block text-[12px] font-black uppercase tracking-wide text-amber-700">Yönetim paneli</span>
              </span>
            </a>
            <div className="flex-1" />
            <span className="hidden min-[400px]:inline-flex"><Badge tone={isSuper ? "amber" : "cyan"}><ShieldCheck size={12} /> {isSuper ? "Süper yönetici" : "Moderatör"}</Badge></span>
            <span className="hidden text-sm font-black text-slate-700 sm:inline">@{auth.profile.username}</span>
            <a href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Siteye dön</span>
            </a>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-5 px-4 py-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[76px] rounded-[22px] border border-slate-200 bg-white p-2">{nav}</div>
          </aside>
          {navOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setNavOpen(false)}>
              <div className="h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-3 shadow-2xl">{nav}</div>
            </div>
          )}
          <main className="min-w-0">
            <View key={current.id + "/" + (route.param || "")} />
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
    ["İletişim mesajı", stats && stats.contact_open, "Yanıt bekliyor", "iletisim", "contact", true],
    ["Öne çıkarma başvurusu", stats && stats.features_pending, "Onay bekliyor", "one-cikarma", "ads", true],
    ["Reklam başvurusu", stats && stats.ads_pending, "Onay bekliyor", "reklamlar", "ads", true],
    ["Tür / lokalite önerisi", stats && stats.species_suggestions_pending, "Onay bekliyor", "turler", "species", true],
    ["Mavi tik talebi", stats && stats.verifications_pending, "Onay bekliyor", "kullanicilar", "users", true],
    ["Askıdaki üye", stats && stats.suspended_users, "Şu an askıda", "kullanicilar", "users"],
    ["PRO üye", stats && stats.pro_active, "Son 30 gün alım: " + (stats ? stats.pro_30d || 0 : "…"), "pro", "users"]
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
      <VisitsCard />
      {can("settings") && <SystemCard />}
    </Section>
  );
}

const SECTION_LABELS = { home: "Ana sayfa", listings: "İlan listesi", listing: "İlan detayı", community: "Topluluk", post: "Paylaşım", group: "Gruplar", kb: "Bilgi Bankası", species: "Tür sayfaları", account: "Üye sayfaları", other: "Diğer" };

function istanbulDay(offset = 0) {
  const date = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(date); // YYYY-MM-DD
}

function VisitsCard() {
  const state = useLoad(async () => {
    const rows = await must(supabase.from("site_visits_daily").select("day, section, views, sessions").gte("day", istanbulDay(-29)).order("day"));
    const days = Array.from({ length: 30 }, (_, i) => istanbulDay(i - 29));
    const byDay = Object.fromEntries(days.map((day) => [day, { views: 0, sessions: 0 }]));
    const bySection = {};
    rows.forEach((row) => {
      const day = String(row.day).slice(0, 10);
      if (byDay[day]) {
        byDay[day].views += row.views;
        byDay[day].sessions += row.sessions;
      }
      if (day >= istanbulDay(-6)) bySection[row.section] = (bySection[row.section] || 0) + row.views;
    });
    return { days, byDay, bySection };
  }, []);

  return (
    <Card className="mt-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-black">Ziyaretler</h2>
        <span className="text-xs text-slate-400">Kişisel veri tutulmaz · ekip içi tarayıcılar ve botlar hariç tutulmaya çalışılır</span>
      </div>
      <LoadState state={state}>
        {(data) => {
          const sum = (from, key) => data.days.filter((day) => day >= istanbulDay(from)).reduce((total, day) => total + data.byDay[day][key], 0);
          const max = Math.max(1, ...data.days.map((day) => data.byDay[day].views));
          const sections = Object.entries(data.bySection).sort((a, b) => b[1] - a[1]);
          const total7 = sections.reduce((total, [, value]) => total + value, 0) || 1;
          return (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[["Bugün", 0], ["Son 7 gün", -6], ["Son 30 gün", -29]].map(([label, from]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</div>
                    <div className="text-2xl font-black text-slate-900">{sum(from, "sessions").toLocaleString("tr-TR")} <span className="text-xs font-bold text-slate-500">ziyaret</span></div>
                    <div className="text-xs font-bold text-slate-500">{sum(from, "views").toLocaleString("tr-TR")} sayfa görüntüleme</div>
                  </div>
                ))}
              </div>
              <div className="flex h-36 items-end gap-[3px]" role="img" aria-label="Son 30 günün günlük sayfa görüntülemeleri">
                {data.days.map((day) => {
                  const value = data.byDay[day];
                  return (
                    <div key={day} className="group relative flex h-full flex-1 items-end" title={new Date(day).toLocaleDateString("tr-TR") + ": " + value.sessions + " ziyaret, " + value.views + " görüntüleme"}>
                      <div className="w-full rounded-t bg-cyan-700/80 transition group-hover:bg-cyan-900" style={{ height: Math.max(value.views ? 4 : 1, (value.views / max) * 100) + "%" }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[12px] font-bold text-slate-400">
                <span>{new Date(data.days[0]).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                <span>Bugün</span>
              </div>
              {sections.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Son 7 gün · bölümler</div>
                  <div className="grid gap-1.5">
                    {sections.map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[120px_1fr_60px] items-center gap-2 text-xs">
                        <span className="font-bold text-slate-600">{SECTION_LABELS[key] || key}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-cyan-700" style={{ width: (value / total7) * 100 + "%" }} /></span>
                        <span className="text-right font-black text-slate-700">{value.toLocaleString("tr-TR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        }}
      </LoadState>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Şikâyetler                                                          */
/* ------------------------------------------------------------------ */

const REMOVABLE = new Set(["listing", "post", "comment", "species_comment", "review"]);
const RATING_LABELS = { positive: "Olumlu", neutral: "Nötr", negative: "Olumsuz" };

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
  const reviewIds = num(idsOf("review"));
  if (reviewIds.length) {
    (await must(supabase.from("reviews").select("id, reviewer_id, reviewee_id, rating, comment, listing_title, is_hidden").in("id", reviewIds))).forEach((row) => {
      out["review:" + row.id] = { title: RATING_LABELS[row.rating] + " değerlendirme" + (row.listing_title ? " · " + row.listing_title : ""), text: row.comment || "(yorum yok)", userId: row.reviewer_id, removed: row.is_hidden };
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

const PAYMENT_LABELS = { simulated_paid: "Deneme ödemesi", paid: "Ödendi", refunded: "İade edildi", failed: "Başarısız", pro_free: "PRO ücretsiz hakkı", granted: "Ekip tanımladı" };

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

const PLACEMENT_LABELS = { feed: "Akış içi", sidebar: "Yan sütun", detail: "İlan detayı", post: "Paylaşım detayı", species: "Tür sayfası" };

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
                      <div className="text-[12px] font-black uppercase tracking-wide text-amber-700">{row.brand}</div>
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
  if (filter === "verify") {
    return (
      <Section title="Kullanıcılar" subtitle="Mavi tik taleplerini incele: profil resmi, e-posta ve telefon numarasını teyit et.">
        <Tabs value={filter} onChange={setFilter} items={[["all", "Tümü"], ["suspended", "Askıda"], ["unverified", "Doğrulanmamış"], ["verify", "Mavi tik talepleri"]]} />
        <VerificationRequests />
      </Section>
    );
  }

  return (
    <Section title="Kullanıcılar" subtitle="Üyeleri ara, askıya al, telefon doğrulamasını yönet.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
          <Search size={16} className="text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı adı ara" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <Tabs value={filter} onChange={setFilter} items={[["all", "Tümü"], ["suspended", "Askıda"], ["unverified", "Doğrulanmamış"], ["verify", "Mavi tik talepleri"]]} />
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

function VerificationRequests() {
  const { act, ask, stats } = useAdmin();
  const [status, setStatus] = useState("pending");
  const state = useLoad(async () => {
    const rows = await must(supabase.from("verification_requests").select("*").eq("status", status).order("created_at", { ascending: status === "pending" }).limit(200));
    const profiles = await profilesByIds([...rows.map((row) => row.user_id), ...rows.map((row) => row.reviewed_by)]);
    const emails = {};
    if (status === "pending") {
      await Promise.all(rows.map(async (row) => {
        const { data } = await supabase.rpc("admin_user_private_info", { p_user_id: row.user_id });
        emails[row.user_id] = data && data[0];
      }));
    }
    return { rows, profiles, emails };
  }, [status]);

  async function review(row, approve) {
    const reason = approve
      ? await ask({ title: "Mavi tik ver", text: "Telefon numarasını teyit ettiysen onayla. Üyeye bildirim gider ve profilinde mavi tik görünür.", input: false, confirm: "Onayla" })
      : await ask({ title: "Talebi reddet", presets: ["Telefon numarasına ulaşılamadı", "Profil resmi uygun değil", "Bilgiler tutarsız"], required: true, confirm: "Reddet", danger: true });
    if (reason === null) return;
    if (await act(supabase.rpc("admin_review_verification", { p_id: row.id, p_approve: approve, p_reason: approve ? null : reason }), approve ? "Mavi tik verildi" : "Talep reddedildi")) state.reload();
  }

  return (
    <>
      <Tabs value={status} onChange={setStatus} items={[["pending", "Bekleyen", stats && stats.verifications_pending], ["approved", "Onaylanan"], ["rejected", "Reddedilen"]]} />
      <Card className="mb-3 bg-sky-50/60 text-xs leading-relaxed text-sky-900">
        SMS doğrulaması eklenene kadar: numarayı ara ya da WhatsApp'tan kısa bir doğrulama mesajı gönder, üye adıyla teyit et, sonra onayla. Telefon numarası yalnızca "Kullanıcılar" yetkili ekibe görünür; üyelerle paylaşma.
      </Card>
      <LoadState state={state}>
        {(data) =>
          !data.rows.length ? <Empty>{status === "pending" ? "Bekleyen talep yok." : "Kayıt yok."}</Empty> : (
            <Card className="divide-y divide-slate-100 p-0">
              {data.rows.map((row) => {
                const profile = data.profiles[row.user_id];
                const email = data.emails[row.user_id];
                return (
                  <div key={row.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-950 text-lg font-black text-white">
                      {profile && profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile ? profile.username.slice(0, 1).toUpperCase() : "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Person profile={profile} sub={profile ? (profile.city || "Şehir yok") + " · Katılım " + fmtDay(profile.created_at) : ""} />
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <a href={"tel:" + row.phone.replace(/\s/g, "")} className="rounded-full bg-white px-2.5 py-1 font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">📞 {row.phone}</a>
                        {status === "pending" && (email && email.email_confirmed_at ? <Badge tone="emerald">E-posta doğrulanmış</Badge> : <Badge tone="rose">E-posta doğrulanmamış</Badge>)}
                        {profile && (profile.avatar_url ? <Badge tone="emerald">Profil resmi var</Badge> : <Badge tone="rose">Profil resmi yok</Badge>)}
                        <span className="text-slate-400">{fmtDate(row.created_at)}</span>
                        {row.reject_reason && <span className="font-bold text-rose-600">Gerekçe: {row.reject_reason}</span>}
                        {row.reviewed_by && <span className="text-slate-400">· {data.profiles[row.reviewed_by] ? "@" + data.profiles[row.reviewed_by].username : "Ekip"}</span>}
                      </div>
                    </div>
                    {status === "pending" && (
                      <div className="flex gap-2">
                        <Btn small tone="success" onClick={() => review(row, true)}><Check size={13} /> Mavi tik ver</Btn>
                        <Btn small tone="ghostDanger" onClick={() => review(row, false)}><X size={13} /> Reddet</Btn>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          )
        }
      </LoadState>
    </>
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
    } else if (type === "review") {
      rows = (await must(supabase.from("reviews").select("id, reviewer_id, rating, comment, listing_title, hidden_reason, updated_at, created_at").eq("is_hidden", true).order("updated_at", { ascending: false }).limit(100))).map((row) => ({
        ...row,
        user_id: row.reviewer_id,
        title: RATING_LABELS[row.rating] + " değerlendirme" + (row.listing_title ? " · " + row.listing_title : ""),
        text: row.comment,
        removed_reason: row.hidden_reason
      }));
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
      <Tabs value={type} onChange={setType} items={[["post", "Paylaşımlar"], ["comment", "Yorumlar"], ["listing", "İlanlar"], ["species_comment", "Tür deneyimleri"], ["review", "Değerlendirmeler"]]} />
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


/* ------------------------------------------------------------------ */
/* PRO üyeler                                                          */
/* ------------------------------------------------------------------ */

const proDaysLeft = (until) => Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000));

function ProSection() {
  const { act, ask } = useAdmin();
  const [tab, setTab] = useState("active");
  const [username, setUsername] = useState("");
  const [months, setMonths] = useState(1);
  const state = useLoad(async () => {
    const [members, purchases] = await Promise.all([
      must(supabase.from("profiles").select(PROFILE_COLS + ", pro_until, message_bonus").gt("pro_until", new Date().toISOString()).order("pro_until", { ascending: true }).limit(500)),
      must(supabase.from("pro_purchases").select("*").order("created_at", { ascending: false }).limit(300))
    ]);
    const people = await profilesByIds(purchases.flatMap((row) => [row.user_id, row.granted_by]));
    return { members, purchases, people };
  }, []);

  async function grant(event) {
    event.preventDefault();
    const name = username.trim().replace(/^@/, "").toLowerCase();
    if (!name) return;
    const { data: profile } = await supabase.from("profiles").select("id, username").eq("username", name).maybeSingle();
    if (!profile) return act(Promise.resolve({ error: { message: "@" + name + " bulunamadı." } }));
    const note = await ask({ title: "@" + profile.username + " için " + months + " ay PRO", text: "Süre mevcut PRO süresinin üstüne eklenir; mesaj kutusu +100 sohbet artar. Üyeye bildirim gider.", placeholder: "Not (isteğe bağlı): kampanya, hediye, ödeme dekontu…", confirm: "PRO tanımla" });
    if (note === null) return;
    if (await act(supabase.rpc("admin_grant_pro", { p_user: profile.id, p_months: months, p_note: note || null }), "@" + profile.username + " için PRO tanımlandı")) {
      setUsername("");
      state.reload();
    }
  }

  async function revoke(row) {
    const note = await ask({ title: "@" + row.username + " PRO üyeliğini sonlandır", text: "PRO ayrıcalıkları hemen sona erer (mesaj kutusu hakkı korunur).", confirm: "Sonlandır", danger: true });
    if (note === null) return;
    if (await act(supabase.rpc("admin_revoke_pro", { p_user: row.id, p_note: note || null }), "PRO üyelik sonlandırıldı")) state.reload();
  }

  return (
    <Section title="PRO üyeler" subtitle="Aktif PRO üyeler, alımlar ve elle PRO tanımlama.">
      <Card className="mb-4">
        <form onSubmit={grant} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">Kullanıcı adı
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@kullaniciadi" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700" />
          </label>
          <label className="grid gap-1 text-xs font-black text-slate-500">Süre
            <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900">
              {[1, 3, 6, 12].map((value) => <option key={value} value={value}>{value} ay</option>)}
            </select>
          </label>
          <Btn type="submit" tone="primary" disabled={!username.trim()}><Crown size={14} /> PRO tanımla</Btn>
        </form>
      </Card>
      <LoadState state={state}>
        {(data) => {
          const revenue = data.purchases.filter((row) => row.payment_status !== "granted").reduce((sum, row) => sum + Number(row.price || 0), 0);
          const last30 = data.purchases.filter((row) => Date.now() - new Date(row.created_at).getTime() < 30 * 86400000);
          return (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Card><div className="text-xs font-black uppercase tracking-wide text-slate-400">Aktif PRO</div><div className="mt-1 text-3xl font-black">{data.members.length}</div></Card>
                <Card><div className="text-xs font-black uppercase tracking-wide text-slate-400">Son 30 gün alım</div><div className="mt-1 text-3xl font-black">{last30.length}</div></Card>
                <Card><div className="text-xs font-black uppercase tracking-wide text-slate-400">Toplam satış (deneme)</div><div className="mt-1 text-3xl font-black">{tl(revenue)}</div><div className="text-xs text-slate-500">Ödeme sistemi gelene kadar tahsil edilmedi</div></Card>
              </div>
              <Tabs value={tab} onChange={setTab} items={[["active", "Aktif PRO üyeler"], ["purchases", "Alımlar"]]} />
              {tab === "active" ? (
                !data.members.length ? <Empty>Aktif PRO üye yok.</Empty> : (
                  <Card className="divide-y divide-slate-100 p-0">
                    {data.members.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <Person profile={row} sub={new Date(row.pro_until).toLocaleDateString("tr-TR") + " tarihine kadar · mesaj kutusu " + (20 + Number(row.message_bonus || 0))} />
                        <div className="flex-1" />
                        <Badge tone={proDaysLeft(row.pro_until) <= 7 ? "rose" : "amber"}>{proDaysLeft(row.pro_until)} gün kaldı</Badge>
                        <Btn small tone="ghostDanger" onClick={() => revoke(row)}>Sonlandır</Btn>
                      </div>
                    ))}
                  </Card>
                )
              ) : !data.purchases.length ? <Empty>Henüz PRO alımı yok.</Empty> : (
                <Card className="overflow-x-auto p-0">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400"><th className="px-4 py-2 font-black">Üye</th><th className="px-2 py-2 font-black">Paket</th><th className="px-2 py-2 font-black">Tutar</th><th className="px-2 py-2 font-black">Ödeme</th><th className="px-2 py-2 font-black">Geçerlilik</th><th className="px-4 py-2 font-black">Tarih</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.purchases.map((row) => {
                        const p = data.people[row.user_id];
                        const by = row.granted_by && data.people[row.granted_by];
                        return (
                          <tr key={row.id}>
                            <td className="px-4 py-2 font-black">{p ? "@" + p.username : "—"}</td>
                            <td className="px-2 py-2">{row.months} ay</td>
                            <td className="px-2 py-2">{tl(row.price)}</td>
                            <td className="px-2 py-2"><Badge tone={row.payment_status === "granted" ? "violet" : "slate"}>{PAYMENT_LABELS[row.payment_status] || row.payment_status}</Badge>{by && <span className="ml-1 text-xs text-slate-400">@{by.username}</span>}</td>
                            <td className="px-2 py-2 text-xs text-slate-500">{fmtDay(row.starts_at)} → {fmtDay(row.ends_at)}</td>
                            <td className="px-4 py-2 text-xs text-slate-500">{fmtDate(row.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
/* Sistem kullanımı (disk, e-posta)                                    */
/* ------------------------------------------------------------------ */

// Supabase planına göre sınırlar (Ayarlar'dan seçilir)
const GB = 1024 * 1024 * 1024;
const PLAN_LIMITS = {
  free: { label: "Ücretsiz", db: 0.5 * GB, storage: 1 * GB, egress: "5 GB", mau: "50.000", note: "1 hafta hareketsiz kalan proje duraklatılır; yedekleme yok." },
  pro: { label: "Pro ($25/ay)", db: 8 * GB, storage: 100 * GB, egress: "250 GB", mau: "100.000", note: "Duraklatma yok, günlük yedek (7 gün). Sınır aşımında kullanım kadar ek ücret." }
};
const EMAILS_PER_DAY = 300;

function fmtBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return value + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let n = value / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return n.toLocaleString("tr-TR", { maximumFractionDigits: n < 10 ? 2 : 1 }) + " " + units[i];
}

function UsageBar({ label, used, limit, detail }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct > 85 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-cyan-700";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-black text-slate-800">{label}</span>
        <span className="font-bold text-slate-500">{fmtBytes(used)} / {fmtBytes(limit)} <span className="text-slate-400">(%{pct.toLocaleString("tr-TR", { maximumFractionDigits: 1 })})</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={"h-full rounded-full " + tone} style={{ width: Math.max(pct, 0.8) + "%" }} /></div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

// Teknik altyapı künyesi — dışarıdan destek alınacak bir geliştiriciye ilk bakışta sistemi anlatmak için.
// Gizli anahtar içermez; anahtarlar yalnızca GitHub/Supabase/Brevo/Cloudflare panellerinde durur.
const TECH_STACK = [
  ["Ön yüz", "React 18 + Vite 5, Tailwind CSS 3, lucide-react ikonları. Tek sayfa uygulama (hash yönlendirme).", "https://github.com/mrtrclb/aquatakas-mvp", "GitHub deposu"],
  ["Yayın", "GitHub Pages. main dalına her push'ta GitHub Actions derleyip yayına alır; her gece de yeniden derlenir. scripts/prerender.mjs tür, makale, ilan ve grup sayfalarını hazır HTML ve site haritası olarak üretir.", "https://github.com/mrtrclb/aquatakas-mvp/actions", "Actions"],
  ["Arka uç", "Supabase (Pro): Postgres + satır düzeyi güvenlik (RLS), üyelik (Auth), dosya depolama, link-preview Edge Function. Veritabanı değişiklikleri supabase/migrations klasöründe sırayla tutulur; yönetici işlemleri yetkiyi kendi içinde denetleyen admin_* / moderate_* fonksiyonlarıyla yapılır.", "https://supabase.com/dashboard/project/kqgcaegwewdsivkbrjjr", "Supabase paneli"],
  ["E-posta", "Brevo SMTP, Supabase Auth'a bağlı (kayıt doğrulama, şifre sıfırlama, e-posta değişikliği, giriş bağlantısı). Şablonlar: supabase/email-templates.", "https://app.brevo.com", "Brevo"],
  ["Bot koruması", "Cloudflare Turnstile: giriş, kayıt ve şifre sıfırlamada. Yalnızca aquagram.com.tr alan adında çalışır.", "https://dash.cloudflare.com/?to=/:account/turnstile", "Turnstile"],
  ["Geliştirme", "Kod Claude (Anthropic) ile yazılıyor; commit'lerin yazarı Claude. Yetki modeli ve tablo açıklamaları supabase/README.md dosyasında.", "https://github.com/mrtrclb/aquatakas-mvp/blob/main/supabase/README.md", "README"]
];

function TechStackBox() {
  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Teknik altyapı · destek için künye</div>
      <dl className="grid gap-2 text-xs">
        {TECH_STACK.map(([label, text, href, linkLabel]) => (
          <div key={label}>
            <dt className="font-black text-slate-700">{label}</dt>
            <dd className="leading-relaxed text-slate-500">
              {text}{" "}
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-black text-cyan-800 underline">{linkLabel} <ExternalLink size={11} /></a>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-amber-800">Gizli anahtarlar (Supabase service key, SMTP şifresi, Turnstile secret) repoda yoktur. Geliştiriciye anahtar değil, ilgili panelde sınırlı erişim verin.</p>
    </div>
  );
}

const TABLE_LABELS = { posts: "Paylaşımlar", comments: "Yorumlar", listings: "İlanlar", messages: "Mesajlar", notifications: "Bildirimler", species: "Türler", profiles: "Profiller", site_visits_daily: "Ziyaret sayaçları", admin_audit_log: "İşlem kaydı", species_comments: "Tür deneyimleri", post_likes: "Beğeniler", conversations: "Konuşmalar", contact_messages: "İletişim mesajları", reports: "Şikâyetler", ads: "Reklamlar" };
const BUCKET_LABELS = { "listing-images": "İlan görselleri", "post-media": "Paylaşım görselleri", avatars: "Profil resimleri", "ad-images": "Reklam görselleri", "species-images": "Tür görselleri" };

function SystemCard() {
  const { act } = useAdmin();
  const state = useLoad(async () => {
    const [stats, plan] = await Promise.all([
      must(supabase.rpc("admin_system_stats")),
      must(supabase.from("site_settings").select("value").eq("key", "supabase_plan").maybeSingle())
    ]);
    return { ...stats, plan: (plan && plan.value) || "free" };
  }, []);
  async function setPlan(value) {
    if (await act(supabase.from("site_settings").upsert({ key: "supabase_plan", value }), "Plan bilgisi güncellendi")) state.reload();
  }
  return (
    <Card className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-black"><HardDrive size={17} /> Sistem kullanımı</h2>
        <div className="flex items-center gap-2">
          {state.data && (
            <select value={state.data.plan} onChange={(event) => setPlan(event.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600" aria-label="Supabase planı">
              {Object.entries(PLAN_LIMITS).map(([key, item]) => <option key={key} value={key}>Supabase: {item.label}</option>)}
            </select>
          )}
          <Btn small onClick={state.reload}><RotateCcw size={13} /> Yenile</Btn>
        </div>
      </div>
      <LoadState state={state}>
        {(data) => {
          const limits = PLAN_LIMITS[data.plan] || PLAN_LIMITS.free;
          const storageBytes = data.storage.reduce((sum, row) => sum + Number(row.bytes || 0), 0);
          const storageFiles = data.storage.reduce((sum, row) => sum + Number(row.files || 0), 0);
          const e = data.emails || {};
          const sent24 = (e.confirm_24h || 0) + (e.recovery_24h || 0) + (e.change_24h || 0);
          const sent30 = (e.confirm_30d || 0) + (e.recovery_30d || 0) + (e.change_30d || 0);
          return (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="grid content-start gap-4">
                <UsageBar label="Veritabanı" used={data.db_bytes} limit={limits.db} detail={limits.label + " plan sınırı " + fmtBytes(limits.db) + ". Metinler, ilanlar, mesajlar ve kayıtlar burada tutulur."} />
                <UsageBar label="Dosya depolama" used={storageBytes} limit={limits.storage} detail={storageFiles.toLocaleString("tr-TR") + " dosya · " + limits.label + " plan sınırı " + fmtBytes(limits.storage)} />
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                  Aylık veri trafiği sınırı {limits.egress}, aylık aktif üye sınırı {limits.mau}. {limits.note} Trafik ve ayrıntılı kullanım için{" "}
                  <a href="https://supabase.com/dashboard/project/kqgcaegwewdsivkbrjjr/settings/billing/usage" target="_blank" rel="noreferrer" className="font-black text-cyan-800 underline">Supabase kullanım sayfasına</a> bak.
                </p>
                {data.storage.length > 0 && (
                  <div className="grid gap-1 text-xs">
                    {data.storage.map((row) => (
                      <div key={row.bucket} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"><span className="font-bold text-slate-600">{BUCKET_LABELS[row.bucket] || row.bucket}</span><span className="text-slate-500">{Number(row.files).toLocaleString("tr-TR")} dosya · {fmtBytes(row.bytes)}</span></div>
                    ))}
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs font-black uppercase tracking-wide text-slate-400">En büyük tablolar</div>
                  <div className="grid gap-1 text-xs">
                    {data.tables.map((row) => (
                      <div key={row.table} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"><span className="font-bold text-slate-600">{TABLE_LABELS[row.table] || row.table}</span><span className="text-slate-500">{Number(row.rows).toLocaleString("tr-TR")} satır · {fmtBytes(row.bytes)}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid content-start gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs font-black uppercase tracking-wide text-slate-400">E-posta · 24 saat</div><div className="mt-1 text-2xl font-black">{sent24}</div><div className="text-xs text-slate-500">Günlük sınır {EMAILS_PER_DAY} (Brevo)</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs font-black uppercase tracking-wide text-slate-400">E-posta · 30 gün</div><div className="mt-1 text-2xl font-black">{sent30}</div><div className="text-xs text-slate-500">Yaklaşık (en az)</div></div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-slate-400"><th className="py-1 font-black">Tür</th><th className="py-1 text-right font-black">24 saat</th><th className="py-1 text-right font-black">30 gün</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {[["Kayıt doğrulama", e.confirm_24h, e.confirm_30d], ["Şifre sıfırlama", e.recovery_24h, e.recovery_30d], ["E-posta değişikliği", e.change_24h, e.change_30d]].map(([label, a, b]) => (
                      <tr key={label}><td className="py-1.5 font-bold text-slate-700">{label}</td><td className="py-1.5 text-right">{a || 0}</td><td className="py-1.5 text-right">{b || 0}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs leading-relaxed text-slate-500">
                  Doğrulanmamış hesap: <b>{e.unconfirmed || 0}</b> · Silinmiş hesap: <b>{data.deleted_accounts || 0}</b>. Supabase her üye için yalnızca son gönderim zamanını tuttuğundan sayılar alt sınırdır (aynı kişiye giden tekrar e-postalar bir kez sayılır). Kesin gönderim, açılma ve teslim raporları için{" "}
                  <a href="https://app.brevo.com/statistics/transactional" target="_blank" rel="noreferrer" className="font-black text-cyan-800 underline">Brevo istatistiklerine</a> bak.
                </p>
                <TechStackBox />
              </div>
            </div>
          );
        }}
      </LoadState>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* İletişim mesajları                                                  */
/* ------------------------------------------------------------------ */

const CONTACT_TOPIC_LABELS = { destek: "Destek / hesap", oneri: "Öneri", hata: "Hata bildirimi", ilan: "İlan / içerik bildirimi", reklam: "Reklam", isbirligi: "İş birliği", kvkk: "KVKK başvurusu", diger: "Diğer" };
const CONTACT_STATUS = { open: ["Yanıt bekliyor", "rose"], answered: ["Yanıtlandı", "emerald"], closed: ["Kapatıldı", "slate"] };

function ContactSection() {
  const { act, ask } = useAdmin();
  const [tab, setTab] = useState("open");
  const [topic, setTopic] = useState("");
  const [openId, setOpenId] = useState(null);
  const state = useLoad(async () => {
    let request = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
    if (tab !== "all") request = request.eq("status", tab);
    if (topic) request = request.eq("topic", topic);
    const rows = await must(request);
    const people = await profilesByIds(rows.flatMap((row) => [row.user_id, row.handled_by]));
    return { rows, people };
  }, [tab, topic]);

  async function setStatus(row, status) {
    const note = status === "open" ? "" : await ask({ title: status === "answered" ? "Yanıtlandı olarak işaretle" : "Mesajı kapat", text: "İsteğe bağlı olarak ekip için kısa bir not bırakabilirsin.", confirm: status === "answered" ? "Yanıtlandı" : "Kapat" });
    if (note === null) return;
    if (await act(supabase.rpc("admin_update_contact", { p_id: row.id, p_status: status, p_note: note || null }), status === "open" ? "Mesaj yeniden açıldı" : status === "answered" ? "Yanıtlandı olarak işaretlendi" : "Mesaj kapatıldı")) state.reload();
  }

  const replyLink = (row) =>
    "mailto:" + encodeURIComponent(row.email) +
    "?subject=" + encodeURIComponent("Re: Aquagram · " + (CONTACT_TOPIC_LABELS[row.topic] || "Mesajın")) +
    "&body=" + encodeURIComponent("Merhaba " + row.name + ",\n\n\n\n—\nAquagram ekibi\n\n> " + row.body.split("\n").join("\n> "));

  return (
    <Section title="İletişim mesajları" subtitle="Bize ulaşın formundan gelen mesajlar. Yanıtı e-posta programından gönderip burada işaretle.">
      <div className="mb-1 flex flex-wrap items-start gap-3">
        <Tabs value={tab} onChange={setTab} items={[["open", "Yanıt bekleyen"], ["answered", "Yanıtlanan"], ["closed", "Kapatılan"], ["all", "Tümü"]]} />
        <select value={topic} onChange={(event) => setTopic(event.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600" aria-label="Konu">
          <option value="">Tüm konular</option>
          {Object.entries(CONTACT_TOPIC_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <LoadState state={state}>
        {(data) =>
          !data.rows.length ? <Empty>Bu listede mesaj yok.</Empty> : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {data.rows.map((row) => {
                const expanded = openId === row.id;
                const [statusLabel, statusTone] = CONTACT_STATUS[row.status] || CONTACT_STATUS.open;
                const member = row.user_id && data.people[row.user_id];
                const handler = row.handled_by && data.people[row.handled_by];
                return (
                  <Card key={row.id} className="p-0">
                    <button type="button" onClick={() => setOpenId(expanded ? null : row.id)} className="flex w-full min-w-0 flex-wrap items-center gap-2 px-4 py-3 text-left">
                      <Badge tone={statusTone}>{statusLabel}</Badge>
                      <Badge tone="cyan">{CONTACT_TOPIC_LABELS[row.topic] || row.topic}</Badge>
                      <span className="font-black text-slate-900">{row.name}</span>
                      <span className="text-sm text-slate-500">{row.email}</span>
                      <span className="flex-1" />
                      <span className="text-xs text-slate-400">{fmtDate(row.created_at)}</span>
                      {!expanded && <span className="w-full min-w-0 basis-full truncate text-sm text-slate-600">{row.body}</span>}
                    </button>
                    {expanded && (
                      <div className="border-t border-slate-100 px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{row.body}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {member ? <span>Üye: <a href={"#/yonetim/kullanicilar/" + member.id} className="font-black text-cyan-800 hover:underline">@{member.username}</a></span> : <span>Üye değil (misafir)</span>}
                          {handler && <span>· {row.status === "answered" ? "Yanıtlayan" : "Kapatan"}: @{handler.username} ({fmtDate(row.handled_at)})</span>}
                        </div>
                        {row.note && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Ekip notu: {row.note}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a href={replyLink(row)} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950 px-3 py-1.5 text-xs font-black text-white hover:bg-cyan-900"><Mail size={13} /> E-postayla yanıtla</a>
                          {row.status !== "answered" && <Btn small tone="success" onClick={() => setStatus(row, "answered")}><Check size={13} /> Yanıtlandı</Btn>}
                          {row.status !== "closed" && <Btn small onClick={() => setStatus(row, "closed")}><X size={13} /> Kapat</Btn>}
                          {row.status !== "open" && <Btn small onClick={() => setStatus(row, "open")}><RotateCcw size={13} /> Yeniden aç</Btn>}
                        </div>
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

const cleanTag = (value) => value.trim().replace(/^#+/, "").toLocaleLowerCase("tr");
// Aramada Türkçe karakter ve büyük/küçük harf farkı gözetilmez (ör. "bitkı" → #bitkili)
const foldTag = (value) => cleanTag(value).replace(/[çğıöşüâî]/g, (ch) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i" })[ch]);

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
  async function removeTag(tag, count) {
    const ok = await ask({ title: "#" + tag + " etiketini kaldır", text: count + " paylaşımdaki #" + tag + " etiketi kaldırılır (metindeki kelime kalır, yalnızca # işareti silinir) ve etiketi takip edenlerin takibi biter. Etiket yasaklanmaz; ileride biri yeniden kullanabilir.", input: false, confirm: "Kaldır", danger: true });
    if (ok === null) return;
    if (await act(supabase.rpc("admin_remove_tag", { p_tag: tag }), "#" + tag + " kaldırıldı")) state.reload();
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
    <Section title="Etiketler" subtitle="Üyelerin kullandığı etiketleri izle. Kaldır: paylaşımlardan siler. Yasakla: siler ve bir daha kullanılmasını engeller. Birleştir: yazım farklarını tek etikette toplar.">
      <Card className="mb-4">
        <form onSubmit={merge} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-black text-slate-500">Birleştirilecek
            <input value={from} onChange={(event) => setFrom(event.target.value)} list="aq-tag-list" placeholder="#bitkilitank" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700" />
          </label>
          <span className="pb-2 font-black text-slate-400">→</span>
          <label className="grid gap-1 text-xs font-black text-slate-500">Hedef etiket
            <input value={to} onChange={(event) => setTo(event.target.value)} list="aq-tag-list" placeholder="#bitkili" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-cyan-700" />
          </label>
          <Btn type="submit" tone="primary" disabled={!cleanTag(from) || !cleanTag(to) || cleanTag(from) === cleanTag(to)}>Birleştir</Btn>
        </form>
        <datalist id="aq-tag-list">
          {((state.data && state.data.counts) || []).map((row) => <option key={row.tag} value={"#" + row.tag}>{row.post_count + " paylaşım"}</option>)}
        </datalist>
        <p className="mt-2 text-xs text-slate-400">Yazmaya başlayınca mevcut etiketler önerilir.</p>
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
          const q = foldTag(query);
          const list = data.counts.filter((row) => !q || foldTag(String(row.tag)).includes(q));
          return !list.length ? (
            <Empty>
              {q ? "“" + query + "” içeren etiket yok." : "Henüz üyeler tarafından etiket kullanılmamış."}
              <span className="mt-2 block text-xs font-normal">Sitede gördüğün örnek (demo) paylaşımların etiketleri veritabanında olmadığı için burada listelenmez; demo içerik kapatıldığında sitede de görünmez.</span>
            </Empty>
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              <div className="px-4 py-2 text-xs font-bold text-slate-400">{list.length} etiket{q ? " · “" + query + "” araması" : ""}</div>
              {list.map((row) => (
                <div key={row.tag} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <a href={siteLink("/etiketler")} target="_blank" rel="noreferrer" className="font-black text-cyan-900 hover:underline">#{row.tag}</a>
                  <Badge>{row.post_count} paylaşım</Badge>
                  <span className="text-xs text-slate-400">Son: {fmtDay(row.last_used_at)}</span>
                  <div className="flex-1" />
                  <Btn small onClick={() => setFrom("#" + row.tag)}>Birleştir…</Btn>
                  <Btn small onClick={() => removeTag(String(row.tag), row.post_count)} title="Paylaşımlardan kaldır, yasaklama"><Trash2 size={13} /> Kaldır</Btn>
                  <Btn small tone="ghostDanger" onClick={() => ban(String(row.tag))} title="Kaldır ve bir daha kullanılmasını engelle"><Ban size={13} /> Yasakla</Btn>
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
                      {!row.is_closed && (
                        <a href={siteLink("/grup/" + row.slug)} target="_blank" rel="noreferrer" title="Grup sayfasındaki 'Grubu düzenle' ile görsel, açıklama ve kuralları değiştirebilirsin" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                          Sitede düzenle <ExternalLink size={12} />
                        </a>
                      )}
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
/* Tür lokaliteleri / varyeteleri                                      */
/* ------------------------------------------------------------------ */

const FORM_KIND_LABELS = { lokalite: "Lokalite", varyete: "Varyete", ticari: "Ticari ad" };
const EMPTY_SPECIES_FORM = { id: null, name: "", kind: "lokalite", origin: "", note: "", aliases: "", images: [], source_url: "", position: 0, status: "published", lat: null, lng: null };
const coordText = (lat, lng) => (lat == null || lng == null ? "" : Number(lat).toFixed(4) + ", " + Number(lng).toFixed(4));
// "-12.08, 34.62" ya da "-12.08 34.62" biçimindeki metni { lat, lng }'ye çevirir
function parseCoord(text) {
  const match = String(text || "").trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1].replace(",", ".")), lng = Number(match[2].replace(",", "."));
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

function SpeciesFormsEditor({ speciesId, latin, slug }) {
  const { act, ask } = useAdmin();
  const [edit, setEdit] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const state = useLoad(async () => must(supabase.from("species_forms").select("*").eq("species_id", speciesId).order("kind").order("position").order("name")), [speciesId]);
  const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700";
  const set = (key, value) => setEdit((prev) => ({ ...prev, [key]: value }));

  async function addImages(event) {
    const files = Array.from(event.target.files || []).filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files.slice(0, 4)) {
      const blob = await shrinkImage(file, 1600, 0.86);
      const type = blob.type || "image/jpeg";
      const path = "species/" + slug + "/form-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const { error } = await supabase.storage.from("species-media").upload(path, blob, { contentType: type });
      if (!error) urls.push(supabase.storage.from("species-media").getPublicUrl(path).data.publicUrl);
    }
    setEdit((prev) => ({ ...prev, images: [...prev.images, ...urls].slice(0, 6) }));
    setUploading(false);
  }

  async function save() {
    const row = {
      species_id: speciesId,
      name: edit.name.trim(),
      kind: edit.kind,
      origin: edit.origin.trim(),
      note: edit.note.trim(),
      aliases: Array.from(new Set(edit.aliases.split(",").map((word) => word.trim()).filter(Boolean))),
      images: edit.images,
      source_url: edit.source_url.trim() || null,
      position: Number(edit.position) || 0,
      status: edit.status,
      lat: edit.lat ?? null,
      lng: edit.lat == null ? null : edit.lng
    };
    const request = edit.id ? supabase.from("species_forms").update(row).eq("id", edit.id) : supabase.from("species_forms").insert(row);
    if (await act(request, edit.id ? "Kayıt güncellendi" : "Kayıt eklendi")) {
      setEdit(null);
      state.reload();
    }
  }

  async function remove(row) {
    if ((await ask({ title: "Kaydı sil", text: "'" + row.name + "' bu türden kaldırılacak.", confirm: "Sil", danger: true })) === null) return;
    if (await act(supabase.from("species_forms").delete().eq("id", row.id), "Kayıt silindi")) state.reload();
  }

  return (
    <Card className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-black">Lokaliteler ve varyeteler</h2>
          <p className="text-xs text-slate-500">Lokalite: doğadaki bölge popülasyonu · Varyete: akvaryumda seçilmiş hat · Ticari ad: satıcıların kullandığı ad. Diğer adlar sitede aramada da bulunur.</p>
        </div>
        {!edit && <Btn small tone="primary" onClick={() => setEdit({ ...EMPTY_SPECIES_FORM })}><Plus size={13} /> Ekle</Btn>}
      </div>

      {edit && (
        <div className="mb-4 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-500">Ad<input className={input} value={edit.name} onChange={(event) => set("name", event.target.value)} placeholder="Ilangi, Kitumba, Electric Blue…" /></label>
          <label className="text-xs font-black text-slate-500">Tür
            <select className={input} value={edit.kind} onChange={(event) => set("kind", event.target.value)}>
              {Object.entries(FORM_KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-black text-slate-500 sm:col-span-2">Köken / bölge<input className={input} value={edit.origin} onChange={(event) => set("origin", event.target.value)} placeholder="Tanzanya kıyısı, gölün orta-doğusu" /></label>
          <label className="text-xs font-black text-slate-500 sm:col-span-2">Diğer adlar (virgülle)<input className={input} value={edit.aliases} onChange={(event) => set("aliases", event.target.value)} placeholder="Blue Flash, Kitumba Blue" /></label>
          <label className="text-xs font-black text-slate-500 sm:col-span-2">Not<textarea rows={3} className={input} value={edit.note} onChange={(event) => set("note", event.target.value)} placeholder="Renk/desen farkı, hobideki yaygınlığı, karıştırılma riski…" /></label>
          <label className="text-xs font-black text-slate-500">Kaynak bağlantısı<input className={input} value={edit.source_url} onChange={(event) => set("source_url", event.target.value)} placeholder="https://…" /></label>
          <label className="text-xs font-black text-slate-500">Sıra<input type="number" className={input} value={edit.position} onChange={(event) => set("position", event.target.value)} /></label>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {edit.images.map((url) => (
                <div key={url} className="relative h-16 w-20 overflow-hidden rounded-xl bg-slate-100">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => set("images", edit.images.filter((item) => item !== url))} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-0.5 text-white"><X size={11} /></button>
                </div>
              ))}
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading} className="grid h-16 w-20 place-items-center rounded-xl border border-dashed border-slate-300 text-[12px] font-black text-slate-500 hover:bg-white">
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <span className="grid place-items-center"><Upload size={15} /> Görsel</span>}
              </button>
              <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={addImages} />
            </div>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-500">
              <span>Haritadaki yeri {edit.kind !== "lokalite" && "(genellikle yalnızca lokaliteler için)"} · haritaya tıkla ya da koordinat yaz</span>
              {edit.lat != null && <button type="button" onClick={() => setEdit((prev) => ({ ...prev, lat: null, lng: null }))} className="text-red-700 hover:underline">Konumu kaldır</button>}
            </div>
            <input
              key={"c" + edit.lat + edit.lng}
              className={input}
              defaultValue={coordText(edit.lat, edit.lng)}
              placeholder="-12.08, 34.62"
              onBlur={(event) => { const c = parseCoord(event.target.value); if (c) setEdit((prev) => ({ ...prev, ...c })); else if (!event.target.value.trim()) setEdit((prev) => ({ ...prev, lat: null, lng: null })); }}
            />
            <Suspense fallback={<div className="h-[240px] animate-pulse rounded-2xl bg-slate-100" />}>
              <MapPicker
                key={edit.id || "yeni"}
                height={240}
                value={edit.lat != null ? { lat: edit.lat, lng: edit.lng } : null}
                onPick={(c) => setEdit((prev) => ({ ...prev, ...c }))}
                context={(state.data || []).filter((row) => row.lat != null && row.id !== edit.id).map((row) => ({ lat: row.lat, lng: row.lng, title: row.name }))}
              />
            </Suspense>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-cyan-900" checked={edit.status === "published"} onChange={(event) => set("status", event.target.checked ? "published" : "draft")} /> Sitede göster
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Btn small tone="primary" disabled={!edit.name.trim() || uploading} onClick={save}><Check size={13} /> Kaydet</Btn>
            <Btn small onClick={() => setEdit(null)}>Vazgeç</Btn>
          </div>
        </div>
      )}

      <LoadState state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="text-sm text-slate-400">Henüz kayıt yok.</p>
          ) : (
            <div className="grid gap-1.5">
              {rows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 px-3 py-2">
                  {row.images && row.images[0] && <img src={row.images[0]} alt="" className="h-10 w-12 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black">{row.kind === "lokalite" ? (latin || "").replace(/\s*'.*$/, "") + " '" + row.name + "'" : row.name}</span>
                      <Badge tone={row.kind === "lokalite" ? "emerald" : row.kind === "varyete" ? "violet" : "amber"}>{FORM_KIND_LABELS[row.kind]}</Badge>
                      {row.status !== "published" && <Badge>Gizli</Badge>}
                      {row.lat != null && <span title={coordText(row.lat, row.lng)} className="text-xs">📍</span>}
                    </div>
                    {row.origin && <div className="text-xs text-slate-500">{row.origin}</div>}
                    {row.aliases && row.aliases.length > 0 && <div className="text-xs text-slate-500">Diğer adlar: {row.aliases.join(", ")}</div>}
                  </div>
                  <Btn small onClick={() => setEdit({ ...row, aliases: (row.aliases || []).join(", "), images: row.images || [], source_url: row.source_url || "", origin: row.origin || "", note: row.note || "" })}>Düzenle</Btn>
                  <Btn small tone="ghostDanger" onClick={() => remove(row)}><Trash2 size={13} /></Btn>
                </div>
              ))}
            </div>
          )
        }
      </LoadState>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

// Bilgi Bankası kategori başlık bandı kapakları (site_settings.category_covers)
/* Bilgi Bankası makaleleri ---------------------------------------------------- */

const ARTICLE_INPUT = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-700";
const EMPTY_ARTICLE = { id: null, title: "", slug: "", excerpt: "", body: "", footnotesText: "", sourcesText: "", cover_url: "", speciesText: "", status: "published" };

function sourcesToText(list) {
  return (list || []).map((row) => (row.tag ? "[" + row.tag + "] " : "") + (row.label && row.label !== row.url ? row.label + (row.url ? ": " : "") : "") + (row.url || "")).join("\n");
}
function textToSources(text) {
  return text.split("\n").map((line) => line.trim().replace(/^[-•]\s*/, "")).filter(Boolean).map((line) => {
    const m = line.match(/^(?:\[([^\]]+)\]\s*)?(.*?)(?::\s*)?(https?:\/\/\S+)?$/);
    const label = (m[2] || "").trim().replace(/:$/, "").trim();
    return { tag: m[1] || "", label: label || m[3] || "", url: m[3] || "" };
  });
}

function ArticlesAdmin({ speciesRows }) {
  const { act } = useAdmin();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const nameBySlug = useMemo(() => Object.fromEntries((speciesRows || []).map((row) => [row.slug, row.name])), [speciesRows]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("articles").select("id, slug, title, excerpt, body, footnotes, sources, cover_url, species_slugs, status, published_at").order("published_at", { ascending: false });
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  function edit(row) {
    setForm(row ? {
      id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt || "", body: row.body || "",
      footnotesText: (row.footnotes || []).join("\n"), sourcesText: sourcesToText(row.sources),
      cover_url: row.cover_url || "", speciesText: (row.species_slugs || []).join(", "), status: row.status
    } : { ...EMPTY_ARTICLE });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const speciesSlugs = form ? form.speciesText.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean) : [];
  const unknown = speciesSlugs.filter((slug) => !nameBySlug[slug]);

  async function upload(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return;
    setBusy(true);
    try {
      const blob = await shrinkImage(file, 1800, 0.85);
      const type = blob.type || "image/jpeg";
      const path = "articles/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const { error } = await supabase.storage.from("species-media").upload(path, blob, { contentType: type });
      if (error) throw error;
      set("cover_url", supabase.storage.from("species-media").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      await act(Promise.resolve({ error: err }));
    }
    setBusy(false);
  }

  async function save() {
    const slug = (form.slug || slugifyTr(form.title)).trim();
    const firstPara = form.body.split(/\n{2,}/).find((chunk) => chunk.trim() && !chunk.startsWith("## ")) || "";
    const plain = firstPara.replace(/\[\d+\]/g, "").trim();
    const payload = {
      slug,
      title: form.title.trim(),
      excerpt: (form.excerpt.trim() || (plain.length > 220 ? plain.slice(0, 217).replace(/\s+\S*$/, "") + "…" : plain)).slice(0, 400),
      body: form.body.trim(),
      footnotes: form.footnotesText.split("\n").map((line) => line.trim().replace(/^\[\d+\]\s*/, "")).filter(Boolean),
      sources: textToSources(form.sourcesText),
      cover_url: form.cover_url || null,
      species_slugs: speciesSlugs,
      status: form.status,
      updated_at: new Date().toISOString()
    };
    setBusy(true);
    const ok = form.id
      ? await act(supabase.from("articles").update(payload).eq("id", form.id), "Makale güncellendi")
      : await act(supabase.from("articles").insert(payload), "Makale eklendi");
    setBusy(false);
    if (ok) {
      forgetArticle(slug);
      setForm(null);
      load();
    }
  }

  async function remove() {
    if (!form.id || !window.confirm("Bu makale kalıcı olarak silinsin mi?")) return;
    if (await act(supabase.from("articles").delete().eq("id", form.id), "Makale silindi")) {
      setForm(null);
      load();
    }
  }

  if (!rows) return <Card><Loader2 className="animate-spin text-slate-400" size={18} /></Card>;

  if (form) {
    const canSave = form.title.trim().length >= 3 && form.body.trim().length >= 20 && !busy;
    return (
      <Card className="grid gap-3 p-4" data-testid="article-editor">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black">{form.id ? "Makaleyi düzenle" : "Yeni makale"}</h3>
          <button onClick={() => setForm(null)} className="rounded-full px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100">Vazgeç</button>
        </div>
        <label className="grid gap-1 text-xs font-black text-slate-500">Başlık
          <input className={ARTICLE_INPUT} value={form.title} maxLength={200} onChange={(event) => set("title", event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">Adres (boş bırakılırsa başlıktan üretilir)
          <input className={ARTICLE_INPUT} value={form.slug} onChange={(event) => set("slug", slugifyTr(event.target.value))} placeholder={slugifyTr(form.title)} />
        </label>
        <div className="grid gap-1 text-xs font-black text-slate-500">Kapak görseli (isteğe bağlı; yoksa ilgili türün görseli kullanılır)
          <div className="flex items-center gap-3">
            {form.cover_url ? <img src={form.cover_url} alt="" className="h-16 w-28 rounded-xl object-cover" /> : <div className="grid h-16 w-28 place-items-center rounded-xl bg-slate-100 text-slate-400"><Upload size={16} /></div>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">{busy ? "Yükleniyor…" : "Görsel seç"}</button>
            {form.cover_url && <button type="button" onClick={() => set("cover_url", "")} className="rounded-full px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50">Kaldır</button>}
          </div>
        </div>
        <label className="grid gap-1 text-xs font-black text-slate-500">Özet (listede görünür; boşsa ilk paragraftan alınır)
          <textarea className={ARTICLE_INPUT} rows={2} maxLength={400} value={form.excerpt} onChange={(event) => set("excerpt", event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">Metin
          <span className="font-normal text-slate-400">Paragrafları boş satırla ayır. Alt başlık için satırı "## " ile başlat. Dipnot işareti: [1], [2]…</span>
          <textarea className={ARTICLE_INPUT + " font-normal leading-relaxed"} rows={18} value={form.body} onChange={(event) => set("body", event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">Dipnotlar (her satıra bir dipnot, sırasıyla [1], [2]…)
          <textarea className={ARTICLE_INPUT} rows={3} value={form.footnotesText} onChange={(event) => set("footnotesText", event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">İleri okumalar ve kaynaklar (her satıra bir kaynak)
          <span className="font-normal text-slate-400">Biçim: [Etiket] Kaynak adı: https://adres</span>
          <textarea className={ARTICLE_INPUT} rows={4} value={form.sourcesText} onChange={(event) => set("sourcesText", event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">İlgili türler (tür adresleri, virgülle)
          <span className="font-normal text-slate-400">Bu türlerin sayfasında "Makaleyi oku" butonu çıkar. Ör. betta-splendens, pterophyllum-scalare</span>
          <input className={ARTICLE_INPUT} value={form.speciesText} onChange={(event) => set("speciesText", event.target.value)} />
          {speciesSlugs.length > 0 && (
            <span className="flex flex-wrap gap-1.5 font-normal">
              {speciesSlugs.map((slug) => <span key={slug} className={"rounded-full px-2 py-0.5 text-[12px] font-bold " + (nameBySlug[slug] ? "bg-cyan-50 text-cyan-900" : "bg-red-50 text-red-700")}>{nameBySlug[slug] || slug + " (bulunamadı)"}</span>)}
            </span>
          )}
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">Durum
          <select className={ARTICLE_INPUT} value={form.status} onChange={(event) => set("status", event.target.value)}>
            <option value="published">Yayında</option>
            <option value="draft">Taslak (yalnız ekip görür)</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button disabled={!canSave || unknown.length > 0} onClick={save} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900 disabled:opacity-40">Kaydet</button>
          {form.id && <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50"><Trash2 size={14} /> Sil</button>}
          {unknown.length > 0 && <span className="text-xs font-bold text-red-600">Bulunamayan tür adreslerini düzelt.</span>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-slate-100 p-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm text-slate-500">{rows.length} makale</span>
        <button onClick={() => edit(null)} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white hover:bg-cyan-900"><Plus size={15} /> Yeni makale</button>
      </div>
      {rows.map((row) => (
        <button key={row.id} onClick={() => edit(row)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
          {row.cover_url ? <img src={row.cover_url} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" /> : <div className="h-10 w-14 shrink-0 rounded-lg bg-gradient-to-br from-cyan-700 to-teal-500" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black">{row.title}</span>
            <span className="block truncate text-xs text-slate-400">{(row.species_slugs || []).map((slug) => nameBySlug[slug] || slug).join(", ") || "Tür bağlantısı yok"}</span>
          </span>
          {row.status === "draft" && <Badge>Taslak</Badge>}
        </button>
      ))}
    </Card>
  );
}

function CategoryCovers({ categories }) {
  const { act } = useAdmin();
  const [covers, setCovers] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const target = useRef("");
  useEffect(() => {
    loadCategoryCovers(true).then((value) => setCovers({ ...value }));
  }, []);
  async function save(next, message) {
    const ok = await act(supabase.from("site_settings").update({ value: next }).eq("key", "category_covers").select("key").single(), message);
    if (ok) {
      setCovers(next);
      loadCategoryCovers(true);
    }
  }
  function pick(id) {
    target.current = id;
    if (fileRef.current) fileRef.current.click();
  }
  async function upload(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    const id = target.current;
    if (!file || !id) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Yalnızca JPG, PNG veya WEBP yükleyebilirsin.");
    setError("");
    setBusy(id);
    try {
      const blob = await shrinkImage(file, 2000, 0.85);
      const type = blob.type || "image/jpeg";
      const path = "categories/" + id + "/" + Date.now() + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const { error: upErr } = await supabase.storage.from("species-media").upload(path, blob, { contentType: type });
      if (upErr) throw upErr;
      const url = supabase.storage.from("species-media").getPublicUrl(path).data.publicUrl;
      await save({ ...covers, [id]: url }, "Kapak görseli güncellendi");
    } catch (err) {
      setError(trError(err));
    }
    setBusy("");
  }
  async function remove(id) {
    const next = { ...covers };
    delete next[id];
    await save(next, "Kapak kaldırıldı; kategori rengi gösterilecek");
  }
  if (!covers) return <Card><Loader2 className="animate-spin text-slate-400" size={18} /></Card>;
  const tones = Object.fromEntries(KB_CATEGORIES.map((row) => [row.id, row]));
  return (
    <Card className="p-4">
      <p className="mb-3 text-sm text-slate-600">Kategori sayfasının üstündeki başlık bandında görünür. Yatay (geniş) görseller en iyi sonucu verir; görsel yoksa kategorinin kendi renk geçişi kullanılır.</p>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {categories.map((cat) => {
          const url = covers[cat.id];
          const tone = (tones[cat.id] && tones[cat.id].tone) || "from-slate-300 to-slate-600";
          return (
            <div key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className={"relative h-20 " + (url ? "bg-slate-900" : "bg-gradient-to-r " + tone)}>
                {url && <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <div className={"absolute inset-0 " + (url ? "bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/5" : "bg-gradient-to-r from-black/25 to-transparent")} />
                <div className="relative flex h-full items-center gap-2 px-3 text-white [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="truncate font-black">{cat.name}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <Btn small onClick={() => pick(cat.id)} disabled={!!busy}>{busy === cat.id ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />} {url ? "Değiştir" : "Görsel yükle"}</Btn>
                {url && <Btn small tone="ghostDanger" onClick={() => remove(cat.id)} disabled={!!busy}><X size={13} /> Kaldır</Btn>}
                {!url && <span className="text-xs text-slate-400">Renk geçişi kullanılıyor</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SpeciesSection() {
  const { act, ask, param } = useAdmin();
  const [tab, setTab] = useState("species");
  const [query, setQuery] = useState("");
  const state = useLoad(async () => {
    const [suggestions, formSuggestions, species, categories] = await Promise.all([
      must(supabase.from("species_suggestions").select("*").order("created_at", { ascending: false }).limit(200)),
      must(supabase.from("species_form_suggestions").select("*").order("created_at", { ascending: false }).limit(200)),
      must(supabase.from("species").select("id, slug, name, latin, category_id, status, is_rare, keeper_count, comment_count, image_url").order("name")),
      must(supabase.from("kb_categories").select("id, section, name, emoji").order("position"))
    ]);
    const profiles = await profilesByIds([...suggestions, ...formSuggestions].map((row) => row.user_id));
    return { suggestions, formSuggestions, speciesById: Object.fromEntries(species.map((row) => [row.id, row])), species, categories, categoryNames: Object.fromEntries(categories.map((row) => [row.id, row.name])), profiles };
  }, []);

  if (param) return <SpeciesEditor param={param} />;

  async function review(row, approve) {
    const note = approve
      ? await ask({ title: "Öneriyi onayla", text: "Öneri onaylandı olarak işaretlenir ve tür profili oluşturma ekranı öneriden doldurularak açılır.", input: false, confirm: "Onayla" })
      : await ask({ title: "Öneriyi reddet", presets: ["Zaten mevcut", "Yanlış / eksik bilgi", "Akvaryum türü değil"], confirm: "Reddet", danger: true, input: false });
    if (note === null) return;
    if (await act(supabase.from("species_suggestions").update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() }).eq("id", row.id), approve ? "Öneri onaylandı" : "Öneri reddedildi")) {
      if (approve) window.location.hash = "#/yonetim/turler/oneri-" + row.id;
      else state.reload();
    }
  }
  async function reviewForm(row, approve) {
    const reason = approve
      ? await ask({ title: "Öneriyi onayla", text: "“" + row.name + "” tür sayfasındaki lokalite / varyete listesine eklenir ve öneren üyeye bildirim gider. Eklendikten sonra tür düzenleme ekranından değiştirebilirsin.", input: false, confirm: "Onayla ve ekle" })
      : await ask({ title: "Öneriyi reddet", text: "Gerekçe üyeye bildirimle iletilir (isteğe bağlı).", presets: ["Zaten listede var", "Doğrulanamadı / kaynak yok", "Ayrı bir tür", "Melez hat"], confirm: "Reddet", danger: true });
    if (reason === null) return;
    if (await act(supabase.rpc("review_form_suggestion", { p_id: row.id, p_approve: approve, p_reason: approve ? null : reason || null }), approve ? "Lokalite eklendi" : "Öneri reddedildi")) state.reload();
  }
  async function toggleStatus(row) {
    const next = row.status === "published" ? "draft" : "published";
    if (await act(supabase.from("species").update({ status: next }).eq("id", row.id), next === "published" ? row.name + " yayında" : row.name + " taslağa alındı")) state.reload();
  }
  async function toggleRare(row) {
    if (await act(supabase.from("species").update({ is_rare: !row.is_rare }).eq("id", row.id), row.is_rare ? "Nadir işareti kaldırıldı" : "Nadir olarak işaretlendi")) state.reload();
  }

  return (
    <Section
      title="Türler"
      subtitle="Bilgi Bankası tür profilleri ve üyelerin tür önerileri."
      actions={<a href="#/yonetim/turler/yeni" className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white hover:bg-cyan-900"><Plus size={15} /> Yeni tür</a>}
    >
      <LoadState state={state}>
        {(data) => {
          const pending = data.suggestions.filter((row) => row.status === "pending");
          const pendingForms = data.formSuggestions.filter((row) => row.status === "pending");
          return (
            <>
              <Tabs
                value={tab}
                onChange={(key) => (key === "new" ? (window.location.hash = "#/yonetim/turler/yeni") : setTab(key))}
                items={[["species", "Türler (" + data.species.length + ")"], ["suggestions", "Tür önerileri", pending.length], ["forms", "Lokalite önerileri", pendingForms.length], ["covers", "Kategori kapakları"], ["articles", "Makaleler"], ["new", "＋ Yeni tür ekle"]]}
              />
              {tab === "covers" ? <CategoryCovers categories={data.categories} /> : tab === "articles" ? <ArticlesAdmin speciesRows={data.species} /> : tab === "forms" ? (
                !data.formSuggestions.length ? <Empty>Henüz lokalite / varyete önerisi yok.</Empty> : (
                  <Card className="divide-y divide-slate-100 p-0">
                    {data.formSuggestions.map((row) => {
                      const sp = data.speciesById[row.species_id];
                      return (
                        <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black">{row.name}</span>
                              <Badge>{FORM_KIND_LABELS[row.kind] || row.kind}</Badge>
                              <StatusBadge status={row.status} />
                            </div>
                            {sp && <a href={"#/yonetim/turler/" + sp.id} className="text-sm font-bold text-cyan-800 hover:underline">{sp.name} <span className="font-normal italic text-slate-500">{sp.latin}</span></a>}
                            {row.origin && <p className="mt-1 text-sm text-slate-600">📍 {row.origin}</p>}
                            {row.lat != null && <a href={"https://www.openstreetmap.org/?mlat=" + row.lat + "&mlon=" + row.lng + "#map=8/" + row.lat + "/" + row.lng} target="_blank" rel="noreferrer noopener" className="text-xs font-bold text-cyan-800 hover:underline">Haritada işaretlenen nokta: {coordText(row.lat, row.lng)}</a>}
                            {row.aliases && row.aliases.length > 0 && <p className="text-sm text-slate-500">Diğer adlar: {row.aliases.join(", ")}</p>}
                            {row.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{row.note}</p>}
                            {row.source_url && <a href={row.source_url} target="_blank" rel="noreferrer noopener" className="mt-1 block truncate text-xs font-bold text-cyan-800 hover:underline">{row.source_url}</a>}
                            {row.images && row.images.length > 0 && (
                              <div className="mt-2 flex gap-2">
                                {row.images.map((url) => (
                                  <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" /></a>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <Person profile={data.profiles[row.user_id]} />
                              <span>{fmtDate(row.created_at)}</span>
                              {row.reject_reason && <span>Gerekçe: {row.reject_reason}</span>}
                            </div>
                          </div>
                          {row.status === "pending" && (
                            <div className="flex gap-2">
                              <Btn small tone="success" onClick={() => reviewForm(row, true)}><Check size={13} /> Onayla</Btn>
                              <Btn small tone="ghostDanger" onClick={() => reviewForm(row, false)}><X size={13} /> Reddet</Btn>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Card>
                )
              ) : tab === "suggestions" ? (
                !data.suggestions.length ? <Empty>Henüz tür önerisi yok.</Empty> : (
                  <Card className="divide-y divide-slate-100 p-0">
                    {data.suggestions.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black">{row.name}</span>
                            {row.latin && <span className="text-sm italic text-slate-500">{row.latin}</span>}
                            <StatusBadge status={row.status} />
                            {row.category_id && <Badge>{data.categoryNames[row.category_id] || row.category_id}</Badge>}
                          </div>
                          {row.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{row.note}</p>}
                          {row.images && row.images.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {row.images.map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" /></a>
                              ))}
                            </div>
                          )}
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
                        {row.status === "approved" && (
                          <a href={"#/yonetim/turler/oneri-" + row.id} className="text-xs font-black text-cyan-800 hover:underline">Profil oluştur →</a>
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
                      .filter((row) => !query.trim() || (row.name + " " + (row.latin || "")).toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")))
                      .map((row) => (
                        <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                          {row.image_url ? <img src={row.image_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-300"><Fish size={18} /></span>}
                          <div className="min-w-0 flex-1">
                            <a href={"#/yonetim/turler/" + row.id} className="font-black hover:underline">{row.name}</a>
                            <span className="ml-2 text-sm italic text-slate-500">{row.latin}</span>
                            <div className="text-xs text-slate-500">{data.categoryNames[row.category_id] || row.category_id} · {row.keeper_count} besleyen · {row.comment_count} deneyim</div>
                          </div>
                          {row.status === "draft" && <Badge tone="amber">Taslak</Badge>}
                          <Btn small onClick={() => toggleRare(row)}>{row.is_rare ? "💎 Nadir" : "Nadir işaretle"}</Btn>
                          <Btn small onClick={() => toggleStatus(row)}>{row.status === "published" ? "Taslağa al" : "Yayınla"}</Btn>
                          <a href={"#/yonetim/turler/" + row.id} className="inline-flex items-center gap-1 rounded-full bg-cyan-950 px-3 py-1.5 text-xs font-black text-white hover:bg-cyan-900">Düzenle</a>
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

/* Tür yayılım alanları (haritadaki daireler) ----------------------------- */
function SpeciesRangeEditor({ speciesId }) {
  const { act } = useAdmin();
  const [areas, setAreas] = useState(null);
  const [active, setActive] = useState(0);
  const [dirty, setDirty] = useState(false);
  const state = useLoad(async () => {
    const [sp, forms] = await Promise.all([
      must(supabase.from("species").select("range_areas").eq("id", speciesId).single()),
      must(supabase.from("species_forms").select("name, lat, lng").eq("species_id", speciesId).not("lat", "is", null))
    ]);
    return { areas: sp.range_areas || [], forms };
  }, [speciesId]);
  useEffect(() => { if (state.data && areas === null) setAreas(state.data.areas); }, [state.data, areas]);
  const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-cyan-700";
  const update = (index, patch) => { setAreas((prev) => prev.map((area, i) => (i === index ? { ...area, ...patch } : area))); setDirty(true); };
  async function save() {
    const clean = (areas || []).filter((area) => Number.isFinite(area.lat) && Number.isFinite(area.lng)).map((area) => ({ label: (area.label || "").trim(), lat: area.lat, lng: area.lng, r: Math.max(5, Math.min(3000, Number(area.r) || 100)) }));
    if (await act(supabase.from("species").update({ range_areas: clean }).eq("id", speciesId), "Yayılım alanları kaydedildi")) { setAreas(clean); setDirty(false); }
  }
  return (
    <Card className="mt-4">
      <div className="mb-3">
        <h2 className="font-black">Doğadaki yayılım alanları</h2>
        <p className="text-xs text-slate-500">Türün doğada yaygın görüldüğü bölgeler; tür sayfasındaki haritada yarı saydam daire olarak görünür. Bir satır seç, haritaya tıklayarak merkezini koy, yarıçapı km olarak ver. Gri noktalar lokaliteler.</p>
      </div>
      <LoadState state={state}>
        {(data) => (
          <>
            <div className="mb-2 grid gap-1.5">
              {(areas || []).map((area, index) => (
                <div key={index} onClick={() => setActive(index)} className={"grid cursor-pointer grid-cols-[1fr_88px_auto] items-center gap-2 rounded-2xl border px-2 py-1.5 " + (active === index ? "border-cyan-700 bg-cyan-50/50" : "border-slate-100")}>
                  <input className={input} value={area.label || ""} onChange={(event) => update(index, { label: event.target.value })} placeholder="Bölge adı (ör. Malavi Gölü)" />
                  <label className="flex items-center gap-1 text-xs text-slate-500"><input type="number" min={5} max={3000} className={input} value={area.r || ""} onChange={(event) => update(index, { r: Number(event.target.value) })} />km</label>
                  <div className="flex items-center gap-1">
                    <span className="hidden text-[11px] text-slate-400 sm:inline">{coordText(area.lat, area.lng) || "konum yok"}</span>
                    <Btn small tone="ghostDanger" onClick={(event) => { event.stopPropagation(); setAreas((prev) => prev.filter((_, i) => i !== index)); setActive(0); setDirty(true); }}><Trash2 size={13} /></Btn>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Btn small onClick={() => { setAreas((prev) => [...(prev || []), { label: "", lat: null, lng: null, r: 150 }]); setActive((areas || []).length); setDirty(true); }}><Plus size={13} /> Bölge ekle</Btn>
              <Btn small tone="primary" disabled={!dirty} onClick={save}><Check size={13} /> Kaydet</Btn>
            </div>
            <Suspense fallback={<div className="h-[300px] animate-pulse rounded-2xl bg-slate-100" />}>
              <MapPicker
                height={300}
                value={areas && areas[active] && areas[active].lat != null ? { lat: areas[active].lat, lng: areas[active].lng } : null}
                areas={(areas || []).filter((area) => area.lat != null)}
                context={data.forms.map((row) => ({ lat: row.lat, lng: row.lng, title: row.name }))}
                onPick={(c) => {
                  if (!areas || !areas.length) { setAreas([{ label: "", r: 150, ...c }]); setActive(0); setDirty(true); return; }
                  update(Math.min(active, areas.length - 1), c);
                }}
              />
            </Suspense>
          </>
        )}
      </LoadState>
    </Card>
  );
}

/* Tür profili düzenleyici ------------------------------------------------ */

const FACT_TEMPLATES = {
  fish: ["Yetişkin boy", "Sıcaklık", "pH", "Min. akvaryum", "Huy", "Beslenme", "Üreme", "Köken", "Ömür"],
  plant: ["Işık", "CO2", "Büyüme hızı", "Yerleşim", "Sıcaklık", "pH", "Çoğaltma"],
  coral: ["Işık", "Akıntı", "Sıcaklık", "Tuzluluk (SG)", "Besleme", "Agresiflik", "Yerleşim"]
};
const KIND_LABELS = { fish: "Balık / omurgasız", plant: "Bitki", coral: "Mercan" };
const MAX_SPECIES_IMAGES = 12;
const TR_ASCII = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const slugify = (text) =>
  (text || "")
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => TR_ASCII[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

function SpeciesEditor({ param }) {
  const { act } = useAdmin();
  const isNew = param === "yeni" || param.startsWith("oneri-");
  const [form, setForm] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const state = useLoad(async () => {
    const categories = await must(supabase.from("kb_categories").select("id, section, name, emoji").order("position"));
    const existing = await must(supabase.from("species").select("slug"));
    let row = null;
    let suggestion = null;
    if (!isNew) row = await must(supabase.from("species").select("*").eq("id", Number(param)).maybeSingle());
    if (param.startsWith("oneri-")) suggestion = await must(supabase.from("species_suggestions").select("*").eq("id", Number(param.slice(6))).maybeSingle());
    return { categories, slugs: new Set(existing.map((item) => String(item.slug))), row, suggestion };
  }, [param]);

  useEffect(() => {
    if (!state.data) return;
    const { row, suggestion, categories } = state.data;
    if (row) {
      const images = Array.isArray(row.images) && row.images.length ? row.images : row.image_url ? [row.image_url] : [];
      setForm({
        slug: String(row.slug), name: row.name, latin: row.latin || "", category_id: row.category_id, kind: row.kind, difficulty: row.difficulty || "Kolay",
        temperament: row.temperament || "", description: row.description || "", facts: Array.isArray(row.facts) ? row.facts.map((pair) => [pair[0], pair[1]]) : [],
        keywords: (row.keywords || []).join(", "), is_rare: Boolean(row.is_rare), status: row.status, images, care_notice: row.care_notice || ""
      });
      setSlugTouched(true);
    } else {
      setForm({
        slug: suggestion ? slugify(suggestion.latin || suggestion.name) : "", name: suggestion ? suggestion.name : "", latin: suggestion ? suggestion.latin || "" : "",
        category_id: (suggestion && suggestion.category_id) || (categories[0] && categories[0].id) || "", kind: "fish", difficulty: "Kolay", temperament: "",
        description: suggestion && suggestion.note ? suggestion.note : "", facts: FACT_TEMPLATES.fish.map((label) => [label, ""]), keywords: "", is_rare: false, status: "draft", care_notice: "",
        images: suggestion && Array.isArray(suggestion.images) ? suggestion.images.slice(0, MAX_SPECIES_IMAGES) : []
      });
    }
  }, [state.data]);

  if (!form) {
    return <LoadState state={state}>{() => null}</LoadState>;
  }

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const slugTaken = isNew && state.data.slugs.has(form.slug);
  const problems = [];
  if (form.name.trim().length < 2) problems.push("Türkçe ad");
  if (!/^[a-z0-9-]{3,80}$/.test(form.slug)) problems.push("adres (en az 3 karakter; küçük harf, rakam, tire)");
  if (slugTaken) problems.push("bu adres zaten kullanılıyor");
  if (!form.category_id) problems.push("kategori");
  if (form.description.trim().length < 20) problems.push("açıklama (en az 20 karakter)");

  async function addImages(event) {
    const files = Array.from(event.target.files || []).filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    event.target.value = "";
    const room = MAX_SPECIES_IMAGES - form.images.length;
    if (!files.length || room <= 0) return;
    setError("");
    setUploading(Math.min(room, files.length));
    const uploaded = [];
    for (const file of files.slice(0, room)) {
      try {
        const blob = await shrinkImage(file, 1800, 0.86);
        const type = blob.type || "image/jpeg";
        const path = "species/" + (form.slug || "yeni") + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + (type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const { error: upErr } = await supabase.storage.from("species-media").upload(path, blob, { contentType: type });
        if (upErr) throw upErr;
        uploaded.push(supabase.storage.from("species-media").getPublicUrl(path).data.publicUrl);
      } catch (err) {
        setError(trError(err));
      }
      setUploading((value) => Math.max(0, value - 1));
    }
    if (uploaded.length) setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded].slice(0, MAX_SPECIES_IMAGES) }));
  }

  function moveImage(index, delta) {
    setForm((prev) => {
      const images = prev.images.slice();
      const target = index + delta;
      if (target < 0 || target >= images.length) return prev;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...prev, images };
    });
  }

  async function save(status) {
    if (problems.length || saving) return;
    setSaving(true);
    setError("");
    const payload = {
      slug: form.slug,
      name: form.name.trim(),
      latin: form.latin.trim() || null,
      category_id: form.category_id,
      kind: form.kind,
      difficulty: form.difficulty,
      temperament: form.temperament.trim() || null,
      description: form.description.trim(),
      facts: form.facts.map(([label, value]) => [label.trim(), String(value).trim()]).filter(([label, value]) => label && value),
      keywords: Array.from(new Set(form.keywords.split(",").map((word) => word.trim().toLocaleLowerCase("tr")).filter(Boolean))),
      is_rare: form.is_rare,
      care_notice: (form.care_notice || "").trim() || null,
      status,
      images: form.images,
      image_url: form.images[0] || null
    };
    const ok = await act(
      isNew ? supabase.from("species").insert(payload) : supabase.from("species").update(payload).eq("id", Number(param)),
      status === "published" ? payload.name + " yayında" : payload.name + " taslak olarak kaydedildi"
    );
    setSaving(false);
    if (ok) window.location.hash = "#/yonetim/turler";
  }

  const input = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-700";
  const sections = Array.from(new Set(state.data.categories.map((cat) => cat.section)));
  const SECTION_NAMES = { tatlisu: "Tatlı su balıkları", omurgasiz: "Omurgasızlar", deniz: "Deniz canlıları", bitki: "Bitkiler" };

  return (
    <div>
      <a href="#/yonetim/turler" className="mb-3 inline-flex items-center gap-1.5 text-sm font-black text-slate-500 hover:text-slate-800"><ArrowLeft size={15} /> Türler</a>
      <Section
        title={isNew ? "Yeni tür profili" : form.name}
        subtitle={isNew ? "Kaydettiğin profil Bilgi Bankası'nda yayınlandığında herkes görür." : "Değişiklikler kaydedildiği anda sitede güncellenir (ziyaretçi sayfayı yenilediğinde)."}
        actions={!isNew && <a href={siteLink("/tur/" + form.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-black text-cyan-800 hover:underline">Sitede aç <ExternalLink size={13} /></a>}
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="grid content-start gap-4">
            <Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-slate-500">Türkçe ad
                  <input className={input} value={form.name} maxLength={80} onChange={(event) => { set("name", event.target.value); if (!slugTouched && !form.latin) set("slug", slugify(event.target.value)); }} placeholder="Örn. Ember Tetra" />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">Latince ad
                  <input className={input + " italic"} value={form.latin} maxLength={120} onChange={(event) => { set("latin", event.target.value); if (!slugTouched) set("slug", slugify(event.target.value || form.name)); }} placeholder="Hyphessobrycon amandae" />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">Sayfa adresi
                  <span className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-400">
                    /tur/
                    <input className="w-full bg-transparent py-2.5 text-slate-900 outline-none disabled:text-slate-500" value={form.slug} disabled={!isNew} onChange={(event) => { setSlugTouched(true); set("slug", slugify(event.target.value)); }} />
                  </span>
                  {!isNew && <span className="font-normal text-slate-400">Paylaşılan bağlantılar bozulmasın diye adres değiştirilemez.</span>}
                  {slugTaken && <span className="font-bold text-rose-600">Bu adres zaten kullanılıyor.</span>}
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">Kategori
                  <select className={input} value={form.category_id} onChange={(event) => set("category_id", event.target.value)}>
                    {sections.map((section) => (
                      <optgroup key={section} label={SECTION_NAMES[section] || section}>
                        {state.data.categories.filter((cat) => cat.section === section).map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">Canlı türü
                  <select className={input} value={form.kind} onChange={(event) => set("kind", event.target.value)}>
                    {Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500">Bakım zorluğu
                  <select className={input} value={form.difficulty} onChange={(event) => set("difficulty", event.target.value)}>
                    {["Kolay", "Orta", "Zor"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Huy / kısa not (isteğe bağlı)
                  <input className={input} value={form.temperament} maxLength={60} onChange={(event) => set("temperament", event.target.value)} placeholder="Örn. Barışçıl, sürü balığı" />
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Açıklama
                  <textarea className={input} rows={5} value={form.description} maxLength={2000} onChange={(event) => set("description", event.target.value)} placeholder="Türü tanıtan, bakımda dikkat edilmesi gerekenleri anlatan birkaç cümle." />
                  <span className="text-right font-normal text-slate-400">{form.description.length}/2000</span>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Arama kelimeleri
                  <input className={input} value={form.keywords} onChange={(event) => set("keywords", event.target.value)} placeholder="virgülle: ember, ember tetra, amandae" />
                  <span className="font-normal text-slate-400">Paylaşım ve ilanlarda bu kelimeler geçince tür otomatik etiketlenir.</span>
                </label>
                <label className="grid gap-1 text-xs font-black text-slate-500 sm:col-span-2">Uyarı notu (isteğe bağlı)
                  <textarea className={input} rows={2} value={form.care_notice || ""} maxLength={500} onChange={(event) => set("care_notice", event.target.value)} placeholder="Tür sayfasında sarı uyarı kutusu olarak görünür (ör. mevzuat, acı su ihtiyacı). Boşsa kategorinin varsayılan uyarısı gösterilir." />
                </label>
              </div>
            </Card>

            <Card>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-black">Bakım künyesi</h2>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(KIND_LABELS).map(([key, label]) => (
                    <Btn key={key} small onClick={() => set("facts", FACT_TEMPLATES[key].map((name) => [name, (form.facts.find(([l]) => l === name) || [])[1] || ""]))}>{label} şablonu</Btn>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                {form.facts.map(([label, value], index) => (
                  <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                    <input className={input} value={label} maxLength={40} onChange={(event) => set("facts", form.facts.map((pair, i) => (i === index ? [event.target.value, pair[1]] : pair)))} placeholder="Başlık" />
                    <input className={input} value={value} maxLength={80} onChange={(event) => set("facts", form.facts.map((pair, i) => (i === index ? [pair[0], event.target.value] : pair)))} placeholder="Değer (ör. 24–28 °C)" />
                    <button type="button" onClick={() => set("facts", form.facts.filter((_, i) => i !== index))} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" title="Satırı sil" aria-label="Satırı sil"><X size={15} /></button>
                  </div>
                ))}
              </div>
              {form.facts.length < 16 && <div className="mt-2"><Btn small onClick={() => set("facts", [...form.facts, ["", ""]])}><Plus size={13} /> Satır ekle</Btn></div>}
              <p className="mt-2 text-xs text-slate-400">Boş bırakılan satırlar kaydedilmez.</p>
            </Card>
          </div>

          <div className="grid content-start gap-4">
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-black">Görseller</h2>
                <span className="text-xs font-bold text-slate-400">{form.images.length}/{MAX_SPECIES_IMAGES}</span>
              </div>
              <p className="mb-3 text-xs text-slate-500">İlk görsel kapak olur; tür sayfasında hepsi kaydırmalı gösterilir. Yatay ya da kare, net görseller seç; telif hakkına dikkat et.</p>
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((url, index) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {index === 0 && <span className="absolute left-1 top-1 rounded-full bg-cyan-950 px-1.5 py-0.5 text-[12px] font-black text-white">Kapak</span>}
                    <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-700 shadow disabled:opacity-30" title="Öne al" aria-label="Öne al"><ChevronLeft size={14} /></button>
                      <button type="button" onClick={() => set("images", form.images.filter((_, i) => i !== index))} className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-rose-600 shadow" title="Görseli kaldır" aria-label="Görseli kaldır"><Trash2 size={13} /></button>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={index === form.images.length - 1} className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-700 shadow disabled:opacity-30" title="Arkaya al" aria-label="Arkaya al"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                ))}
                {form.images.length < MAX_SPECIES_IMAGES && (
                  <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading > 0} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-cyan-700 hover:text-cyan-800">
                    {uploading > 0 ? <Loader2 className="animate-spin" size={20} /> : <span className="grid place-items-center gap-1 text-[12px] font-black"><Upload size={18} /> Görsel ekle</span>}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={addImages} />
            </Card>

            <Card>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="h-4 w-4 accent-cyan-900" checked={form.is_rare} onChange={(event) => set("is_rare", event.target.checked)} /> Nadir tür olarak işaretle 💎
              </label>
              <div className="mt-3 text-xs text-slate-500">Durum: <strong className="text-slate-800">{form.status === "published" ? "Yayında" : "Taslak"}</strong></div>
              {error && <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}
              {problems.length > 0 && <p className="mt-3 text-xs font-bold text-slate-400">Eksik: {problems.join(", ")}</p>}
              <div className="mt-3 grid gap-2">
                <Btn tone="primary" disabled={problems.length > 0 || saving || uploading > 0} onClick={() => save("published")}><Check size={14} /> {form.status === "published" ? "Kaydet" : "Kaydet ve yayınla"}</Btn>
                <Btn disabled={problems.length > 0 || saving || uploading > 0} onClick={() => save("draft")}>{form.status === "published" ? "Taslağa al ve kaydet" : "Taslak olarak kaydet"}</Btn>
              </div>
            </Card>
          </div>
        </div>
        {!isNew && <SpeciesFormsEditor speciesId={Number(param)} latin={form.latin} slug={form.slug} />}
        {!isNew && <SpeciesRangeEditor speciesId={Number(param)} />}
      </Section>
    </div>
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
        <textarea value={announcement.text} onChange={(event) => setAnnouncement({ ...announcement, text: event.target.value })} rows={2} maxLength={200} placeholder="Örn. Bu hafta sonu bakım çalışması yapılacak." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-cyan-700" />
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
        <textarea value={words} onChange={(event) => setWords(event.target.value)} rows={3} placeholder="kelime1, kelime2" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-cyan-700" />
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

      <details className="mb-4 rounded-[22px] border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-black text-slate-800">Yetkiler neye izin verir?</summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {PERMISSIONS.map(([key, label]) => (
            <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
              <dt className="font-black text-slate-800">{label}</dt>
              <dd className="text-xs leading-relaxed text-slate-600">{PERMISSION_HELP[key]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-slate-500">Her ekip üyesi Özet ve İşlem kaydı sayfalarını görür. Ekip ve yetkiler sayfası yalnızca süper yöneticiye açıktır. Mesaj içerikleri hiçbir yetkiyle görüntülenemez.</p>
      </details>

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
                  <label key={key} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-900"
                      checked={editing.permissions.has(key)}
                      onChange={(event) => {
                        const next = new Set(editing.permissions);
                        event.target.checked ? next.add(key) : next.delete(key);
                        setEditing({ ...editing, permissions: next });
                      }}
                    />
                    <span>
                      {label}
                      <span className="mt-0.5 block text-xs font-normal leading-relaxed text-slate-500">{PERMISSION_HELP[key]}</span>
                    </span>
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
        items={[["all", "Tümü"], ["report", "Şikâyet"], ["content", "İçerik"], ["user", "Kullanıcı"], ["verification", "Doğrulama"], ["feature", "Öne çıkarma"], ["ad", "Reklam"], ["tag", "Etiket"], ["group", "Grup"], ["staff", "Ekip"], ["settings", "Ayar"]]}
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
