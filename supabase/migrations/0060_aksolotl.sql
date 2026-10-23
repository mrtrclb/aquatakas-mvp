-- Aquagram — 0060: Aksolotl (Ambystoma mexicanum) — "Diğer Balıklar" kategorisinin ilk türü + 12 varyete
-- Kategori adı: "Diğer Balıklar & Amfibiler".
-- Görsel numaraları: 779 = tür (yabani tip), 780–790 = varyeteler (scripts/gorsel-numaralari.json "formlar").

update public.kb_categories set name = 'Diğer Balıklar & Amfibiler' where id = 'diger-baliklar';

insert into public.species (slug, name, latin, category_id, kind, difficulty, temperament, description, facts, keywords, is_rare, care_notice, range_areas, status)
values (
  'ambystoma-mexicanum',
  'Aksolotl (Meksika Semenderi)',
  'Ambystoma mexicanum',
  'diger-baliklar',
  'fish',
  'Orta',
  'Barışçıl, tek ya da tür içi',
  'Ömür boyu larva görünümünü ve dış solungaçlarını koruyan (neotenik) bir semender. Kopan uzuvlarını, hatta kalp ve beyin dokusunu yenileyebilmesiyle bilim dünyasının da gözdesidir. Doğada yalnızca Mexico City''deki Xochimilco kanallarında kalmıştır ve kritik tehlike altındadır; hobideki bireylerin tamamı akvaryum üretimidir. Soğuk su, ince kum ya da çıplak taban, zayıf akıntı ve tek tür tank ister.',
  '[["Yetişkin boy","20–30 cm"],["Sıcaklık","14–20 °C (22 °C üstü stres)"],["pH","6.5–8.0"],["Min. akvaryum","80 L (tek birey), 120 L+ önerilir"],["Huy","Barışçıl; balıklarla konmaz"],["Beslenme","Etçil: solucan, batan pelet, kan kurdu"],["Üreme","Yumurtlayan (yumurtaları bitkilere yapıştırır)"],["Köken","Meksika, Xochimilco Gölü"],["Ömür","10–15 yıl"],["Özellikler","Neoteni, uzuv yenileme, soğuk su"]]'::jsonb,
  array['aksolotl','axolotl','meksika semenderi','meksika yürüyen balığı','yürüyen balık','walking fish','ambystoma','ambystoma mexicanum','semender'],
  false,
  'Aksolotl balık değil, bir semenderdir (amfibi). Soğuk su ister: 22 °C üstü strese, 24 °C üstü hastalığa yol açar; yazın fan ya da soğutucu gerekebilir. Çakıl ve iri kumu yutup tıkanabilir, taban ince kum (1 mm altı) ya da çıplak olmalı. Balıklar solungaçlarını ısırır, kendisi de küçük balıkları yer; tek tür tankta tutulmalı. Doğal türü CITES Ek-II listesindedir.',
  '[{"r":40,"lat":19.26,"lng":-99.1,"label":"Xochimilco kanalları (Mexico City)"}]'::jsonb,
  'published'
)
on conflict (slug) do nothing;

insert into public.species_forms (species_id, name, kind, origin, note, aliases, position, status)
select s.id, f.name, 'varyete', f.origin, f.note, f.aliases, f.pos, 'published'
from public.species s
cross join (values
  (0, 'Wild Type', 'Doğal renk', 'Doğadaki renk: zeytin yeşili-kahverengi zemin üzerinde koyu benekler ve altın sarısı parıltılar. En dayanıklı hat olarak bilinir.', array['Yabani tip','Wildtype','Normal']),
  (1, 'Leucistic', 'Akvaryum üretimi', 'Beyaz-pembe gövde, siyah gözler ve kırmızı solungaçlar. Hobide en çok bilinen ve en sık görülen renk.', array['Lösistik','Leu','Pembe aksolotl']),
  (2, 'Piebald', 'Akvaryum üretimi', 'Lösistik zemin üzerinde, özellikle sırt ve başta yoğunlaşan koyu lekeler. Lekeler yaşla artabilir.', array['Benekli lösistik','Pie']),
  (3, 'Golden Albino', 'Akvaryum üretimi', 'Altın sarısı gövde, açık renkli gözler ve parlak yansımalar. Albino olduğu için güçlü ışıktan rahatsız olur; loş ortam önerilir.', array['Altın albino','Gold','Golden']),
  (4, 'White Albino', 'Akvaryum üretimi', 'Bembeyaz gövde, pembe-kırmızı gözler. Lösistikten açık renkli gözleriyle ayrılır; ışığa duyarlıdır.', array['Beyaz albino','Albino']),
  (5, 'Copper', 'Akvaryum üretimi', 'Açık kahverengi-bakır zemin, koyu bakır benekler ve kırmızımsı gözler. Albinizmin farklı bir türüdür.', array['Bakır','Copper albino']),
  (6, 'Melanoid', 'Akvaryum üretimi', 'Koyu siyah-lacivert, parlak altın benekleri olmayan düz renk. Gözün etrafındaki parlak halka da yoktur.', array['Siyah aksolotl','Black melanoid','Melanoid']),
  (7, 'Axanthic', 'Akvaryum üretimi', 'Sarı ve kırmızı pigment taşımaz; gri-siyah tonlarda görünür. Yaşla birlikte biraz açılabilir.', array['Aksantik','Gri aksolotl']),
  (8, 'Lavender', 'Akvaryum üretimi', 'Gümüşi-lila zemin üzerinde koyu benekler. Hobide "Silver Dalmatian" olarak da anılır.', array['Lavanta','Silver Dalmatian']),
  (9, 'GFP', 'Laboratuvar kökenli hat', 'Morötesi (UV) ışık altında yeşil parlayan, genetiği değiştirilmiş hat. Normal ışıkta lösistik ya da albino gibi görünür. Bazı ülkelerde satışı yasaktır; almadan önce yasal durumu kontrol et.', array['Floresan aksolotl','Glow','GFP Leucistic']),
  (10, 'Mosaic', 'Akvaryum üretimi (kalıtsal değil)', 'Vücutta iki farklı rengin karışık lekeler hâlinde bulunduğu, çok nadir görülen durum. Kalıtsal değildir, yavrularına geçmez.', array['Mozaik']),
  (11, 'Chimera', 'Akvaryum üretimi (kalıtsal değil)', 'Vücudun iki yarısı farklı renkte; iki embriyonun erken evrede birleşmesiyle oluşur. Son derece nadirdir ve kalıtsal değildir.', array['Kimera','Yarım yarım aksolotl'])
) as f(pos, name, origin, note, aliases)
where s.slug = 'ambystoma-mexicanum'
  and not exists (select 1 from public.species_forms x where x.species_id = s.id and x.name = f.name);
