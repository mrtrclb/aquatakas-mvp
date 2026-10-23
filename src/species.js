// Bilgi Bankası — tür rehberi örnek verisi.
// Değerler hobide yaygın kabul gören aralıklardır; yayına almadan önce bir uzman gözüyle kontrol edilmelidir.

export const KB_SECTIONS = [
  { id: "tatlisu", name: "Tatlı Su Balıkları", emoji: "🐠" },
  { id: "omurgasiz", name: "Omurgasızlar", emoji: "🦐" },
  { id: "deniz", name: "Deniz Canlıları", emoji: "🪸" },
  { id: "bitki", name: "Bitkiler", emoji: "🌿" }
];

export const KB_CATEGORIES = [
  // Korunan kategori: içerik öncelikli sayfa; beslenen/ilan bağlantısı yok, yalnızca favori
  { id: "turkiye", section: "tatlisu", name: "Türkiye'nin Tatlı Su Balıkları", emoji: "🇹🇷", tone: "from-red-300 to-cyan-800", protected: true },
  { id: "malawi", section: "tatlisu", name: "Malawi Cichlidleri", emoji: "🐟", tone: "from-amber-300 to-orange-500" },
  { id: "tanganyika", section: "tatlisu", name: "Tanganyika Cichlidleri", emoji: "🪨", tone: "from-stone-300 to-amber-600" },
  { id: "guney-amerika", section: "tatlisu", name: "Güney Amerika Cichlidleri", emoji: "🍂", tone: "from-orange-300 to-red-600" },
  { id: "orta-amerika", section: "tatlisu", name: "Orta Amerika Cichlidleri", emoji: "🌋", tone: "from-yellow-300 to-rose-600" },
  { id: "afrika-nehir", section: "tatlisu", name: "Afrika Nehir Cichlidleri", emoji: "🌴", tone: "from-lime-300 to-orange-600" },
  { id: "canli-doguranlar", section: "tatlisu", name: "Canlı Doğuranlar", emoji: "🐡", tone: "from-rose-300 to-red-500" },
  { id: "labirentliler", section: "tatlisu", name: "Labirentliler", emoji: "🫧", tone: "from-red-400 to-fuchsia-700" },
  { id: "characiformlar", section: "tatlisu", name: "Characiformlar (Tetralar)", emoji: "✨", tone: "from-cyan-300 to-blue-700" },
  { id: "danio-rasboralar", section: "tatlisu", name: "Danio & Rasboralar", emoji: "⚡", tone: "from-indigo-300 to-sky-600" },
  { id: "sazangiller", section: "tatlisu", name: "Sazangiller", emoji: "🐟", tone: "from-sky-300 to-indigo-500" },
  { id: "loachlar", section: "tatlisu", name: "Loachlar", emoji: "🌀", tone: "from-amber-200 to-stone-600" },
  { id: "kedi-baliklari", section: "tatlisu", name: "Kedi Balıkları", emoji: "🐈", tone: "from-slate-300 to-slate-600" },
  { id: "killifishler", section: "tatlisu", name: "Killifishler", emoji: "🎨", tone: "from-lime-300 to-teal-600" },
  { id: "gokkusaklari", section: "tatlisu", name: "Gökkuşakları", emoji: "🌈", tone: "from-sky-300 to-violet-500" },
  { id: "gobyler", section: "tatlisu", name: "Gobyler", emoji: "🐚", tone: "from-teal-200 to-sky-700" },
  { id: "aci-su", section: "tatlisu", name: "Acı Su Balıkları", emoji: "🌊", tone: "from-emerald-300 to-cyan-700" },
  { id: "yilanbaslar", section: "tatlisu", name: "Yılanbaşlar", emoji: "🐍", tone: "from-lime-300 to-stone-700", notice: "Yılanbaşlarla ilgili ithalat, ticaret ve bulundurma kuralları ülkeye ve zamana göre değişebilir; bazı türler istilacı potansiyel taşır. Edinmeden önce güncel resmî mevzuatı kontrol edin ve hiçbir koşulda doğaya salmayın." },
  { id: "ilkel-siradisi-baliklar", section: "tatlisu", name: "İlkel & Sıra Dışı Balıklar", emoji: "🐉", tone: "from-stone-400 to-emerald-900" },
  { id: "diger-baliklar", section: "tatlisu", name: "Diğer Balıklar & Amfibiler", emoji: "🦈", tone: "from-zinc-300 to-emerald-800" },
  { id: "karidesler", section: "omurgasiz", name: "Karidesler", emoji: "🦐", tone: "from-red-300 to-rose-600" },
  { id: "salyangozlar", section: "omurgasiz", name: "Salyangozlar", emoji: "🐌", tone: "from-amber-200 to-yellow-700" },
  { id: "kerevitler", section: "omurgasiz", name: "Kerevitler", emoji: "🦞", tone: "from-orange-300 to-orange-600" },
  { id: "deniz-baliklari", section: "deniz", name: "Deniz Balıkları", emoji: "🐠", tone: "from-sky-300 to-blue-700" },
  { id: "mercanlar", section: "deniz", name: "Mercanlar", emoji: "🪸", tone: "from-pink-300 to-purple-600" },
  { id: "rizomlu", section: "bitki", name: "Rizomlu Bitkiler", emoji: "🌿", tone: "from-green-300 to-emerald-700" },
  { id: "govdeli", section: "bitki", name: "Gövdeli Bitkiler", emoji: "🌱", tone: "from-lime-300 to-green-700" },
  { id: "on-plan", section: "bitki", name: "Ön Plan / Halı Bitkileri", emoji: "☘️", tone: "from-lime-200 to-lime-600" },
  { id: "rozet", section: "bitki", name: "Rozet Bitkiler", emoji: "🪴", tone: "from-emerald-200 to-teal-700" },
  { id: "yuzen", section: "bitki", name: "Yüzen Bitkiler", emoji: "🍃", tone: "from-teal-200 to-green-600" },
  { id: "yosunlar", section: "bitki", name: "Yosunlar (Moss)", emoji: "🌾", tone: "from-green-200 to-green-800" }
];

