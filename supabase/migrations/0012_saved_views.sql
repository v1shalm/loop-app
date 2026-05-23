-- 0012 — Saved views (Linear-style filters that survive page reloads)
--
-- One row per saved view. `scope` says which surface the view applies to
-- (currently 'inbox', can grow later). `config` is JSONB so we can add
-- new filter dimensions without migrating every row. Per-user (no
-- workspace-wide views to start; Notion does that but it's a separate
-- permissions problem we're not solving today).

create table if not exists public.saved_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  scope       text not null check (scope in ('inbox')),
  name        text not null,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists saved_views_user_scope_idx
  on public.saved_views (user_id, scope);

alter table public.saved_views enable row level security;

drop policy if exists "saved_views_owner_all" on public.saved_views;
create policy "saved_views_owner_all" on public.saved_views
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
