-- Aquagram — 0057: "Aquagram Ekibi" mesajları
-- Yönetim panelinden: tüm PRO üyelere, seçilen üyelere ya da İletişim formundan yazan üyeye yanıt.
-- Mesaj üyeye bildirim olarak gider (zil simgesi); tam metin team_messages tablosunda durur.
-- Yeni yetki: messages (Ekip mesajları). Süper yönetici her zaman kullanabilir.

-- Yetki listesine "messages" eklenir
alter table public.staff drop constraint if exists staff_permissions_check;
alter table public.staff add constraint staff_permissions_check
  check (permissions <@ array['reports','content','users','groups','tags','species','ads','settings','contact','messages']);

-- Bildirim türlerine "team_message" eklenir
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['post_like','post_comment','comment_like','feature_approved','feature_rejected','group_join','review','system',
    'content_removed','content_restored','ad_approved','ad_rejected','account_suspended','account_restored','report_resolved',
    'group_closed','group_reopened','verification_approved','verification_rejected','suggestion_approved','suggestion_rejected',
    'form_suggestion_approved','form_suggestion_rejected','team_message']));

create table if not exists public.team_messages (
  id bigint generated always as identity primary key,
  sender_id uuid references public.profiles(id) on delete set null,
  target text not null check (target in ('pro', 'users', 'contact')),
  recipient_count integer not null default 0,
  body text not null check (char_length(trim(body)) between 2 and 2000),
  contact_id bigint references public.contact_messages(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.team_messages enable row level security;

alter table public.notifications add column if not exists team_message_id bigint references public.team_messages(id) on delete cascade;
create index if not exists notifications_team_message_idx on public.notifications (team_message_id) where team_message_id is not null;

-- Ekip mesajları yetkisi olanlar geçmişi görür; üye yalnızca kendisine gelen mesajın tam metnini okur
create policy "ekip mesajlari: ekip gorur" on public.team_messages for select to authenticated
  using (private.has_permission('messages'));
create policy "ekip mesajlari: alici okur" on public.team_messages for select to authenticated
  using (exists (select 1 from public.notifications n where n.team_message_id = team_messages.id and n.user_id = (select auth.uid())));

create or replace function public.admin_team_message(p_target text, p_body text, p_users uuid[] default null, p_contact bigint default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  msg_id bigint;
  recipients uuid[];
  preview text;
  cnt integer;
begin
  if not private.has_permission('messages') then raise exception 'Yetkiniz yok.'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 2 then raise exception 'Mesaj boş olamaz.'; end if;
  if char_length(p_body) > 2000 then raise exception 'Mesaj en fazla 2000 karakter olabilir.'; end if;

  if p_target = 'pro' then
    select array_agg(id) into recipients from public.profiles where pro_until > now();
  elsif p_target = 'users' then
    if coalesce(array_length(p_users, 1), 0) = 0 then raise exception 'En az bir üye seç.'; end if;
    if array_length(p_users, 1) > 500 then raise exception 'Tek seferde en fazla 500 üye seçilebilir.'; end if;
    select array_agg(id) into recipients from public.profiles where id = any(p_users);
  elsif p_target = 'contact' then
    if not private.has_permission('contact') then raise exception 'Yetkiniz yok.'; end if;
    select array[user_id] into recipients from public.contact_messages where id = p_contact and user_id is not null;
    if recipients is null then raise exception 'Bu mesaj bir üyeden gelmemiş; e-postayla yanıtla.'; end if;
  else
    raise exception 'Geçersiz hedef.';
  end if;

  cnt := coalesce(array_length(recipients, 1), 0);
  if cnt = 0 then raise exception 'Gönderilecek üye bulunamadı.'; end if;

  insert into public.team_messages (sender_id, target, recipient_count, body, contact_id)
    values (auth.uid(), p_target, cnt, trim(p_body), p_contact) returning id into msg_id;

  preview := left(regexp_replace(trim(p_body), '\s+', ' ', 'g'), 280);
  insert into public.notifications (user_id, actor_id, type, body, team_message_id)
    select r, null, 'team_message', preview, msg_id from unnest(recipients) as r;

  if p_target = 'contact' then
    update public.contact_messages
      set status = 'answered', handled_by = auth.uid(), handled_at = now(),
          note = coalesce(note || E'\n', '') || 'Aquagram Ekibi olarak site içinden yanıtlandı.'
      where id = p_contact;
  end if;

  perform private.audit('team_message.send', 'team_message', msg_id::text, jsonb_build_object('target', p_target, 'recipients', cnt));
  return cnt;
end $$;
revoke execute on function public.admin_team_message(text, text, uuid[], bigint) from public, anon;
grant execute on function public.admin_team_message(text, text, uuid[], bigint) to authenticated;
