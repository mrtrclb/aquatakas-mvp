import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ExternalLink, Loader2, Mail, Send, X } from "lucide-react";
import { supabase, trError } from "./lib/supabase";
import { AD_PLACEMENTS } from "./lib/ads";
import { CONTACT_EMAIL, LEGAL_DOCS, LegalBody } from "./legal.jsx";

export const BLOG_URL = "https://blog.aquagram.com.tr";

export const SITE_INFO_TABS = [
  ["nedir", "Nedir?"],
  ["contact", "Bize ulaşın"],
  ["terms", "Kullanım şartları"],
  ["ads", "Reklam verin"],
  ["adpolicy", "Reklam politikası"],
  ["warnings", "Önemli uyarılar"],
  ["privacy", "Gizlilik politikası"],
  ["kvkk", "KVKK aydınlatma"]
];

export const CONTACT_TOPICS = [
  ["destek", "Destek / hesabım"],
  ["oneri", "Öneri ve istek"],
  ["hata", "Hata bildirimi"],
  ["ilan", "İlan ya da içerik bildirimi"],
  ["reklam", "Reklam ve öne çıkarma"],
  ["isbirligi", "İş birliği"],
  ["kvkk", "KVKK / kişisel veri başvurusu"],
  ["diger", "Diğer"]
];

// Hesabım menüsündeki bir sayfayı açar (App dinler)
export function openMemberPage(page) {
  window.dispatchEvent(new CustomEvent("aq:member-page", { detail: page }));
}

/* Site bilgileri penceresi. Yan sütun "sticky" olduğu ve kendi katmanını oluşturduğu için
   pencere doğrudan <body> içine çizilir; böylece orta sütundaki yapışkan başlıkların üstünde kalır. */
export function SiteInfoModal({ activeTab, setActiveTab, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const legalKey = { terms: "terms", privacy: "privacy", adpolicy: "ads", kvkk: "kvkk" }[activeTab];
  const titles = { nedir: "Aquagram nedir?", contact: "Bize ulaşın", ads: "Reklam verin", warnings: "Önemli uyarılar" };
  const title = legalKey ? LEGAL_DOCS[legalKey].title : titles[activeTab] || titles.nedir;

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}>
      <div className="grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl md:grid-cols-[200px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50 p-3 md:border-b-0 md:border-r md:p-4">
          <div className="flex items-center gap-2 md:block">
            <div className="flex flex-1 gap-1 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0 [scrollbar-width:none]">
              {SITE_INFO_TABS.map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={"shrink-0 rounded-2xl px-3 py-2 text-left text-sm font-black " + (activeTab === key ? "bg-cyan-950 text-white" : "text-slate-600 hover:bg-white")}>{label}</button>
              ))}
              <a href={BLOG_URL} target="_blank" rel="noopener" className="flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-black text-slate-600 hover:bg-white">Blog <ExternalLink size={13} /></a>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-full bg-white p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Kapat"><X size={18} /></button>
          </div>
        </aside>
        <section className="max-h-[calc(90vh-64px)] overflow-y-auto p-5 sm:p-6 md:max-h-[90vh]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
            <button onClick={onClose} className="hidden rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 md:block" aria-label="Kapat"><X size={18} /></button>
          </div>
          {legalKey && <LegalBody docKey={legalKey} />}
          {activeTab === "nedir" && <AboutTab onTab={setActiveTab} />}
          {activeTab === "contact" && <ContactTab />}
          {activeTab === "ads" && <AdsTab onTab={setActiveTab} onClose={onClose} />}
          {activeTab === "warnings" && <WarningsTab />}
        </section>
      </div>
    </div>,
    document.body
  );
}

/* ---------------------------------------------------------------- Nedir? */

