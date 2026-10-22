import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Crown,
  Hash,
  Link2,
  Pencil,
  Plus,
  Search,
  Shield,
  Users,
  X
} from "lucide-react";
import { Avatar, ComposerPrompt, PageHeader, PostCard, TagFollowButton, extractTags, normalizeTr, searchPosts, slugifyWords } from "./community.jsx";

/* ------------------------------------------------------------------ */
/* Varsayılan gruplar                                                  */
/* ------------------------------------------------------------------ */

const COVER = {
  tanganyika: "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&w=1400&q=80",
  malawi: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=1400&q=80",
  guney: "https://images.unsplash.com/photo-1520301255226-bf5f144451c1?auto=format&fit=crop&w=1400&q=80",
  deniz: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1400&q=80",
  nano: "https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=1400&q=80",
  bitkili: "https://images.unsplash.com/photo-1518156677180-95a2893f3499?auto=format&fit=crop&w=1400&q=80",
  monster: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80"
};

export const COVER_PRESETS = [COVER.bitkili, COVER.deniz, COVER.tanganyika, COVER.monster];
export const GROUP_EMOJIS = ["🐠", "🪨", "🌿", "🦐", "🪸", "🦈", "🐡", "🍂", "💧", "🐢", "🔬", "🏠"];
const GROUP_COLORS = ["bg-cyan-100", "bg-emerald-100", "bg-amber-100", "bg-sky-100", "bg-rose-100", "bg-indigo-100", "bg-orange-100", "bg-slate-200"];

export const MAX_GROUP_RULES = 10;
export const MAX_GROUP_MODS = 5;

