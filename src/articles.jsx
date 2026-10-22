import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronDown, Clock, ExternalLink, Link2, Loader2, Newspaper } from "lucide-react";
import { PageHeader } from "./community.jsx";
import { SpeciesImage } from "./knowledge.jsx";
import { articleBlocks, articleDate, readingMinutes, useArticle } from "./lib/articles";

const PAGE_SIZE = 10;

function speciesOf(kb, article) {
  return (article.speciesSlugs || []).map((slug) => kb.species.find((item) => item.slug === slug)).filter(Boolean);
}

// Makalenin küçük görseli: kapak > ilgili türün görseli > ilgili türün kategori rengi > genel yer tutucu
export function ArticleThumb({ article, kb, className = "" }) {
  const linked = speciesOf(kb, article);
  if (article.cover) {
    return (
      <div className={"relative overflow-hidden bg-slate-100 " + className}>
        <img src={article.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  const withImage = linked.find((item) => item.images && item.images[0]) || linked[0];
  if (withImage) return <SpeciesImage species={withImage} label={false} className={className + " text-[12px]"} />;
  return (
    <div className={"grid place-items-center bg-gradient-to-br from-cyan-700 to-teal-500 text-white " + className}>
      <BookOpen className="h-1/3 w-1/3 opacity-90" />
    </div>
  );
}

/* Makaleler listesi ------------------------------------------------------ */

export function ArticlesPage({ kb }) {
  const [count, setCount] = useState(PAGE_SIZE);
  const list = kb.articles;
  const shown = list.slice(0, count);
  return (
    <div>
      <PageHeader title="Makaleler" subtitle="Tür bakımı, hobi efsaneleri ve deneyimler üzerine okumalar" />
      {!kb.articlesLoaded ? (
        <div className="grid place-items-center p-12 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">Henüz makale yok.</div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100" data-testid="article-list">
            {shown.map((article) => (
              <li key={article.slug}>
                <button onClick={() => kb.openArticle(article)} className="flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:gap-5">
                  <ArticleThumb article={article} kb={kb} className="h-20 w-24 shrink-0 rounded-2xl sm:h-24 sm:w-36" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] font-black leading-snug text-slate-950 sm:text-[17px]">{article.title}</span>
                    <span className="mt-1 hidden text-sm leading-relaxed text-slate-500 sm:line-clamp-2">{article.excerpt}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Clock size={12} /> {articleDate(article.publishedAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {count < list.length && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button onClick={() => setCount((value) => value + PAGE_SIZE)} className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-200" data-testid="articles-more">
                Daha fazla yükle <span className="text-slate-400">({list.length - count})</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Makale detayı ---------------------------------------------------------- */

// Paragraftaki [1] gibi dipnot işaretlerini tıklanabilir üst simgeye çevirir
function Paragraph({ text, onFootnote }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="mb-6">
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <React.Fragment key={index}>{part}</React.Fragment>;
        return (
          <sup key={index} className="ml-0.5">
            <button type="button" onClick={() => onFootnote(match[1])} className="rounded px-0.5 text-[0.7em] font-black text-cyan-700 hover:bg-cyan-50" aria-label={"Dipnot " + match[1]}>
              [{match[1]}]
            </button>
          </sup>
        );
      })}
    </p>
  );
}

function sourceLabel(source) {
  if (source.label && !/^https?:\/\//.test(source.label)) return source.label;
  try {
    return new URL(source.url || source.label).hostname.replace(/^www\./, "");
  } catch {
    return source.label || source.url;
  }
}

export function ArticlePage({ slug, kb, ctx }) {
  const { article, loading } = useArticle(slug);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);
  const meta = kb.articles.find((item) => item.slug === slug);
  const linked = article ? speciesOf(kb, article) : [];
  const blocks = useMemo(() => (article ? articleBlocks(article.body) : []), [article]);
  const others = useMemo(() => kb.articles.filter((item) => item.slug !== slug).slice(0, 3), [kb.articles, slug]);
  const hasArticleAds = ctx.adsFor && (ctx.adsFor("article").length > 0 || ctx.adsFor("species").length > 0);

  useEffect(() => setCopied(false), [slug]);

  function goFootnote(n) {
    const el = rootRef.current && rootRef.current.querySelector("#dipnot-" + n);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-amber-50");
      setTimeout(() => el.classList.remove("bg-amber-50"), 1600);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/makale/" + slug);
      setCopied(true);
    } catch {
      /* pano erişimi yok */
    }
  }

  return (
    <div ref={rootRef}>
      <div className="sticky top-[60px] z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur lg:top-[72px]">
        <button onClick={() => kb.openArticles()} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" title="Makalelere dön"><ArrowLeft size={19} /></button>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-black uppercase tracking-wide text-slate-400">Makaleler</p>
          <h2 className="truncate text-lg font-black leading-tight">{(article || meta || {}).title || "Makale"}</h2>
        </div>
      </div>

      {hasArticleAds && (
        <div className="px-4 pt-4 [&>div]:mb-0" data-testid="article-ad">
          <ctx.RotatingDetailAd placement={ctx.adsFor("article").length > 0 ? "article" : "species"} pageKey={"makale-" + slug} />
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center p-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : !article ? (
        <div className="p-10 text-center">
          <h2 className="text-xl font-black">Makale bulunamadı</h2>
          <button onClick={() => kb.openArticles()} className="mt-5 rounded-full bg-cyan-950 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-900">Makalelere dön</button>
        </div>
      ) : (
        <article className="mx-auto max-w-[720px] px-5 pb-10 pt-6 sm:px-8" data-testid="article-body">
          {article.cover && <img src={article.cover} alt="" className="mb-6 aspect-[16/9] w-full rounded-3xl object-cover" />}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-cyan-800">
            <span className="inline-flex items-center gap-1"><Newspaper size={13} /> Makale</span>
            <span className="text-slate-300">•</span>
            <span className="normal-case tracking-normal text-slate-500">{articleDate(article.publishedAt)}</span>
            <span className="text-slate-300">•</span>
            <span className="normal-case tracking-normal text-slate-500">{readingMinutes(article.body)} dk okuma</span>
          </p>
          <h1 className="mt-3 text-[28px] font-black leading-[1.15] tracking-tight text-slate-950 sm:text-[36px]">{article.title}</h1>

          {linked.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {linked.slice(0, 8).map((item) => (
                <button key={item.slug} onClick={() => kb.openSpecies(item)} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pl-1 pr-2.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-cyan-50">
                  <SpeciesImage species={item} round label={false} className="h-5 w-5 text-[6px]" />
                  {item.name}
                </button>
              ))}
              {linked.length > 8 && <span className="self-center text-xs font-bold text-slate-400">+{linked.length - 8} tür</span>}
            </div>
          )}

          <div className="mt-7 text-[17px] leading-[1.8] text-slate-800 sm:text-[18.5px]">
            {blocks.map((block, index) =>
              block.type === "h" ? (
                <h2 key={index} className="mb-3 mt-10 text-[22px] font-black leading-snug text-slate-950 sm:text-[25px]">{block.text}</h2>
              ) : (
                <Paragraph key={index} text={block.text} onFootnote={goFootnote} />
              )
            )}
          </div>

          {article.footnotes.length > 0 && (
            <section className="mt-10 border-t border-slate-200 pt-6">
              <h2 className="text-base font-black text-slate-950">Dipnotlar</h2>
              <ol className="mt-3 grid gap-2 text-[15px] leading-relaxed text-slate-600">
                {article.footnotes.map((note, index) => (
                  <li key={index} id={"dipnot-" + (index + 1)} className="flex gap-2 rounded-lg px-1 transition-colors">
                    <span className="shrink-0 font-black text-cyan-800">[{index + 1}]</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {article.sources.length > 0 && (
            <section className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-base font-black text-slate-950">İleri okumalar ve kaynaklar</h2>
              <ul className="mt-3 grid gap-2">
                {article.sources.map((source, index) => (
                  <li key={index} className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-relaxed">
                    {source.tag && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-black text-slate-500">{source.tag}</span>}
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-cyan-800 underline-offset-2 hover:underline">
                        {sourceLabel(source)} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="font-bold text-slate-700">{source.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5">
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">
              <Link2 size={15} /> {copied ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}
            </button>
            <button onClick={() => kb.openArticles()} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black text-cyan-800 hover:bg-cyan-50">
              <BookOpen size={15} /> Tüm makaleler
            </button>
          </div>

          {others.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-base font-black text-slate-950">Diğer makaleler</h2>
              <div className="grid gap-1">
                {others.map((item) => (
                  <button key={item.slug} onClick={() => kb.openArticle(item)} className="flex items-center gap-3 rounded-2xl p-2 text-left hover:bg-slate-50">
                    <ArticleThumb article={item} kb={kb} className="h-14 w-20 shrink-0 rounded-xl" />
                    <span className="line-clamp-2 text-sm font-black leading-snug text-slate-800">{item.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>
      )}
    </div>
  );
}

/* Tür sayfasındaki makale butonu ---------------------------------------- */

export function SpeciesArticlesButton({ kb, slug }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const list = kb.articles.filter((item) => item.speciesSlugs.includes(slug));
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => boxRef.current && !boxRef.current.contains(event.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!list.length) return null;
  const cls = "flex items-center gap-1.5 whitespace-nowrap rounded-full bg-cyan-50 px-3 py-2 text-[13px] font-black text-cyan-900 ring-1 ring-cyan-200 transition hover:bg-cyan-100";
  if (list.length === 1) {
    return (
      <button onClick={() => kb.openArticle(list[0])} className={cls} title={list[0].title} data-testid="species-article-btn">
        <BookOpen size={15} /> Makaleyi oku
      </button>
    );
  }
  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => setOpen((value) => !value)} className={cls} data-testid="species-article-btn">
        <BookOpen size={15} /> Makaleler ({list.length}) <ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {list.map((item) => (
            <button key={item.slug} onClick={() => kb.openArticle(item)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold leading-snug text-slate-700 hover:bg-cyan-50">
              {item.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Sağ sütun: son eklenen makaleler -------------------------------------- */

export function RecentArticles({ kb }) {
  const list = kb.articles.slice(0, 5);
  if (!list.length) return null;
  return (
    <section className="rounded-[28px] border border-slate-200 p-4" data-testid="recent-articles">
      <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black text-slate-900"><BookOpen size={15} className="text-cyan-700" /> Son eklenen makaleler</h3>
      <div className="grid">
        {list.map((item) => (
          <button key={item.slug} onClick={() => kb.openArticle(item)} className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-slate-50">
            <ArticleThumb article={item} kb={kb} className="h-10 w-12 shrink-0 rounded-lg" />
            <span className="line-clamp-2 text-[13px] font-black leading-snug text-slate-800">{item.title}</span>
          </button>
        ))}
      </div>
      <button onClick={() => kb.openArticles()} className="mt-1 w-full rounded-xl px-1.5 py-1.5 text-left text-xs font-black text-cyan-800 hover:bg-slate-50">Tüm makaleler →</button>
    </section>
  );
}
