-- Aquagram — 0026: Danio & Rasboralar, Loachlar, Gobyler, Yılanbaşlar & İlkel Balıklar kategorileri
insert into public.kb_categories (id, section, name, emoji, tone, position) values
  ('danio-rasboralar', 'tatlisu', 'Danio & Rasboralar', '⚡', 'from-indigo-300 to-sky-600', 100),
  ('loachlar', 'tatlisu', 'Loachlar', '🌀', 'from-amber-200 to-stone-600', 101),
  ('gobyler', 'tatlisu', 'Gobyler', '🐚', 'from-teal-200 to-sky-700', 102),
  ('ilkel-baliklar', 'tatlisu', 'Yılanbaşlar & İlkel Balıklar', '🐉', 'from-stone-400 to-emerald-900', 103)
on conflict (id) do nothing;

update public.kb_categories c set position = o.pos from (values
  ('malawi',1),('tanganyika',2),('guney-amerika',3),('orta-amerika',4),('canli-doguranlar',5),('labirentliler',6),
  ('sazangiller',7),('danio-rasboralar',8),('characiformlar',9),('kedi-baliklari',10),('loachlar',11),('killifishler',12),
  ('gokkusaklari',13),('gobyler',14),('aci-su',15),('ilkel-baliklar',16),('diger-baliklar',17),
  ('karidesler',18),('salyangozlar',19),('kerevitler',20),('deniz-baliklari',21),('mercanlar',22),
  ('rizomlu',23),('govdeli',24),('on-plan',25),('rozet',26),('yuzen',27),('yosunlar',28)
) as o(id, pos) where c.id = o.id;

-- Danio ve rasboralar Sazangiller'den taşınır; ilkel balıklar Diğer'den taşınır
update public.species set category_id = 'danio-rasboralar'
  where category_id = 'sazangiller' and (latin ~ '^(Danio|Devario|Microdevario|Rasbora|Trigonostigma|Boraras|Celestichthys) ');
update public.species set category_id = 'ilkel-baliklar'
  where category_id = 'diger-baliklar' and latin ~ '^(Polypterus|Erpetoichthys|Osteoglossum|Scleropages|Pantodon|Xenomystus|Chitala|Notopterus|Gnathonemus|Protopterus|Channa|Parachanna|Calamoichthys) ';
