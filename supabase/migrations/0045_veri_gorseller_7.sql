-- Aquagram — 0045: 7. görsel paketi (191–232)
update public.species s set images = v.imgs
from (
  select slug, array_agg('https://aquagram.com.tr/media/tur/' || slug || '-' || i || '.webp' order by i)::text[] as imgs
  from (values
  ('nomorhamphus-liemi',3),
  ('poecilia-latipinna',1),
  ('poecilia-reticulata',1),
  ('poecilia-salvatoris',1),
  ('poecilia-sphenops',1),
  ('poecilia-velifera',1),
  ('poecilia-wingei',1),
  ('priapella-intermedia',2),
  ('skiffia-francesae',1),
  ('xenotoca-eiseni',1),
  ('xiphophorus-cortezi',1),
  ('xiphophorus-hellerii',1),
  ('xiphophorus-maculatus',1),
  ('xiphophorus-montezumae',2),
  ('xiphophorus-nezahualcoyotl',1),
  ('xiphophorus-pygmaeus',1),
  ('xiphophorus-variatus',1),
  ('zoogoneticus-tequila',1),
  ('betta-albimarginata',2),
  ('betta-channoides',1),
  ('betta-imbellis',1),
  ('betta-macrostoma',1),
  ('betta-mahachaiensis',1),
  ('betta-pugnax',1),
  ('betta-simplex',1),
  ('betta-smaragdina',1),
  ('betta-splendens',1),
  ('betta-unimaculata',1),
  ('ctenopoma-acutirostre',1),
  ('helostoma-temminckii',1),
  ('luciocephalus-pulcher',2),
  ('macropodus-ocellatus',1),
  ('macropodus-opercularis',1),
  ('macropodus-spechti',1),
  ('microctenopoma-ansorgii',1),
  ('microctenopoma-fasciolatum',2),
  ('osphronemus-goramy',3),
  ('parosphromenus-deissneri',1),
  ('parosphromenus-linkei',2),
  ('parosphromenus-nagyi',1),
  ('pseudosphromenus-cupanus',1)
  ) as t(slug, adet), generate_series(1, adet) as i
  group by slug
) v
where s.slug = v.slug;
