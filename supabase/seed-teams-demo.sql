-- Seed: 2 teams + 4 demo users (admin + member per team) + sample tasks.
-- Idempotent: rerun anytime, won't dupe.

do $$
declare
  v_workspace uuid;
  v_design_team uuid;
  v_eng_team uuid;
  v_admin_design uuid;
  v_member_design uuid;
  v_admin_eng uuid;
  v_member_eng uuid;
begin
  -- Pick the first (and only) workspace
  select id into v_workspace from public.workspaces limit 1;
  if v_workspace is null then
    raise notice 'No workspace yet — run the main seed first.';
    return;
  end if;

  -- Teams
  insert into public.teams (workspace_id, name, color)
  values (v_workspace, 'Design', '#8B5CF6')
  on conflict do nothing;
  select id into v_design_team from public.teams
    where workspace_id = v_workspace and name = 'Design' limit 1;

  insert into public.teams (workspace_id, name, color)
  values (v_workspace, 'Engineering', '#06B6D4')
  on conflict do nothing;
  select id into v_eng_team from public.teams
    where workspace_id = v_workspace and name = 'Engineering' limit 1;

  -- Demo users — create via auth.users with a crypt'd password, then mirror
  -- into profiles. handle_new_user trigger should also catch this.
  -- Admin Design: alex@loop.app / alex-loop-2026
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  select
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'alex@loop.app',
    crypt('alex-loop-2026', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Alex Chen","role":"Design lead"}'::jsonb,
    now(), now(), '', '', '', ''
  where not exists (select 1 from auth.users where email = 'alex@loop.app');
  select id into v_admin_design from auth.users where email = 'alex@loop.app';

  -- Member Design: mia@loop.app / mia-loop-2026
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  select
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'mia@loop.app',
    crypt('mia-loop-2026', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Mia Patel","role":"Product designer"}'::jsonb,
    now(), now(), '', '', '', ''
  where not exists (select 1 from auth.users where email = 'mia@loop.app');
  select id into v_member_design from auth.users where email = 'mia@loop.app';

  -- Admin Engineering: ravi@loop.app / ravi-loop-2026
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  select
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'ravi@loop.app',
    crypt('ravi-loop-2026', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Ravi Kumar","role":"Engineering lead"}'::jsonb,
    now(), now(), '', '', '', ''
  where not exists (select 1 from auth.users where email = 'ravi@loop.app');
  select id into v_admin_eng from auth.users where email = 'ravi@loop.app';

  -- Member Engineering: priya@loop.app / priya-loop-2026
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  select
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'priya@loop.app',
    crypt('priya-loop-2026', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Priya Shah","role":"Frontend engineer"}'::jsonb,
    now(), now(), '', '', '', ''
  where not exists (select 1 from auth.users where email = 'priya@loop.app');
  select id into v_member_eng from auth.users where email = 'priya@loop.app';

  -- Ensure profile rows exist (handle_new_user trigger should run on insert,
  -- but belt-and-suspenders)
  insert into public.profiles (id, name, initials, avatar_color, role)
  values
    (v_admin_design, 'Alex Chen', 'AC', '#A855F7', 'Design lead'),
    (v_member_design, 'Mia Patel', 'MP', '#EC4899', 'Product designer'),
    (v_admin_eng, 'Ravi Kumar', 'RK', '#06B6D4', 'Engineering lead'),
    (v_member_eng, 'Priya Shah', 'PS', '#10B981', 'Frontend engineer')
  on conflict (id) do nothing;

  -- Workspace membership (any role at workspace level — teams handle real perms)
  insert into public.workspace_members (workspace_id, user_id, role) values
    (v_workspace, v_admin_design, 'admin'),
    (v_workspace, v_member_design, 'member'),
    (v_workspace, v_admin_eng, 'admin'),
    (v_workspace, v_member_eng, 'member')
  on conflict do nothing;

  -- Team membership
  insert into public.team_members (team_id, user_id, role) values
    (v_design_team, v_admin_design, 'admin'),
    (v_design_team, v_member_design, 'member'),
    (v_eng_team, v_admin_eng, 'admin'),
    (v_eng_team, v_member_eng, 'member')
  on conflict do nothing;

  -- Backfill existing tasks/projects with no team_id → put them in Design
  update public.tasks set team_id = v_design_team where team_id is null;
  update public.projects set team_id = v_design_team where team_id is null;

  -- Sample tasks per team so each demo account lands on real data.
  -- Skip if a sample task already exists.
  if not exists (select 1 from public.tasks where title = 'Polish onboarding empty states') then
    insert into public.tasks
      (workspace_id, team_id, title, description, priority, status, assignee_id, author_id, triaged_at)
    values
      (v_workspace, v_design_team, 'Polish onboarding empty states',
       'Replace the placeholder gray boxes with the illustrated set Mia drafted last week.',
       2, 'todo', v_member_design, v_admin_design, now()),
      (v_workspace, v_design_team, 'Sync component naming with engineering',
       'Mia and Priya to align on Button / Pill / Tag naming so handoff stops causing churn.',
       3, 'todo', v_member_design, v_admin_design, now()),
      (v_workspace, v_design_team, 'Review dashboard chart spacing',
       'Charts feel cramped on smaller laptop screens — add breathing room.',
       2, 'todo', v_admin_design, v_admin_design, now()),
      (v_workspace, v_eng_team, 'Wire up workflow status backend',
       'New workflow_status column on projects needs RLS + a server action. See Ravi for spec.',
       1, 'todo', v_member_eng, v_admin_eng, now()),
      (v_workspace, v_eng_team, 'Fix realtime reconnect on tab focus',
       'Sometimes the realtime channel goes stale and the inbox doesn''t refresh.',
       2, 'todo', v_admin_eng, v_admin_eng, now()),
      (v_workspace, v_eng_team, 'Migrate avatar uploads to Supabase Storage',
       'Right now we only hold the Google profile URL — let users upload a custom one.',
       3, 'todo', v_member_eng, v_admin_eng, now());
  end if;

end $$;
