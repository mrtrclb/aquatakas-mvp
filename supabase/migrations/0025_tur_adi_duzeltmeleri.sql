-- Aquagram — 0025: Excel kaynaklı yazım / ad düzeltmeleri
update public.species set name='Nanoluteus', keywords = array_remove(keywords,'nanoluuteus') where slug='cryptoheros-nanoluteus';
update public.species set name='Pasionis', keywords = array_replace(keywords,'pasionesis','pasionis') where slug='thorichthys-pasionis';
update public.species set keywords = array_replace(keywords,'ıstlanum','istlanum ciklet') where slug='nosferatu-istlanum';
update public.species set name='Macmasteri Cüce Ciklet' where slug='apistogramma-macmasteri';
update public.species set name='Heckelii Acara' where slug='acarichthys-heckelii';
update public.species set name='Stergiosi Guianacara' where slug='guianacara-stergiosi';
update public.species set latin='Melanochromis johannii' where slug='pseudotropheus-johannii';
update public.species set latin='Melanochromis cyaneorhabdos' where slug='pseudotropheus-cyaneorhabdos';