// Grup kimliği = slug. ownerId null → platformun resmi grubu.
export function buildDefaultGroups() {
  const created = new Date("2026-03-01").getTime();
  return [
    {
      id: "tanganyika", slug: "tanganyika", name: "Tanganyika", emoji: "🪨", color: "bg-amber-100", cover: COVER.tanganyika,
      description: "Tanganyika gölü cikletleri: Neolamprologus, Cyprichromis, kabuk yaşayanlar, frontosa ve kolonili kurulumlar.",
      rules: ["Sert su ve yüksek pH kurulumları konuşulur; değerlerini paylaşırken ölçüm aracını da belirt.", "Hibrit üretim ve satışı yasaktır.", "Tür adlarını mümkünse Latince yaz."],
      ownerId: null, moderatorIds: [7, 1], memberIds: [1, 7, 4, 2], createdAt: created
    },
    {
      id: "malawi", slug: "malawi", name: "Malawi", emoji: "🐠", color: "bg-sky-100", cover: COVER.malawi,
      description: "Mbuna, haplochromis ve peacock severler. Stoklama, saldırganlık yönetimi ve kaya düzenleri.",
      rules: ["Stok önerisi isterken tank ölçülerini ve mevcut balıkları yaz.", "Hibrit balıkları saf tür gibi tanıtma."],
      ownerId: null, moderatorIds: [4], memberIds: [4, 9, 2], createdAt: created
    },
    {
      id: "guney-amerika", slug: "guney-amerika", name: "Güney Amerika", emoji: "🍂", color: "bg-orange-100", cover: COVER.guney,
      description: "Apistogramma, discus, melek, tetra ve siyah su biyotopları.",
      rules: ["Biyotop paylaşımlarında bitki ve yaprak türlerini belirt.", "Yabani yakalanmış (WC) canlı paylaşımlarında kaynağı belirt."],
      ownerId: null, moderatorIds: [5], memberIds: [5, 3, 6], createdAt: created
    },
    {
      id: "deniz", slug: "deniz", name: "Deniz Akvaryumu", emoji: "🪸", color: "bg-indigo-100", cover: COVER.deniz,
      description: "Resif tankları, mercan fragları, tuzlu su kimyası ve ekipmanları.",
      rules: ["Doğadan izinsiz toplanmış canlı ve mercan paylaşımı yapılmaz.", "Su değerlerini (KH, Ca, Mg, NO3, PO4) birim ile yaz."],
      ownerId: null, moderatorIds: [2], memberIds: [10, 2, 4], createdAt: created
    },
    {
      id: "nano", slug: "nano", name: "Nano Tanklar", emoji: "🦐", color: "bg-rose-100", cover: COVER.nano,
      description: "60 litre altı tanklar, karides, betta, moss ve küçük biyotoplar.",
      rules: ["Tank hacmini paylaşımında mutlaka belirt.", "Hayvan refahına aykırı küçük kap (vazo, kavanoz) önerilerine izin verilmez."],
      ownerId: null, moderatorIds: [3, 8], memberIds: [3, 8, 9, 5], createdAt: created
    },
    {
      id: "bitkili", slug: "bitkili", name: "Bitkili Akvaryumlar", emoji: "🌿", color: "bg-emerald-100", cover: COVER.bitkili,
      description: "Aquascape, low-tech ve CO2'li bitkili tanklar, gübreleme ve budama paylaşımları.",
      rules: ["Gübre ve CO2 önerilerinde ışık süresini de yaz.", "Budama satışları için ilan bölümünü kullan."],
      ownerId: null, moderatorIds: [5, 3], memberIds: [1, 3, 5, 2, 8], createdAt: created
    },
    {
      id: "monster", slug: "monster", name: "Monster Balıklar", emoji: "🦈", color: "bg-slate-200", cover: COVER.monster,
      description: "Oscar, arowana, büyük yayın balıkları ve dev tanklar. Büyük balık, büyük sorumluluk.",
      rules: ["Balığın yetişkin boyuna uygun olmayan tank önerileri kaldırılır.", "Canlı yem videoları paylaşılmaz."],
      ownerId: null, moderatorIds: [4], memberIds: [4, 7], createdAt: created
    },
    {
      id: "hastaliklar", slug: "hastaliklar", name: "Hastalıklar", emoji: "🩺", color: "bg-red-100", cover: COVER.guney,
      description: "Beyaz benek, kadife, yüzgeç çürümesi, bakteriyel ve paraziter sorunlar: belirtiler, karantina ve tedavi deneyimleri.",
      rules: ["Soru sorarken su değerlerini (NH3, NO2, NO3, pH, sıcaklık), tank hacmini ve belirtileri yaz; mümkünse fotoğraf/video ekle.", "Paylaşılanlar deneyimdir, kesin teşhis değildir; ilaç dozlarını ürün etiketine göre uygula.", "İlaç satışı ve reçeteli ürün önerisi yapılmaz.", "Acil durumlarda önce su değişimi ve karantina önerilerini dikkate al."],
      ownerId: null, moderatorIds: [4, 2], memberIds: [4, 2, 6, 9, 1], createdAt: created + 86400000
    },
    {
      id: "canli-yem", slug: "canli-yem", name: "Canlı Yem", emoji: "🪱", color: "bg-lime-100", cover: COVER.nano,
      description: "Artemia, mikrokurt, infusoria, daphnia, grindal ve kültür kurulumları; kültür takasları ve beslenme deneyimleri.",
      rules: ["Kültür satışı için ilan bölümünü kullan; burada yöntem ve deneyim paylaşılır.", "Doğadan toplanan yemlerde parazit riskini belirt."],
      ownerId: null, moderatorIds: [3], memberIds: [3, 5, 6], createdAt: created + 2 * 86400000
    },
    {
      id: "yavru-bakimi", slug: "yavru-bakimi", name: "Yavru Bakımı", emoji: "🐣", color: "bg-yellow-100", cover: COVER.tanganyika,
      description: "Yumurtadan yetişkine: kuluçka, ilk yem, büyütme tankları, su kalitesi ve seçilim.",
      rules: ["Türü ve yavruların yaşını (gün/hafta) belirt.", "Satış ya da sahiplendirme için ilan bölümünü kullan."],
      ownerId: null, moderatorIds: [1], memberIds: [1, 6, 7, 3], createdAt: created + 3 * 86400000
    },
    {
      id: "ekipman", slug: "ekipman", name: "Ekipman Önerileri", emoji: "🔧", color: "bg-zinc-200", cover: COVER.monster,
      description: "Filtre, ısıtıcı, aydınlatma, CO2 ve ölçüm cihazları: karşılaştırmalar, kurulum ve arıza çözümleri.",
      rules: ["Marka/model önerirken kendi kullanım süreni ve tank hacmini yaz.", "Gizli reklam ve yönlendirme bağlantısı paylaşılmaz; satıcıysan belirt.", "Elektrik güvenliği konusunda riskli yöntemler önerilmez."],
      ownerId: null, moderatorIds: [4], memberIds: [4, 2, 10], createdAt: created + 4 * 86400000
    },
    {
      id: "bitki-bakimi", slug: "bitki-bakimi", name: "Bitki Bakımı", emoji: "🌱", color: "bg-green-100", cover: COVER.bitkili,
      description: "Besin eksiklikleri, yosun sorunları, budama ve çoğaltma. Bitkin neden sararıyor? Burada sor.",
      rules: ["Işık süresi, gübreleme ve CO2 bilgisini paylaş.", "Bitkinin yakın plan fotoğrafını ekle."],
      ownerId: null, moderatorIds: [5], memberIds: [5, 3, 8], createdAt: created + 5 * 86400000
    },
    {
      id: "nadir-turler", slug: "nadir-turler", name: "Nadir Türler", emoji: "💎", color: "bg-violet-100", cover: COVER.deniz,
      description: "Türkiye'de az bulunan türler, lokasyon varyantları, yabani (WC) hatlar ve koruma odaklı üretim.",
      rules: ["Tür adını Latince ve varsa lokasyon/hat bilgisiyle yaz.", "Koruma altındaki (CITES) türlerin yasal belgesiz alım-satımı konuşulmaz.", "Doğaya bırakma (salım) hiçbir şekilde önerilmez."],
      ownerId: null, moderatorIds: [7], memberIds: [7, 1, 5], createdAt: created + 6 * 86400000
    }
  ];
}

