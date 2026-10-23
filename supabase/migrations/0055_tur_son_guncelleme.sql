-- Aquagram — 0055: "Son güncellenen profiller" için türün içerik güncelleme zamanı
-- updated_at, besleyen/yorum sayaçları değişince de güncellendiği için ayrı bir sütun tutulur.
-- Yalnızca içerik değişince (ad, açıklama, künye, görsel, uyarı, dağılım...) ya da türe
-- lokalite/varyete eklenip düzenlenince (kabul edilen öneriler dahil) güncellenir.
alter table public.species add column if not exists content_updated_at timestamptz;
update public.species set content_updated_at = created_at where content_updated_at is null;
alter table public.species alter column content_updated_at set default now();

create or replace function private.species_content_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.name, new.latin, new.category_id, new.kind, new.difficulty, new.temperament, new.description, new.facts,
      new.keywords, new.is_rare, new.image_url, new.images, new.care_notice, new.range_areas, new.status)
     is distinct from
     (old.name, old.latin, old.category_id, old.kind, old.difficulty, old.temperament, old.description, old.facts,
      old.keywords, old.is_rare, old.image_url, old.images, old.care_notice, old.range_areas, old.status) then
    new.content_updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists species_content_touch on public.species;
create trigger species_content_touch before update on public.species
  for each row execute function private.species_content_touch();

create or replace function private.species_form_touch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' then
    update public.species set content_updated_at = now() where id = new.species_id;
  end if;
  return null;
end $$;
drop trigger if exists species_form_touch on public.species_forms;
create trigger species_form_touch after insert or update on public.species_forms
  for each row execute function private.species_form_touch();
