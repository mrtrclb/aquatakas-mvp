// Derleme sonrası: arama motorları ve sosyal medya önizlemeleri için sayfaları hazır HTML olarak üretir.
// Her sayfa uygulamanın kendisini de yükler; JavaScript açıldığında normal uygulama devralır.
//   dist/tur/<ad>.html, dist/bilgi/k/<kategori>.html, dist/ilan/<no>.html, dist/grup/<ad>.html, ...
//   dist/404.html (diğer adresler için uygulama kabuğu), dist/sitemap.xml
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITE = "https://aquagram.com.tr";
const OG_DEFAULT = SITE + "/og-image.png";

const supabaseSrc = readFileSync(join(ROOT, "src/lib/supabase.js"), "utf8");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || (supabaseSrc.match(/"(https:\/\/[a-z0-9]+\.supabase\.co)"/) || [])[1];
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || (supabaseSrc.match(/"(sb_publishable_[^"]+)"/) || [])[1];

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const clip = (text, n) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : clean;
};
const today = new Date().toISOString().slice(0, 10);

async function rest(path) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase ayarı yok");
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(path + " → " + res.status);
  return res.json();
}

async function loadData() {
  const local = await import(join(ROOT, "src/species.js"));
  const categories = local.KB_CATEGORIES;
  const sections = local.KB_SECTIONS;
  try {
    const [species, listings, groups] = await Promise.all([
      rest("species?select=slug,name,latin,category_id,kind,difficulty,temperament,description,facts,image_url,images,updated_at&status=eq.published&order=name"),
      rest("listings?select=id,title,description,price,type,city,district,images,updated_at,user_id,owner:profiles!listings_user_id_fkey(username,hide_from_search)&status=eq.active&order=updated_at.desc&limit=2000"),
      rest("groups?select=slug,name,description,cover_url,member_count,created_at&is_closed=eq.false&order=member_count.desc")
    ]);
    console.log("Prerender: veritabanından " + species.length + " tür, " + listings.length + " ilan, " + groups.length + " grup alındı.");
    return {
      categories,
      sections,
      species: species.map((row) => ({ ...row, category: row.category_id, images: (row.images && row.images.length ? row.images : row.image_url ? [row.image_url] : []) })),
      listings: listings.filter((row) => !(row.owner && row.owner.hide_from_search)),
      groups
    };
  } catch (error) {
    console.warn("Prerender: veritabanına ulaşılamadı (" + error.message + "); koddaki tür verisi kullanılıyor, ilan ve gruplar atlanıyor.");
    return {
      categories,
      sections,
      species: local.SPECIES.map((sp) => ({ ...sp, description: sp.desc, images: [] })),
      listings: [],
      groups: []
    };
  }
}

const template = readFileSync(join(DIST, "index.html"), "utf8");