export function uniqueGroupSlug(name, groups, ignoreId) {
  const base = slugifyWords(name, 5);
  let slug = base;
  let n = 2;
  while (groups.some((group) => group.slug === slug && group.id !== ignoreId)) {
    slug = base + "-" + n;
    n += 1;
  }
  return slug;
}

/* ------------------------------------------------------------------ */
/* Küçük parçalar                                                      */
/* ------------------------------------------------------------------ */

function GroupTile({ group, size = "md" }) {
  const cls = size === "lg" ? "h-20 w-20 rounded-3xl text-4xl ring-4" : size === "sm" ? "h-9 w-9 rounded-xl text-lg ring-2" : "h-14 w-14 rounded-2xl text-2xl ring-4";
  return <span className={"grid shrink-0 place-items-center ring-white " + cls + " " + group.color}>{group.emoji}</span>;
}

function Cover({ group, className }) {
  return (
    <div className={"relative overflow-hidden bg-gradient-to-br from-cyan-900 via-cyan-700 to-teal-500 " + className}>
      {group.cover && <img src={group.cover} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
    </div>
  );
}

function JoinButton({ group, ctx, size = "md" }) {
  const joined = ctx.isMember && group.memberIds.includes(ctx.currentUserId);
  const isOwner = ctx.isMember && group.ownerId === ctx.currentUserId;
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  if (isOwner) {
    return <span className={"inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-black text-amber-800 ring-1 ring-amber-200 " + pad}><Crown size={14} /> Kurucusun</span>;
  }
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); ctx.onToggleJoin(group.id); }}
      className={
        "group/join inline-flex items-center gap-1.5 rounded-full font-black transition " + pad + " " +
        (joined ? "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-red-50 hover:text-red-600 hover:ring-red-200" : "bg-cyan-950 text-white hover:bg-cyan-900")
      }
    >
      {joined ? (
        <>
          <span className="group-hover/join:hidden"><Check size={14} className="-mt-0.5 mr-1 inline" />Katıldın</span>
          <span className="hidden group-hover/join:inline">Gruptan ayrıl</span>
        </>
      ) : (
        "Katıl"
      )}
    </button>
  );
}

function roleOf(group, userId) {
  if (group.ownerId === userId) return "owner";
  if (group.moderatorIds.includes(userId)) return "mod";
  return "member";
}

function RoleBadge({ role }) {
  if (role === "owner") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-black text-amber-800"><Crown size={11} /> Kurucu</span>;
  if (role === "mod") return <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[12px] font-black text-cyan-800"><Shield size={11} /> Moderatör</span>;
  return null;
}

function groupStats(group, posts) {
  const groupPosts = posts.filter((post) => post.groupId === group.id);
  const lastActivity = groupPosts.reduce((max, post) => Math.max(max, post.createdAt), 0);
  return { postCount: groupPosts.length, memberCount: group.memberIds.length, lastActivity };
}