const ABOUT_CARDS = [
  ["🐠", "İlanlar", "Fazla yavru mu verdi guppilerin? Tankı mı büyütüyorsun? Canlı, bitki, ekipman, yem ve dekor ilanlarını şehir, kategori ve türe göre filtrele; satıcıya site içinden yaz."],
  ["💬", "Topluluk", "Sabah tankının fotoğrafını at, “bu yosun ne?” diye sor, anket aç, #etiket kullan. Beğen, yorum yap, kaydet; aynı hobiyi yapan insanlarla sohbet et."],
  ["📚", "Bilgi Bankası", "Yüzlerce türün bakım künyesi: sıcaklık, pH, akvaryum hacmi, huy ve zorluk. Beslediğin türleri ekle, kimlerin aynı türü beslediğini gör, deneyimini paylaş."],
  ["👥", "Gruplar", "Karides delileri, bitkili tank tutkunları, deniz akvaryumcuları… İlgi alanına göre gruplara katıl ya da kendi grubunu kur."],
  ["🛡️", "Güven", "Mavi tik, alışveriş sonrası değerlendirmeler, şikâyet ve engelleme. İlanlar ve paylaşımlar ekibimizce izlenir; kurallara uymayan içerikler kaldırılır."],
  ["🆓", "Ücretsiz", "Üyelik, ilan vermek, paylaşım yapmak ve mesajlaşmak ücretsiz. İstersen ilanını öne çıkarabilir ya da işletmen için reklam verebilirsin."]
];

