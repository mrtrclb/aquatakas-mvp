-- Aquagram — 0010: ilan yayın süresi 30 gün
alter table public.listings alter column expires_at set default now() + interval '30 days';