/* ------------------------------------------------------------------ */
/* Gruplar listesi                                                     */
/* ------------------------------------------------------------------ */

function GroupCard({ group, posts, ctx }) {
  const stats = groupStats(group, posts);
  const owner = group.ownerId ? ctx.users[group.ownerId] : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ctx.onOpenGroup(group)}
      onKeyDown={(event) => { if (event.key === "Enter") ctx.onOpenGroup(group); }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:border-cyan-200 hover:shadow-lg"
    >
      <Cover group={group} className="h-24" />
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="relative z-10 -mt-7 flex items-end justify-between gap-2">
          <GroupTile group={group} />
          <JoinButton group={group} ctx={ctx} size="sm" />
        </div>
        <h3 className="mt-2 text-base font-black text-slate-950 group-hover:underline">{group.name}</h3>
        <p className="text-[12px] font-black text-slate-400">{owner ? "Kuran: " + owner.username : "Resmi grup"}</p>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{group.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1"><Users size={13} /> {stats.memberCount} üye</span>
          <span>{stats.postCount} paylaşım</span>
        </div>
      </div>
    </div>
  );
}

export function GroupsPage({ groups, posts, ctx }) {
  const [sort, setSort] = useState("popular");
  const [filter, setFilter] = useState("");
  const myGroup = ctx.isMember ? groups.find((group) => group.ownerId === ctx.currentUserId) : null;
  const joined = ctx.isMember ? groups.filter((group) => group.memberIds.includes(ctx.currentUserId)) : [];
  const q = normalizeTr(filter.trim());

  const list = groups
    .filter((group) => !q || normalizeTr(group.name + " " + group.description).includes(q))
    .map((group) => ({ group, stats: groupStats(group, posts) }))
    .sort((a, b) => {
      if (sort === "active") return b.stats.lastActivity - a.stats.lastActivity;
      if (sort === "new") return b.group.createdAt - a.group.createdAt;
      return b.stats.memberCount - a.stats.memberCount || b.stats.postCount - a.stats.postCount;
    });

  return (
    <div>
      <PageHeader title="Gruplar" subtitle={groups.length + " grup · ilgi alanına göre ayrı akışlar"} />

      <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-cyan-950 to-slate-900 p-5 text-white">
        <div className="max-w-md">
          <h3 className="text-lg font-black">Kendi grubunu kur</h3>
          <p className="mt-1 text-sm text-cyan-50/80">Belirli bir tür ya da kurulum etrafında hobicileri topla, kurallarını belirle, moderatör ata. Her üye en fazla 1 grup kurabilir.</p>
        </div>
        {myGroup ? (
          <button onClick={() => ctx.onOpenGroup(myGroup)} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-cyan-950 hover:bg-cyan-50">
            <span>{myGroup.emoji}</span> Grubuna git
          </button>
        ) : (
          <button onClick={() => ctx.onCreateGroup()} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-cyan-950 hover:bg-cyan-50">
            <Plus size={16} /> Grup oluştur
          </button>
        )}
      </div>

      {joined.length > 0 && (
        <section className="px-4 pb-2">
          <h3 className="mb-2 text-sm font-black text-slate-800">Katıldığın gruplar</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {joined.map((group) => (
              <button
                key={group.id}
                onClick={() => ctx.onOpenGroup(group)}
                className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white py-2 pl-2 pr-4 text-left hover:border-cyan-200 hover:bg-cyan-50/40"
              >
                <GroupTile group={group} size="sm" />
                <span>
                  <span className="block text-sm font-black text-slate-900">{group.name}</span>
                  <span className="block text-[12px] font-semibold text-slate-500">{groupStats(group, posts).postCount} paylaşım</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 pb-6 pt-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-800">Tüm gruplar</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Grup ara" className="w-28 bg-transparent text-xs outline-none" />
            </div>
            <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
              {[["popular", "Popüler"], ["active", "Aktif"], ["new", "Yeni"]].map(([key, label]) => (
                <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        {list.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">Aramana uyan grup yok.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map(({ group }) => <GroupCard key={group.id} group={group} posts={posts} ctx={ctx} />)}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grup sayfası                                                        */
/* ------------------------------------------------------------------ */

function MemberRow({ userId, group, ctx }) {
  const user = ctx.users[userId];
  const UserName = ctx.UserName;
  return (
    <button onClick={() => ctx.onProfile(user)} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
      <Avatar user={user} size={42} onClick={() => ctx.onProfile(user)} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-900"><UserName user={user} /> <RoleBadge role={roleOf(group, userId)} /></span>
        <span className="block truncate text-xs text-slate-500">{user.city} · {user.bio}</span>
      </span>
    </button>
  );
}

export function GroupPage({ group, posts, ctx, search = "" }) {
  const [tab, setTab] = useState("feed");
  const [sort, setSort] = useState("new");
  // Kurucu ya da grup yönetme yetkili ekip üyesi (süper yönetici, "Gruplar" yetkili moderatör) düzenleyebilir
  const canEdit = ctx.isMember && (group.ownerId === ctx.currentUserId || (ctx.canManageGroups && Boolean(group.dbId)));
  const groupPosts = posts.filter((post) => post.groupId === group.id);
  const query = search.trim();
  const visible = (query ? searchPosts(groupPosts, ctx.users, query) : groupPosts)
    .slice()
    .sort((a, b) => (sort === "top" ? b.likes + b.comments.length * 3 - (a.likes + a.comments.length * 3) : b.createdAt - a.createdAt));
  const staff = [group.ownerId, ...group.moderatorIds].filter((id, index, arr) => id && arr.indexOf(id) === index);
  const regular = group.memberIds.filter((id) => !staff.includes(id));
  const owner = group.ownerId ? ctx.users[group.ownerId] : null;

  useEffect(() => { setTab("feed"); }, [group.id]);
  useEffect(() => { if (query) setTab("feed"); }, [query]);

  return (
    <div>
      <div className="sticky top-[60px] lg:top-[72px] z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur">
        <button onClick={ctx.onOpenGroups} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Gruplar"><ArrowLeft size={19} /></button>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black leading-tight">{group.name}</h2>
          <p className="text-xs font-semibold text-slate-500">{groupPosts.length} paylaşım</p>
        </div>
      </div>

      <Cover group={group} className="h-40" />
      <div className="border-b border-slate-200 px-4 pb-4">
        <div className="relative z-10 -mt-10 flex flex-wrap items-end justify-between gap-3">
          <GroupTile group={group} size="lg" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => ctx.onShareGroup(group)} title="Bağlantıyı kopyala" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><Link2 size={16} /></button>
            {canEdit && (
              <button onClick={() => ctx.onEditGroup(group)} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"><Pencil size={14} /> Grubu düzenle</button>
            )}
            <JoinButton group={group} ctx={ctx} />
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{group.name}</h1>
        <p className="mt-0.5 text-xs font-bold text-slate-500">Herkese açık grup · {owner ? "Kuran: " + owner.username : "Resmi grup"}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{group.description}</p>
        <button onClick={() => setTab("members")} className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600 hover:underline">
          <span className="flex -space-x-2">
            {group.memberIds.slice(0, 5).map((id) => (
              <span key={id} className="rounded-full ring-2 ring-white"><Avatar user={ctx.users[id]} size={26} /></span>
            ))}
          </span>
          <span><strong className="text-slate-900">{group.memberIds.length}</strong> üye</span>
        </button>
      </div>

      <div className="sticky top-[116px] lg:top-[128px] z-10 flex border-b border-slate-200 bg-white/95 backdrop-blur">
        {[["feed", "Akış"], ["members", "Üyeler"], ["about", "Hakkında"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={"relative flex-1 py-3 text-sm font-black transition hover:bg-slate-50 " + (tab === key ? "text-slate-950" : "text-slate-500")}>
            {label}
            {tab === key && <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-cyan-700" />}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        <>
          {query ? (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-cyan-50/60 px-4 py-3">
              <p className="min-w-0 truncate text-sm text-slate-600"><strong className="text-slate-900">“{query}”</strong> için grupta {visible.length} paylaşım</p>
              <button onClick={() => ctx.onSearch("")} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-50">Aramayı temizle</button>
            </div>
          ) : (
            <ComposerPrompt ctx={ctx} group={group} />
          )}
          <div className="flex justify-end gap-1 border-b border-slate-100 px-4 py-2">
            {[["new", "En yeni"], ["top", "Popüler"]].map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-cyan-950 text-white" : "text-slate-500 hover:bg-slate-100")}>{label}</button>
            ))}
          </div>
          {visible.length === 0 ? (
            <p className="p-10 text-center text-sm font-semibold text-slate-400">{query ? "Grupta bu aramaya uyan paylaşım yok." : "Bu grupta henüz paylaşım yok. İlk paylaşımı sen yap!"}</p>
          ) : (
            visible.map((post) => <PostCard key={post.id} post={post} ctx={ctx} hideGroup />)
          )}
        </>
      )}

      {tab === "members" && (
        <div>
          <div className="bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500">Yönetim · {staff.length}</div>
          {staff.map((id) => <MemberRow key={id} userId={id} group={group} ctx={ctx} />)}
          <div className="bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-500">Üyeler · {regular.length}</div>
          {regular.length ? regular.map((id) => <MemberRow key={id} userId={id} group={group} ctx={ctx} />) : <p className="p-6 text-center text-sm text-slate-400">Henüz başka üye yok.</p>}
        </div>
      )}

      {tab === "about" && (
        <div className="grid gap-4 p-4">
          <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="text-sm font-black text-slate-900">Grup hakkında</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{group.description}</p>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Oluşturulma: {new Date(group.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} · {group.memberIds.length} üye · {groupPosts.length} paylaşım
            </p>
          </section>
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-black text-slate-900">Grup kuralları</h3>
            {group.rules.length ? (
              <ol className="mt-2 grid gap-2">
                {group.rules.map((rule, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-50 text-xs font-black text-cyan-800">{index + 1}</span>{rule}</li>
                ))}
              </ol>
            ) : <p className="mt-2 text-sm text-slate-500">Ek kural yok; genel topluluk kuralları geçerli.</p>}
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Etiket bulutu                                                       */
/* ------------------------------------------------------------------ */

export function TagsPage({ posts, ctx }) {
  const [sort, setSort] = useState("popular");
  const [filter, setFilter] = useState("");
  const all = useMemo(() => extractTags(posts), [posts]);
  const max = all.length ? all[0].count : 1;
  const fold = (text) => normalizeTr(text).replace(/[çğıöşü]/g, (ch) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[ch]);
  const q = fold(filter.trim().replace(/^#/, ""));
  const list = all
    .filter(({ tag }) => !q || fold(tag).includes(q))
    .slice()
    .sort((a, b) => (sort === "alpha" ? a.tag.localeCompare(b.tag, "tr") : b.count - a.count || a.tag.localeCompare(b.tag, "tr")));

  function size(count) {
    const ratio = max > 1 ? (count - 1) / (max - 1) : 0;
    if (ratio > 0.66) return "text-xl px-4 py-2";
    if (ratio > 0.33) return "text-base px-3.5 py-1.5";
    return "text-sm px-3 py-1.5";
  }

  return (
    <div>
      <PageHeader title="Etiketler" subtitle={all.length + " etiket · paylaşım sayılarıyla"} />
      {ctx.isMember && (ctx.followedTags || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-cyan-50/50 px-4 py-3">
          <span className="mr-1 text-xs font-black text-slate-600">Takip ettiklerin:</span>
          {ctx.followedTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-cyan-950 py-1 pl-2.5 pr-1 text-xs font-black text-white">
              <button onClick={() => ctx.onSearch(tag)} className="hover:underline">{tag}</button>
              <button onClick={() => ctx.onToggleTag(tag)} title="Takibi bırak" className="rounded-full p-0.5 hover:bg-white/20"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Hash size={14} className="text-slate-400" />
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Etiket ara" className="w-36 bg-transparent text-sm outline-none" />
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
          {[["popular", "En çok kullanılan"], ["alpha", "A-Z"]].map(([key, label]) => (
            <button key={key} onClick={() => setSort(key)} className={"rounded-full px-3 py-1 text-xs font-black " + (sort === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>{label}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="p-10 text-center text-sm font-semibold text-slate-400">Bu aramaya uyan etiket yok.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 p-5">
          {list.map(({ tag, count }) => {
            const following = (ctx.followedTags || []).includes(tag);
            return (
              <span key={tag} className={"inline-flex items-center gap-1 rounded-full font-black ring-1 transition " + (following ? "bg-cyan-950 text-white ring-cyan-950" : "bg-cyan-50 text-cyan-900 ring-cyan-100") + " " + size(count)}>
                <button onClick={() => ctx.onSearch(tag)} title={count + " paylaşımda kullanıldı · paylaşımları gör"} className="inline-flex items-center gap-2 hover:underline">
                  {tag}
                  <span className={"rounded-full px-2 py-0.5 text-[12px] font-black " + (following ? "bg-white/15 text-white" : "bg-white/80 text-cyan-800")}>{count}</span>
                </button>
                <button
                  onClick={() => ctx.onToggleTag(tag)}
                  title={following ? "Takibi bırak" : "Takip et"}
                  className={"ml-0.5 grid h-6 w-6 place-items-center rounded-full text-sm leading-none transition " + (following ? "bg-white/15 hover:bg-red-500" : "bg-white text-cyan-800 hover:bg-cyan-950 hover:text-white")}
                >
                  {following ? <Check size={13} /> : <Plus size={13} />}
                </button>
              </span>
            );
          })}
        </div>
      )}
      <p className="px-5 pb-6 text-xs text-slate-400">Etikete tıkladığında o etiketle yapılan paylaşımlar listelenir. <strong>+</strong> ile takip ettiğin etiketlerin paylaşımları ana sayfandaki “Takip ettiklerim” sekmesinde görünür.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Grup oluşturma / düzenleme                                          */
/* ------------------------------------------------------------------ */

export function GroupFormModal({ group, users, groups, currentUserId, onClose, onSave, canManageMods = true }) {
  const editing = Boolean(group);
  const [name, setName] = useState(group ? group.name : "");
  const [description, setDescription] = useState(group ? group.description : "");
  const [emoji, setEmoji] = useState(group ? group.emoji : GROUP_EMOJIS[0]);
  const [cover, setCover] = useState(group ? group.cover : COVER_PRESETS[0]);
  const [rules, setRules] = useState(group && group.rules.length ? group.rules : [""]);
  const ownerId = group ? group.ownerId : currentUserId;
  const [mods, setMods] = useState(group ? group.moderatorIds.filter((id) => id !== ownerId) : []);
  const [modQuery, setModQuery] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    function onKey(event) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const candidates = Object.entries(users)
    .map(([id, user]) => ({ id: /^\d+$/.test(id) ? Number(id) : id, user }))
    .filter(({ id, user }) => id !== ownerId && !mods.includes(id) && (!modQuery.trim() || normalizeTr(user.username).includes(normalizeTr(modQuery.trim()))))
    .slice(0, 5);

  function uploadCover(event) {
    const file = (event.target.files || [])[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setCover(URL.createObjectURL(file));
  }

  function save() {
    const cleanName = name.trim();
    if (cleanName.length < 3) return setError("Grup adı en az 3 karakter olmalı.");
    if (groups.some((item) => item.id !== (group && group.id) && normalizeTr(item.name) === normalizeTr(cleanName))) return setError("Bu adla bir grup zaten var.");
    if (description.trim().length < 10) return setError("Kısa bir açıklama yaz (en az 10 karakter).");
    const cleanRules = rules.map((rule) => rule.trim()).filter(Boolean);
    const moderatorIds = [ownerId, ...mods].filter(Boolean);
    onSave({
      ...(group || {}),
      id: group ? group.id : "g" + Date.now(),
      // Düzenlemede grup adresi değişmez (paylaşılan bağlantılar bozulmasın)
      slug: group ? group.slug : uniqueGroupSlug(cleanName, groups, null),
      name: cleanName,
      description: description.trim(),
      emoji,
      color: group ? group.color : GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)],
      cover,
      rules: cleanRules,
      ownerId,
      moderatorIds,
      memberIds: Array.from(new Set([...(group ? group.memberIds : []), ...moderatorIds])),
      createdAt: group ? group.createdAt : Date.now()
    });
    return undefined;
  }

  const UserTag = ({ id }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 py-1 pl-3 pr-1 text-xs font-black text-cyan-900">
      {users[id].username}
      <button type="button" onClick={() => setMods((prev) => prev.filter((item) => item !== id))} className="rounded-full p-0.5 hover:bg-cyan-100" title="Kaldır"><X size={12} /></button>
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-[5vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-lg font-black">{editing ? "Grubu düzenle" : "Grup oluştur"}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Kapat"><X size={19} /></button>
        </div>

        <div className="relative">
          <Cover group={{ cover }} className="h-32" />
          <button type="button" onClick={() => fileInput.current && fileInput.current.click()} className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-950/60 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-950/80">
            <Camera size={14} /> Kapak yükle
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={uploadCover} />
          <div className="absolute -bottom-7 left-5 z-10"><GroupTile group={{ emoji, color: group ? group.color : "bg-cyan-100" }} /></div>
        </div>

        <div className="grid gap-4 px-5 pb-5 pt-10">
          <div>
            <div className="mb-1 text-xs font-black text-slate-500">Hazır kapaklar</div>
            <div className="flex gap-2">
              {COVER_PRESETS.map((url) => (
                <button key={url} type="button" onClick={() => setCover(url)} className={"h-12 w-20 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-900 to-teal-500 ring-2 " + (cover === url ? "ring-cyan-700" : "ring-transparent")}>
                  <img src={url} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-black text-slate-500">Simge</div>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_EMOJIS.map((item) => (
                <button key={item} type="button" onClick={() => setEmoji(item)} className={"grid h-9 w-9 place-items-center rounded-xl text-lg transition " + (emoji === item ? "bg-cyan-950 ring-2 ring-cyan-950" : "bg-slate-100 hover:bg-slate-200")}>{item}</button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-black text-slate-500">Grup adı <span className="text-slate-400">{name.length}/40</span></span>
            <input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="Örn. Killifish Türkiye" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-700" />
          </label>

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-black text-slate-500">Açıklama <span className="text-slate-400">{description.length}/160</span></span>
            <textarea value={description} maxLength={160} rows={2} onChange={(event) => setDescription(event.target.value)} placeholder="Grup ne hakkında, kimler katılmalı?" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base outline-none focus:border-cyan-700" />
          </label>

          <div>
            <div className="mb-1 flex justify-between text-xs font-black text-slate-500">Grup kuralları <span className="text-slate-400">genel kurallara ek olarak · en fazla {MAX_GROUP_RULES}</span></div>
            <div className="grid gap-2">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-50 text-xs font-black text-cyan-800">{index + 1}</span>
                  <input value={rule} maxLength={140} onChange={(event) => setRules((prev) => prev.map((item, i) => (i === index ? event.target.value : item)))} placeholder="Kural yaz" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-700" />
                  {rules.length > 1 && <button type="button" onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" title="Kaldır"><X size={15} /></button>}
                </div>
              ))}
            </div>
            {rules.length < MAX_GROUP_RULES && <button type="button" onClick={() => setRules((prev) => [...prev, ""])} className="mt-2 text-sm font-black text-cyan-800 hover:underline">+ Kural ekle</button>}
          </div>

          {canManageMods ? (
          <div>
              <div className="mb-1 flex justify-between text-xs font-black text-slate-500">Moderatörler <span className="text-slate-400">kurucu olarak sen otomatik moderatörsün · en fazla {MAX_GROUP_MODS}</span></div>
              {mods.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{mods.map((id) => <UserTag key={id} id={id} />)}</div>}
              {mods.length < MAX_GROUP_MODS && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Search size={14} className="text-slate-400" />
                    <input value={modQuery} onChange={(event) => setModQuery(event.target.value)} placeholder="Kullanıcı adıyla ara" className="w-full bg-transparent text-sm outline-none" />
                  </div>
                  {modQuery.trim() && (
                    <div className="border-t border-slate-200 p-1">
                      {candidates.length ? candidates.map(({ id, user }) => (
                        <button key={id} type="button" onClick={() => { setMods((prev) => [...prev, id]); setModQuery(""); }} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white">
                          <span className="font-black text-slate-800">{user.username} <span className="font-semibold text-slate-400">· {user.city}</span></span>
                          <Plus size={14} className="text-cyan-800" />
                        </button>
                      )) : <p className="px-2 py-1.5 text-xs text-slate-400">Kullanıcı bulunamadı.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Grup moderatörlerini yalnızca kurucu belirler.</p>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">{editing ? "Değişiklikler hemen yayına girer." : "Her üye en fazla 1 grup oluşturabilir."}</p>
            <button onClick={save} className="rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">{editing ? "Kaydet" : "Grubu oluştur"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
