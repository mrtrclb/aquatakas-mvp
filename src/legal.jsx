import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

// Yasal metinler. Yayına almadan önce bir hukukçuya kontrol ettirilmelidir.
// Köşeli parantezli alanlar ([...]) doldurulmalıdır.
export const LEGAL_VERSION = "2026-10-21";
export const CONTACT_EMAIL = "bilgi@aquagram.com.tr";
const CONTACT = CONTACT_EMAIL;
const CONTROLLER = "[VERİ SORUMLUSUNUN ADI SOYADI / UNVANI]";
const ADDRESS = "[YAZIŞMA ADRESİ]";

export const LEGAL_DOCS = {
  terms: {
    title: "Kullanım Koşulları",
    accept: "Okudum, anladım ve kabul ediyorum",
    sections: [
      ["1. Taraflar ve kapsam", [
        "Bu koşullar, aquagram.com.tr adresinde sunulan Aquagram platformunu (\"Platform\") kullanan herkes (\"Üye\" ya da \"Kullanıcı\") ile Platform'u işleten " + CONTROLLER + " (\"Aquagram\") arasındaki ilişkiyi düzenler.",
        "Platform'a üye olarak bu koşulları, Topluluk Kuralları'nı ve Reklam Politikası'nı kabul etmiş olursun. Koşulları kabul etmiyorsan Platform'u kullanmamalısın."
      ]],
      ["2. Platform'un niteliği", [
        "Aquagram; akvaryum hobisine ilişkin canlı, bitki, ekipman ve malzeme ilanlarının yayımlandığı, üyelerin paylaşım yapıp birbirleriyle mesajlaştığı ve tür bilgilerinin derlendiği bir aracı hizmet sağlayıcıdır.",
        "Aquagram ilanlarda yer alan ürünlerin ve canlıların satıcısı, alıcısı ya da aracısı değildir; satış sözleşmesinin tarafı olmaz, ödeme almaz, teslimat yapmaz ve ürünlerin niteliğini, sağlığını ya da yasallığını garanti etmez. Alışverişin tüm sorumluluğu taraflara aittir.",
        "Bilgi Bankası'ndaki bakım bilgileri hobide yaygın kabul gören genel bilgilerdir; veteriner hekim ya da uzman görüşü yerine geçmez."
      ]],
      ["3. Üyelik", [
        "Üye olmak için en az 18 yaşında olmalı ya da yasal temsilcinin iznini almış olmalısın.",
        "Kayıtta verdiğin bilgilerin doğru ve güncel olmasından sen sorumlusun. Hesabının güvenliğini sağlamak, şifreni kimseyle paylaşmamak senin sorumluluğundadır.",
        "Her kişi yalnızca bir hesap açabilir. Başkası adına, sahte kimlikle ya da yanıltıcı kullanıcı adıyla hesap açılamaz.",
        "Mavi tik (doğrulanmış üye) rozeti; profil resmi, doğrulanmış e-posta ve ekip tarafından teyit edilen telefon numarası şartlarını sağlayan üyelere verilir. Rozet yalnızca bu bilgilerin teyit edildiğini gösterir, üyenin güvenilirliğine dair bir garanti değildir."
      ]],
      ["4. İlan kuralları", [
        "İlanlar yalnızca akvaryum hobisiyle ilgili olmalı; fotoğraf, açıklama ve fiyat bilgisi gerçeği yansıtmalıdır. Başkasına ait fotoğraf izinsiz kullanılamaz.",
        "Satılan, takas edilen ya da sahiplendirilen canlılar sağlıklı olmalı, hastalık belirtileri gizlenmemelidir.",
        "Yürürlükteki mevzuata göre ticareti yasak ya da izne bağlı türlerin (ör. CITES listelerindeki türler, koruma altındaki yerli türler) gerekli belgeler olmadan ilanı verilemez.",
        "İstilacı ya da yabancı türlerin doğaya (göl, dere, deniz) bırakılması ekosisteme zarar verir ve yasaktır; bu yönde teşvik içeren içerik paylaşılamaz.",
        "Canlıların kargoyla gönderiminde hayvan refahı gözetilmeli; uygun ambalaj, ısı ve süre koşulları sağlanmalıdır.",
        "Aynı ürün için tekrarlayan ilan, yanıltıcı kategori seçimi, ilan alanında başka sitelere yönlendirme ve satılmış ilanı yayında tutmak yasaktır."
      ]],
      ["5. Topluluk kuralları", [
        "Saygılı ve yapıcı bir dil kullan. Hakaret, taciz, nefret söylemi, tehdit ve ayrımcılık yasaktır.",
        "Başkalarının kişisel bilgilerini (telefon, adres, fotoğraf vb.) izinsiz paylaşma.",
        "Topluluk akışını satış için kullanma; satış ve takas için ilan bölümünü kullan.",
        "Hastalık ve tedavi konularında deneyimini paylaş, kesin teşhis koyma; ilaç kullanımında üretici talimatlarına ve uzman görüşüne uy.",
        "Spam, yanıltıcı bilgi, hayvana eziyet içeren ya da müstehcen içerik paylaşılamaz.",
        "Değerlendirmeler yalnızca gerçekten yaşanmış bir alışverişi yansıtmalıdır; sahte, karşılıklı anlaşmalı ya da kasıtlı olarak zarar verme amaçlı değerlendirme yasaktır."
      ]],
      ["6. İçerik hakları ve sorumluluğu", [
        "Paylaştığın ilan, fotoğraf, video, yorum ve diğer içeriklerden yalnızca sen sorumlusun. Bu içeriklerin hukuka ve üçüncü kişilerin haklarına aykırı olmadığını kabul edersin.",
        "İçeriklerinin sahipliği sende kalır. Ancak içeriklerini Platform'da yayımlamak, göstermek ve Platform'un tanıtımı amacıyla Platform içinde kullanmak üzere Aquagram'a dünya genelinde, ücretsiz ve devredilemez bir kullanım izni verirsin. İçeriği sildiğinde bu izin, makul teknik süreler ve yasal saklama yükümlülükleri saklı kalmak kaydıyla sona erer."
      ]],
      ["7. Moderasyon ve yaptırımlar", [
        "Aquagram; bu koşullara, mevzuata ya da topluluk kurallarına aykırı bulduğu içerikleri önceden bildirimde bulunmaksızın kaldırabilir, ilanları yayından alabilir ve hesapları geçici ya da süresiz olarak askıya alabilir.",
        "Alınan kararlar kısa bir gerekçeyle ilgili üyeye bildirilir. Karara itiraz etmek için " + CONTACT + " adresine yazabilirsin.",
        "Şikâyetler gizli tutulur; şikâyet edenin kimliği içerik sahibiyle paylaşılmaz."
      ]],
      ["8. Ücretli hizmetler", [
        "İlan öne çıkarma ve reklam gibi ücretli hizmetlerin süresi ve fiyatı başvuru sırasında gösterilir. Başvurular ekip incelemesinden sonra yayına alınır; reddedilen başvurularda ödeme alınmışsa iade edilir.",
        "Onaylanıp yayına alınan bir reklamın, süresi dolmadan reklam veren tarafından yayından kaldırılması hâlinde kısmi ya da tam ücret iadesi yapılmaz. Mesafeli sözleşmelere ilişkin yasal haklar saklıdır.",
        "Aquagram PRO üyelik seçilen süre (1, 3 ya da 12 ay) boyunca geçerlidir ve otomatik yenilenmez. PRO ayrıcalıkları (ücretsiz öne çıkarma ve reklam hakları, günlük üste taşıma hakkı, ek sohbet hakkı ve PRO rozeti) satın alma sayfasında açıklanır; kullanılmayan haklar sonraki döneme devretmez. Ücretsiz haklarla yapılan öne çıkarma ve reklam başvuruları da ekip incelemesine tabidir. Kurallara aykırılık nedeniyle askıya alınan hesaplarda kalan PRO süresi için iade yapılmaz."
      ]],
      ["9. Sorumluluğun sınırlandırılması", [
        "Platform \"olduğu gibi\" sunulur. Aquagram, kesintisiz ya da hatasız çalışmayı garanti etmez.",
        "Üyeler arasındaki alışveriş, takas, teslimat ve ödemelerden doğan zararlardan, üyelerin içeriklerinden ve üçüncü kişilerin sitelerinden Aquagram sorumlu değildir. Bu sınırlama, kast ve ağır kusur hâllerinde ve kanunen sınırlanamayan durumlarda uygulanmaz."
      ]],
      ["10. Değişiklikler ve fesih", [
        "Aquagram bu koşulları değiştirebilir. Önemli değişiklikler Platform üzerinden duyurulur; değişiklikten sonra Platform'u kullanmaya devam etmen güncel koşulları kabul ettiğin anlamına gelir.",
        "Hesabını dilediğin zaman Hesabım sayfasındaki \"Hesabımı sil\" düğmesiyle kapatabilirsin. Hesap kapatıldığında e-posta adresin, şifren ve profil bilgilerin silinir, yayındaki ilanların kaldırılır. Topluluk sohbetlerinin bütünlüğü için paylaşım, yorum, tür deneyimi ve değerlendirmelerin \"misafir_…\" biçiminde anonim bir kullanıcı adıyla yayında kalır; bunları hesabını silmeden önce kendin silebilirsin."
      ]],
      ["11. Uygulanacak hukuk", [
        "Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda tüketici işlemleri bakımından Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri, diğer hâllerde İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.",
        "İletişim: " + CONTACT
      ]]
    ]
  },

  kvkk: {
    title: "Kişisel Verilerin Korunması Aydınlatma Metni",
    accept: "Okudum ve anladım",
    sections: [
      ["Veri sorumlusu", [
        "6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla " + CONTROLLER + " (" + ADDRESS + ", " + CONTACT + ") tarafından aşağıda açıklanan kapsamda işlenmektedir."
      ]],
      ["İşlenen kişisel veriler", [
        "Kimlik ve hesap bilgileri: kullanıcı adı, profil resmi, şehir/ilçe, biyografi, sosyal medya hesap adları.",
        "İletişim bilgileri: e-posta adresi; mavi tik talebinde bulunursanız cep telefonu numarası.",
        "Kullanıcı işlem bilgileri: ilanlar, paylaşımlar, yorumlar, beğeniler, mesajlar, değerlendirmeler, beslediğiniz ve favori türler, grup üyelikleri, şikâyetler, reklam ve öne çıkarma başvuruları.",
        "İşlem güvenliği bilgileri: şifrenizin geri döndürülemez özeti, oturum ve giriş kayıtları, teknik hizmet sağlayıcının tuttuğu IP adresi ve tarayıcı bilgisi içeren güvenlik kayıtları.",
        "Ziyaret istatistikleri kişiyle ilişkilendirilmeden, yalnızca gün ve sayfa bölümü bazında toplam sayı olarak tutulur; bu sayılar kişisel veri içermez."
      ]],
      ["İşleme amaçları ve hukuki sebepler", [
        "Üyelik sözleşmesinin kurulması ve ifası; ilan, mesajlaşma, topluluk ve Bilgi Bankası hizmetlerinin sunulması (KVKK m. 5/2-c).",
        "Hesap ve platform güvenliğinin sağlanması, kötüye kullanımın, dolandırıcılığın ve kurallara aykırı içeriğin önlenmesi, şikâyetlerin incelenmesi (KVKK m. 5/2-f meşru menfaat).",
        "5651 sayılı Kanun ve diğer mevzuattan doğan yükümlülüklerin yerine getirilmesi, yetkili makamların taleplerinin karşılanması (KVKK m. 5/2-ç).",
        "Mavi tik talebinde telefon numaranızın teyit edilmesi (KVKK m. 5/2-c ve 5/2-f).",
        "Hakların tesisi, kullanılması ve korunması (KVKK m. 5/2-e)."
      ]],
      ["Kişisel verilerin aktarılması", [
        "Profil bilgileriniz, ilanlarınız, paylaşımlarınız ve değerlendirmeleriniz Platform'un doğası gereği diğer kullanıcılara açık olarak görüntülenir. E-posta adresiniz ve telefon numaranız diğer kullanıcılarla paylaşılmaz.",
        "Platform'un barındırılması ve veritabanı, kimlik doğrulama ve dosya depolama hizmetleri için yurt dışında bulunan hizmet sağlayıcılardan yararlanılmaktadır (veritabanı: Supabase, sunucu bölgesi İrlanda/AB; site barındırma: GitHub Pages). Bu aktarımlar KVKK'nın 9. maddesinde öngörülen şartlar ve güvenceler çerçevesinde yapılır.",
        "Kişisel verileriniz, hukuken yetkili kamu kurum ve kuruluşlarına ve adli makamlara talep hâlinde ve mevzuatın izin verdiği ölçüde aktarılabilir."
      ]],
      ["Toplama yöntemi", [
        "Kişisel verileriniz; kayıt formu, profil sayfası, ilan ve paylaşım formları, mesajlaşma ve diğer Platform özellikleri aracılığıyla elektronik ortamda, kısmen otomatik yollarla toplanır."
      ]],
      ["Saklama süresi", [
        "Verileriniz üyeliğiniz süresince ve üyeliğin sona ermesinden sonra ilgili mevzuatta öngörülen ya da olası uyuşmazlıklar için gereken süre boyunca saklanır; süre dolduğunda silinir, yok edilir ya da anonim hâle getirilir.",
        "Hesabınızı Hesabım sayfasından sildiğinizde e-posta adresiniz, şifreniz, profil bilgileriniz, telefon numaranız ve kişisel listeleriniz silinir. Paylaşım, yorum, tür deneyimi ve değerlendirmeleriniz kimliğinizle ilişkilendirilmeyen anonim bir kullanıcı adıyla (\"misafir_…\") yayında kalır."
      ]],
      ["Haklarınız", [
        "KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.",
        "Başvurularınızı " + CONTACT + " adresine kayıtlı e-posta adresinizden iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır."
      ]]
    ]
  },

  privacy: {
    title: "Gizlilik ve Çerez Politikası",
    accept: "Anladım",
    sections: [
      ["Özet", [
        "Aquagram'da reklam amaçlı takip çerezi, üçüncü taraf analiz aracı ya da profilleme yoktur. Kişisel verilerin işlenmesine ilişkin ayrıntılar Kişisel Verilerin Korunması Aydınlatma Metni'nde yer alır.",
        "Bizimle paylaştığınız veri oldukça sınırlıdır. Kart ya da banka bilgilerinizi saklamayız; verilerinizi reklam şirketlerine satmaz, ticari amaçla üçüncü kişilerle paylaşmayız. Verileriniz yalnızca hizmeti sunmak, güvenliği sağlamak ve platformu iyileştirmek için kullanılır."
      ]],
      ["Bot koruması", [
        "Giriş, kayıt ve şifre işlemlerinde otomatik saldırıları önlemek için Cloudflare Turnstile kullanılır. Turnstile, isteğin bir insandan geldiğini anlamak için tarayıcı ve cihaz sinyallerini kısa süreli olarak inceler; reklam ya da takip amacıyla kullanılmaz."
      ]],
      ["Tarayıcıda saklanan bilgiler", [
        "Oturumunuzun açık kalması için tarayıcınızın yerel deposunda (localStorage) bir oturum anahtarı saklanır. Bu zorunlu bir teknik kayıttır; çıkış yaptığınızda silinir.",
        "Ziyaret sayısı tarayıcı sekmesi açık kaldığı sürece geçerli, kişiyle ilişkilendirilmeyen bir oturum işaretiyle (sessionStorage) sayılır. Sekme kapanınca silinir; IP adresi ya da kullanıcı kimliği istatistiklerde tutulmaz.",
        "Tercihleriniz (ör. açtığınız sekme, filtre) aynı şekilde yalnızca tarayıcınızda tutulabilir."
      ]],
      ["Herkese açık bilgiler", [
        "Kullanıcı adınız, profil resminiz, şehir bilginiz, ilanlarınız, paylaşımlarınız, yorumlarınız, beslediğiniz türler ve hakkınızdaki değerlendirmeler diğer kullanıcılara görünür. Hesabım sayfasından profilinizin arama motorlarında görünmemesini seçebilirsiniz.",
        "Mesajlarınızı yalnızca konuşmanın tarafları görebilir. Ekip, şikâyet incelemesi dışında mesaj içeriklerine erişmez."
      ]],
      ["Dış bağlantılar", [
        "Reklamlar ve ilanlar başka sitelere bağlantı içerebilir. Bu sitelerin gizlilik uygulamalarından Aquagram sorumlu değildir.",
        "Paylaşımlara eklenen bağlantılar için başlık, açıklama ve görselden oluşan bir önizleme kartı gösterilir. Önizleme bilgisi sunucumuz tarafından alınır; kart görseli ise ilgili siteden yüklenir. YouTube videoları yalnızca oynat düğmesine bastığınızda, çerez kullanımı azaltılmış (youtube-nocookie.com) oynatıcıyla açılır."
      ]],
      ["İletişim", ["Sorularınız için: " + CONTACT]]
    ]
  },

  ads: {
    title: "Reklam Politikası",
    accept: "Anladım",
    sections: [
      ["Genel", [
        "Reklamlar akvaryum hobisiyle ilgili ürün, hizmet, mağaza, etkinlik ya da içeriklere ilişkin olmalıdır. Tüm başvurular yayından önce ekip tarafından incelenir."
      ]],
      ["Kabul edilmeyen reklamlar", [
        "Yanıltıcı, abartılı ya da doğrulanamayan vaatler içeren reklamlar.",
        "Ticareti yasak ya da izne bağlı canlılar, yasa dışı ürünler, ilaç ve sağlık iddiası taşıyan ürünlerin mevzuata aykırı tanıtımı.",
        "Hayvan refahına aykırı uygulamaları özendiren, şiddet ya da müstehcenlik içeren reklamlar.",
        "Görselde yoğun metin, telefon numarası, fiyat listesi ya da başka platformların logolarını öne çıkaran tasarımlar."
      ]],
      ["Yayın ve ölçüm", [
        "Onaylanan reklam seçilen alanda paket süresince gösterilir; süre onay anında başlar. Aynı alanda birden fazla reklam varsa sıralama her sayfa açılışında karıştırılır ve reklamlar dönüşümlü gösterilir.",
        "Gösterim ve tıklama sayıları reklam verene Reklamlarım sayfasında gösterilir.",
        "Aquagram, yayındaki bir reklamı kurallara aykırı hâle gelmesi durumunda yayından kaldırabilir."
      ]],
      ["Ücret ve iade", [
        "Reddedilen başvurularda ödeme alınmışsa ücretin tamamı iade edilir.",
        "Reklam veren, onaylanıp yayına alınmış reklamını Reklamlarım sayfasından dilediği zaman yayından kaldırabilir. Kendi isteğinizle süresi tamamlanmadan yayından kaldırılan reklamlar için kısmi ya da tamamen ücret iadesi yapılmaz.",
        "Reklamın kurallara aykırılık nedeniyle Aquagram tarafından yayından kaldırılması hâlinde de kalan süre için iade yapılmaz. Mesafeli sözleşmelere ilişkin yasal haklarınız saklıdır."
      ]]
    ]
  }
};

