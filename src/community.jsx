import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Link2,
  MapPin,
  MessageCircle,
  Play,
  Share2,
  Trash2,
  UserRound,
  Users,
  Video,
  X
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

const TR_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export function slugifyWords(text, count = 4) {
  const words = (text || "")
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (c) => TR_MAP[c])
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, count);
  return words.length ? words.join("-") : "paylasim";
}

// Detay bağlantısı: rastgele 5 haneli sayı + metnin ilk 4 kelimesi
export function makeSlug(text, number) {
  const n = number ?? 10000 + Math.floor(Math.random() * 90000);
  return n + "-" + slugifyWords(text);
}

export function postUrl(post) {
  return window.location.origin + window.location.pathname + "#/paylasim/" + post.slug;
}

export function timeAgo(ts) {
  const minutes = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return minutes + " dk";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " sa";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + " g";
  return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function fullDate(ts) {
  return new Date(ts).toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function pollTimeLeft(endsAt) {
  const diff = endsAt - Date.now();
  if (diff <= 0) return "Anket sona erdi";
  const hours = Math.ceil(diff / 3600000);
  if (hours < 24) return hours + " saat kaldı";
  return Math.ceil(hours / 24) + " gün kaldı";
}

export function parseYouTubeId(url) {
  const m = (url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const AVATAR_COLORS = ["bg-cyan-950", "bg-teal-700", "bg-sky-700", "bg-indigo-700", "bg-emerald-700", "bg-slate-700", "bg-amber-700"];
function avatarColor(username) {
  let sum = 0;
  for (let i = 0; i < username.length; i += 1) sum += username.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Örnek veri                                                          */
/* ------------------------------------------------------------------ */

const IMG = {
  fish1: "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&w=1200&q=80",
  fish2: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=1200&q=80",
  tank1: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  tank2: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80",
  plant1: "https://images.unsplash.com/photo-1518156677180-95a2893f3499?auto=format&fit=crop&w=1200&q=80",
  plant2: "https://images.unsplash.com/photo-1520301255226-bf5f144451c1?auto=format&fit=crop&w=1200&q=80",
  equip1: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
  food1: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  chem1: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1200&q=80",
  decor1: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  bottle: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1200&q=80",
  culture: "https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=1200&q=80"
};

// Yeni üyeler (App.jsx içindeki users nesnesine 6-10 numaralarıyla eklenir)
export const newMemberUsers = {
  6: { username: "@guppyistanbul", city: "İstanbul", joined: "Ekim 2026", joinedAgo: "2 gün önce", interest: "Guppy", lastSeen: "çevrimiçi", online: true, listingsCount: 0, verified: false, bio: "Guppy ve endler üretimi denemeleri.", socials: { instagram: "", facebook: "", x: "" }, reviewStats: { positive: 0, neutral: 0, negative: 0 }, reviews: [], newMember: true },
  7: { username: "@tanganyikaizmir", city: "İzmir", joined: "Ekim 2026", joinedAgo: "3 gün önce", interest: "Tanganyika", lastSeen: "1 saat önce", online: false, listingsCount: 0, verified: false, bio: "Tanganyika kurulumuna yeni başladım.", socials: { instagram: "", facebook: "", x: "" }, reviewStats: { positive: 0, neutral: 0, negative: 0 }, reviews: [], newMember: true },
  8: { username: "@karidesci_ela", city: "Eskişehir", joined: "Ekim 2026", joinedAgo: "4 gün önce", interest: "Karides", lastSeen: "dün", online: false, listingsCount: 0, verified: true, bio: "Neocaridina renk hatları ve nano tanklar.", socials: { instagram: "@karidesci_ela", facebook: "", x: "" }, reviewStats: { positive: 0, neutral: 0, negative: 0 }, reviews: [], newMember: true },
  9: { username: "@betta_bursa", city: "Bursa", joined: "Ekim 2026", joinedAgo: "5 gün önce", interest: "Betta", lastSeen: "3 saat önce", online: false, listingsCount: 0, verified: false, bio: "Betta ve low-tech nano tanklar.", socials: { instagram: "", facebook: "", x: "" }, reviewStats: { positive: 0, neutral: 0, negative: 0 }, reviews: [], newMember: true },
  10: { username: "@marinejunior", city: "Antalya", joined: "Ekim 2026", joinedAgo: "6 gün önce", interest: "Deniz akv.", lastSeen: "çevrimiçi", online: true, listingsCount: 0, verified: false, bio: "Deniz akvaryumuna ilk adımı atıyorum.", socials: { instagram: "", facebook: "", x: "" }, reviewStats: { positive: 0, neutral: 0, negative: 0 }, reviews: [], newMember: true }
};

// ago: dakika; comments: [kullanıcı no, metin, gönderiden kaç dk sonra]
const seedPosts = [
  {
    userId: 2, ago: 14,
    text: "Bu hafta bitkili tankta CO2'yi ışıktan bir saat önce açıp erken kapattım, yosun baskısı gözle görülür azaldı. Sizde ışık / CO2 zamanlaması nasıl? #bitkilitank",
    comments: [[3, "Ben de aynı düzene geçtim, 2 haftada fark ettim. Işık süresi kaç saat sende?", 6], [5, "Damlalık yerine ölçülü verince daha stabil oluyor, tavsiye ederim.", 9], [1, "Deneyeceğim, sonucu paylaşırsan sevinirim.", 12]]
  },
  {
    userId: 1, ago: 32,
    text: "Brichardi yavruları kayaların arasından çıkmaya başladı. Koloni davranışı beklediğimden çok daha keyifli 🐟 #tanganyika",
    images: [IMG.fish1],
    comments: [[7, "Ne kadar güzel! Kaç çift var kolonide?", 4], [2, "Yavrular için ekstra yemleme yapıyor musun?", 8]]
  },
  {
    userId: 3, ago: 50,
    text: "Nano tankta moss duvarı yaparken en zor kısım ipi gizlemek. Siz hangi yöntemi kullanıyorsunuz? Misina mı, pamuk ip mi?",
    comments: [[5, "Pamuk ip bir süre sonra çözülüyor, misina daha temiz görünüyor.", 5], [9, "Ben cyanoacrylate jel yapıştırıcıyla denedim, sorunsuz oldu.", 14], [6, "Ağ üzerine sarmak da pratik bir çözüm.", 20]]
  },
  {
    userId: 4, ago: 70,
    text: "Dış filtre bakım günü: öncesi, bakım sırası ve sonrası. Medyalar yıkanınca akış farkı çok net. #ekipman",
    images: [IMG.equip1, IMG.bottle, IMG.chem1],
    comments: [[2, "Bakımı hangi sıklıkla yapıyorsun?", 7], [1, "Önceki hali gerçekten çok kirliymiş 😅", 11]]
  },
  {
    userId: 5, ago: 120,
    text: "Low-tech bitkili tankta hangi taban malzemesini tercih edersiniz? #bitkilitank",
    poll: { days: 2, options: [["Normal çakıl", 18], ["Besleyici taban toprağı", 41], ["Kum", 12], ["Karışık düzen", 9]] },
    comments: [[3, "Toprak ilk aylarda zor ama sonrasında bitkiler çok mutlu oluyor.", 15], [8, "Kum bence en rahat bakım, ben ona oy verdim.", 25]]
  },
  {
    userId: 6, ago: 160,
    text: "Merhaba herkese! Guppy üretimine yeni başladım. İlk doğumda 20 yavru çıktı, ayrı tankta büyütmek için hangi yemlerle başlamanızı önerirsiniz?",
    comments: [[3, "Hoş geldin! İlk günler artemia nauplii çok iyi, yoksa toz yem de olur.", 10], [4, "Yavru tankında hafif bir filtre ve bol saklanma alanı koy.", 18], [1, "Aramıza hoş geldin, bu platformda çok bilgili hobici var.", 25]]
  },
  {
    userId: 1, ago: 190,
    text: "Hafta sonu tank bakımı tamam: sifon, kısmi su değişimi ve cam temizliği 🧽",
    images: [IMG.tank1, IMG.tank2, IMG.plant1, IMG.plant2],
    comments: [[2, "Cam çok parlak olmuş, hangi sünger?", 8], [5, "Bitkiler de harika görünüyor 👏", 14], [4, "Su değişimi yüzdesini paylaşır mısın?", 22]]
  },
  {
    userId: 2, ago: 240,
    text: "Yeni aldığım rimless tank sonunda yerine oturdu. Cam kalitesi gerçekten fark yaratıyor.",
    images: [IMG.tank2],
    comments: [[4, "Silikon kenarları temiz mi? İthal olanlarda hep merak ederim.", 12], [3, "Hayırlı olsun! Bitkilendirme planı var mı?", 30]]
  },
  {
    userId: 7, ago: 300,
    text: "Tanganyika kurulumunda ilk hafta pH'ı kaç tutuyorsunuz? Kum ve kaya sonrası 8.2'ye çıktı, ilk günler bekleme önerenler var.",
    comments: [[1, "8.2 gayet normal, balıkları yavaş yavaş ekle yeter.", 9], [4, "Düzenli kısmi su değişimi stabilite sağlar.", 16], [2, "KH değerine de bakmanı öneririm.", 24]]
  },
  {
    userId: 3, ago: 420,
    text: "Bu ayki budama paketi hazır: java fern, anubias ve moss. Takas için mesaj atabilirsiniz! #bitkilitank",
    images: [IMG.plant1, IMG.plant2, IMG.decor1],
    comments: [[5, "Karides takası olur mu? Mesaj attım.", 5], [9, "Anubias için sıra bende 🙋", 11]]
  },
  {
    userId: 5, ago: 540,
    text: "Bucephalandra koleksiyonu güncellemesi: 6 farklı tür bir arada. Kök üstü bağlamaları bu hafta bitirdim, sonuçlar çok iyi. #bitkilitank",
    images: [IMG.plant2, IMG.plant1, IMG.decor1, IMG.tank1, IMG.tank2, IMG.culture],
    comments: [[3, "Koleksiyon harika! Türlerin isimlerini yazabilir misin?", 10], [2, "Fotoğraf serisi çok güzel olmuş.", 20], [8, "Takas listen var mı?", 35]]
  },
  {
    userId: 9, ago: 660,
    text: "Betta için hangi tank hacmini minimum görüyorsunuz? 20 litrelik tankta düşük akımlı iç filtre yeterli mi?",
    comments: [[1, "Bence 20 litre alt sınır, ısıtıcı da şart.", 12], [3, "Düşük akım için sünger filtre en güvenlisi.", 20]]
  },
  {
    userId: 1, ago: 1560,
    text: "Calvus çiftimde yumurta gördüm! Heyecandan üç saattir tanka bakıyorum 😄 Daha önce deneyimi olanlar yavru çıkışına kadar nelere dikkat etmeli?",
    comments: [[7, "Işıkları kısmak ve bölgeyi rahat bırakmak önemli.", 8], [4, "Tebrikler! Çiftin stresini artıracak bakımlardan uzak dur.", 18], [2, "Yavru çıkınca artemia hazır olsun 👌", 40]]
  },
  {
    userId: 4, ago: 1800,
    text: "Filtre sesinden rahatsız olanlara küçük ipucu: pervane ve motor yuvasını silikon yağıyla hafifçe yağlayınca ses neredeyse bitti.",
    comments: [[2, "Gıda onaylı silikon yağı mı kullandın?", 14], [5, "Bunu hiç denememiştim, teşekkürler!", 28]]
  },
  {
    userId: 10, ago: 1740,
    text: "Deniz akvaryumuna ilk adım: 60 litrelik nano ile başlamak mantıklı mı, yoksa direkt daha büyük tank mı almalıyım?",
    comments: [[2, "Başlangıç için 100 litre civarı daha stabil, ama nano da olur.", 20], [4, "Önce sistemin döngüsünü bitirip sabırlı olmak şart.", 35]]
  }
];

export function buildInitialPosts() {
  const now = Date.now();
  const rand = mulberry32(20261020);
  return seedPosts
    .map((p, i) => {
      const createdAt = now - p.ago * 60000;
      return {
        id: "p" + (i + 1),
        slug: makeSlug(p.text, 10000 + Math.floor(rand() * 89999)),
        userId: p.userId,
        text: p.text,
        images: p.images || [],
        video: null,
        poll: p.poll
          ? { options: p.poll.options.map((o, k) => ({ id: "o" + k, text: o[0], votes: o[1] })), votedId: null, endsAt: createdAt + p.poll.days * 86400000 }
          : null,
        likes: 6 + Math.floor(rand() * 140),
        likedByMe: false,
        createdAt,
        comments: p.comments.map((c, k) => ({
          id: "c" + (i + 1) + "-" + k,
          userId: c[0],
          text: c[1],
          createdAt: createdAt + c[2] * 60000,
          likes: Math.floor(rand() * 18),
          likedByMe: false
        }))
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function userIdOf(users, user) {
  const id = Object.keys(users).find((key) => users[key].username === user.username);
  return id ? Number(id) : null;
}

export function postSnippet(post) {
  if (post.text) return post.text;
  if (post.poll) return "📊 Anket";
  if (post.video) return "🎬 Video";
  if (post.images.length) return "📷 " + post.images.length + " fotoğraf";
  return "Paylaşım";
}

/* ------------------------------------------------------------------ */
/* Küçük parçalar                                                      */
/* ------------------------------------------------------------------ */

function Avatar({ user, size = 44, onClick }) {
  return (
    <button
      type="button"
      title={user.username}
      onClick={(event) => {
        event.stopPropagation();
        if (onClick) onClick();
      }}
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      <span className={"grid h-full w-full place-items-center rounded-full text-white " + avatarColor(user.username)}>
        <UserRound size={Math.round(size * 0.5)} />
      </span>
      {user.online && <span title="Çevrimiçi" className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
    </button>
  );
}

function RichText({ text }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return parts.map((part, index) =>
    part.startsWith("#") ? (
      <span key={index} className="font-semibold text-cyan-700">{part}</span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
}

function Lightbox({ images, start = 0, onClose }) {
  const [index, setIndex] = useState(start);
  const count = images.length;

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((v) => (v + 1) % count);
      if (event.key === "ArrowLeft") setIndex((v) => (v - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" title="Kapat">
        <X size={22} />
      </button>
      <img src={images[index]} alt="" onClick={(event) => event.stopPropagation()} className="max-h-[88vh] max-w-full rounded-xl object-contain" />
      {count > 1 && (
        <>
          <button
            onClick={(event) => { event.stopPropagation(); setIndex((index - 1 + count) % count); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            title="Önceki"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); setIndex((index + 1) % count); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            title="Sonraki"
          >
            <ChevronRight size={26} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">{index + 1} / {count}</div>
        </>
      )}
    </div>
  );
}

// Twitter benzeri görsel ızgarası: 1, 2, 3, 4 ve 4+ görsel
function ImageGrid({ images, onOpen }) {
  const count = images.length;
  if (!count) return null;
  const extra = count - 4;

  function cell(index, className) {
    return (
      <button
        key={index}
        type="button"
        onClick={(event) => { event.stopPropagation(); onOpen(index); }}
        className={"relative block overflow-hidden bg-slate-100 " + className}
      >
        <img src={images[index]} alt="" loading="lazy" className="h-full w-full object-cover transition hover:opacity-90" />
        {index === 3 && extra > 0 && (
          <span className="absolute inset-0 grid place-items-center bg-slate-950/55 text-2xl font-black text-white">+{extra}</span>
        )}
      </button>
    );
  }

  let body;
  if (count === 1) {
    body = (
      <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(0); }} className="block w-full bg-slate-100">
        <img src={images[0]} alt="" loading="lazy" className="max-h-[420px] w-full object-cover transition hover:opacity-90" />
      </button>
    );
  } else if (count === 2) {
    body = <div className="grid aspect-video grid-cols-2 gap-0.5">{[0, 1].map((i) => cell(i, "h-full w-full"))}</div>;
  } else if (count === 3) {
    body = (
      <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-0.5">
        {cell(0, "row-span-2 h-full w-full")}
        {cell(1, "h-full w-full")}
        {cell(2, "h-full w-full")}
      </div>
    );
  } else {
    body = <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-0.5">{[0, 1, 2, 3].map((i) => cell(i, "h-full w-full"))}</div>;
  }

  return <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">{body}</div>;
}

function VideoBlock({ video }) {
  const [playing, setPlaying] = useState(false);
  if (!video) return null;

  if (video.kind === "file") {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-black" onClick={(event) => event.stopPropagation()}>
        <video src={video.url} controls preload="metadata" className="max-h-[420px] w-full" />
      </div>
    );
  }

  if (video.ytId) {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-black" onClick={(event) => event.stopPropagation()}>
        {playing ? (
          <iframe
            title="Video"
            src={"https://www.youtube.com/embed/" + video.ytId + "?autoplay=1"}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="relative block aspect-video w-full">
            <img src={"https://img.youtube.com/vi/" + video.ytId + "/hqdefault.jpg"} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-slate-950/25">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-lg"><Play size={26} fill="currentColor" /></span>
            </span>
          </button>
        )}
      </div>
    );
  }

  let host = video.url;
  try { host = new URL(video.url).hostname.replace(/^www\./, ""); } catch (e) { /* yoksay */ }
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-cyan-950 text-white"><Play size={18} fill="currentColor" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-900">Video bağlantısı</span>
        <span className="block truncate text-xs text-slate-500">{host}</span>
      </span>
    </a>
  );
}

function PollBlock({ post, ctx }) {
  const poll = post.poll;
  if (!poll) return null;
  const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const ended = Date.now() > poll.endsAt;
  const showResults = poll.votedId !== null || ended;
  const leader = Math.max(...poll.options.map((option) => option.votes));

  return (
    <div className="mt-3 grid gap-2" onClick={(event) => event.stopPropagation()}>
      {poll.options.map((option) => {
        const percent = total ? Math.round((option.votes / total) * 100) : 0;
        if (!showResults) {
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => (ctx.isMember ? ctx.onVote(post.id, option.id) : ctx.onAuth())}
              className="rounded-full border border-cyan-300 bg-white px-4 py-2 text-left text-sm font-black text-cyan-900 transition hover:bg-cyan-50"
            >
              {option.text}
            </button>
          );
        }
        const isMine = poll.votedId === option.id;
        return (
          <div key={option.id} className="relative overflow-hidden rounded-xl bg-slate-100">
            <div
              className={"absolute inset-y-0 left-0 " + (option.votes === leader ? "bg-cyan-200" : "bg-slate-200")}
              style={{ width: percent + "%" }}
            />
            <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className={"flex items-center gap-1.5 " + (option.votes === leader ? "font-black" : "font-semibold")}>
                {option.text}
                {isMine && <span className="rounded-full bg-cyan-950 px-1.5 py-0.5 text-[10px] font-black text-white">Oyun</span>}
              </span>
              <span className="font-black text-slate-700">%{percent}</span>
            </div>
          </div>
        );
      })}
      <div className="text-xs font-semibold text-slate-500">{total} oy · {pollTimeLeft(poll.endsAt)}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paylaşım kartı                                                      */
/* ------------------------------------------------------------------ */

export function PostCard({ post, ctx, detail = false }) {
  const [lightbox, setLightbox] = useState(null);
  const user = ctx.users[post.userId];
  const UserName = ctx.UserName;
  const isMine = ctx.isMember && post.userId === ctx.currentUserId;
  const gated = (fn) => (event) => {
    event.stopPropagation();
    if (!ctx.isMember) return ctx.onAuth();
    return fn();
  };

  return (
    <article
      onClick={detail ? undefined : () => ctx.onOpenPost(post)}
      className={"flex gap-3 border-b border-slate-200 px-4 " + (detail ? "py-5" : "cursor-pointer py-3.5 transition hover:bg-slate-50/70")}
    >
      <Avatar user={user} onClick={() => ctx.onProfile(user)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <button type="button" onClick={(event) => { event.stopPropagation(); ctx.onProfile(user); }} className="font-black text-slate-900 hover:underline">
            <UserName user={user} />
          </button>
          <span className="text-slate-400">· {timeAgo(post.createdAt)}</span>
          {isMine && (
            <button
              type="button"
              title="Paylaşımı sil"
              onClick={(event) => { event.stopPropagation(); ctx.onDelete(post); }}
              className="ml-auto rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {post.text && (
          <p className={"mt-1 whitespace-pre-wrap break-words leading-relaxed text-slate-900 " + (detail ? "text-[18px]" : "text-[15px]")}>
            <RichText text={post.text} />
          </p>
        )}

        <ImageGrid images={post.images} onOpen={(index) => setLightbox(index)} />
        <VideoBlock video={post.video} />
        <PollBlock post={post} ctx={ctx} />

        {detail && <div className="mt-3 text-sm text-slate-500">{fullDate(post.createdAt)}</div>}

        <div className={"flex items-center justify-between text-slate-500 " + (detail ? "mt-3 border-t border-slate-100 pt-3" : "mt-3 max-w-sm")}>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); ctx.onOpenPost(post); }}
            className="flex items-center gap-1.5 rounded-full text-sm font-semibold hover:text-cyan-700"
            title="Yorumlar"
          >
            <MessageCircle size={18} /> {post.comments.length}
          </button>

          <button
            type="button"
            onClick={gated(() => ctx.onLike(post.id))}
            className={"flex items-center gap-1.5 rounded-full text-sm font-semibold " + (post.likedByMe ? "text-rose-600" : "hover:text-rose-600")}
            title="Beğen"
          >
            <Heart size={18} fill={post.likedByMe ? "currentColor" : "none"} /> {post.likes}
          </button>

          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); ctx.onShare(post); }}
            className="flex items-center gap-1.5 rounded-full text-sm font-semibold hover:text-cyan-700"
            title="Bağlantıyı kopyala"
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>

      {lightbox !== null && <Lightbox images={post.images} start={lightbox} onClose={() => setLightbox(null)} />}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Yeni üyeler kartı                                                   */
/* ------------------------------------------------------------------ */

function NewMembersCard({ members, ctx }) {
  const scroller = useRef(null);
  const [greeted, setGreeted] = useState({});
  const UserName = ctx.UserName;

  function scrollBy(amount) {
    if (scroller.current) scroller.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="border-b border-slate-200 bg-cyan-50/50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-cyan-950"><Users size={17} /> Yeni üyelere merhaba deyin!</h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">Topluluğa yeni katılan hobiciler</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scrollBy(-220)} className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50" title="Geri"><ChevronLeft size={16} /></button>
          <button onClick={() => scrollBy(220)} className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50" title="İleri"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div ref={scroller} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {members.map((member) => {
          const done = Boolean(greeted[member.username]);
          return (
            <div key={member.username} className="flex w-44 shrink-0 snap-start flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
              <Avatar user={member} size={64} onClick={() => ctx.onProfile(member)} />
              <button type="button" onClick={() => ctx.onProfile(member)} className="mt-2 max-w-full truncate text-sm font-black text-slate-900 hover:underline">
                <UserName user={member} />
              </button>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {member.city}</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-400">{member.joinedAgo} katıldı</div>
              <span className="mt-2 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-900">{member.interest}</span>
              <button
                type="button"
                onClick={() => {
                  if (!ctx.isMember) return ctx.onAuth();
                  setGreeted((prev) => ({ ...prev, [member.username]: true }));
                  ctx.onToast(member.username + " kullanıcısına merhaba dedin 👋");
                  return undefined;
                }}
                className={"mt-3 w-full rounded-full px-3 py-2 text-xs font-black " + (done ? "bg-emerald-50 text-emerald-700" : "bg-cyan-950 text-white hover:bg-cyan-900")}
              >
                {done ? "Merhaba dedin ✓" : "Merhaba de 👋"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Paylaşım kutusu (sayfa içi) ve yan menü                             */
/* ------------------------------------------------------------------ */

function ComposerPrompt({ ctx }) {
  const me = ctx.isMember ? ctx.users[ctx.currentUserId] : null;
  return (
    <div className="flex gap-3 border-b border-slate-200 px-4 py-3.5">
      {me ? (
        <Avatar user={me} />
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500"><UserRound size={22} /></span>
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={ctx.onCompose}
          className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left text-[15px] text-slate-400 hover:bg-slate-100"
        >
          {me ? "Akvaryumunda neler oluyor?" : "Paylaşmak için giriş yap"}
        </button>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-cyan-800">
            <button type="button" onClick={ctx.onCompose} title="Anket" className="rounded-full p-2 hover:bg-cyan-50"><BarChart3 size={18} /></button>
            <button type="button" onClick={ctx.onCompose} title="Fotoğraf" className="rounded-full p-2 hover:bg-cyan-50"><ImageIcon size={18} /></button>
            <button type="button" onClick={ctx.onCompose} title="Video" className="rounded-full p-2 hover:bg-cyan-50"><Video size={18} /></button>
          </div>
          <button type="button" onClick={ctx.onCompose} className="rounded-full bg-cyan-950 px-4 py-1.5 text-sm font-black text-white hover:bg-cyan-900">Paylaş</button>
        </div>
      </div>
    </div>
  );
}

export function CommunityAside({ onCompose }) {
  return (
    <aside className="hidden h-fit border-x border-slate-200 bg-white p-4 lg:sticky lg:top-[72px] lg:block lg:h-[calc(100vh-72px)] lg:overflow-auto">
      <h2 className="text-lg font-black text-slate-950">Topluluk</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">Tankını paylaş, soru sor, deneyimlerden öğren. Hobicilerle sohbet burada.</p>
      <button onClick={onCompose} className="mt-4 w-full rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-black text-white hover:bg-cyan-900">İçerik paylaş</button>

      <div className="mt-6 rounded-2xl bg-slate-50 p-3">
        <div className="mb-2 text-sm font-black text-slate-800">Topluluk kuralları</div>
        <ul className="grid gap-1.5 text-xs leading-relaxed text-slate-600">
          <li>• Saygılı ve yapıcı bir dil kullan.</li>
          <li>• Satış / takas için ilan ekle bölümünü kullan.</li>
          <li>• Hastalık ve tedavi konularında deneyimini paylaş, kesin teşhis koyma.</li>
          <li>• Görsellerde başkalarının izni olmadan kişi paylaşma.</li>
        </ul>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Sayfalar                                                            */
/* ------------------------------------------------------------------ */

function PageHeader({ title, subtitle }) {
  return (
    <div className="sticky top-[72px] z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      {subtitle && <p className="text-xs font-semibold text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function CommunityFeed({ posts, members, ctx }) {
  const items = [];
  posts.forEach((post, index) => {
    items.push({ kind: "post", post });
    if ((index + 1) % 3 === 0) {
      const slot = Math.floor(index / 3);
      items.push(slot % 2 === 0 ? { kind: "ad", ad: ctx.adPool[(slot / 2) % ctx.adPool.length], key: "ad-" + slot } : { kind: "members", key: "members-" + slot });
    }
  });
  const FeedAdCard = ctx.FeedAdCard;

  return (
    <div>
      <PageHeader title="Topluluk" subtitle="Hobicilerin paylaşımları" />
      <ComposerPrompt ctx={ctx} />
      {items.map((entry) => {
        if (entry.kind === "ad") return <FeedAdCard key={entry.key} ad={entry.ad} />;
        if (entry.kind === "members") return <NewMembersCard key={entry.key} members={members} ctx={ctx} />;
        return <PostCard key={entry.post.id} post={entry.post} ctx={ctx} />;
      })}
      <div className="p-6 text-center text-sm font-semibold text-slate-400">Şimdilik hepsi bu kadar 🐠</div>
    </div>
  );
}

function CommentItem({ comment, postId, ctx }) {
  const user = ctx.users[comment.userId];
  const UserName = ctx.UserName;
  return (
    <div className="flex gap-3 border-b border-slate-100 px-4 py-3">
      <Avatar user={user} size={36} onClick={() => ctx.onProfile(user)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm">
          <button type="button" onClick={() => ctx.onProfile(user)} className="font-black text-slate-900 hover:underline"><UserName user={user} /></button>
          <span className="text-slate-400">· {timeAgo(comment.createdAt)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">{comment.text}</p>
        <button
          type="button"
          onClick={() => (ctx.isMember ? ctx.onLikeComment(postId, comment.id) : ctx.onAuth())}
          className={"mt-1.5 flex items-center gap-1.5 text-xs font-semibold " + (comment.likedByMe ? "text-rose-600" : "text-slate-500 hover:text-rose-600")}
        >
          <Heart size={15} fill={comment.likedByMe ? "currentColor" : "none"} /> {comment.likes}
        </button>
      </div>
    </div>
  );
}

function ReplyBox({ post, ctx }) {
  const [text, setText] = useState("");
  const me = ctx.isMember ? ctx.users[ctx.currentUserId] : null;

  if (!me) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-600">Yanıt yazmak için giriş yapmalısın.</p>
        <button onClick={ctx.onAuth} className="rounded-full bg-cyan-950 px-4 py-2 text-xs font-black text-white hover:bg-cyan-900">Giriş yap</button>
      </div>
    );
  }

  function submit() {
    const value = text.trim();
    if (!value) return;
    ctx.onReply(post.id, value);
    setText("");
  }

  return (
    <div className="flex gap-3 border-b border-slate-200 px-4 py-3">
      <Avatar user={me} size={36} />
      <div className="min-w-0 flex-1">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit(); }}
          rows={2}
          maxLength={300}
          placeholder="Yanıtını paylaş"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
        <div className="mt-2 flex justify-end">
          <button onClick={submit} disabled={!text.trim()} className="rounded-full bg-cyan-950 px-4 py-1.5 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">Yanıtla</button>
        </div>
      </div>
    </div>
  );
}

export function PostDetailPage({ post, ctx, onBack }) {
  const comments = [...post.comments].sort((a, b) => a.createdAt - b.createdAt);
  return (
    <div>
      <div className="sticky top-[72px] z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur">
        <button onClick={onBack} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Geri"><ArrowLeft size={19} /></button>
        <div>
          <h2 className="text-lg font-black leading-tight">Paylaşım</h2>
          <p className="text-xs font-semibold text-slate-500">{post.comments.length} yanıt · {post.likes} beğeni</p>
        </div>
      </div>
      <PostCard post={post} ctx={ctx} detail />
      <ReplyBox post={post} ctx={ctx} />
      {comments.length === 0 ? (
        <p className="p-6 text-center text-sm font-semibold text-slate-400">Henüz yanıt yok. İlk yanıtı sen yaz!</p>
      ) : (
        comments.map((comment) => <CommentItem key={comment.id} comment={comment} postId={post.id} ctx={ctx} />)
      )}
    </div>
  );
}

export function PostNotFound({ onBack }) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-black">Paylaşım bulunamadı</h2>
      <p className="mt-2 text-sm text-slate-500">Bu paylaşım silinmiş ya da bağlantı hatalı olabilir.</p>
      <button onClick={onBack} className="mt-5 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Topluluğa dön</button>
    </div>
  );
}

export function MyPostsPage({ posts, ctx }) {
  const mine = posts.filter((post) => post.userId === ctx.currentUserId);
  return (
    <div>
      <PageHeader title="Paylaşımlarım" subtitle={mine.length + " paylaşım"} />
      <ComposerPrompt ctx={ctx} />
      {mine.length === 0 ? (
        <p className="p-8 text-center text-sm font-semibold text-slate-400">Henüz bir şey paylaşmadın. İlk paylaşımını yukarıdan yapabilirsin.</p>
      ) : (
        mine.map((post) => <PostCard key={post.id} post={post} ctx={ctx} />)
      )}
    </div>
  );
}

export function UserPostsPage({ user, posts, ctx, onBack, onViewListings }) {
  const userId = userIdOf(ctx.users, user);
  const userPosts = posts.filter((post) => post.userId === userId);
  const likesTotal = userPosts.reduce((sum, post) => sum + post.likes, 0);
  const VerifiedBadge = ctx.VerifiedBadge;

  return (
    <div className="p-4 sm:p-5">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-100">
        <ArrowLeft size={17} /> Topluluğa dön
      </button>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-br from-cyan-950 to-slate-900 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <UserRound size={30} />
                {user.online && <span title="Çevrimiçi" className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">{user.username}</h2>
                  {user.verified && <VerifiedBadge />}
                </div>
                <p className="mt-1 text-sm text-cyan-50/80">{user.city} · {user.joined} üyesi · {user.online ? "Çevrimiçi" : "Son ziyaret: " + user.lastSeen}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/90">{user.bio || "Bu kullanıcı henüz hakkında bilgisi eklememiş."}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onViewListings} className="rounded-full border border-white/30 px-4 py-2 text-sm font-black text-white hover:bg-white/10">İlanlarını gör</button>
              <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-950 hover:bg-cyan-50"><MessageCircle size={16} /> Mesaj gönder</button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">{userPosts.length}</div>
            <div className="text-xs font-black text-slate-500">Paylaşım</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-rose-600">{likesTotal}</div>
            <div className="text-xs font-black text-slate-500">Alınan beğeni</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-2xl font-black text-slate-950">{ctx.listingCountOf(userId)}</div>
            <div className="text-xs font-black text-slate-500">Yayındaki ilan</div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-4">
          <h3 className="text-lg font-black">{user.username} kullanıcısının paylaşımları</h3>
          <p className="mt-1 text-sm text-slate-500">En yeni paylaşımlar üstte listelenir.</p>
        </div>

        {userPosts.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-slate-400">Bu kullanıcı henüz bir şey paylaşmamış.</p>
        ) : (
          userPosts.map((post) => <PostCard key={post.id} post={post} ctx={ctx} />)
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paylaşım oluşturma penceresi                                        */
/* ------------------------------------------------------------------ */

const MAX_TEXT = 500;
const MAX_IMAGES = 10;

function ToolButton({ icon: Icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? label + " (diğer eklerle birlikte kullanılamaz)" : label}
      className={
        "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black transition " +
        (active ? "bg-cyan-100 text-cyan-950" : "text-cyan-800 hover:bg-cyan-50") +
        " disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
      }
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function ComposerModal({ user, userId, onClose, onPublish }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoPanel, setVideoPanel] = useState(false);
  const [videoLink, setVideoLink] = useState("");
  const [pollOn, setPollOn] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDays, setPollDays] = useState(1);
  const [error, setError] = useState("");
  const imageInput = useRef(null);
  const videoInput = useRef(null);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasMedia = images.length > 0 || Boolean(video);
  const filledOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
  const trimmed = text.trim();
  const canPublish = text.length <= MAX_TEXT && (pollOn ? Boolean(trimmed) && filledOptions.length >= 2 : Boolean(trimmed) || hasMedia);

  function addImages(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError("En fazla " + MAX_IMAGES + " fotoğraf ekleyebilirsin.");
    else setError("");
    setImages((prev) => [...prev, ...files.slice(0, room).map((file) => ({ url: URL.createObjectURL(file), name: file.name }))]);
  }

  function removeImage(index) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function addVideoFile(event) {
    const file = (event.target.files || [])[0];
    event.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (probe.duration > 60.5) {
        URL.revokeObjectURL(url);
        const total = Math.round(probe.duration);
        setError("Bu video " + Math.floor(total / 60) + " dk " + (total % 60) + " sn. Doğrudan yüklenen videolar en fazla 1 dakika olabilir; daha uzunsa bağlantı olarak ekleyebilirsin.");
        return;
      }
      setVideo({ kind: "file", url, name: file.name });
      setVideoPanel(false);
      setError("");
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Video dosyası okunamadı. Farklı bir dosya dene.");
    };
    probe.src = url;
  }

  function addVideoLink() {
    const value = videoLink.trim();
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protokol");
    } catch (e) {
      setError("Geçerli bir bağlantı gir (https://...).");
      return;
    }
    setVideo({ kind: "link", url: value, ytId: parseYouTubeId(value) });
    setVideoLink("");
    setVideoPanel(false);
    setError("");
  }

  function removeVideo() {
    if (video && video.kind === "file") URL.revokeObjectURL(video.url);
    setVideo(null);
  }

  function togglePoll() {
    setPollOn((value) => !value);
    setVideoPanel(false);
    setError("");
  }

  function publish() {
    if (!canPublish) return;
    const now = Date.now();
    onPublish({
      id: "u" + now,
      slug: makeSlug(trimmed || "paylasim"),
      userId,
      text: trimmed,
      images: images.map((image) => image.url),
      video,
      poll: pollOn
        ? { options: filledOptions.map((option, index) => ({ id: "o" + index, text: option, votes: 0 })), votedId: null, endsAt: now + pollDays * 86400000 }
        : null,
      likes: 0,
      likedByMe: false,
      comments: [],
      createdAt: now
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Kapat"><X size={19} /></button>
          <span className="text-sm font-black text-slate-500">İçerik paylaş</span>
        </div>

        <div className="flex gap-3 px-4 pb-2">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <textarea
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={pollOn || hasMedia ? 3 : 5}
              placeholder={pollOn ? "Anket sorunu yaz" : "Akvaryumunda neler oluyor?"}
              className="w-full resize-none bg-transparent py-2 text-lg leading-relaxed outline-none placeholder:text-slate-400"
            />

            {images.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={image.url} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white hover:bg-slate-950" title="Kaldır"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {video && (
              <div className="relative mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {video.kind === "file" ? (
                  <video src={video.url} controls className="max-h-60 w-full bg-black" />
                ) : (
                  <div className="flex items-center gap-3 p-3 pr-12">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white"><Play size={18} fill="currentColor" /></span>
                    <div className="min-w-0">
                      <div className="text-sm font-black">{video.ytId ? "YouTube videosu" : "Video bağlantısı"}</div>
                      <div className="truncate text-xs text-slate-500">{video.url}</div>
                    </div>
                  </div>
                )}
                <button onClick={removeVideo} className="absolute right-2 top-2 rounded-full bg-slate-950/70 p-1 text-white hover:bg-slate-950" title="Kaldır"><X size={14} /></button>
              </div>
            )}

            {pollOn && (
              <div className="mb-3 rounded-2xl border border-slate-200 p-3">
                <div className="grid gap-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={option}
                        maxLength={40}
                        onChange={(event) => setPollOptions((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))}
                        placeholder={"Seçenek " + (index + 1)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                      />
                      {index >= 2 && (
                        <button onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== index))} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" title="Seçeneği kaldır"><X size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {pollOptions.length < 4 ? (
                    <button onClick={() => setPollOptions((prev) => [...prev, ""])} className="text-sm font-black text-cyan-800 hover:underline">+ Seçenek ekle</button>
                  ) : <span />}
                  <label className="flex items-center gap-2 text-xs font-black text-slate-500">
                    Süre
                    <select value={pollDays} onChange={(event) => setPollDays(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-700">
                      <option value={1}>1 gün</option>
                      <option value={3}>3 gün</option>
                      <option value={7}>7 gün</option>
                    </select>
                  </label>
                </div>
                <button onClick={togglePoll} className="mt-3 w-full rounded-xl border border-red-100 py-1.5 text-xs font-black text-red-600 hover:bg-red-50">Anketi kaldır</button>
              </div>
            )}

            {videoPanel && (
              <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <button onClick={() => videoInput.current && videoInput.current.click()} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left text-sm font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
                  <span className="flex items-center gap-2"><Video size={16} /> Videoyu yükle</span>
                  <span className="text-xs font-semibold text-slate-500">en fazla 1 dk</span>
                </button>
                <div className="my-2 text-center text-xs font-black text-slate-400">veya</div>
                <div className="flex gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-slate-200">
                    <Link2 size={15} className="text-slate-400" />
                    <input
                      value={videoLink}
                      onChange={(event) => setVideoLink(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") addVideoLink(); }}
                      placeholder="YouTube veya video bağlantısı"
                      className="w-full bg-transparent py-2 text-sm outline-none"
                    />
                  </div>
                  <button onClick={addVideoLink} disabled={!videoLink.trim()} className="rounded-xl bg-cyan-950 px-4 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">Ekle</button>
                </div>
              </div>
            )}

            {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
          </div>
        </div>

        <input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
        <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={addVideoFile} />

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5">
          <div className="flex items-center">
            <ToolButton icon={BarChart3} label="Anket ekle" onClick={togglePoll} disabled={hasMedia} active={pollOn} />
            <ToolButton icon={ImageIcon} label="Foto ekle" onClick={() => imageInput.current && imageInput.current.click()} disabled={Boolean(video) || pollOn || images.length >= MAX_IMAGES} />
            <ToolButton icon={Video} label="Video ekle" onClick={() => setVideoPanel((value) => !value)} disabled={images.length > 0 || pollOn || Boolean(video)} active={videoPanel} />
          </div>
          <div className="flex items-center gap-3">
            <span className={"text-xs font-black " + (text.length > MAX_TEXT - 40 ? "text-red-600" : "text-slate-400")}>{text.length}/{MAX_TEXT}</span>
            <button onClick={publish} disabled={!canPublish} className="rounded-full bg-cyan-950 px-5 py-2 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">Paylaş</button>
          </div>
        </div>
      </div>
    </div>
  );
}
