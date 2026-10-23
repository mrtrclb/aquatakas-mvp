import { imgProps } from "./lib/img";
import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Flame, Hash, Info, MapPin, MessageCircle, Pin, Play, Share2, Sparkles, Users, X } from "lucide-react";
import { Avatar, PostCard, extractTags, mediaLabel, normalizeTr, timeAgo } from "./community.jsx";
import { SeenMarker, rotate } from "./lib/rotation";
import { GroupIcon } from "./lib/group-icon.jsx";
import { firstUrl } from "./link-preview.jsx";

// Medya: en az 1 görsel, yüklenen video (en fazla 1 dk) ya da bağlantı önizlemesi (YouTube, Instagram, haber…)
const isMediaPost = (post) => (post.images && post.images.length > 0) || Boolean(post.video) || Boolean(firstUrl(post.text || ""));

/* ------------------------------------------------------------------ */
/* Ayarlar                                                             */
/* ------------------------------------------------------------------ */

// Karışım: her 3 içerikten sonra 1 ilan; öne çıkan ilanlar 2. ve 10. sırada
const POSTS_PER_LISTING = 3;
const FEATURED_SLOTS = [1, 9];
const AD_EVERY = 10;
const PAGE_SIZE = 18;

export const HOME_FILTERS = [
  ["all", "Tümü"],
  ["listings", "İlanlar"],
  ["posts", "İçerikler"],
  ["questions", "Sorular"],
  ["polls", "Anketler"],
  ["media", "Medya"]
];

const STORE_KEY = "hh_home_filter";
const ONBOARD_KEY = "hh_home_onboard_done";

export function loadHomeFilter() {
  try {
    const value = window.localStorage.getItem(STORE_KEY);
    return HOME_FILTERS.some(([key]) => key === value) ? value : "all";
  } catch (e) {
    return "all";
  }
}

export function saveHomeFilter(value) {
  try { window.localStorage.setItem(STORE_KEY, value); } catch (e) { /* yoksay */ }
}

function loadOnboardDone() {
  try { return window.localStorage.getItem(ONBOARD_KEY) === "1"; } catch (e) { return false; }
}

function isQuestion(post) {
  return post.kind === "question";
}