function page({ path, title, description, image = OG_DEFAULT, type = "website", jsonld = [], body = "" }) {
  const url = SITE + (path === "/" ? "/" : path);
  let html = template;
  const set = (re, value) => {
    html = html.replace(re, value);
  };
  set(/<title>[^<]*<\/title>/, "<title>" + esc(title) + "</title>");
  set(/<meta name="description" content="[^"]*" \/>/, '<meta name="description" content="' + esc(description) + '" />');
  set(/<link rel="canonical" href="[^"]*" \/>/, '<link rel="canonical" href="' + url + '" />');
  set(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="' + type + '" />');
  set(/<meta property="og:url" content="[^"]*" \/>/, '<meta property="og:url" content="' + url + '" />');
  set(/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="' + esc(title) + '" />');
  set(/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="' + esc(description) + '" />');
  set(/<meta property="og:image" content="[^"]*" \/>/, '<meta property="og:image" content="' + esc(image) + '" />');
  set(/<meta name="twitter:title" content="[^"]*" \/>/, '<meta name="twitter:title" content="' + esc(title) + '" />');
  set(/<meta name="twitter:description" content="[^"]*" \/>/, '<meta name="twitter:description" content="' + esc(description) + '" />');
  set(/<meta name="twitter:image" content="[^"]*" \/>/, '<meta name="twitter:image" content="' + esc(image) + '" />');
  if (image !== OG_DEFAULT) {
    html = html.replace(/\s*<meta property="og:image:width" content="1200" \/>\s*<meta property="og:image:height" content="630" \/>/, "");
  }
  if (jsonld.length) {
    html = html.replace("</head>", jsonld.map((item) => '<script type="application/ld+json">' + JSON.stringify(item).replace(/</g, "\\u003c") + "</script>").join("\n") + "\n  </head>");
  }
  if (body) {
    const nav =
      '<nav aria-label="Site"><a href="/">Aquagram</a> · <a href="/ilanlar">İlanlar</a> · <a href="/topluluk">Topluluk</a> · <a href="/bilgi">Bilgi Bankası</a></nav>';
    html = html.replace('<div id="root"></div>', '<div id="root"><div style="max-width:760px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.6">' + nav + body + "</div></div>");
  }
  return html;
}

function write(path, html) {
  const file = path === "/" ? join(DIST, "index.html") : join(DIST, path.replace(/^\//, "") + ".html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  // Aynı adla klasörü de olan sayfalar (ör. /bilgi ve /bilgi/k/...) için klasör içi kopya:
  // GitHub Pages /bilgi isteğini /bilgi/ klasörüne yönlendirirse de hazır sayfa bulunur
  if (path === "/bilgi") {
    mkdirSync(join(DIST, "bilgi"), { recursive: true });
    writeFileSync(join(DIST, "bilgi", "index.html"), html);
  }
}

function breadcrumb(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: SITE + path }))
  };
}

const TYPE_LABELS = { sale: "Satılık", trade: "Takas", free: "Ücretsiz / sahiplendirme", wanted: "Aranıyor" };
const price = (row) => (row.type === "free" ? "Ücretsiz" : row.type === "wanted" ? "Aranıyor" : row.type === "trade" ? "Takas" : row.price ? Number(row.price).toLocaleString("tr-TR") + " TL" : "Teklif ver");

async function main() {
  if (!existsSync(join(DIST, "index.html"))) throw new Error("Önce vite build çalıştırılmalı");
  writeFileSync(join(DIST, "404.html"), template.replace("<head>", '<head>\n    <meta name="robots" content="noindex" />'));
  const data = await loadData();
  const urls = [];
  const add = (path, html, lastmod = today, priority = "0.6") => {
    write(path, html);
    urls.push({ path, lastmod, priority });
  };
  const catById = Object.fromEntries(data.categories.map((cat) => [cat.id, cat]));

  // Ana bölümler
  add("/ilanlar", page({ path: "/ilanlar", title: "Akvaryum ilanları: canlı, bitki, ekipman — Aquagram", description: "Akvaryum balığı, karides, bitki, akvaryum ve ekipman ilanları. Hobicilerden satılık, takas ve sahiplendirme ilanları." }), today, "0.9");
  add("/topluluk", page({ path: "/topluluk", title: "Akvaryum topluluğu: soru-cevap ve paylaşımlar — Aquagram", description: "Akvaryum hobicilerinin soruları, deneyimleri ve tank paylaşımları. Gruplara katıl, sorunu sor." }), today, "0.8");
  add("/gruplar", page({ path: "/gruplar", title: "Akvaryum grupları — Aquagram Topluluk", description: "Malawi, Tanganyika, nano tank, bitkili akvaryum, deniz akvaryumu ve daha fazla konuda hobici grupları." }), today, "0.6");

  // Bilgi Bankası
  const kbBody =
    "<h1>Akvaryum Bilgi Bankası</h1><p>" + data.species.length + " türün bakım künyesi ve hobici deneyimleri.</p>" +
    data.sections.map((section) => "<h2>" + esc(section.name) + "</h2><ul>" + data.categories.filter((cat) => cat.section === section.id).map((cat) => '<li><a href="/bilgi/k/' + cat.id + '">' + esc(cat.name) + "</a></li>").join("") + "</ul>").join("");
  add("/bilgi", page({ path: "/bilgi", title: "Akvaryum Bilgi Bankası: tür bakım rehberi — Aquagram", description: "Akvaryum balıkları, karidesler, mercanlar ve bitkiler için bakım künyesi: sıcaklık, pH, tank hacmi, huy ve hobici deneyimleri.", body: kbBody }), today, "0.9");

  for (const cat of data.categories) {
    const list = data.species.filter((sp) => sp.category === cat.id);
    if (!list.length) continue;
    const body = "<h1>" + esc(cat.name) + "</h1><ul>" + list.map((sp) => '<li><a href="/tur/' + sp.slug + '">' + esc(sp.name) + "</a> <i>" + esc(sp.latin) + "</i></li>").join("") + "</ul>";
    add(
      "/bilgi/k/" + cat.id,
      page({
        path: "/bilgi/k/" + cat.id,
        title: cat.name + ": türler ve bakım bilgileri — Aquagram Bilgi Bankası",
        description: cat.name + " kategorisindeki " + list.length + " türün bakım künyesi: " + clip(list.map((sp) => sp.name).join(", "), 120),
        body,
        jsonld: [breadcrumb([["Bilgi Bankası", "/bilgi"], [cat.name, "/bilgi/k/" + cat.id]])]
      }),
      today,
      "0.7"
    );
  }

  for (const sp of data.species) {
    const cat = catById[sp.category] || { name: "Bilgi Bankası", id: "" };
    const facts = (sp.facts || []).filter((pair) => Array.isArray(pair) && pair[0] && pair[1]);
    const title = sp.name + (sp.latin ? " (" + sp.latin + ")" : "") + " bakımı ve künyesi — Aquagram";
    const description = clip((sp.description || "") + " " + facts.slice(0, 4).map(([label, value]) => label + ": " + value).join(", "), 158);
    const body =
      "<h1>" + esc(sp.name) + "</h1>" + (sp.latin ? "<p><i>" + esc(sp.latin) + "</i></p>" : "") +
      "<p>" + esc(sp.description) + "</p>" +
      (facts.length ? "<h2>Bakım künyesi</h2><dl>" + facts.map(([label, value]) => "<dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd>").join("") + "</dl>" : "") +
      '<p><a href="/bilgi/k/' + cat.id + '">' + esc(cat.name) + "</a></p>";
    add(
      "/tur/" + sp.slug,
      page({
        path: "/tur/" + sp.slug,
        title,
        description,
        type: "article",
        image: sp.images && sp.images[0] ? sp.images[0] : OG_DEFAULT,
        body,
        jsonld: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: sp.name + " bakımı",
            description,
            inLanguage: "tr-TR",
            image: sp.images && sp.images.length ? sp.images : [OG_DEFAULT],
            about: { "@type": "Taxon", name: sp.latin || sp.name, alternateName: sp.name },
            publisher: { "@type": "Organization", name: "Aquagram", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" } },
            mainEntityOfPage: SITE + "/tur/" + sp.slug,
            ...(sp.updated_at ? { dateModified: sp.updated_at } : {})
          },
          breadcrumb([["Bilgi Bankası", "/bilgi"], [cat.name, "/bilgi/k/" + cat.id], [sp.name, "/tur/" + sp.slug]])
        ]
      }),
      (sp.updated_at || today).slice(0, 10),
      "0.8"
    );
  }

  // İlanlar
  for (const row of data.listings) {
    const place = [row.city, row.district].filter(Boolean).join(" / ");
    const title = row.title + " — " + price(row) + (row.city ? " · " + row.city : "") + " | Aquagram";
    const description = clip(TYPE_LABELS[row.type] + " ilan" + (place ? ", " + place : "") + ". " + (row.description || ""), 158);
    const image = row.images && row.images[0] ? row.images[0] : OG_DEFAULT;
    const body =
      "<h1>" + esc(row.title) + "</h1><p><strong>" + esc(price(row)) + "</strong> · " + esc(TYPE_LABELS[row.type] || "") + (place ? " · " + esc(place) : "") + "</p><p>" + esc(row.description) + "</p>" +
      (row.owner ? "<p>İlan veren: @" + esc(row.owner.username) + "</p>" : "");
    const jsonld = [breadcrumb([["İlanlar", "/ilanlar"], [row.title, "/ilan/" + row.id]])];
    if (row.type === "sale" && Number(row.price) > 0) {
      jsonld.push({
        "@context": "https://schema.org",
        "@type": "Product",
        name: row.title,
        description: clip(row.description, 500),
        image: row.images && row.images.length ? row.images.slice(0, 5) : undefined,
        offers: {
          "@type": "Offer",
          price: Number(row.price),
          priceCurrency: "TRY",
          availability: "https://schema.org/InStock",
          url: SITE + "/ilan/" + row.id,
          ...(row.owner ? { seller: { "@type": "Person", name: "@" + row.owner.username } } : {})
        }
      });
    }
    add("/ilan/" + row.id, page({ path: "/ilan/" + row.id, title, description, image, body, jsonld }), (row.updated_at || today).slice(0, 10), "0.6");
  }

  // Gruplar
  for (const group of data.groups) {
    const body = "<h1>" + esc(group.name) + "</h1><p>" + esc(group.description) + "</p><p>" + (group.member_count || 0) + " üye</p>";
    add(
      "/grup/" + group.slug,
      page({ path: "/grup/" + group.slug, title: group.name + " grubu — Aquagram Topluluk", description: clip(group.description || group.name + " grubu", 158), image: group.cover_url || OG_DEFAULT, body }),
      today,
      "0.5"
    );
  }

  // Site haritası
  const all = [{ path: "/", lastmod: today, priority: "1.0" }, ...urls];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    all.map((u) => "  <url><loc>" + SITE + (u.path === "/" ? "/" : u.path) + "</loc><lastmod>" + u.lastmod + "</lastmod><priority>" + u.priority + "</priority></url>").join("\n") +
    "\n</urlset>\n";
  writeFileSync(join(DIST, "sitemap.xml"), xml);
  console.log("Prerender: " + urls.length + " sayfa üretildi, sitemap.xml " + all.length + " adres.");
}

main().catch((error) => {
  console.error("Prerender başarısız:", error);
  process.exit(1);
});
