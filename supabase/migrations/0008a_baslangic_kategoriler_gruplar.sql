-- Aquagram — 0008a: başlangıç verisi: bilgi bankası kategorileri ve 13 resmi grup
insert into public.kb_categories (id, section, name, emoji, tone, position) values
  ('malawi', 'tatlisu', 'Malawi Cichlidleri', '🐟', 'from-amber-300 to-orange-500', 1),
  ('tanganyika', 'tatlisu', 'Tanganyika Cichlidleri', '🪨', 'from-stone-300 to-amber-600', 2),
  ('guney-amerika', 'tatlisu', 'Güney Amerika Cichlidleri', '🍂', 'from-orange-300 to-red-600', 3),
  ('orta-amerika', 'tatlisu', 'Orta Amerika Cichlidleri', '🌋', 'from-yellow-300 to-rose-600', 4),
  ('canli-doguranlar', 'tatlisu', 'Canlı Doğuranlar', '🐡', 'from-rose-300 to-red-500', 5),
  ('labirentliler', 'tatlisu', 'Labirentliler', '🫧', 'from-red-400 to-fuchsia-700', 6),
  ('sazangiller', 'tatlisu', 'Sazangiller', '🐟', 'from-sky-300 to-indigo-500', 7),
  ('characiformlar', 'tatlisu', 'Characiformlar (Tetralar)', '✨', 'from-cyan-300 to-blue-700', 8),
  ('kedi-baliklari', 'tatlisu', 'Kedi Balıkları', '🐈', 'from-slate-300 to-slate-600', 9),
  ('killifishler', 'tatlisu', 'Killifishler', '🎨', 'from-lime-300 to-teal-600', 10),
  ('gokkusaklari', 'tatlisu', 'Gökkuşakları', '🌈', 'from-sky-300 to-violet-500', 11),
  ('aci-su', 'tatlisu', 'Acı Su Balıkları', '🌊', 'from-emerald-300 to-cyan-700', 12),
  ('diger-baliklar', 'tatlisu', 'Diğer Balıklar', '🦈', 'from-zinc-300 to-emerald-800', 13),
  ('karidesler', 'omurgasiz', 'Karidesler', '🦐', 'from-red-300 to-rose-600', 14),
  ('salyangozlar', 'omurgasiz', 'Salyangozlar', '🐌', 'from-amber-200 to-yellow-700', 15),
  ('kerevitler', 'omurgasiz', 'Kerevitler', '🦞', 'from-orange-300 to-orange-600', 16),
  ('deniz-baliklari', 'deniz', 'Deniz Balıkları', '🐠', 'from-sky-300 to-blue-700', 17),
  ('mercanlar', 'deniz', 'Mercanlar', '🪸', 'from-pink-300 to-purple-600', 18),
  ('rizomlu', 'bitki', 'Rizomlu Bitkiler', '🌿', 'from-green-300 to-emerald-700', 19),
  ('govdeli', 'bitki', 'Gövdeli Bitkiler', '🌱', 'from-lime-300 to-green-700', 20),
  ('on-plan', 'bitki', 'Ön Plan / Halı Bitkileri', '☘️', 'from-lime-200 to-lime-600', 21),
  ('rozet', 'bitki', 'Rozet Bitkiler', '🪴', 'from-emerald-200 to-teal-700', 22),
  ('yuzen', 'bitki', 'Yüzen Bitkiler', '🍃', 'from-teal-200 to-green-600', 23),
  ('yosunlar', 'bitki', 'Yosunlar (Moss)', '🌾', 'from-green-200 to-green-800', 24)
on conflict (id) do nothing;