function postTags(post) {
  return ((post.text || "").match(/#[\p{L}\p{N}_]+/gu) || []).map(normalizeTr);
}

// Takip: katıldığın gruplar + takip ettiğin etiketler
export function isFollowedPost(post, joinedIds, followedTags) {
  if (post.groupId && joinedIds.includes(post.groupId)) return true;
  return followedTags.length > 0 && postTags(post).some((tag) => followedTags.includes(tag));
}

// Popüler tartışmalar puanı: son 48 saat, yorum x3 + beğeni (yorum, tartışmayı beğeniden daha iyi temsil eder)
export const POPULAR_WINDOW_HOURS = 48;
export function popularScore(post) {
  return post.comments.length * 3 + post.likes;
}

/* ------------------------------------------------------------------ */
/* Üst çubuk: sekmeler + filtre çipleri + konum                        */
/* ------------------------------------------------------------------ */

export function HomeTopBar({ filter, onFilter, tab, onTab, location, onLocation, cities, myCity, showTabs = true, showLocation = true }) {
  return (
    <div className="sticky top-[60px] lg:top-[72px] z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      {showTabs && (
        <div className="flex">
          {[["foryou", "Senin için"], ["following", "Takip ettiklerim"]].map(([key, label]) => (
            <button key={key} onClick={() => onTab(key)} className={"relative flex-1 py-3.5 text-sm font-black transition hover:bg-slate-50 " + (tab === key ? "text-slate-950" : "text-slate-500")}>
              {label}
              {tab === key && <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-cyan-700" />}
            </button>
          ))}
        </div>
      )}
      <div className={"flex items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] " + (showTabs ? "border-t border-slate-100" : "")}>
        {HOME_FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onFilter(key)}
            className={"shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black transition " + (filter === key ? "bg-cyan-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
          >
            {label}
          </button>
        ))}
        {showLocation && (
          <label className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs font-black text-slate-600">
            <MapPin size={13} className="text-cyan-700" />
            <select value={location} onChange={(event) => onLocation(event.target.value)} className="bg-transparent pr-1 text-xs font-black outline-none">
              <option value="">Tüm Türkiye</option>
              {myCity && <option value={myCity}>Şehrim · {myCity}</option>}
              {cities.filter((city) => city !== myCity).map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
        )}
      </div>
      {(filter === "listings" || filter === "posts") && (
        <p className="px-4 pb-2 text-[12px] font-semibold text-slate-400">
          Bu seçim hatırlanır; ana sayfa bir dahaki girişte de {filter === "listings" ? "ilanlarla" : "içeriklerle"} açılır. Karışık akış için “Tümü”yü seç.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Akıştaki kompakt ilan kartı                                         */
/* ------------------------------------------------------------------ */

function HomeListingCard({ item, ctx, featured }) {
  const user = ctx.users[item.userId];
  const UserName = ctx.UserName;
  const listedAt = item.date ? Date.parse(item.date + "T12:00:00") : null;
  const image = item.images && item.images[0];
  const stop = (fn) => (event) => { event.stopPropagation(); fn(); };
  function share() {
    const url = "https://aquagram.com.tr/ilan/" + (item.dbId || "ornek-" + item.id);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => ctx.onToast && ctx.onToast("Bağlantı kopyalandı"), () => {});
  }
  return (
    <article
      onClick={() => ctx.onOpenListing(item)}
      className="relative flex cursor-pointer gap-3 border-b border-slate-200 px-4 py-3.5 transition hover:bg-slate-50/70"
    >
      {featured && <span className="absolute inset-y-0 left-0 w-1 bg-amber-400" aria-hidden="true" />}
      <SeenMarker kind="listing" id={item.id} enabled={Boolean(featured)} />
      <Avatar user={user} onClick={() => ctx.onProfile(user)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm sm:text-[15px]">
          <button type="button" onClick={stop(() => ctx.onProfile(user))} className="min-w-0 truncate font-black text-slate-900 hover:underline"><UserName user={user} /></button>
          <span className="shrink-0 text-slate-400">· ilan verdi{listedAt ? " · " + timeAgo(listedAt) : ""}</span>
          {featured && <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-black text-amber-800 ring-1 ring-amber-200"><Pin size={10} fill="currentColor" /> Öne çıkan</span>}
        </div>

        <h3 className="mt-1 line-clamp-2 text-[16px] font-black leading-snug text-slate-900 sm:text-[18px]">{item.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500 sm:text-sm">
          <span className="font-black text-cyan-900">{ctx.priceLabel(item)}</span>
          <span className="text-slate-300">·</span>
          <span className="font-bold text-slate-600">{item.type}</span>
          <span className="text-slate-300">·</span>
          <span>{item.category}</span>
          {item.city && (
            <span className="flex items-center gap-1"><span className="mr-1 text-slate-300">·</span><MapPin size={13} /> {item.city}{item.district ? " / " + item.district : ""}</span>
          )}
        </div>

        {image && (
          <div className="relative mt-2.5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-800 to-teal-500">
            <img {...imgProps(image, "(max-width: 640px) 100vw, 560px", [480, 960])} alt="" loading="lazy" decoding="async" className="aspect-[16/9] max-h-[340px] w-full object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
            {item.images.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/65 px-2 py-0.5 text-[12px] font-black text-white">1/{item.images.length}</span>}
            {item.youtube && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white"><Play size={13} fill="currentColor" /></span>}
          </div>
        )}

        <div className="mt-3 flex max-w-sm items-center justify-between text-slate-500">
          <button type="button" onClick={stop(() => user && ctx.onMessage(user, item.title))} className="flex items-center gap-1.5 rounded-full text-sm font-semibold hover:text-cyan-700" title="Satıcıya mesaj gönder">
            <MessageCircle size={18} /> Mesaj gönder
          </button>
          <button type="button" onClick={stop(() => ctx.onOpenListing(item))} className="flex items-center gap-1.5 rounded-full text-sm font-semibold hover:text-cyan-700" title="İlanı aç">
            İlana git <ChevronRight size={16} />
          </button>
          <button type="button" onClick={stop(share)} className="flex items-center gap-1.5 rounded-full text-sm font-semibold hover:text-cyan-700" title="Bağlantıyı kopyala">
            <Share2 size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* İlgi alanı kartı (bir kez)                                          */
/* ------------------------------------------------------------------ */

function InterestChip({ group, active, onClick, large = false }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-full font-black transition " +
        (large ? "px-3.5 py-2 text-sm " : "px-3 py-1.5 text-sm ") +
        (active ? "bg-cyan-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")
      }
    >
      <GroupIcon group={group} inline /> {group.name}
      {active && <span className="text-xs">✓</span>}
    </button>
  );
}

function OnboardingCard({ groups, ctx, onDone }) {
  const [picked, setPicked] = useState([]);
  const [allOpen, setAllOpen] = useState(false);
  const toggle = (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  const sorted = groups.slice().sort((a, b) => b.memberIds.length - a.memberIds.length);

  function submit() {
    if (!ctx.isMember) return ctx.onAuth();
    picked.forEach((id) => ctx.onJoinGroup(id));
    setAllOpen(false);
    onDone();
    return undefined;
  }
  const submitLabel = ctx.isMember ? (picked.length ? picked.length + " gruba katıl" : "Grup seç") : "Üye ol ve akışını oluştur";

  return (
    <section className="relative border-b border-slate-200 bg-gradient-to-br from-cyan-50 to-white py-4">
      <button onClick={onDone} title="Kapat" className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button>
      <div className="px-4 pr-10">
        <h3 className="flex items-center gap-2 text-base font-black text-cyan-950"><Sparkles size={17} /> İlgi alanlarını seç</h3>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">Seçtiğin gruplara katılırsın; akışın ilk günden sana göre şekillenir.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 px-4">
        {sorted.slice(0, 6).map((group) => <InterestChip key={group.id} group={group} active={picked.includes(group.id)} onClick={() => toggle(group.id)} />)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 px-4">
        <button onClick={submit} disabled={ctx.isMember && picked.length === 0} className="rounded-full bg-cyan-950 px-4 py-2 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">{submitLabel}</button>
        <button onClick={() => setAllOpen(true)} className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-black text-cyan-800 hover:bg-white">
          Tümünü gör ({groups.length}) <ChevronRight size={15} />
        </button>
      </div>

      {allOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAllOpen(false); }}>
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-cyan-950"><Sparkles size={18} /> İlgi alanların</h3>
                <p className="text-xs font-semibold text-slate-500">İstediğin kadar seç; sonradan gruplardan ayrılabilirsin.</p>
              </div>
              <button onClick={() => setAllOpen(false)} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={17} /></button>
            </div>
            <div className="grid gap-2 overflow-y-auto p-4 sm:grid-cols-2">
              {sorted.map((group) => {
                const active = picked.includes(group.id);
                return (
                  <button
                    key={group.id}
                    onClick={() => toggle(group.id)}
                    className={"flex items-start gap-3 rounded-2xl p-3 text-left ring-1 transition " + (active ? "bg-cyan-50 ring-cyan-700" : "ring-slate-200 hover:bg-slate-50")}
                  >
                    <span className={"grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-xl " + group.color}><GroupIcon group={group} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-slate-900">{group.name}</span>
                        <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] " + (active ? "bg-cyan-950 text-white" : "ring-1 ring-slate-300")}>{active ? "✓" : ""}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">{group.description}</span>
                      <span className="mt-1 block text-[12px] font-bold text-slate-400">{group.memberIds.length} üye</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
              <span className="text-xs font-bold text-slate-500">{picked.length} seçildi</span>
              <button onClick={submit} disabled={ctx.isMember && picked.length === 0} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">{submitLabel}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Karışık akış                                                        */
/* ------------------------------------------------------------------ */

export function HomeFeed({ posts, listings, groups, ctx, filter, tab, location }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [onboardDone, setOnboardDone] = useState(loadOnboardDone);
  const joinedIds = ctx.isMember ? groups.filter((group) => group.memberIds.includes(ctx.currentUserId)).map((group) => group.id) : [];
  const followedTags = ctx.isMember ? ctx.followedTags || [] : [];
  const myCity = ctx.isMember ? ctx.users[ctx.currentUserId].city : null;
  const FeedAdCard = ctx.FeedAdCard;

  const items = useMemo(() => {
    const inLocation = (city) => !location || city === location;

    let feedPosts = posts.filter((post) => inLocation(ctx.users[post.userId].city));
    if (tab === "following") feedPosts = feedPosts.filter((post) => isFollowedPost(post, joinedIds, followedTags));
    if (filter === "questions") feedPosts = feedPosts.filter(isQuestion);
    if (filter === "polls") feedPosts = feedPosts.filter((post) => post.poll);
    if (filter === "media") feedPosts = feedPosts.filter(isMediaPost);
    feedPosts = feedPosts.slice().sort((a, b) => b.createdAt - a.createdAt);

    // İlanlar yalnızca "Senin için" + "Tümü" görünümünde karışır
    const mixListings = tab === "foryou" && filter === "all";
    let featured = [];
    let normal = [];
    if (mixListings) {
      const pool = listings.filter((item) => inLocation(item.city));
      // Öne çıkanlar: bu ziyaretçiye en az gösterilen önce, eşitlerde her yüklemede rastgele
      featured = rotate(pool.filter((item) => ctx.featuredListingIds.includes(item.id)), "listing");
      // Yakınındaki ilanlar (profil şehri) önce, sonra en yeni
      normal = pool
        .filter((item) => !ctx.featuredListingIds.includes(item.id))
        .sort((a, b) => {
          // Son 24 saatte üste taşınan ilanlar en başta, sonra yakınındakiler, sonra en yeni
          const at = (row) => row.sortAt || new Date(row.date).getTime() || 0;
          const fresh = (row) => (row.bumpedAt && Date.now() - new Date(row.bumpedAt).getTime() < 86400000 ? 1 : 0);
          return fresh(b) - fresh(a) || (fresh(a) && fresh(b) ? at(b) - at(a) : 0) || (myCity ? (b.city === myCity) - (a.city === myCity) : 0) || at(b) - at(a);
        });
    }

    const result = [];
    let pi = 0;
    let li = 0;
    let fi = 0;
    let sinceListing = 0;
    let adSlot = 0;
    while (pi < feedPosts.length || li < normal.length || fi < featured.length) {
      if (ctx.adPool.length && result.length > 0 && result.length % AD_EVERY === 0 && result[result.length - 1].kind !== "ad") {
        result.push({ kind: "ad", key: "ad-" + adSlot, ad: ctx.adPool[(adSlot + 1) % ctx.adPool.length] });
        adSlot += 1;
        continue;
      }
      if (FEATURED_SLOTS.includes(result.length) && fi < featured.length) {
        result.push({ kind: "listing", key: "f-" + featured[fi].id, item: featured[fi], featured: true });
        fi += 1;
        sinceListing = 0; // öne çıkan ilan da 3:1 sayacına dahil
        continue;
      }
      const wantListing = sinceListing >= POSTS_PER_LISTING || pi >= feedPosts.length;
      if (wantListing && li < normal.length) {
        result.push({ kind: "listing", key: "l-" + normal[li].id, item: normal[li] });
        li += 1;
        sinceListing = 0;
      } else if (pi < feedPosts.length) {
        result.push({ kind: "post", key: feedPosts[pi].id, post: feedPosts[pi] });
        pi += 1;
        sinceListing += 1;
      } else if (fi < featured.length) {
        result.push({ kind: "listing", key: "f-" + featured[fi].id, item: featured[fi], featured: true });
        fi += 1;
      } else {
        break;
      }
    }
    return result;
  }, [posts, listings, filter, tab, location, joinedIds.join(","), followedTags.join(","), myCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yalnız hiç gruba katılmamış ve hiç etiket takip etmeyen üyelere gösterilir; ziyaretçiler kayıt akışında zaten seçer.
  const showOnboarding = !onboardDone && tab === "foryou" && ctx.isMember && joinedIds.length === 0 && followedTags.length === 0;
  function finishOnboarding() {
    setOnboardDone(true);
    try { window.localStorage.setItem(ONBOARD_KEY, "1"); } catch (e) { /* yoksay */ }
  }

  if (tab === "following" && !ctx.isMember) {
    return (
      <div className="p-10 text-center">
        <Users size={30} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-black text-slate-700">Takip ettiğin grup ve etiketleri görmek için giriş yap</p>
        <button onClick={ctx.onAuth} className="mt-4 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Giriş yap</button>
      </div>
    );
  }

  return (
    <div>
      {showOnboarding && <OnboardingCard groups={groups} ctx={ctx} onDone={finishOnboarding} />}
      {items.slice(0, limit).map((entry, index) => {
        if (entry.kind === "ad") return <FeedAdCard key={entry.key} ad={entry.ad} />;
        if (entry.kind === "listing") return <HomeListingCard key={entry.key} item={entry.item} featured={entry.featured} ctx={ctx} />;
        return <PostCard key={entry.key} post={entry.post} ctx={ctx} eager={index < 2} />;
      })}
      {items.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-black text-slate-700">{tab === "following" ? (joinedIds.length || followedTags.length ? "Takip ettiklerinde bu filtreye uyan paylaşım yok" : "Henüz bir grup ya da etiket takip etmiyorsun") : "Bu filtreye uyan bir şey yok"}</p>
          <p className="mt-1 text-sm text-slate-500">{tab === "following" && !joinedIds.length && !followedTags.length ? "Gruplara katıl ya da etiket takip et; paylaşımları burada toplanır." : "Konum ya da filtreyi değiştirmeyi dene."}</p>
          {tab === "following" && !joinedIds.length && !followedTags.length && (
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={ctx.onOpenGroups} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Gruplara göz at</button>
              <button onClick={ctx.onOpenTags} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Etiketler</button>
            </div>
          )}
        </div>
      ) : limit < items.length ? (
        <div className="border-b border-slate-200 p-5">
          <button onClick={() => setLimit((value) => value + PAGE_SIZE)} className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Daha fazla göster</button>
        </div>
      ) : (
        <div className="p-6 text-center text-sm font-semibold text-slate-400">Şimdilik hepsi bu kadar 🐠</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sol menü                                                            */
/* ------------------------------------------------------------------ */

// Sayfa her yüklendiğinde farklı 3 grup göstermek için
const GROUP_SHUFFLE_SEED = Math.random();
function shuffledGroups(groups) {
  const score = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
    const x = Math.sin(h * 0.001 + GROUP_SHUFFLE_SEED * 1000) * 10000;
    return x - Math.floor(x);
  };
  return groups.slice().sort((a, b) => score(a.id) - score(b.id));
}

export function HomeAside({ ctx, groups, posts }) {
  const picks = useMemo(() => shuffledGroups(groups).slice(0, 3), [groups.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = picks.map((pick) => groups.find((group) => group.id === pick.id) || pick);

  return (
    <aside className="h-fit border-x border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:overflow-auto">
      <HomeWidgets posts={posts} ctx={ctx} className="grid gap-4" />

      <section className="mt-4 rounded-[28px] border border-slate-200 p-4">
        <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black text-slate-900"><Users size={16} className="text-cyan-700" /> Gruplar</h3>
        <div className="grid gap-0.5">
          {live.map((group) => {
            const joined = ctx.isMember && group.memberIds.includes(ctx.currentUserId);
            return (
              <div key={group.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                <button onClick={() => ctx.onOpenGroup(group)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <span className={"grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl text-lg " + group.color}><GroupIcon group={group} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-900 hover:underline">{group.name}</span>
                    <span className="block text-[12px] font-semibold text-slate-400">{group.memberIds.length} üye</span>
                  </span>
                </button>
                {joined ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-black text-slate-500">✓ Üyesin</span>
                ) : (
                  <button onClick={() => ctx.onToggleJoin(group.id)} className="shrink-0 rounded-full bg-cyan-950 px-3 py-1.5 text-xs font-black text-white hover:bg-cyan-900">Katıl</button>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={ctx.onOpenGroups} className="mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-slate-50 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-50">
          Daha fazlasını gör ({groups.length} grup) <ChevronRight size={14} />
        </button>
      </section>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Sağ sütun bileşenleri                                               */
/* ------------------------------------------------------------------ */

export function HomeWidgets({ posts, ctx, className = "mt-4 grid gap-4" }) {
  const since = Date.now() - POPULAR_WINDOW_HOURS * 3600000;
  const recent = posts.filter((post) => post.createdAt >= since);
  const popular = (recent.length >= 3 ? recent : posts)
    .slice()
    .sort((a, b) => popularScore(b) - popularScore(a) || b.createdAt - a.createdAt)
    .slice(0, 5);
  const tags = extractTags(posts).slice(0, 5);

  return (
    <div className={className}>
      <section className="rounded-[28px] border border-slate-200 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900">
          <Flame size={16} className="text-orange-500" /> Popüler tartışmalar
          <span title={"Son " + POPULAR_WINDOW_HOURS + " saatteki paylaşımlar; puan = yorum × 3 + beğeni"} className="ml-auto cursor-help text-slate-300 hover:text-slate-500"><Info size={14} /></span>
        </h3>
        <div className="grid">
          {popular.map((post, index) => {
            const user = ctx.users[post.userId];
            return (
              <button key={post.id} onClick={() => ctx.onOpenPost(post)} className="flex gap-2.5 rounded-xl px-1.5 py-2 text-left hover:bg-slate-50">
                <span className="w-4 shrink-0 text-sm font-black text-slate-300">{index + 1}</span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-800">{post.text || mediaLabel(post)}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[12px] font-semibold text-slate-400">
                    <span>{user.username}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {post.comments.length}</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><Hash size={16} className="text-cyan-700" /> Gündemdeki etiketler</h3>
          <button onClick={ctx.onOpenTags} className="text-[12px] font-black text-cyan-800 hover:underline">Tümü →</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(({ tag, count }) => (
            <button key={tag} onClick={() => ctx.onSearch(tag)} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-900 hover:bg-cyan-100">
              {tag} <span className="text-[12px] text-cyan-700/70">{count}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
