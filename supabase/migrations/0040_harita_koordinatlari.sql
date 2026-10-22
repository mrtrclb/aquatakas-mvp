-- Aquagram — 0040: lokalitelerin ve türlerin doğal yayılım alanlarının haritada gösterimi.
-- species_forms.lat/lng: lokalitenin yaklaşık noktası (ada, resif, köy, nehir kesimi düzeyinde).
-- species.range_areas: türün doğada yaygın görüldüğü bölgeler; her biri merkez + yarıçap (km) olarak kaba bir daire.
--   [{ "label": "Malavi Gölü", "lat": -12.0, "lng": 34.4, "r": 120 }]
-- Tüm koordinatlar yaklaşık kabul edilir; arayüz bunu belirtir.

alter table public.species_forms
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180),
  add constraint species_forms_latlng_pair check ((lat is null) = (lng is null));

alter table public.species
  add column range_areas jsonb not null default '[]'::jsonb check (jsonb_typeof(range_areas) = 'array');

alter table public.species_form_suggestions
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

-- Onayda koordinatlar da forma taşınır
create or replace function public.review_form_suggestion(p_id bigint, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.species_form_suggestions;
  sp_name text;
begin
  if not private.has_permission('species') then raise exception 'Yetkiniz yok.'; end if;
  select * into s from public.species_form_suggestions where id = p_id for update;
  if s.id is null then raise exception 'Öneri bulunamadı.'; end if;
  if s.status <> 'pending' then raise exception 'Bu öneri zaten sonuçlandırılmış.'; end if;
  select name into sp_name from public.species where id = s.species_id;

  if p_approve then
    insert into public.species_forms (species_id, name, kind, origin, note, aliases, images, source_url, position, lat, lng)
    values (s.species_id, s.name, s.kind, s.origin, s.note, s.aliases, s.images, s.source_url,
            coalesce((select max(position) from public.species_forms where species_id = s.species_id), 0) + 1,
            case when s.lng is not null then s.lat end, case when s.lat is not null then s.lng end)
    on conflict (species_id, name) do nothing;
  end if;

  update public.species_form_suggestions
     set status = case when p_approve then 'approved' else 'rejected' end,
         reject_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
         reviewed_by = (select auth.uid()), reviewed_at = now()
   where id = p_id;

  perform private.notify(s.user_id, null, case when p_approve then 'form_suggestion_approved' else 'form_suggestion_rejected' end,
    null, null, null, null, left(coalesce(sp_name, '') || ' – ' || s.name || case when not p_approve and nullif(trim(p_reason), '') is not null then ' (' || trim(p_reason) || ')' else '' end, 300));
  perform private.audit('species_form_suggestion.review', 'species_form_suggestion', p_id::text,
    jsonb_build_object('species', sp_name, 'name', s.name, 'status', case when p_approve then 'approved' else 'rejected' end));
end; $$;
