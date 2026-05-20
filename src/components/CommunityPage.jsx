import { useMemo, useState } from "react";

const communityTags = [
  { key: "genel", label: "#genel" },
  { key: "hastalik", label: "#hastalık" },
  { key: "uretim", label: "#üretim" },
  { key: "bitkili", label: "#bitkili" },
  { key: "tanganyika", label: "#tanganyika" },
  { key: "ekipman", label: "#ekipman" },
];

const demoCommunityPosts = [
  {
    id: 1,
    user: "@brichardici",
    name: "Tanganyika Günlüğü",
    city: "Gaziantep",
    time: "12 dk önce",
    tag: "uretim",
    title: "Brichardi yavruları artık kayaların arasından çıkmaya başladı",
    text:
      "Koloni davranışı beklediğimden daha keyifliymiş. Büyükler yavrulara ciddi ciddi alan açıyor gibi. Sizce bu aşamada ekstra yemlemeyi artırmalı mıyım?",
    image:
      "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=1200&q=80",
    likes: 18,
    replies: 7,
  },
  {
    id: 2,
    user: "@bitkilidunya",
    name: "Bitkili Akvaryum",
    city: "İstanbul",
    time: "28 dk önce",
    tag: "bitkili",
    title: "Cryptocoryne yaprak erimesi normal mi?",
    text:
      "Yeni kurulumda birkaç crypt yaprağı şeffaflaşıp erimeye başladı. Kökler sağlam görünüyor. Beklemeli miyim yoksa budamak daha mı doğru olur?",
    image: null,
    likes: 9,
    replies: 11,
  },
  {
    id: 3,
    user: "@discusnotlari",
    name: "Discus Notları",
    city: "Ankara",
    time: "45 dk önce",
    tag: "hastalik",
    title: "Discus iştahsız ama dışkı normal görünüyor",
    text:
      "Isı 29 derece, pH 6.7 civarı. Renk kararması yok ama yem almıyor. Karantina mı düşünmeliyim yoksa birkaç gün gözlem yeterli mi?",
    image: null,
    likes: 6,
    replies: 14,
  },
  {
    id: 4,
    user: "@nanotank",
    name: "Nano Tank",
    city: "İzmir",
    time: "1 sa önce",
    tag: "ekipman",
    title: "Küçük tankta dış filtre mi pipo filtre mi?",
    text:
      "40 litrelik yavru büyütme tankı için dış filtre fazla mı olur? Pipo filtre daha güvenli gibi geliyor ama görüntü olarak biraz kaba duruyor.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    likes: 12,
    replies: 9,
  },
  {
    id: 5,
    user: "@apistocu",
    name: "Cüce Ciklet Merakı",
    city: "Bursa",
    time: "2 sa önce",
    tag: "uretim",
    title: "Apistogramma çiftleri için bölmeli tank mantıklı mı?",
    text:
      "160 cm tankı bölerek birkaç çift denemek istiyorum. Görsel temas stresi artırır mı, yoksa bitki ve kökle perdelemek yeterli olur mu?",
    image: null,
    likes: 21,
    replies: 16,
  },
  {
    id: 6,
    user: "@channasever",
    name: "Channa Güncesi",
    city: "Sakarya",
    time: "3 sa önce",
    tag: "genel",
    title: "Channa andrao için yaz sıcakları nasıl yönetilir?",
    text:
      "Kışın sorun yok ama yazın oda ısısı yükseliyor. Fan kullanan var mı? Su üstü bitkisi ve kapak dengesi nasıl olmalı?",
    image:
      "https://images.unsplash.com/photo-1534043464124-3be32fe000c9?auto=format&fit=crop&w=1200&q=80",
    likes: 15,
    replies: 10,
  },
  {
    id: 7,
    user: "@akvaryumcuabi",
    name: "Akvaryumcu Abi",
    city: "Antalya",
    time: "4 sa önce",
    tag: "ekipman",
    title: "İkinci el CO2 tüp alırken nelere bakıyorsunuz?",
    text:
      "Regülatör, manometre, kaçak kontrolü ve tüp tarihi dışında özellikle dikkat ettiğiniz bir şey var mı?",
    image: null,
    likes: 8,
    replies: 6,
  },
  {
    id: 8,
    user: "@tanganyikaTR",
    name: "Tanganyika TR",
    city: "Konya",
    time: "5 sa önce",
    tag: "tanganyika",
    title: "Kabukçul türler için kum kalınlığı",
    text:
      "Multifasciatus benzeri türlerde çok derin kum şart mı? Yoksa kabuk çevresinde 3-4 cm yeterli olur mu?",
    image:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80",
    likes: 17,
    replies: 13,
  },
];

function CommunitySidebar({ activeTag, setActiveTag, search, setSearch }) {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:block">
      <div className="sticky top-24 space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-950">Topluluk</h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
            Soru sor, tankını paylaş, deneyimlerden öğren.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-black text-slate-500">Ara</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Soru, tür, ekipman ara..."
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-cyan-900"
          />
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTag("all")}
            className={
              "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition " +
              (activeTag === "all"
                ? "bg-cyan-950 text-white"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100")
            }
          >
            <span>Keşfet</span>
            <span>›</span>
          </button>

          {communityTags.map((tag) => (
            <button
              key={tag.key}
              onClick={() => setActiveTag(tag.key)}
              className={
                "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black transition " +
                (activeTag === tag.key
                  ? "bg-cyan-950 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100")
              }
            >
              <span>{tag.label}</span>
              <span>›</span>
            </button>
          ))}
        </nav>

        <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-4">
          <h3 className="text-sm font-black text-cyan-950">Topluluk notu</h3>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-cyan-900">
            Satış ilanları yerine soru, deneyim, bakım notu ve tank paylaşımı
            yapman daha iyi olur. Alım-satım için ilan bölümü kullanılmalı.
          </p>
        </div>
      </div>
    </aside>
  );
}

