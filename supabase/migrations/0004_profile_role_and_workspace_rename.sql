-- 0004 — Profile role (shown under name in sidebar) + rename default
-- workspace to "Loop" so older databases stop showing "Tist".

alter table public.profiles
  add column if not exists role text;

update public.workspaces
  set name = 'Loop', emoji = '🔁'
  where id = '00000000-0000-0000-0000-000000000001'
    and name in ('Tist', 'tist', 'TIST');
