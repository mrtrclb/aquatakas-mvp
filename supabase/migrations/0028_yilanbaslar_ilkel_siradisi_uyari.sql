-- Aquagram — 0028: "Yılanbaşlar" ve "İlkel & Sıra Dışı Balıklar" ayrı kategoriler; tür profiline uyarı notu alanı
-- Türler silinmez/yeniden oluşturulmaz; yalnızca category_id güncellenir (besliyorum, favori, yorum, id'ler korunur).

alter table public.species add column if not exists care_notice text;

insert into public.kb_categories (id, section, name, emoji, tone, position) values
  ('yilanbaslar', 'tatlisu', 'Yılanbaşlar', '🐍', 'from-lime-300 to-stone-700', 200),
  ('ilkel-siradisi-baliklar', 'tatlisu', 'İlkel & Sıra Dışı Balıklar', '🐉', 'from-stone-400 to-emerald-900', 201)
on conflict (id) do nothing;

update public.species set category_id = 'yilanbaslar'
  where category_id in ('ilkel-baliklar', 'diger-baliklar') and latin ~ '^(Channa|Parachanna) ';
update public.species set category_id = 'ilkel-siradisi-baliklar'
  where category_id = 'ilkel-baliklar'
     or (category_id = 'diger-baliklar' and latin ~ '^(Polypterus|Erpetoichthys|Pantodon|Protopterus|Xenomystus|Chitala|Notopterus|Gnathonemus|Brienomyrus|Gymnarchus|Apteronotus|Monocirrhus|Polycentrus|Osteoglossum|Scleropages) ');
update public.species_suggestions set category_id = 'ilkel-siradisi-baliklar' where category_id = 'ilkel-baliklar';
-- Geçici "ilkel-baliklar" kategorisi boş kalır (arayüzde gösterilmez); istenirse elle silinebilir:
-- delete from public.kb_categories where id = 'ilkel-baliklar';

update public.kb_categories c set position = o.pos from (values
  ('malawi',1),('tanganyika',2),('guney-amerika',3),('orta-amerika',4),('canli-doguranlar',5),('labirentliler',6),
  ('characiformlar',7),('danio-rasboralar',8),('sazangiller',9),('loachlar',10),('kedi-baliklari',11),('killifishler',12),
  ('gokkusaklari',13),('gobyler',14),('aci-su',15),('yilanbaslar',16),('ilkel-siradisi-baliklar',17),('diger-baliklar',18),
  ('karidesler',19),('salyangozlar',20),('kerevitler',21),('deniz-baliklari',22),('mercanlar',23),
  ('rizomlu',24),('govdeli',25),('on-plan',26),('rozet',27),('yuzen',28),('yosunlar',29),('ilkel-baliklar',99)
) as o(id, pos) where c.id = o.id;

-- Yılanbaşlar uyarısı arayüzde kategori varsayılanı olarak gösterilir (src/species.js); tür bazında care_notice ile değiştirilebilir.
-- update public.species set care_notice = 'Yılanbaşlarla ilgili ithalat, ticaret ve bulundurma kuralları ülkeye ve zamana göre değişebilir; bazı türler istilacı potansiyel taşır. Edinmeden önce güncel resmî mevzuatı kontrol edin ve hiçbir koşulda doğaya salmayın.'
--   where category_id = 'yilanbaslar' and care_notice is null;
