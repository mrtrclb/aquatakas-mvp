-- Aquagram — 0082: Karides ve salyangoz renk varyeteleri (aynı adlı form varsa eklenmez)
insert into public.species_forms (species_id, name, kind, origin, note, aliases, position, status)
select s.id, v.name, 'varyete', 'Akvaryum üretimi', v.note, v.aliases, v.pos, 'published'
from (values
  ('neocaridina-davidi','Sakura Red','Red Cherry hattından seçilmiş, daha koyu ve tam kırmızı form.',array['Sakura']::text[],9),
  ('neocaridina-davidi','Fire Red','Sakura''dan da yoğun, bacakları dahil tamamen kırmızı en üst kırmızı hat.',array['Painted Fire Red','PFR']::text[],10),
  ('neocaridina-davidi','Red Rili','Kırmızı baş ve kuyruk arasında saydam bir gövde bölümü taşıyan desenli hat.',array['Rili']::text[],11),
  ('neocaridina-davidi','Blue Rili','Mavi-saydam ''rili'' desenli hat.',array[]::text[],12),
  ('neocaridina-davidi','Blue Velvet','Koyu ve parlak mavi hat; Blue Dream''den daha açık tonludur.',array[]::text[],13),
  ('neocaridina-davidi','Snowball','Beyaz-yarı saydam gövdeli, yumurtaları beyaz görünen hat.',array['White Pearl']::text[],14),
  ('neocaridina-davidi','Orange Rili','Turuncu ''rili'' desenli hat.',array[]::text[],15),
  ('caridina-cantonensis-taiwan-bee','Black King Kong','Tamamen koyu mavi-siyah, desensiz Taiwan Bee hattı.',array['King Kong','BKK']::text[],1),
  ('caridina-cantonensis-taiwan-bee','Blue Bolt','Baştan kuyruğa açık mavi-beyaz renkli hat.',array[]::text[],2),
  ('caridina-cantonensis-taiwan-bee','Shadow Panda','Koyu mavi-siyah ve beyaz bantlı, panda desenli hat.',array['Panda']::text[],3),
  ('caridina-cantonensis-taiwan-bee','Red Wine','Tamamen koyu şarap kırmızısı, desensiz hat.',array['Wine Red','Red Ruby']::text[],4),
  ('caridina-cantonensis-taiwan-bee','Black Pinto','Siyah zemin üzerinde beyaz zebra ya da benek desenli hat.',array['Pinto','Black Galaxy Pinto']::text[],5),
  ('caridina-cantonensis-taiwan-bee','Red Pinto','Kırmızı zemin üzerinde beyaz zebra ya da benek desenli hat.',array['Red Galaxy Pinto']::text[],6),
  ('caridina-cantonensis','Mosura','Başı ve gövdesi büyük ölçüde beyaz, yüksek dereceli (SSS) Crystal hattı.',array['SSS','Hinomaru']::text[],4),
  ('caridina-mariae','Orange Eyed Blue Tiger','Turuncu gözlü, koyu mavi gövdeli ve ince çizgili Tiger hattı.',array['OEBT']::text[],2),
  ('caridina-mariae','Black Tiger','Koyu siyah gövdeli Tiger hattı.',array[]::text[],3),
  ('pomacea-bridgesii','Gold','Altın sarısı kabuklu, en yaygın renk.',array['Golden Mystery']::text[],1),
  ('pomacea-bridgesii','Blue','Mavi-gri kabuklu renk formu.',array['Blue Mystery']::text[],2),
  ('pomacea-bridgesii','Ivory','Fildişi beyazı kabuklu renk formu.',array['White Mystery']::text[],3),
  ('pomacea-bridgesii','Purple','Koyu mor kabuk, açık renkli gövde.',array['Purple Mystery']::text[],4),
  ('pomacea-bridgesii','Magenta','Pembe-mor kabuklu renk formu.',array['Pink Mystery']::text[],5),
  ('pomacea-bridgesii','Jade','Yeşilimsi kabuklu renk formu.',array['Jade Mystery']::text[],6),
  ('pomacea-bridgesii','Black','Siyah kabuklu, koyu gövdeli renk formu.',array['Black Mystery']::text[],7),
  ('planorbella-duryi','Red','Kırmızı gövdeli, kahve ya da kırmızı kabuklu en yaygın form.',array['Red Ramshorn']::text[],1),
  ('planorbella-duryi','Pink','Pembe kabuklu renk formu.',array['Pink Ramshorn']::text[],2),
  ('planorbella-duryi','Blue','Mavi-gri kabuklu renk formu.',array['Blue Ramshorn']::text[],3),
  ('planorbella-duryi','Leopard','Kabuğu benekli ''leopar'' desenli form.',array['Leopard Ramshorn']::text[],4)
) as v(slug, name, note, aliases, pos)
join public.species s on s.slug = v.slug
where not exists (select 1 from public.species_forms f where f.species_id = s.id and lower(f.name) = lower(v.name));

-- Mystery snail adı için ⓘ notu
update public.species set name_note = 'Ticarette "mystery snail" adıyla satılan salyangozların çoğu aslında Pomacea diffusa''dır; iki tür birbirine çok benzer ve hobide genellikle aynı adla anılır.',
  keywords = (select array(select distinct unnest(keywords || array['pomacea diffusa','mystery salyangoz'])))
where slug = 'pomacea-bridgesii' and name_note is null;
