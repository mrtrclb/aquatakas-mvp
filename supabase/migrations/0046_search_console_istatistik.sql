-- Aquagram — 0046: Google Search Console istatistikleri (yönetim paneli → İstatistikler)
-- Veri gsc-sync Edge Function'ı ile Search Console API'den çekilir; yalnızca ekip okuyabilir.
-- Kişisel veri yoktur: Google'ın toplu arama verileri (sorgu, sayfa, cihaz, ülke bazında toplamlar).

create table if not exists public.gsc_daily (
  day date primary key,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr real not null default 0,
  position real not null default 0
);

create table if not exists public.gsc_top (
  kind text not null check (kind in ('query', 'page', 'device', 'country')),
  period text not null check (period in ('cur', 'prev')), -- son 28 gün / ondan önceki 28 gün
  key text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr real not null default 0,
  position real not null default 0,
  primary key (kind, period, key)
);

create table if not exists public.gsc_sync (
  id integer primary key default 1 check (id = 1),
  synced_at timestamptz,
  ok boolean not null default false,
  message text,
  range_start date,
  range_end date
);

alter table public.gsc_daily enable row level security;
alter table public.gsc_top enable row level security;
alter table public.gsc_sync enable row level security;
revoke insert, update, delete on public.gsc_daily, public.gsc_top, public.gsc_sync from anon, authenticated;
create policy "arama istatistiklerini ekip görür" on public.gsc_daily for select to authenticated using ((select private.is_staff()));
create policy "arama istatistiklerini ekip görür" on public.gsc_top for select to authenticated using ((select private.is_staff()));
create policy "arama istatistiklerini ekip görür" on public.gsc_sync for select to authenticated using ((select private.is_staff()));
