-- Aquagram — 0012: yönetim paneli ekleri
--  1) Ayar, tür ve tür önerisi değişiklikleri işlem kaydına yazılır
--  2) Yasaklı kelimeler (site_settings.banned_words) paylaşım, yorum, tür deneyimi, ilan ve grup metinlerinde engellenir

-- ---------------------------------------------------------------------------
-- 1) İşlem kaydı
-- ---------------------------------------------------------------------------
create or replace function private.stamp_setting()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end; $$;
create trigger site_settings_stamp before insert or update on public.site_settings
  for each row execute function private.stamp_setting();

create or replace function private.audit_setting()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (tg_op = 'INSERT' or new.value is distinct from old.value) then
    perform private.audit('settings.update', 'setting', new.key, jsonb_build_object('key', new.key));
  end if;
  return null;
end; $$;
create trigger site_settings_audit after insert or update on public.site_settings
  for each row execute function private.audit_setting();

create or replace function private.audit_species()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (
    new.status is distinct from old.status or new.is_rare is distinct from old.is_rare or new.name is distinct from old.name
    or new.description is distinct from old.description or new.facts is distinct from old.facts or new.category_id is distinct from old.category_id
  ) then
    perform private.audit('species.update', 'species', new.id::text,
      jsonb_build_object('name', new.name, 'status', new.status, 'is_rare', new.is_rare));
  end if;
  return null;
end; $$;
create trigger species_audit after update on public.species
  for each row execute function private.audit_species();

create or replace function private.stamp_species_suggestion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;
  return new;
end; $$;
create trigger species_suggestions_stamp before update on public.species_suggestions
  for each row execute function private.stamp_species_suggestion();

create or replace function private.audit_species_suggestion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform private.audit('species_suggestion.review', 'species_suggestion', new.id::text,
      jsonb_build_object('name', new.name, 'status', new.status));
  end if;
  return null;
end; $$;
create trigger species_suggestions_audit after update on public.species_suggestions
  for each row execute function private.audit_species_suggestion();

-- ---------------------------------------------------------------------------
-- 2) Yasaklı kelimeler
-- ---------------------------------------------------------------------------
-- Kelime başından eşleşir (Türkçe ekler için sonu serbest): "dolandırıcı" → "dolandırıcılar" da yakalanır
create or replace function private.check_banned_words(p_text text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  w text;
  haystack text := lower(coalesce(p_text, ''));
begin
  if haystack = '' then return; end if;
  for w in
    select lower(trim(x)) from public.site_settings s, jsonb_array_elements_text(s.value) as x
    where s.key = 'banned_words' and jsonb_typeof(s.value) = 'array'
  loop
    if w <> '' and haystack ~ ('(^|[^[:alnum:]_çğıöşü])' || regexp_replace(w, '([.*+?^${}()|\[\]\\])', '\\\1', 'g')) then
      raise exception 'İçerikte izin verilmeyen bir ifade var.' using errcode = 'P0001';
    end if;
  end loop;
end; $$;

create or replace function private.enforce_banned_words()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name in ('posts', 'comments', 'species_comments') then
    perform private.check_banned_words(new.text);
  elsif tg_table_name = 'listings' then
    perform private.check_banned_words(coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
  elsif tg_table_name = 'groups' then
    perform private.check_banned_words(coalesce(new.name, '') || ' ' || coalesce(new.description, ''));
  end if;
  return new;
end; $$;

-- Yalnızca metin alanı değiştiğinde çalışır (durum güncellemeleri, sayaçlar vb. etkilenmez)
create trigger posts_banned_words before insert or update of text on public.posts
  for each row execute function private.enforce_banned_words();
create trigger comments_banned_words before insert or update of text on public.comments
  for each row execute function private.enforce_banned_words();
create trigger species_comments_banned_words before insert or update of text on public.species_comments
  for each row execute function private.enforce_banned_words();
create trigger listings_banned_words before insert or update of title, description on public.listings
  for each row execute function private.enforce_banned_words();
create trigger groups_banned_words before insert or update of name, description on public.groups
  for each row execute function private.enforce_banned_words();

revoke execute on function private.stamp_setting(), private.audit_setting(), private.audit_species(),
  private.stamp_species_suggestion(), private.audit_species_suggestion(), private.enforce_banned_words(),
  private.check_banned_words(text) from public;