insert into public.groups (slug, name, emoji, color, cover_url, description, rules, is_official) values
  ('tanganyika', 'Tanganyika', '🪨', 'bg-amber-100', 'https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&w=1400&q=80', 'Tanganyika gölü cikletleri: Neolamprologus, Cyprichromis, kabuk yaşayanlar, frontosa ve kolonili kurulumlar.', array['Sert su ve yüksek pH kurulumları konuşulur; değerlerini paylaşırken ölçüm aracını da belirt.', 'Hibrit üretim ve satışı yasaktır.', 'Tür adlarını mümkünse Latince yaz.']::text[], true),
  ('malawi', 'Malawi', '🐠', 'bg-sky-100', 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=1400&q=80', 'Mbuna, haplochromis ve peacock severler. Stoklama, saldırganlık yönetimi ve kaya düzenleri.', array['Stok önerisi isterken tank ölçülerini ve mevcut balıkları yaz.', 'Hibrit balıkları saf tür gibi tanıtma.']::text[], true),
  ('guney-amerika', 'Güney Amerika', '🍂', 'bg-orange-100', 'https://images.unsplash.com/photo-1520301255226-bf5f144451c1?auto=format&fit=crop&w=1400&q=80', 'Apistogramma, discus, melek, tetra ve siyah su biyotopları.', array['Biyotop paylaşımlarında bitki ve yaprak türlerini belirt.', 'Yabani yakalanmış (WC) canlı paylaşımlarında kaynağı belirt.']::text[], true),
  ('deniz', 'Deniz Akvaryumu', '🪸', 'bg-indigo-100', 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1400&q=80', 'Resif tankları, mercan fragları, tuzlu su kimyası ve ekipmanları.', array['Doğadan izinsiz toplanmış canlı ve mercan paylaşımı yapılmaz.', 'Su değerlerini (KH, Ca, Mg, NO3, PO4) birim ile yaz.']::text[], true),
  ('nano', 'Nano Tanklar', '🦐', 'bg-rose-100', 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=1400&q=80', '60 litre altı tanklar, karides, betta, moss ve küçük biyotoplar.', array['Tank hacmini paylaşımında mutlaka belirt.', 'Hayvan refahına aykırı küçük kap (vazo, kavanoz) önerilerine izin verilmez.']::text[], true),
  ('bitkili', 'Bitkili Akvaryumlar', '🌿', 'bg-emerald-100', 'https://images.unsplash.com/photo-1518156677180-95a2893f3499?auto=format&fit=crop&w=1400&q=80', 'Aquascape, low-tech ve CO2''li bitkili tanklar, gübreleme ve budama paylaşımları.', array['Gübre ve CO2 önerilerinde ışık süresini de yaz.', 'Budama satışları için ilan bölümünü kullan.']::text[], true),
  ('monster', 'Monster Balıklar', '🦈', 'bg-slate-200', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80', 'Oscar, arowana, büyük yayın balıkları ve dev tanklar. Büyük balık, büyük sorumluluk.', array['Balığın yetişkin boyuna uygun olmayan tank önerileri kaldırılır.', 'Canlı yem videoları paylaşılmaz.']::text[], true),
  ('hastaliklar', 'Hastalıklar', '🩺', 'bg-red-100', 'https://images.unsplash.com/photo-1520301255226-bf5f144451c1?auto=format&fit=crop&w=1400&q=80', 'Beyaz benek, kadife, yüzgeç çürümesi, bakteriyel ve paraziter sorunlar: belirtiler, karantina ve tedavi deneyimleri.', array['Soru sorarken su değerlerini (NH3, NO2, NO3, pH, sıcaklık), tank hacmini ve belirtileri yaz; mümkünse fotoğraf/video ekle.', 'Paylaşılanlar deneyimdir, kesin teşhis değildir; ilaç dozlarını ürün etiketine göre uygula.', 'İlaç satışı ve reçeteli ürün önerisi yapılmaz.', 'Acil durumlarda önce su değişimi ve karantina önerilerini dikkate al.']::text[], true),
  ('canli-yem', 'Canlı Yem', '🪱', 'bg-lime-100', 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=1400&q=80', 'Artemia, mikrokurt, infusoria, daphnia, grindal ve kültür kurulumları; kültür takasları ve beslenme deneyimleri.', array['Kültür satışı için ilan bölümünü kullan; burada yöntem ve deneyim paylaşılır.', 'Doğadan toplanan yemlerde parazit riskini belirt.']::text[], true),
  ('yavru-bakimi', 'Yavru Bakımı', '🐣', 'bg-yellow-100', 'https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?auto=format&fit=crop&w=1400&q=80', 'Yumurtadan yetişkine: kuluçka, ilk yem, büyütme tankları, su kalitesi ve seçilim.', array['Türü ve yavruların yaşını (gün/hafta) belirt.', 'Satış ya da sahiplendirme için ilan bölümünü kullan.']::text[], true),
  ('ekipman', 'Ekipman Önerileri', '🔧', 'bg-zinc-200', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80', 'Filtre, ısıtıcı, aydınlatma, CO2 ve ölçüm cihazları: karşılaştırmalar, kurulum ve arıza çözümleri.', array['Marka/model önerirken kendi kullanım süreni ve tank hacmini yaz.', 'Gizli reklam ve yönlendirme bağlantısı paylaşılmaz; satıcıysan belirt.', 'Elektrik güvenliği konusunda riskli yöntemler önerilmez.']::text[], true),
  ('bitki-bakimi', 'Bitki Bakımı', '🌱', 'bg-green-100', 'https://images.unsplash.com/photo-1518156677180-95a2893f3499?auto=format&fit=crop&w=1400&q=80', 'Besin eksiklikleri, yosun sorunları, budama ve çoğaltma. Bitkin neden sararıyor? Burada sor.', array['Işık süresi, gübreleme ve CO2 bilgisini paylaş.', 'Bitkinin yakın plan fotoğrafını ekle.']::text[], true),
  ('nadir-turler', 'Nadir Türler', '💎', 'bg-violet-100', 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1400&q=80', 'Türkiye''de az bulunan türler, lokasyon varyantları, yabani (WC) hatlar ve koruma odaklı üretim.', array['Tür adını Latince ve varsa lokasyon/hat bilgisiyle yaz.', 'Koruma altındaki (CITES) türlerin yasal belgesiz alım-satımı konuşulmaz.', 'Doğaya bırakma (salım) hiçbir şekilde önerilmez.']::text[], true)
on conflict (slug) do nothing;
