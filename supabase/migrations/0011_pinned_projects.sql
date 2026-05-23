-- 0011 — Per-user pinned projects
--
-- Notion's Favorites section. Each user pins the handful of projects
-- they want at the top of the sidebar. An array of UUIDs on profiles
-- keeps it cheap (no extra table, no extra join), and the order in the
-- array is the pin order.

alter table public.profiles
  add column if not exists pinned_project_ids uuid[] not null default '{}';