function AboutTab({ onTab }) {
  return (
    <div className="grid gap-4 text-[15px] leading-7 text-slate-600">
      <p>
        Aquagram, akvaryum hobisinin buluşma noktası. Genel pazar yerlerinde “neon tetra” arayıp araba lastiği ilanlarına boğulmaktan,
        forumlarda 2009'dan kalma cevapları okumaktan sıkılan hobiciler için kuruldu. Burada her şey <b className="text-slate-900">su altı dünyası</b> üzerine:
        alıp sattığın canlılar, sorduğun sorular, öğrendiğin türler ve tanıştığın insanlar.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ABOUT_CARDS.map(([emoji, head, text]) => (
          <div key={head} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-black text-slate-900"><span className="text-xl" aria-hidden="true">{emoji}</span>{head}</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[22px] bg-cyan-950 p-5 text-cyan-50">
        <div className="text-lg font-black text-white">Nasıl başlarım?</div>
        <ol className="mt-2 grid gap-1 text-sm leading-relaxed">
          <li>1. Ücretsiz üye ol, profil resmini ve şehrini ekle.</li>
          <li>2. Bilgi Bankası'ndan beslediğin türleri işaretle; aynı türü besleyenler seni bulsun.</li>
          <li>3. İlk paylaşımını yap: tankının bir fotoğrafı yeter. 📸</li>
          <li>4. Fazla canlın ya da kullanmadığın ekipmanın varsa ilan ver, takasa aç.</li>
        </ol>
      </div>
      <p className="text-sm">
        Küçük bir ekibiz ve siteyi hobicilerle birlikte büyütüyoruz. Bir fikrin, bir şikâyetin ya da “şu da olsa ne güzel olur” dediğin bir şey varsa{" "}
        <button onClick={() => onTab("contact")} className="font-black text-cyan-800 underline decoration-cyan-800/30 underline-offset-2">bize yaz</button>. İyi akvaryumlar! 🌿
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- Bize ulaşın */

const fieldCls = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-800 focus:bg-white";

function ContactTab() {
  const [form, setForm] = useState({ name: "", email: "", topic: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Giriş yapmış üyenin bilgileri hazır gelir
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data && data.session && data.session.user;
      if (!user || cancelled) return;
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      setForm((prev) => ({ ...prev, email: prev.email || user.email || "", name: prev.name || (profile ? "@" + profile.username : "") }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const valid = form.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()) && form.topic && form.body.trim().length >= 10;

  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("submit_contact", { p_name: form.name.trim(), p_email: form.email.trim(), p_topic: form.topic, p_body: form.body.trim() });
    setBusy(false);
    if (err) return setError(trError(err));
    return setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-[24px] bg-emerald-50 p-6 text-center text-emerald-900">
        <CheckCircle2 className="mx-auto mb-2" size={32} />
        <div className="text-lg font-black">Mesajın bize ulaştı</div>
        <p className="mt-1 text-sm">Teşekkürler! En kısa sürede <b>{form.email}</b> adresine dönüş yapacağız.</p>
        <button onClick={() => { setSent(false); setForm((prev) => ({ ...prev, topic: "", body: "" })); }} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">Yeni mesaj yaz</button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-[15px] leading-7 text-slate-600">
        Destek, öneri, hata bildirimi ya da iş birliği… Formu doldur, ekibimiz e-postayla dönüş yapsın. Dilersen doğrudan{" "}
        <a href={"mailto:" + CONTACT_EMAIL} className="font-black text-cyan-800 underline decoration-cyan-800/30 underline-offset-2">{CONTACT_EMAIL}</a> adresinden de bize ulaşabilirsin.
      </p>
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-black text-slate-500">Adın
            <input value={form.name} onChange={(event) => set("name", event.target.value.slice(0, 80))} className={fieldCls} autoComplete="name" required />
          </label>
          <label className="grid gap-1.5 text-xs font-black text-slate-500">E-posta adresin
            <input type="email" value={form.email} onChange={(event) => set("email", event.target.value.slice(0, 160))} className={fieldCls} autoComplete="email" required />
          </label>
        </div>
        <label className="grid gap-1.5 text-xs font-black text-slate-500">Konu
          <select value={form.topic} onChange={(event) => set("topic", event.target.value)} className={fieldCls + " appearance-auto"} required>
            <option value="" disabled>Konu seç</option>
            {CONTACT_TOPICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-black text-slate-500">Mesajın
          <textarea value={form.body} onChange={(event) => set("body", event.target.value.slice(0, 4000))} rows={7} className={fieldCls + " resize-y"} placeholder="Nasıl yardımcı olabiliriz? İlan ya da paylaşım bildiriyorsan bağlantısını eklemeyi unutma." required />
          <span className="text-right font-normal text-slate-400">{form.body.length} / 4000</span>
        </label>
        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Bilgilerin yalnızca sana dönüş yapmak için kullanılır.</p>
          <button type="submit" disabled={!valid || busy} className="flex items-center gap-2 rounded-full bg-cyan-950 px-5 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gönder
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- Reklam verin */

const tl = (value) => Number(value).toLocaleString("tr-TR") + " ₺";

function AdsTab({ onTab, onClose }) {
  const [plans, setPlans] = useState(null);
  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "ad_plans").maybeSingle().then(({ data }) => {
      setPlans((data && Array.isArray(data.value) && data.value) || []);
    });
  }, []);

  return (
    <div className="grid gap-4 text-[15px] leading-7 text-slate-600">
      <p>
        Akvaryum mağazan, üretim tesisin, bitki ya da canlı çiftliğin veya hobiye yönelik bir hizmetin mi var? Aquagram'da reklamın
        yalnızca akvaryumla ilgilenen kişilere gösterilir; boşa giden gösterim yok.
      </p>
      <div className="grid gap-2">
        <div className="text-sm font-black text-slate-900">Reklam alanları</div>
        {plans === null ? (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Yükleniyor…</div>
        ) : (
          plans.map((plan) => {
            const meta = AD_PLACEMENTS[plan.placement] || { label: plan.placement, hint: "" };
            return (
              <div key={plan.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">{meta.label}</div>
                  <div className="text-xs leading-snug text-slate-500">{meta.hint}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-black text-slate-900">{tl(plan.price)}</div>
                  <div className="text-xs text-slate-500">{plan.days} gün</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ul className="grid gap-1.5 text-sm">
        <li>✅ <b className="text-slate-900">Kolay başvuru:</b> Marka adı, başlık, kısa metin, buton yazısı, bağlantı ve tek bir görsel yeterli. Reklamın her alanda o alana uygun boyutta otomatik yerleşir; başvururken nasıl görüneceğini önizleyebilirsin.</li>
        <li>✅ <b className="text-slate-900">Hızlı onay:</b> Başvurular ekibimizce incelenir; süre onaylandığı anda başlar.</li>
        <li>✅ <b className="text-slate-900">Şeffaf ölçüm:</b> Gösterim ve tıklama sayılarını Hesabım → Reklamlarım sayfasından anlık izlersin.</li>
        <li>✅ <b className="text-slate-900">Adil dağılım:</b> Aynı alanda birden fazla reklam varsa her sayfa açılışında sıra karışır; tüm reklam verenler eşit şansla gösterilir.</li>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            onClose();
            openMemberPage("ads");
          }}
          className="rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600"
        >
          Reklam başvurusu yap
        </button>
        <button onClick={() => onTab("adpolicy")} className="text-sm font-black text-cyan-800 underline decoration-cyan-800/30 underline-offset-2">Reklam politikasını oku</button>
      </div>
      <p className="text-xs text-slate-400">Toplu ya da uzun süreli kampanyalar için <a href={"mailto:" + CONTACT_EMAIL} className="font-bold underline">{CONTACT_EMAIL}</a> adresine yazabilirsin.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- Önemli uyarılar */

const WARNINGS = [
  ["🤝 Alışverişin tarafı biz değiliz", "Aquagram ilanların buluştuğu bir platformdur; satıcı, alıcı ya da aracı değildir. Ödeme, teslimat, kargo ve iade koşullarını taraflar kendi arasında belirler ve bunlardan taraflar sorumludur."],
  ["🚩 Dolandırıcılığa dikkat", "Canlıyı ya da ürünü görmeden kapora göndermeyin. Çok düşük fiyat, acele ettirme, site dışına (WhatsApp, başka uygulama) çekme ya da “kargo ücretini önden yatır” gibi taleplerde dikkatli olun ve kullanıcıyı bildirin. Aquagram ekibi sizden asla şifre, kart bilgisi ya da doğrulama kodu istemez."],
  ["🐟 Canlı refahı", "Canlı gönderiminde uygun ambalaj, ısı yalıtımı ve oksijen sağlanmalı, teslim süresi kısa tutulmalıdır. Hasta canlılar satılmamalı, akvaryum canlıları ve bitkileri asla doğaya (göl, dere, deniz) bırakılmamalıdır."],
  ["⚖️ Yasak ve izne bağlı türler", "Koruma altındaki ya da ticareti izne bağlı türler (ör. CITES listesindekiler) gerekli belgeler olmadan satılamaz. Bu tür ilanlar kaldırılır ve hesap askıya alınabilir."],
  ["🔒 Verilerin ve gizliliğin", "Bizimle paylaştığın veri oldukça sınırlıdır: kullanıcı adı, e-posta adresi, isteğe bağlı olarak şehir, profil resmi ve (yalnızca mavi tik başvurusunda) telefon numarası. Kart ya da banka bilgilerini saklamayız. Verilerini reklam şirketlerine satmaz, ticari amaçla üçüncü kişilerle paylaşmaz, profil çıkarmak için kullanmayız; yalnızca hizmeti sunmak, güvenliği sağlamak ve platformu iyileştirmek için kullanırız. Ayrıntılar KVKK Aydınlatma Metni ve Gizlilik Politikası'nda."],
  ["🚪 Dilediğin zaman ayrılabilirsin", "Üyeliğini istediğin an Hesabım sayfasındaki “Hesabımı sil” düğmesiyle sonlandırabilirsin. Hesabın silindiğinde e-posta adresin, şifren, profil bilgilerin, beslediğin türler ve kayıtların silinir; yayındaki ilanların kaldırılır."],
  ["👤 Silinen hesabın paylaşımları", "Topluluk sohbetlerinin bütünlüğü bozulmasın diye, silinen hesabın paylaşım, yorum, tür deneyimi ve değerlendirmeleri sitede kalmaya devam eder; ancak kim olduğun görünmez, bunlar “misafir_…” şeklinde anonim bir kullanıcı adıyla gösterilir. Belirli bir içeriğin tamamen silinmesini istersen hesabını silmeden önce kendin silebilir ya da bize yazabilirsin."],
  ["📢 Reklamlar ve moderasyon", "Yanıltıcı, yoğun metinli, fiyat odaklı, iletişim bilgisi taşıyan ya da topluluk güvenliğini zedeleyen ilan, paylaşım ve reklamlar incelemeye alınabilir, reddedilebilir ya da yayından kaldırılabilir. Kurallara aykırı davranan hesaplar askıya alınabilir."],
  ["🩺 Bilgiler tavsiye niteliğindedir", "Bilgi Bankası ve topluluktaki bakım ve tedavi bilgileri hobicilerin deneyimlerine dayanır; veteriner hekim ya da uzman görüşünün yerine geçmez. İlaç kullanırken üretici talimatlarına uyun."]
];

function WarningsTab() {
  return (
    <div className="grid gap-3">
      {WARNINGS.map(([head, text]) => (
        <div key={head} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <div className="font-black text-slate-900">{head}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-xs text-slate-400"><Mail size={13} /> Sorun mu yaşıyorsun? {CONTACT_EMAIL}</p>
    </div>
  );
}
