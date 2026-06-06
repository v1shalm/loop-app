-- 0044 — Per-user dashboard (widget canvas home).
-- Owner-only RLS, so the app writes directly (no SECURITY DEFINER RPC needed).
-- Idempotent and re-runnable.

begin;

-- One row per user: the lock flag (room for multi-dashboard later).
create table if not exists public.dashboards (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per placed widget.
create table if not exists public.dashboard_widgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  position   int  not null default 0,
  size       text not null default 'M' check (size in ('S','M','L')),
  settings   jsonb not null default '{}'::jsonb,
  grid       jsonb,                       -- reserved for Approach A (x/y/w/h)
  created_at timestamptz not null default now()
);

create index if not exists dashboard_widgets_user_pos_idx
  on public.dashboard_widgets (user_id, position);

alter table public.dashboards        enable row level security;
alter table public.dashboard_widgets enable row level security;

-- Owner-only policies (wrap auth.uid() in select per the perf lint).
drop policy if exists "dashboards_owner" on public.dashboards;
create policy "dashboards_owner" on public.dashboards
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dashboard_widgets_owner" on public.dashboard_widgets;
create policy "dashboard_widgets_owner" on public.dashboard_widgets
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.dashboards        to authenticated;
grant select, insert, update, delete on public.dashboard_widgets to authenticated;

commit;