/* Metin penceresi: zorunlu okumada en alta kaydırmadan onay düğmesi açılmaz */
export function LegalModal({ docKey, mustRead = false, onAccept, onClose }) {
  const doc = LEGAL_DOCS[docKey];
  const [atBottom, setAtBottom] = useState(!mustRead);
  const body = useRef(null);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // İçerik kısa ve kaydırma gerekmiyorsa düğme baştan açık olsun
  useEffect(() => {
    const node = body.current;
    if (node && node.scrollHeight <= node.clientHeight + 8) setAtBottom(true);
  }, [docKey]);

  function onScroll(event) {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) setAtBottom(true);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-label={doc.title} className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">{doc.title}</h2>
            <p className="text-xs text-slate-400">Sürüm: {new Date(LEGAL_VERSION).toLocaleDateString("tr-TR")}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" title="Pencereyi kapat" aria-label="Pencereyi kapat"><X size={18} /></button>
        </div>
        <div ref={body} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-700">
          {doc.sections.map(([heading, paragraphs]) => (
            <section key={heading} className="mb-4">
              <h3 className="mb-1.5 font-black text-slate-900">{heading}</h3>
              {paragraphs.map((text) => <p key={text.slice(0, 40)} className="mb-2">{text}</p>)}
            </section>
          ))}
        </div>
        {onAccept && (
          <div className="border-t border-slate-100 px-5 py-3">
            {!atBottom && (
              <p className="mb-2 flex items-center justify-center gap-1 text-xs font-bold text-slate-400"><ChevronDown size={14} /> Onaylamak için metni sonuna kadar oku</p>
            )}
            <button
              onClick={onAccept}
              disabled={!atBottom}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-950 px-4 py-3 text-sm font-black text-white enabled:hover:bg-cyan-900 disabled:opacity-40"
            >
              <Check size={16} /> {doc.accept}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LegalBody({ docKey }) {
  const doc = LEGAL_DOCS[docKey];
  return (
    <div className="max-h-[55vh] overflow-y-auto pr-1 text-sm leading-relaxed text-slate-600">
      {doc.sections.map(([heading, paragraphs]) => (
        <section key={heading} className="mb-3">
          <h4 className="mb-1 font-black text-slate-800">{heading}</h4>
          {paragraphs.map((text) => <p key={text.slice(0, 40)} className="mb-1.5">{text}</p>)}
        </section>
      ))}
    </div>
  );
}
