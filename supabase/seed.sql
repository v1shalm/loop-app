-- ─────────────────────────────────────────────────────────────────────────────
-- Loop — seed data
-- Run AFTER 0001_init.sql.
-- ─────────────────────────────────────────────────────────────────────────────
-- This creates:
--   • The default Loop workspace (id is referenced by handle_new_user trigger)
--   • Three starter projects (Team Setup Guide, Brand refresh, Office ops)
--
-- It does NOT create users. Users are created by Supabase Auth when people
-- sign up via the magic link flow on /login. The handle_new_user() trigger
-- automatically:
--   • inserts a row into profiles
--   • adds them to the Loop workspace as a member
--
-- ─────────────────────────────────────────────────────────────────────────────

-- Default workspace. (Was called "Tist" early in dev; renamed to "Loop".)
insert into public.workspaces (id, name, emoji)
values ('00000000-0000-0000-0000-000000000001', 'Loop', '🔁')
on conflict (id) do update
  set name = excluded.name,
      emoji = excluded.emoji;

insert into public.projects (workspace_id, name, emoji, color)
values
  ('00000000-0000-0000-0000-000000000001', 'Team Setup Guide', '📋', null),
  ('00000000-0000-0000-0000-000000000001', 'Brand refresh',    '✨', null),
  ('00000000-0000-0000-0000-000000000001', 'Office ops',       '🏢', null)
on conflict (workspace_id, name) do nothing;

-- Backfill: add every existing profile to the Loop workspace as a member.
-- (The handle_new_user() trigger only fires for NEW signups, so any users
-- who signed in before this seed ran would otherwise be stuck without
-- workspace access.)
insert into public.workspace_members (workspace_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', id, 'member'
from public.profiles
on conflict do nothing;

-- After your first sign-in, you can uncomment + adapt the block below to
-- pre-populate tasks. Find your profile id with:
--   select id, name from public.profiles;
--
-- insert into public.tasks
--   (workspace_id, project_id, title, priority, due_at, assignee_id, author_id)
-- values
--   ('00000000-0000-0000-0000-000000000001',
--    (select id from public.projects where name = 'Office ops' limit 1),
--    'Send invoices to clients',
--    1,
--    now() + interval '4 hours',
--    '<your profile id here>',
--    '<your profile id here>');