function Composer({ isMember, currentUser, onAuth, onAddPost }) {
  const [text, setText] = useState("");
  const [selectedTag, setSelectedTag] = useState("genel");
  const [hasImage, setHasImage] = useState(false);

  function handleShare() {
    if (!isMember) {
      onAuth?.();
      return;
    }

    const cleanedText = text.trim();

    if (!cleanedText) return;

    onAddPost({
      id: Date.now(),
      user: currentUser?.username || "@hobici",
      name: currentUser?.name || "Hobiciden Hobiciye Üyesi",
      city: currentUser?.city || "Türkiye",
      time: "şimdi",
      tag: selectedTag,
      title: cleanedText.length > 70 ? cleanedText.slice(0, 70) + "..." : cleanedText,
      text: cleanedText,
      image: hasImage
        ? "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80"
        : null,
      likes: 0,
      replies: 0,
    });

    setText("");
    setHasImage(false);
    setSelectedTag("genel");
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-950 text-sm font-black text-white">
          {isMember ? "HH" : "?"}
        </div>

        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              isMember
                ? "Topluluğa bir soru sor ya da tankından bir not paylaş..."
                : "Paylaşım yapmak için giriş yapmalısın..."
            }
            className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700 outline-none focus:border-cyan-900"
          />

          {hasImage ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80"
                alt="Önizleme"
                className="h-44 w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setHasImage((value) => !value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Görsel ekle
              </button>

              <select
                value={selectedTag}
                onChange={(event) => setSelectedTag(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 outline-none"
              >
                {communityTags.map((tag) => (
                  <option key={tag.key} value={tag.key}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleShare}
              className="rounded-full bg-cyan-950 px-5 py-2.5 text-xs font-black text-white hover:bg-cyan-900"
            >
              Paylaş
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunityPostCard({ post }) {
  const tagLabel =
    communityTags.find((tag) => tag.key === post.tag)?.label || "#genel";

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
          {post.user?.slice(1, 3).toUpperCase() || "HH"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm font-black text-slate-950">
              {post.user}
            </strong>
            <span className="text-xs font-bold text-slate-400">·</span>
            <span className="text-xs font-bold text-slate-500">{post.city}</span>
            <span className="text-xs font-bold text-slate-400">·</span>
            <span className="text-xs font-bold text-slate-500">{post.time}</span>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-900">
              {tagLabel}
            </span>
          </div>

          <h3 className="mt-2 text-lg font-black leading-snug text-slate-950">
            {post.title}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            {post.text}
          </p>

          {post.image ? (
            <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-slate-200">
              <img
                src={post.image}
                alt={post.title}
                className="max-h-[360px] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            <button className="rounded-full bg-slate-50 px-4 py-2 hover:bg-slate-100">
              Yanıtla · {post.replies}
            </button>
            <button className="rounded-full bg-slate-50 px-4 py-2 hover:bg-slate-100">
              Faydalı · {post.likes}
            </button>
            <button className="rounded-full bg-slate-50 px-4 py-2 hover:bg-slate-100">
              Kaydet
            </button>
            <button className="ml-auto rounded-full bg-red-50 px-4 py-2 text-red-600 hover:bg-red-100">
              Bildir
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CommunityPage({ isMember, currentUser, onAuth }) {
  const [activeTag, setActiveTag] = useState("all");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState(demoCommunityPosts);

  const filteredPosts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return posts.filter((post) => {
      const tagMatch = activeTag === "all" || post.tag === activeTag;

      const searchMatch =
        !searchValue ||
        post.title.toLowerCase().includes(searchValue) ||
        post.text.toLowerCase().includes(searchValue) ||
        post.user.toLowerCase().includes(searchValue);

      return tagMatch && searchMatch;
    });
  }, [posts, activeTag, search]);

  function handleAddPost(newPost) {
    setPosts((currentPosts) => [newPost, ...currentPosts]);
  }

  return (
    <div className="mx-auto flex max-w-[1180px] border-x border-slate-200 bg-white">
      <CommunitySidebar
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        search={search}
        setSearch={setSearch}
      />

      <main className="min-w-0 flex-1 bg-slate-50/60 px-4 py-5 sm:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-slate-950">Topluluk</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Akvaryum hobisine dair sorular, deneyimler, tank günlükleri ve küçük
            notlar.
          </p>
        </div>

        <div className="mb-4 block lg:hidden">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Toplulukta ara..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-cyan-900"
          />

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTag("all")}
              className={
                "shrink-0 rounded-full px-4 py-2 text-xs font-black " +
                (activeTag === "all"
                  ? "bg-cyan-950 text-white"
                  : "bg-white text-slate-600")
              }
            >
              Keşfet
            </button>

            {communityTags.map((tag) => (
              <button
                key={tag.key}
                onClick={() => setActiveTag(tag.key)}
                className={
                  "shrink-0 rounded-full px-4 py-2 text-xs font-black " +
                  (activeTag === tag.key
                    ? "bg-cyan-950 text-white"
                    : "bg-white text-slate-600")
                }
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Composer
            isMember={isMember}
            currentUser={currentUser}
            onAuth={onAuth}
            onAddPost={handleAddPost}
          />

          {filteredPosts.map((post) => (
            <CommunityPostCard key={post.id} post={post} />
          ))}

          {filteredPosts.length === 0 ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center">
              <h3 className="text-lg font-black text-slate-950">
                Sonuç bulunamadı
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Aramayı temizleyebilir ya da başka bir kategori seçebilirsin.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