// IUCN Kırmızı Liste kategorileri
export const IUCN = {
  EX: { label: "Nesli tükenmiş", tone: "bg-slate-800 text-white ring-slate-800" },
  EW: { label: "Doğada tükenmiş", tone: "bg-slate-700 text-white ring-slate-700" },
  CR: { label: "Kritik tehlikede", tone: "bg-red-50 text-red-800 ring-red-200" },
  EN: { label: "Tehlikede", tone: "bg-orange-50 text-orange-800 ring-orange-200" },
  VU: { label: "Hassas", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  NT: { label: "Tehdite yakın", tone: "bg-lime-50 text-lime-800 ring-lime-200" },
  LC: { label: "Düşük riskli", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  DD: { label: "Veri yetersiz", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
  NE: { label: "Değerlendirilmemiş", tone: "bg-slate-100 text-slate-600 ring-slate-200" }
};
export const IUCN_ORDER = ["EX", "EW", "CR", "EN", "VU", "NT", "LC", "DD", "NE"];
export const TR_STATUS = { endemik: "Endemik", yerli: "Yerli", yabanci: "Yabancı (yerleşik)" };

export const DIFFICULTY_COLORS = { Kolay: "bg-emerald-50 text-emerald-700", Orta: "bg-amber-50 text-amber-800", Zor: "bg-red-50 text-red-700" };

/* Yardımcılar: alanları türe göre künye satırlarına çevirir */
const range = (a, b, unit = "") => (a === b ? a + unit : a + "–" + b + unit);

// f: [boy cm, [sıcaklık], [pH], min litre, huy, beslenme, üreme, zorluk, köken, ömür]
function fish(slug, name, latin, category, f, desc, extra = {}) {
  const [size, temp, ph, liters, temperament, diet, breeding, difficulty, origin, life] = f;
  return {
    slug, name, latin, category, kind: "fish", difficulty, temperament, desc, ...extra,
    facts: [
      ["Yetişkin boy", size + " cm"],
      ["Sıcaklık", range(temp[0], temp[1], " °C")],
      ["pH", range(ph[0], ph[1])],
      ["Min. akvaryum", liters + " L"],
      ["Huy", temperament],
      ["Beslenme", diet],
      ["Üreme", breeding],
      ["Köken", origin],
      ["Ömür", life]
    ]
  };
}

// p: [ışık, CO2, büyüme, yerleşim, [sıcaklık], [pH], zorluk, çoğaltma]
function plant(slug, name, latin, category, p, desc, extra = {}) {
  const [light, co2, growth, placement, temp, ph, difficulty, propagation] = p;
  return {
    slug, name, latin, category, kind: "plant", difficulty, desc, ...extra,
    facts: [
      ["Işık", light],
      ["CO2", co2],
      ["Büyüme hızı", growth],
      ["Yerleşim", placement],
      ["Sıcaklık", range(temp[0], temp[1], " °C")],
      ["pH", range(ph[0], ph[1])],
      ["Çoğaltma", propagation]
    ]
  };
}

// c: [ışık, akıntı, tür grubu, saldırganlık, zorluk]
function coral(slug, name, latin, c, desc, extra = {}) {
  const [light, flow, type, aggression, difficulty] = c;
  return {
    slug, name, latin, category: "mercanlar", kind: "coral", difficulty, temperament: aggression, desc, ...extra,
    facts: [["Işık", light], ["Akıntı", flow], ["Grup", type], ["Saldırganlık", aggression], ["Sıcaklık", "24–27 °C"], ["Tuzluluk (SG)", "1.024–1.026"]]
  };
}

function marine(slug, name, latin, f, desc, extra = {}) {
  const [size, liters, temperament, diet, reefSafe, difficulty, origin] = f;
  return {
    slug, name, latin, category: "deniz-baliklari", kind: "fish", difficulty, temperament, desc, ...extra,
    facts: [
      ["Yetişkin boy", size + " cm"], ["Sıcaklık", "24–27 °C"], ["Tuzluluk (SG)", "1.023–1.026"], ["pH", "8.1–8.4"],
      ["Min. akvaryum", liters + " L"], ["Huy", temperament], ["Beslenme", diet], ["Resif uyumu", reefSafe], ["Köken", origin]
    ]
  };
}

const RAW = [
  // Malawi
  fish("labidochromis-caeruleus", "Yellow Lab", "Labidochromis caeruleus", "malawi", ["10", [24, 27], [7.5, 8.5], 200, "Yarı agresif", "Omnivor", "Ağız kuluçkacı", "Kolay", "Malawi Gölü", "8–10 yıl"], "Parlak sarı rengiyle Malawi tanklarının en sakin mbuna türlerinden biri. Bol kayalı düzen ve kalabalık stokla iyi geçinir.", { keywords: ["yellow lab", "labidochromis"] }),
  fish("chindongo-demasoni", "Demasoni", "Chindongo demasoni", "malawi", ["8", [24, 27], [7.5, 8.6], 200, "Agresif", "Otçul ağırlıklı omnivor", "Ağız kuluçkacı", "Orta", "Malawi Gölü", "8–10 yıl"], "Küçük ama kendi türüne karşı çok saldırgan. Saldırganlığı dağıtmak için 12+ bireylik gruplar halinde tutulması önerilir.", { keywords: ["demasoni"] }),
  fish("aulonocara-jacobfreibergi", "Peacock (Aulonocara)", "Aulonocara jacobfreibergi", "malawi", ["13–15", [24, 27], [7.5, 8.5], 300, "Barışçıl / yarı agresif", "Etçil ağırlıklı omnivor", "Ağız kuluçkacı", "Orta", "Malawi Gölü", "8–10 yıl"], "Erkekleri metalik mavi-turuncu renkleriyle öne çıkar. Mbunalardan daha sakindir; kumlu açık alan sever.", { keywords: ["peacock", "aulonocara"] }),
  fish("metriaclima-estherae", "Red Zebra", "Metriaclima estherae", "malawi", ["12", [24, 27], [7.5, 8.5], 300, "Agresif", "Otçul ağırlıklı omnivor", "Ağız kuluçkacı", "Kolay", "Malawi Gölü", "8–10 yıl"], "Turuncu-pembe dişileri ve mavimsi erkekleriyle bilinen dayanıklı bir mbuna. Yüksek proteinli yemlerden kaçının.", { keywords: ["red zebra", "estherae"] }),
  // Tanganyika
  fish("neolamprologus-brichardi", "Brichardi (Peri Prenses)", "Neolamprologus brichardi", "tanganyika", ["9", [24, 27], [8.0, 9.0], 150, "Yarı agresif (bölgesel)", "Omnivor", "Kaya yumurtlayıcı, koloni", "Kolay", "Tanganyika Gölü", "8–10 yıl"], "Koloni halinde yaşar; önceki yavrular yeni kuşağın bakımına yardım eder. Bol kaya ve mağara ister.", { keywords: ["brichardi"] }),
  fish("altolamprologus-calvus", "Calvus", "Altolamprologus calvus", "tanganyika", ["13–15", [23, 26], [8.0, 9.0], 200, "Yarı agresif", "Etçil", "Mağara / kabuk yumurtlayıcı", "Orta", "Tanganyika Gölü", "10+ yıl"], "Yassı gövdesiyle dar kaya yarıklarına girer. Yavaş büyür; küçük balıkları ve yavruları avlayabilir.", { keywords: ["calvus"] }),
  fish("cyphotilapia-frontosa", "Frontosa", "Cyphotilapia frontosa", "tanganyika", ["30–35", [24, 27], [8.0, 9.0], 400, "Yarı agresif", "Etçil", "Ağız kuluçkacı", "Orta", "Tanganyika Gölü", "15+ yıl"], "Kambur alnı ve mavi-beyaz bantlarıyla görkemli, sakin bir dev. Gece küçük balıkları avlar; büyük tank şart.", { keywords: ["frontosa"] }),
  fish("neolamprologus-multifasciatus", "Multi (Kabuk Cikleti)", "Neolamprologus multifasciatus", "tanganyika", ["4–5", [24, 27], [7.8, 9.0], 60, "Bölgesel", "Omnivor", "Kabuk içinde", "Kolay", "Tanganyika Gölü", "8 yıl"], "Dünyanın en küçük cichlidlerinden. Salyangoz kabuklarında koloni kurar; nano Tanganyika tankları için ideal.", { keywords: ["multifasciatus", "multi cichlid"] }),
  fish("tropheus-moorii", "Tropheus moorii", "Tropheus moorii", "tanganyika", ["12", [24, 27], [8.0, 9.0], 300, "Agresif", "Otçul", "Ağız kuluçkacı", "Zor", "Tanganyika Gölü", "10 yıl"], "Lokasyon varyantları çok olan, otçul ve hassas bir tür. Proteinli yemler ölümcül şişkinliğe (bloat) yol açabilir.", { keywords: ["tropheus", "ilangi"] }),
  // Güney Amerika
  fish("symphysodon-aequifasciatus", "Discus", "Symphysodon aequifasciatus", "guney-amerika", ["15–20", [28, 31], [6.0, 7.0], 250, "Barışçıl", "Etçil / omnivor", "Substrat yumurtlayıcı", "Zor", "Amazon havzası", "10+ yıl"], "Akvaryumun kralı olarak anılır. Sıcak, yumuşak ve çok temiz su ister; sık su değişimi şarttır.", { keywords: ["discus", "diskus"] }),
  fish("pterophyllum-scalare", "Melek Balığı", "Pterophyllum scalare", "guney-amerika", ["15 (yükseklik 20+)", [24, 30], [6.0, 7.5], 150, "Yarı agresif", "Omnivor", "Substrat yumurtlayıcı", "Kolay", "Amazon havzası", "10 yıl"], "Yüksek tank ister. Neon gibi küçük balıkları yetişkinken avlayabilir.", { keywords: ["melek balığı", "melekler", "scalare"] }),
  fish("apistogramma-cacatuoides", "Apistogramma cacatuoides", "Apistogramma cacatuoides", "guney-amerika", ["5–8", [24, 28], [6.0, 7.5], 60, "Bölgesel, barışçıl", "Etçil ağırlıklı", "Mağara yumurtlayıcı", "Orta", "Peru, Kolombiya", "5 yıl"], "Cüce cichlidlerin en dayanıklılarından. Dişi, yavrularını mağara çevresinde gözler önünde korur.", { keywords: ["apistogramma", "apisto"] }),
  fish("mikrogeophagus-ramirezi", "Ramirezi", "Mikrogeophagus ramirezi", "guney-amerika", ["5–7", [27, 30], [5.5, 7.0], 60, "Barışçıl", "Omnivor", "Substrat yumurtlayıcı", "Orta", "Venezuela, Kolombiya", "3–4 yıl"], "Sıcak su sever, toplu tanklarda renkli bir dip-orta bölge cichlidi. Su kalitesine hassastır.", { keywords: ["ramirezi"] }),
  fish("astronotus-ocellatus", "Oscar", "Astronotus ocellatus", "guney-amerika", ["30–35", [23, 28], [6.0, 7.5], 400, "Yarı agresif", "Etçil / omnivor", "Substrat yumurtlayıcı", "Orta", "Amazon havzası", "10–15 yıl"], "Sahibini tanıyan, kişilikli bir monster balık. Çok kirletir; güçlü filtrasyon ve büyük tank gerekir.", { keywords: ["oscar"] }),
  // Orta Amerika
  fish("amatitlania-nigrofasciata", "Zebra Cichlid (Convict)", "Amatitlania nigrofasciata", "orta-amerika", ["10–15", [22, 27], [6.5, 8.0], 150, "Agresif (üremede)", "Omnivor", "Mağara / substrat", "Kolay", "Orta Amerika", "8–10 yıl"], "Çok kolay ürer; çiftler üreme döneminde tankı sahiplenir. Yeni başlayanlar için öğretici bir tür.", { keywords: ["convict", "zebra cichlid"] }),
  fish("thorichthys-meeki", "Firemouth (Ateş Ağız)", "Thorichthys meeki", "orta-amerika", ["15", [24, 29], [6.5, 8.0], 150, "Yarı agresif", "Omnivor", "Substrat yumurtlayıcı", "Kolay", "Meksika, Guatemala", "10 yıl"], "Tehdit edildiğinde kırmızı gırtlak zarını şişirir. Kumu eşelemeyi sever.", { keywords: ["firemouth", "meeki"] }),
  fish("herichthys-carpintis", "Green Texas", "Herichthys carpintis", "orta-amerika", ["25–30", [22, 28], [7.0, 8.0], 400, "Agresif", "Omnivor", "Substrat yumurtlayıcı", "Orta", "Meksika", "10+ yıl"], "Turkuaz benekleriyle göz alıcı, güçlü ve bölgesel bir cichlid. Bitkileri söker.", { keywords: ["texas", "carpintis"] }),
  // Canlı doğuranlar
  fish("poecilia-reticulata", "Lepistes (Guppy)", "Poecilia reticulata", "canli-doguranlar", ["3–6", [22, 28], [7.0, 8.0], 40, "Barışçıl", "Omnivor", "Canlı doğuran", "Kolay", "Güney Amerika (kuzey)", "2–3 yıl"], "Sayısız renk hattıyla hobinin başlangıç balığı. Hızlı çoğalır; hat korumak için ayrı tank gerekir.", { keywords: ["guppy", "lepistes"] }),
  fish("poecilia-wingei", "Endler", "Poecilia wingei", "canli-doguranlar", ["2,5–3", [24, 28], [7.0, 8.0], 30, "Barışçıl", "Omnivor", "Canlı doğuran", "Kolay", "Venezuela", "2–3 yıl"], "Lepistesin küçük ve canlı renkli akrabası. Nano tanklarda karidesle birlikte tutulabilir.", { keywords: ["endler"] }),
  fish("xiphophorus-maculatus", "Plati", "Xiphophorus maculatus", "canli-doguranlar", ["5–6", [20, 26], [7.0, 8.2], 60, "Barışçıl", "Omnivor", "Canlı doğuran", "Kolay", "Orta Amerika", "3 yıl"], "Dayanıklı, renkli ve sakin; toplu tanklar için ideal.", { keywords: ["plati", "platy"] }),
  fish("xiphophorus-hellerii", "Kılıçkuyruk", "Xiphophorus hellerii", "canli-doguranlar", ["12–14", [22, 28], [7.0, 8.3], 100, "Barışçıl (erkekler kavgacı olabilir)", "Omnivor", "Canlı doğuran", "Kolay", "Orta Amerika", "3–5 yıl"], "Erkeklerin kuyruğundaki kılıç uzantısıyla tanınır. Atlayabilir, kapaklı tank önerilir.", { keywords: ["kılıçkuyruk", "swordtail"] }),
  fish("poecilia-sphenops", "Molly", "Poecilia sphenops", "canli-doguranlar", ["8–10", [24, 28], [7.5, 8.5], 100, "Barışçıl", "Otçul ağırlıklı omnivor", "Canlı doğuran", "Kolay", "Orta Amerika", "3–5 yıl"], "Sert suyu sever, yosun kemirir. Hafif tuzlu suya da uyum sağlar.", { keywords: ["molly"] }),
  // Labirentliler
  fish("betta-splendens", "Beta (Betta)", "Betta splendens", "labirentliler", ["6–7", [25, 28], [6.5, 7.5], 20, "Erkekler birbirine agresif", "Etçil", "Köpük yuva", "Kolay", "Tayland", "3–5 yıl"], "Labirent organı sayesinde havadan nefes alır ama kavanozda değil, ısıtıcılı ve filtreli tankta tutulmalıdır. Akıntıyı sevmez.", { keywords: ["betta", "beta balığı", "betalar", "betam", "betaya"] }),
  fish("trichogaster-lalius", "Cüce Gurami", "Trichogaster lalius", "labirentliler", ["6–8", [24, 28], [6.0, 7.5], 40, "Barışçıl", "Omnivor", "Köpük yuva", "Orta", "Güney Asya", "4 yıl"], "Renkli ve sakin; bitkili tanklarda yüzeye yakın yaşar. Bazı hatları hastalıklara hassastır.", { keywords: ["gurami", "lalius"] }),
  fish("trichopodus-trichopterus", "Üç Noktalı Gurami", "Trichopodus trichopterus", "labirentliler", ["10–15", [23, 28], [6.0, 8.0], 100, "Yarı agresif", "Omnivor", "Köpük yuva", "Kolay", "Güneydoğu Asya", "5 yıl"], "Dayanıklı ve meraklı; erkekleri birbirine karşı huysuz olabilir.", { keywords: ["üç noktalı", "trichopterus"] }),
  fish("macropodus-opercularis", "Cennet Balığı", "Macropodus opercularis", "labirentliler", ["6–10", [16, 26], [6.0, 8.0], 60, "Yarı agresif", "Omnivor", "Köpük yuva", "Kolay", "Doğu Asya", "8 yıl"], "Isıtıcısız tanklara uygun, hobinin en eski türlerinden. Erkekler birbirine saldırgandır.", { keywords: ["cennet balığı", "paradise fish"] }),
  // Sazangiller
  fish("danio-rerio", "Zebra Danyo", "Danio rerio", "sazangiller", ["4–5", [18, 26], [6.5, 7.5], 60, "Barışçıl", "Omnivor", "Yumurta saçan", "Kolay", "Güney Asya", "3–5 yıl"], "Hızlı ve hareketli bir sürü balığı; en az 6 bireyle tutulmalı.", { keywords: ["zebra danyo", "danio rerio"] }),
  fish("trigonostigma-heteromorpha", "Harlequin Rasbora", "Trigonostigma heteromorpha", "sazangiller", ["4–5", [23, 28], [6.0, 7.5], 60, "Barışçıl", "Omnivor", "Yaprak altına yumurtlar", "Kolay", "Güneydoğu Asya", "5 yıl"], "Siyah üçgen lekesiyle tanınır; bitkili tanklarda sıkı sürüler oluşturur.", { keywords: ["rasbora", "harlequin"] }),
  fish("puntigrus-tetrazona", "Sumatra Barbı", "Puntigrus tetrazona", "sazangiller", ["6–7", [22, 27], [6.0, 8.0], 80, "Yarı agresif (yüzgeç ısırır)", "Omnivor", "Yumurta saçan", "Kolay", "Endonezya", "5 yıl"], "Kalabalık gruplarda tutulduğunda yüzgeç ısırma azalır. Uzun yüzgeçli türlerle tutulmamalı.", { keywords: ["sumatra", "barb"] }),
  fish("boraras-brigittae", "Sivrisinek Rasbora", "Boraras brigittae", "sazangiller", ["1,5–2", [23, 28], [5.0, 7.0], 20, "Barışçıl", "Omnivor (küçük yemler)", "Yumurta saçan", "Orta", "Borneo", "3–4 yıl"], "Nano bitkili tankların yıldızı; yumuşak, hafif asidik su sever.", { keywords: ["boraras", "brigittae"] }),
  // Characiformlar
  fish("paracheirodon-innesi", "Neon Tetra", "Paracheirodon innesi", "characiformlar", ["3–4", [20, 26], [5.5, 7.5], 60, "Barışçıl", "Omnivor", "Yumurta saçan", "Kolay", "Amazon havzası", "5 yıl"], "Mavi-kırmızı şeridiyle en bilinen sürü balığı. Oturmamış (yeni kurulmuş) tanklara hassastır.", { keywords: ["neon tetra", "neonlar", "neonlarım", "neonum"] }),
  fish("paracheirodon-axelrodi", "Kardinal Tetra", "Paracheirodon axelrodi", "characiformlar", ["3–5", [23, 29], [4.5, 7.0], 60, "Barışçıl", "Omnivor", "Yumurta saçan", "Orta", "Rio Negro", "5 yıl"], "Neona benzer ama kırmızısı tüm alt gövdeyi kaplar. Daha sıcak ve yumuşak su ister.", { keywords: ["kardinal tetra", "kardinaller", "cardinal tetra"] }),
  fish("hemigrammus-bleheri", "Kırmızı Burun Tetra", "Hemigrammus bleheri", "characiformlar", ["4–5", [23, 28], [5.5, 7.0], 80, "Barışçıl", "Omnivor", "Yumurta saçan", "Orta", "Amazon havzası", "5 yıl"], "Burnundaki kırmızılık su kalitesinin göstergesidir; solarsa su değerlerini kontrol edin.", { keywords: ["kırmızı burun", "rummy"] }),
  fish("gymnocorymbus-ternetzi", "Siyah Tetra", "Gymnocorymbus ternetzi", "characiformlar", ["5–6", [20, 26], [6.0, 8.0], 80, "Barışçıl (hafif yüzgeç ısırabilir)", "Omnivor", "Yumurta saçan", "Kolay", "Güney Amerika", "5 yıl"], "Dayanıklı ve kolay; uzun yüzgeçli türlerle dikkatli olunmalı.", { keywords: ["siyah tetra"] }),
  // Kedi balıkları
  fish("corydoras-paleatus", "Benekli Corydoras", "Corydoras paleatus", "kedi-baliklari", ["5–7", [18, 24], [6.0, 8.0], 60, "Barışçıl", "Omnivor (dip)", "Yapışkan yumurta", "Kolay", "Güney Amerika", "10 yıl"], "Grup halinde yaşayan, kumda eşelenen sevimli bir dip balığı. Keskin çakıl bıyıklarına zarar verir; kum önerilir.", { keywords: ["corydoras"] }),
  fish("ancistrus-sp", "Ancistrus (Bushynose)", "Ancistrus sp.", "kedi-baliklari", ["12–15", [23, 27], [6.5, 7.5], 100, "Barışçıl", "Otçul + odun", "Mağara yumurtlayıcı (erkek bakar)", "Kolay", "Güney Amerika", "10 yıl"], "Yosun temizliğine yardımcı olur; tankta mutlaka kök/odun bulunmalı.", { keywords: ["ancistrus"] }),
  fish("otocinclus-affinis", "Otocinclus", "Otocinclus affinis", "kedi-baliklari", ["4–5", [21, 26], [6.0, 7.5], 60, "Barışçıl", "Otçul (yosun)", "Yumurtlayan", "Orta", "Güneydoğu Brezilya", "5 yıl"], "Nano ve bitkili tankların yosun temizleyicisi. Oturmuş, yosunlu tanka eklenmeli.", { keywords: ["otocinclus"] }),
  fish("synodontis-nigriventris", "Ters Yüzen Çöpçü", "Synodontis nigriventris", "kedi-baliklari", ["8–10", [22, 26], [6.0, 7.5], 100, "Barışçıl", "Omnivor", "Yumurtlayan (akvaryumda nadir)", "Orta", "Kongo havzası", "10+ yıl"], "Adı gibi ters yüzer; gece aktiftir ve saklanacak yer ister.", { keywords: ["synodontis", "ters yüzen"] }),
  // Killifishler
  fish("aphyosemion-australe", "Aphyosemion australe", "Aphyosemion australe", "killifishler", ["5–6", [21, 24], [5.5, 7.0], 40, "Barışçıl", "Etçil", "Bitkilere yumurtlar", "Orta", "Batı Afrika", "3 yıl"], "Lir kuyruklu, renkli bir killi. Yumuşak, hafif asidik ve serin su sever.", { keywords: ["aphyosemion", "killi"] }),
  fish("nothobranchius-rachovii", "Nothobranchius rachovii", "Nothobranchius rachovii", "killifishler", ["5", [22, 26], [6.5, 7.5], 30, "Yarı agresif (erkekler)", "Etçil", "Yıllık (yumurtalar kuru dönemde bekler)", "Zor", "Mozambik", "1 yıl"], "Doğada kuruyan göletlerde yaşar; yumurtalar turba içinde aylarca bekletilir.", { keywords: ["nothobranchius"], rare: true }),
  fish("fundulopanchax-gardneri", "Gardneri Killifish", "Fundulopanchax gardneri", "killifishler", ["6", [22, 26], [6.0, 7.5], 40, "Yarı agresif", "Etçil", "Bitkilere / paspasa yumurtlar", "Orta", "Nijerya, Kamerun", "2–3 yıl"], "Benekli desenleriyle göz alıcı; yumurtaları paspastan toplanarak üretilir.", { keywords: ["gardneri", "killi"] }),
  // Gökkuşakları
  fish("melanotaenia-boesemani", "Boeseman Gökkuşağı", "Melanotaenia boesemani", "gokkusaklari", ["9–10", [26, 30], [7.0, 8.0], 200, "Barışçıl", "Omnivor", "Yumurtlayan", "Kolay", "Yeni Gine (Batı Papua)", "5–8 yıl"], "Ön yarısı mavi, arka yarısı turuncu. Uzun tanklarda sürü halinde en güzel rengine ulaşır.", { keywords: ["boesemani"] }),
  fish("pseudomugil-furcatus", "Forktail Blue-eye", "Pseudomugil furcatus", "gokkusaklari", ["5", [24, 28], [7.0, 8.0], 60, "Barışçıl", "Omnivor", "Yumurtlayan", "Kolay", "Papua Yeni Gine", "2–3 yıl"], "Sarı yüzgeçli, mavi gözlü küçük bir gökkuşağı; nano tanklara uygun.", { keywords: ["pseudomugil", "blue-eye"] }),
  // Acı su
  fish("dichotomyctere-nigroviridis", "Yeşil Benekli Balon", "Dichotomyctere nigroviridis", "aci-su", ["15–17", [24, 28], [7.5, 8.5], 150, "Agresif", "Etçil (salyangoz, kabuklu)", "Yumurtlayan (akvaryumda nadir)", "Zor", "Güneydoğu Asya", "10 yıl"], "Gençken acı suda, yetişkinken neredeyse deniz suyunda yaşar. Dişlerinin aşınması için kabuklu yemler gerekir.", { keywords: ["yeşil benekli balon", "puffer"] }),
  // Diğer balıklar
  fish("osteoglossum-bicirrhosum", "Gümüş Arowana", "Osteoglossum bicirrhosum", "diger-baliklar", ["90", [24, 30], [6.0, 7.0], 1000, "Agresif (yırtıcı)", "Etçil", "Ağız kuluçkacı", "Zor", "Amazon havzası", "15+ yıl"], "Yüzeyde avlanan, çok güçlü atlayan bir dev. Ağır kapaklı ve çok büyük tank şart.", { keywords: ["arowana"], rare: true }),
  fish("polypterus-senegalus", "Polypterus senegalus", "Polypterus senegalus", "diger-baliklar", ["30", [25, 28], [6.5, 7.5], 300, "Yarı agresif (küçükleri yer)", "Etçil", "Yumurtlayan (akvaryumda nadir)", "Orta", "Afrika", "15+ yıl"], "Akciğerimsi yüzme kesesiyle hava solur; tarih öncesi görünümlü, sakin bir dip yırtıcısı.", { keywords: ["polypterus", "bichir"] }),
  // Omurgasızlar
  fish("neocaridina-davidi", "Red Cherry Karides", "Neocaridina davidi", "karidesler", ["2–3", [18, 28], [6.5, 8.0], 20, "Barışçıl", "Omnivor", "Doğrudan gelişim (larvasız)", "Kolay", "Tayvan, Çin", "1–2 yıl"], "Karides hobisine başlangıcın klasik türü. Bakır içeren ilaç ve gübrelerden uzak tutulmalı.", { keywords: ["neocaridina", "red cherry", "cherry karides"] }),
  fish("caridina-multidentata", "Amano Karides", "Caridina multidentata", "karidesler", ["4–5", [18, 28], [6.5, 7.5], 30, "Barışçıl", "Yosun / omnivor", "Larvalar tuzlu suda gelişir (tatlı suda çoğalmaz)", "Kolay", "Japonya, Tayvan", "2–3 yıl"], "Bitkili tankların en çalışkan yosun temizleyicisi.", { keywords: ["amano"] }),
  fish("caridina-cantonensis", "Crystal Red Karides", "Caridina cantonensis", "karidesler", ["2,5", [20, 24], [5.8, 6.8], 20, "Barışçıl", "Omnivor", "Doğrudan gelişim", "Zor", "Güney Çin (seçilim hattı)", "1,5 yıl"], "Yumuşak, asidik su ister; genellikle aktif taban ve RO su ile tutulur.", { keywords: ["crystal red", "crs", "caridina"], rare: true }),
  fish("clea-helena", "Katil Salyangoz", "Clea helena", "salyangozlar", ["2", [23, 27], [7.0, 8.0], 20, "Salyangoz avcısı, diğerlerine barışçıl", "Etçil", "Tek tek yumurta", "Kolay", "Güneydoğu Asya", "2–3 yıl"], "Zararlı salyangoz patlamalarını kontrol etmek için kullanılır.", { keywords: ["katil salyangoz", "helena"] }),
  fish("neritina-sp", "Nerit Salyangoz", "Neritina sp.", "salyangozlar", ["2–3", [22, 27], [7.0, 8.5], 20, "Barışçıl", "Yosun", "Tatlı suda çoğalmaz (beyaz yumurta bırakır)", "Kolay", "Doğu Afrika, Güneydoğu Asya", "1–2 yıl"], "Cam ve dekor yosunlarını temizler; tankta çoğalıp sorun olmaz.", { keywords: ["nerit", "neritina"] }),
  fish("cambarellus-patzcuarensis", "CPO Cüce Kerevit", "Cambarellus patzcuarensis 'Orange'", "kerevitler", ["3–4", [18, 26], [7.0, 8.0], 40, "Barışçıl", "Omnivor", "Doğrudan gelişim", "Kolay", "Meksika (seçilim hattı)", "1,5–2 yıl"], "Turuncu, küçük ve bitkilere zarar vermeyen bir kerevit. Kabuk değiştirirken saklanacak yer ister.", { keywords: ["cpo", "kerevit"] }),
  // Deniz
  marine("amphiprion-ocellaris", "Palyaço Balığı", "Amphiprion ocellaris", ["8–11", 80, "Yarı agresif (bölgesel)", "Omnivor", "Evet", "Kolay", "Hint-Pasifik"], "Deniz akvaryumuna başlangıcın sembol türü. Anemon şart değildir; çiftler halinde tutulabilir.", { keywords: ["palyaço", "clownfish", "ocellaris"] }),
  marine("paracanthurus-hepatus", "Mavi Cerrah (Dory)", "Paracanthurus hepatus", ["25–30", 500, "Yarı agresif", "Otçul ağırlıklı", "Evet", "Zor", "Hint-Pasifik"], "Geniş yüzme alanı ister; beyaz benek hastalığına (ich) yatkındır.", { keywords: ["cerrah", "tang", "dory"] }),
  marine("gramma-loreto", "Royal Gramma", "Gramma loreto", ["8", 100, "Barışçıl (mağarasını korur)", "Etçil", "Evet", "Kolay", "Karayipler"], "Mor-sarı rengiyle küçük resif tanklarının sakin sakini.", { keywords: ["gramma"] }),
  marine("synchiropus-splendidus", "Mandarin", "Synchiropus splendidus", ["6–7", 200, "Barışçıl", "Kopepod / küçük omurgasızlar", "Evet", "Zor", "Batı Pasifik"], "Olağanüstü desenli ama kopepod popülasyonu olan oturmuş bir resif ister; yeni tanka eklenmemeli.", { keywords: ["mandarin"], rare: true }),
  coral("zoanthus-sp", "Zoanthus (Zoa)", "Zoanthus sp.", ["Orta", "Orta", "Yumuşak mercan / polip", "Düşük", "Kolay"], "Renk çeşitliliği çok, hızlı yayılan polipler. Uyarı: bazı Zoanthus/Palythoa türleri palitoksin içerir; eldiven ve göz koruması kullanın, kaya kaynatmayın.", { keywords: ["zoanthus", "zoa"] }),
  coral("discosoma-sp", "Mantar Mercan", "Discosoma sp.", ["Düşük–orta", "Düşük", "Mantar (korallimorf)", "Orta (yayılır)", "Kolay"], "Başlangıç mercanı; düşük ışıkta bile renklenir.", { keywords: ["mantar mercan", "discosoma"] }),
  coral("euphyllia-glabrescens", "Torch Mercan", "Euphyllia glabrescens", ["Orta", "Düşük–orta", "LPS", "Yüksek (süpürücü dokunaçlar)", "Orta"], "Uzun dokunaçları çevresindeki mercanları yakabilir; arada boşluk bırakın.", { keywords: ["torch", "euphyllia"] }),
  coral("acropora-sp", "Acropora", "Acropora sp.", ["Yüksek", "Yüksek", "SPS", "Düşük", "Zor"], "Stabil kalsiyum, alkalinite ve magnezyum değerleri ister; deneyimli resifçiler için.", { keywords: ["acropora", "sps"], rare: true }),
  // Bitkiler
  plant("anubias-nana", "Anubias Nana", "Anubias barteri var. nana", "rizomlu", ["Düşük", "Gerekmez", "Çok yavaş", "Ön / orta plan, köke bağlanır", [22, 28], [6.0, 7.5], "Kolay", "Rizom bölme"], "Rizom gömülmemeli; taş ya da köke bağlanır. Neredeyse ölümsüz bir bitki.", { keywords: ["anubias"] }),
  plant("microsorum-pteropus", "Java Fern", "Microsorum pteropus", "rizomlu", ["Düşük", "Gerekmez", "Yavaş", "Orta / arka plan, köke bağlanır", [20, 28], [6.0, 7.5], "Kolay", "Yaprak üzerinde yavru"], "Cikletlerin bile yemediği dayanıklı bir eğrelti.", { keywords: ["java fern", "microsorum"] }),
  plant("bucephalandra-sp", "Bucephalandra", "Bucephalandra sp.", "rizomlu", ["Düşük–orta", "Opsiyonel", "Çok yavaş", "Ön / orta plan, taşa bağlanır", [22, 28], [6.0, 7.5], "Orta", "Rizom bölme"], "Borneo kökenli, metalik parıltılı yapraklarıyla koleksiyoncuların gözdesi.", { keywords: ["bucephalandra", "buce"] }),
  plant("rotala-rotundifolia", "Rotala rotundifolia", "Rotala rotundifolia", "govdeli", ["Orta–yüksek", "Önerilir", "Hızlı", "Arka plan", [20, 28], [6.0, 7.5], "Orta", "Çelik (tepe kesimi)"], "Güçlü ışıkta uçları pembeleşir; düzenli budamayla gür bir arka plan oluşturur.", { keywords: ["rotala"] }),
  plant("ludwigia-repens", "Ludwigia repens", "Ludwigia repens", "govdeli", ["Orta", "Opsiyonel", "Orta", "Arka plan", [20, 28], [6.0, 7.5], "Kolay", "Çelik"], "Yeşil tanklara kırmızı kontrast katan kolay bir gövdeli bitki.", { keywords: ["ludwigia"] }),
  plant("micranthemum-monte-carlo", "Monte Carlo", "Micranthemum tweediei", "on-plan", ["Orta–yüksek", "Önerilir", "Hızlı", "Ön plan halısı", [20, 28], [6.0, 7.5], "Orta", "Halı parçalarını bölme"], "Cuba'ya göre daha affedici bir halı bitkisi.", { keywords: ["monte carlo", "micranthemum"] }),
  plant("hemianthus-cuba", "HC Cuba", "Hemianthus callitrichoides", "on-plan", ["Yüksek", "Şart", "Orta", "Ön plan halısı", [20, 28], [6.0, 7.0], "Zor", "Halı parçalarını bölme"], "Dünyanın en küçük yapraklı akvaryum bitkilerinden; yoğun CO2 ve ışık ister.", { keywords: ["cuba", "hemianthus", "hc"] }),
  plant("cryptocoryne-wendtii", "Cryptocoryne wendtii", "Cryptocoryne wendtii", "rozet", ["Düşük–orta", "Gerekmez", "Yavaş", "Ön / orta plan", [22, 28], [6.0, 8.0], "Kolay", "Kök sürgünü"], "Yeni tankta yapraklarını dökebilir (crypt erimesi); kökü sağlamsa yeniden çıkar.", { keywords: ["cryptocoryne", "crypt"] }),
  plant("echinodorus-bleheri", "Amazon Kılıç Otu", "Echinodorus grisebachii 'Bleherae'", "rozet", ["Orta", "Gerekmez", "Orta", "Arka plan, soliter", [22, 28], [6.5, 7.5], "Kolay", "Çiçek sapında yavru bitkiler"], "Büyük tanklarda gösterişli bir merkez bitkisi; kök tablet gübresi sever.", { keywords: ["amazon kılıç", "echinodorus"] }),
  plant("limnobium-laevigatum", "Amazon Frogbit", "Limnobium laevigatum", "yuzen", ["Orta", "Gerekmez", "Hızlı", "Yüzey", [20, 28], [6.0, 7.5], "Kolay", "Stolon"], "Nitratı hızlı tüketir, yavrulara ve betalara gölge sağlar. Doğaya kesinlikle bırakılmamalı.", { keywords: ["frogbit", "limnobium"] }),
  plant("salvinia-natans", "Salvinia", "Salvinia natans", "yuzen", ["Orta", "Gerekmez", "Hızlı", "Yüzey", [20, 28], [6.0, 7.5], "Kolay", "Bölünme"], "Su üstü bitkisi; aşırı yayılmaması için düzenli seyreltilmeli.", { keywords: ["salvinia"] }),
  plant("taxiphyllum-barbieri", "Java Moss", "Taxiphyllum barbieri", "yosunlar", ["Düşük", "Gerekmez", "Orta", "Dekor, kök ve taş üzeri", [20, 28], [6.0, 7.5], "Kolay", "Parçalama"], "Karides ve yavru tanklarının vazgeçilmezi; yumurta bırakma alanı sağlar.", { keywords: ["java moss"] }),
  plant("vesicularia-montagnei", "Christmas Moss", "Vesicularia montagnei", "yosunlar", ["Düşük–orta", "Opsiyonel", "Yavaş", "Dekor, duvar ve köke", [20, 26], [6.0, 7.5], "Kolay", "Parçalama"], "Çam ağacı dallarını andıran düzenli yaprak yapısıyla moss duvarlarında tercih edilir.", { keywords: ["christmas moss"] })
];

const START = new Date("2026-06-01").getTime();
export const SPECIES = RAW.map((item, index) => ({ ...item, addedAt: START + index * 2 * 86400000 + (index % 5) * 3600000 }));

// Etkin tür kataloğu: önce koddaki örnek veri, veritabanı yüklenince oradaki yayındaki türler
let catalog = SPECIES;
export function getSpeciesCatalog() {
  return catalog;
}

export function speciesBySlug(slug) {
  return catalog.find((item) => item.slug === slug) || null;
}

const FALLBACK_CATEGORY = { id: "diger", section: "tatlisu", name: "Diğer", emoji: "🐟", tone: "from-slate-300 to-slate-500" };
export function categoryById(id) {
  return KB_CATEGORIES.find((item) => item.id === id) || FALLBACK_CATEGORY;
}

// Korunan (Türkiye) kategorisindeki türler: beslenen listesine ve ilanlara bağlanmaz
export function isProtectedSpecies(slugOrSpecies) {
  const sp = typeof slugOrSpecies === "string" ? speciesBySlug(slugOrSpecies) : slugOrSpecies;
  return Boolean(sp && categoryById(sp.category).protected);
}
export const withoutProtected = (slugs) => (slugs || []).filter((slug) => !isProtectedSpecies(slug));

// Örnek: üyelerin beslediği türler (kullanıcı no → tür slug'ları)
export const SEED_KEEPING = {
  1: ["neolamprologus-brichardi", "altolamprologus-calvus", "cyphotilapia-frontosa", "poecilia-reticulata", "anubias-nana"],
  2: ["rotala-rotundifolia", "paracheirodon-axelrodi", "caridina-multidentata", "amphiprion-ocellaris", "micranthemum-monte-carlo"],
  3: ["neocaridina-davidi", "taxiphyllum-barbieri", "boraras-brigittae", "otocinclus-affinis", "vesicularia-montagnei", "anubias-nana"],
  4: ["aulonocara-jacobfreibergi", "labidochromis-caeruleus", "astronotus-ocellatus", "ancistrus-sp"],
  5: ["bucephalandra-sp", "apistogramma-cacatuoides", "cryptocoryne-wendtii", "microsorum-pteropus", "limnobium-laevigatum"],
  6: ["poecilia-reticulata", "poecilia-wingei", "paracheirodon-innesi"],
  7: ["neolamprologus-multifasciatus", "tropheus-moorii", "astronotus-ocellatus"],
  8: ["neocaridina-davidi", "caridina-cantonensis", "neritina-sp"],
  9: ["betta-splendens", "corydoras-paleatus", "trichogaster-lalius"],
  10: ["amphiprion-ocellaris", "zoanthus-sp", "gramma-loreto"]
};

export const SEED_FAVORITES = { 1: ["symphysodon-aequifasciatus", "osteoglossum-bicirrhosum"] };

// Örnek tür yorumları: [tür, kullanıcı, metin, kaç saat önce]
export const SEED_SPECIES_COMMENTS = [
  ["neolamprologus-brichardi", 1, "80 litrede başlattığım çiftten bir yılda 40 bireylik koloni oldu. Kaya düzenini yavruların saklanacağı şekilde sık kurun.", 30],
  ["neolamprologus-brichardi", 7, "Koloni büyüyünce diğer türlere karşı epey bölgesel oluyorlar, tank planlamasını ona göre yapın.", 52],
  ["betta-splendens", 9, "20 litre, ısıtıcı ve sünger filtre ile 3 yıldır sorunsuz. Kavanoz hikâyelerine inanmayın!", 6],
  ["neocaridina-davidi", 8, "Taban olarak inert kum kullanıyorum, haftalık %10 su değişimiyle hızla çoğalıyorlar.", 14],
  ["neocaridina-davidi", 3, "Yeni bitki alırken mutlaka durulayın; bazı pestisitler karidesleri öldürüyor.", 40],
  ["astronotus-ocellatus", 7, "28 cm'yi geçince 400 litre dar gelmeye başladı. 600+ litre hedefleyin.", 20],
  ["anubias-nana", 5, "Rizomu kuma gömdüğümde çürüdü, köke bağlayınca toparladı.", 70],
  ["symphysodon-aequifasciatus", 2, "Bitkili tankta tutuyorum ama su değişimini ihmal etmeyin; günde %10–20 yapanlar var.", 90],
  ["amphiprion-ocellaris", 10, "Anemon almadan önce tankın oturmasını bekledim, palyaçolar bir LPS mercanı ev edindi 🙂", 12],
  ["caridina-multidentata", 2, "5 tane amano, 120 litredeki tüy yosununu iki haftada temizledi.", 44]
];

/* ------------------------------------------------------------------ */
/* Metinden tür tanıma                                                 */
/* ------------------------------------------------------------------ */

const lower = (text) => (text || "").toLocaleLowerCase("tr");
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Her tür için: Latince ad + Türkçe ad + anahtar kelimeler. Kelime başından eşleşir (Türkçe ekler için sonu serbest);
// 4 harften kısa ifadeler yalnızca tam kelime olarak eşleşir.
function buildMatchers(list) {
  return list.map((item) => ({
  slug: item.slug,
  patterns: [(item.latin || "").replace(/ sp\.$/, ""), item.name, ...(item.keywords || [])]
    .filter(Boolean)
    .map((word) => {
      const w = escapeRe(lower(word).replace(/['’]/g, ""));
      return new RegExp("(^|[^\\p{L}\\p{N}])" + w + (w.length < 4 ? "(?![\\p{L}\\p{N}])" : ""), "u");
    })
}));
}
let MATCHERS = buildMatchers(SPECIES);

export function setSpeciesCatalog(list) {
  if (!Array.isArray(list) || !list.length) return;
  catalog = list;
  MATCHERS = buildMatchers(list);
}

export function detectSpecies(text) {
  // Etiketlerdeki alt çizgi boşluk sayılır: #öpüşen_gurami → "öpüşen gurami"
  const hay = lower(text).replace(/['’]/g, "").replace(/_/g, " ");
  if (!hay.trim()) return [];
  return MATCHERS.filter((matcher) => matcher.patterns.some((re) => re.test(hay))).map((matcher) => matcher.slug);
}

// Tür için metne eklenebilecek, tanıma sisteminin kesin yakaladığı etiket (#öpüşen_gurami gibi)
export function speciesTag(species) {
  const cands = [species.name, ...(species.keywords || []), species.latin].filter(Boolean);
  const toTag = (word) => lower(word).replace(/['’]/g, "").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  for (const word of cands) {
    const tag = toTag(word);
    if (tag.length >= 3 && detectSpecies("#" + tag).includes(species.slug)) return "#" + tag;
  }
  return "#" + toTag(species.latin || species.name || species.slug);
}
