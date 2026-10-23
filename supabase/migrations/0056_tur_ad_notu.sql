-- Aquagram — 0056: Bilimsel ad değişikliği notu (tür adının yanında ⓘ ile gösterilir)
-- Latince adlar değiştirilmedi; güncel adlar arama kelimelerine eklendi (arama ve paylaşım/ilan/soru
-- otomatik tür etiketlemesi bu kelimeleri kullanır).
alter table public.species add column if not exists name_note text;

update public.species s set
  name_note = v.note,
  keywords = array(select distinct k from unnest(coalesce(s.keywords, '{}') || v.extra) as k where k <> '')
from (values
  ('pseudotropheus-elongatus',
   '2016''daki revizyonla Chindongo cinsine taşındı; güncel bilimsel adı Chindongo elongatus. Hobide hâlâ çoğunlukla Pseudotropheus elongatus olarak bilinir.',
   array['chindongo elongatus']),
  ('pseudotropheus-socolofi',
   '2016''daki revizyonla Chindongo cinsine taşındı; güncel bilimsel adı Chindongo socolofi. Hobide hâlâ çoğunlukla Pseudotropheus socolofi olarak bilinir.',
   array['chindongo socolofi']),
  ('neolamprologus-ocellatus',
   'Güncel kaynakların çoğunda Lamprologus cinsine alınmış olarak Lamprologus ocellatus adıyla geçer. Hobide Neolamprologus ocellatus adı da yaygın olarak kullanılır.',
   array['lamprologus ocellatus']),
  ('neolamprologus-ornatipinnis',
   'Güncel kaynakların çoğunda Lamprologus cinsine alınmış olarak Lamprologus ornatipinnis adıyla geçer. Hobide Neolamprologus ornatipinnis adı da kullanılır.',
   array['lamprologus ornatipinnis']),
  ('pseudotropheus-tropheops',
   'Tropheops önceden Pseudotropheus''un alt cinsi sayılıyordu; birçok güncel kaynakta ayrı cins olarak kabul edilip Tropheops tropheops adıyla geçer. Sınıflandırma henüz tam netleşmedi.',
   array['tropheops tropheops']),
  ('pseudotropheus-johannii',
   'Eski adı Pseudotropheus johannii; güncel kaynaklarda Melanochromis cinsinde, Melanochromis johannii olarak geçer.',
   array['pseudotropheus johannii']),
  ('pseudotropheus-cyaneorhabdos',
   'Eski adı Pseudotropheus cyaneorhabdos (Maingano); güncel kaynaklarda Melanochromis cinsinde, Melanochromis cyaneorhabdos olarak geçer.',
   array['pseudotropheus cyaneorhabdos'])
) as v(slug, note, extra)
where s.slug = v.slug;
