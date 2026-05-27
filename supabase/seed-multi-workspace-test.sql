-- ============================================================================
-- Multi-workspace test scenario for the reworked org model.
--
-- Run this in the Supabase SQL editor (after the main seed.sql) to get a
-- realistic, login-able dataset for testing multi-membership + switching.
-- Idempotent: safe to re-run.
--
-- It creates THREE workspaces (departments) under the single company
-- workspace, six accounts, deliberate cross-membership, and projects +
-- tasks per workspace:
--
--   Workspace      Members (role)                        Projects
--   ----------     -----------------------------------   --------------------
--   Design         Alex (admin), Mia, Sam (admin)        Website redesign, Design system
--   Engineering    Ravi (admin), Priya, Sam (admin)      API v2, Realtime infra
--   Marketing      Nadia (admin), Mia, Sam (admin)       Q3 launch, Blog refresh
--
-- The two relationships worth testing:
--   * Sam is in ALL three  -> the workspace switcher shows three, switching
--     re-scopes projects/tasks/members. (the "founder" case)
--   * Mia is in Design + Marketing -> multi-membership; her active workspace
--     starts as Marketing, she can switch to Design.
--
-- Log in with email + password (the "or with email" form):
--   alex@loop.app   / alex-loop-2026     (Design admin)
--   mia@loop.app    / mia-loop-2026      (Design + Marketing)
--   ravi@loop.app   / ravi-loop-2026     (Engineering admin)
--   priya@loop.app  / priya-loop-2026    (Engineering member)
--   sam@loop.app    / sam-loop-2026      (in all three — the founder)
--   nadia@loop.app  / nadia-loop-2026    (Marketing admin)
-- ============================================================================

do $$
declare
  v_ws       uuid;
  v_design   uuid;
  v_eng      uuid;
  v_mkt      uuid;
  v_alex uuid; v_mia uuid; v_ravi uuid; v_priya uuid; v_sam uuid; v_nadia uuid;
  v_pd uuid; v_pe uuid; v_pm uuid;
begin
  select id into v_ws from public.workspaces limit 1;
  if v_ws is null then
    raise notice 'No workspace yet — run seed.sql first.';
    return;
  end if;

  -- ── helpers (session-scoped, auto-dropped) ───────────────────────────────
  create or replace function pg_temp.ensure_user(
    p_email text, p_pw text, p_name text, p_initials text, p_color text, p_role text
  ) returns uuid language plpgsql as $f$
  declare uid uuid;
  begin
    select id into uid from auth.users where email = p_email;
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) values (
        uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
        'authenticated', p_email, crypt(p_pw, gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', p_name, 'role', p_role),
        now(), now(), '', '', '', ''
      );
    end if;
    insert into public.profiles (id, name, initials, avatar_color, role)
      values (uid, p_name, p_initials, p_color, p_role)
      on conflict (id) do nothing;
    return uid;
  end $f$;

  create or replace function pg_temp.ensure_project(
    p_ws uuid, p_team uuid, p_name text, p_emoji text, p_color text, p_by uuid
  ) returns uuid language plpgsql as $f$
  declare pid uuid;
  begin
    select id into pid from public.projects
      where team_id = p_team and name = p_name limit 1;
    if pid is null then
      insert into public.projects
        (workspace_id, team_id, name, emoji, color, created_by, workflow_status)
        values (p_ws, p_team, p_name, p_emoji, p_color, p_by, 'active')
        returning id into pid;
    end if;
    return pid;
  end $f$;

  -- ── workspaces (departments) ─────────────────────────────────────────────
  insert into public.teams (workspace_id, name, color) values (v_ws, 'Design', '#8B5CF6') on conflict do nothing;
  insert into public.teams (workspace_id, name, color) values (v_ws, 'Engineering', '#06B6D4') on conflict do nothing;
  insert into public.teams (workspace_id, name, color) values (v_ws, 'Marketing', '#F59E0B') on conflict do nothing;
  select id into v_design from public.teams where workspace_id = v_ws and name = 'Design' limit 1;
  select id into v_eng    from public.teams where workspace_id = v_ws and name = 'Engineering' limit 1;
  select id into v_mkt    from public.teams where workspace_id = v_ws and name = 'Marketing' limit 1;

  -- ── accounts ─────────────────────────────────────────────────────────────
  v_alex  := pg_temp.ensure_user('alex@loop.app',  'alex-loop-2026',  'Alex Chen',   'AC', '#A855F7', 'Design lead');
  v_mia   := pg_temp.ensure_user('mia@loop.app',   'mia-loop-2026',   'Mia Patel',   'MP', '#EC4899', 'Product designer');
  v_ravi  := pg_temp.ensure_user('ravi@loop.app',  'ravi-loop-2026',  'Ravi Kumar',  'RK', '#06B6D4', 'Engineering lead');
  v_priya := pg_temp.ensure_user('priya@loop.app', 'priya-loop-2026', 'Priya Shah',  'PS', '#10B981', 'Frontend engineer');
  v_sam   := pg_temp.ensure_user('sam@loop.app',   'sam-loop-2026',   'Sam Rivera',  'SR', '#F97316', 'Founder');
  v_nadia := pg_temp.ensure_user('nadia@loop.app', 'nadia-loop-2026', 'Nadia Osei',  'NO', '#3B82F6', 'Head of marketing');

  -- ── company (workspace) membership — everyone is in the one company ──────
  insert into public.workspace_members (workspace_id, user_id, role) values
    (v_ws, v_alex, 'admin'), (v_ws, v_mia, 'member'), (v_ws, v_ravi, 'admin'),
    (v_ws, v_priya, 'member'), (v_ws, v_sam, 'admin'), (v_ws, v_nadia, 'admin')
  on conflict do nothing;

  -- ── department membership (multi) ────────────────────────────────────────
  insert into public.team_members (team_id, user_id, role) values
    -- Design
    (v_design, v_alex, 'admin'), (v_design, v_mia, 'member'), (v_design, v_sam, 'admin'),
    -- Engineering
    (v_eng, v_ravi, 'admin'), (v_eng, v_priya, 'member'), (v_eng, v_sam, 'admin'),
    -- Marketing
    (v_mkt, v_nadia, 'admin'), (v_mkt, v_mia, 'member'), (v_mkt, v_sam, 'admin')
  on conflict do nothing;

  -- ── projects per department ──────────────────────────────────────────────
  v_pd := pg_temp.ensure_project(v_ws, v_design, 'Website redesign', '🎨', '#8B5CF6', v_alex);
  perform pg_temp.ensure_project(v_ws, v_design, 'Design system',    '🧩', '#8B5CF6', v_alex);
  v_pe := pg_temp.ensure_project(v_ws, v_eng,    'API v2',           '⚙️', '#06B6D4', v_ravi);
  perform pg_temp.ensure_project(v_ws, v_eng,    'Realtime infra',   '⚡', '#06B6D4', v_ravi);
  v_pm := pg_temp.ensure_project(v_ws, v_mkt,    'Q3 launch',        '🚀', '#F59E0B', v_nadia);
  perform pg_temp.ensure_project(v_ws, v_mkt,    'Blog refresh',     '✍️', '#F59E0B', v_nadia);

  -- ── a few tasks per department (guarded by title so re-runs don't dupe) ──
  if not exists (select 1 from public.tasks where title = 'Redesign the marketing homepage hero') then
    insert into public.tasks (workspace_id, team_id, project_id, title, priority, status, assignee_id, author_id, triaged_at) values
      (v_ws, v_design, v_pd, 'Redesign the marketing homepage hero', 2, 'todo', v_mia,   v_alex,  now()),
      (v_ws, v_design, v_pd, 'Audit color contrast for AA',          3, 'todo', v_alex,  v_alex,  now()),
      (v_ws, v_eng,    v_pe, 'Ship the new auth endpoints',          1, 'todo', v_priya, v_ravi,  now()),
      (v_ws, v_eng,    v_pe, 'Add rate limiting to the public API',  2, 'todo', v_ravi,  v_ravi,  now()),
      (v_ws, v_mkt,    v_pm, 'Draft the Q3 launch announcement',     2, 'todo', v_mia,   v_nadia, now()),
      (v_ws, v_mkt,    v_pm, 'Line up three customer quotes',        3, 'todo', v_nadia, v_nadia, now());
  end if;

  -- ── active workspace (so switching is visible immediately) ───────────────
  -- Mia lands in Marketing (she can switch to Design); Sam lands in Design.
  insert into public.team_active_selection (user_id, team_id) values (v_mia, v_mkt)
    on conflict (user_id) do update set team_id = excluded.team_id;
  insert into public.team_active_selection (user_id, team_id) values (v_sam, v_design)
    on conflict (user_id) do update set team_id = excluded.team_id;

  raise notice 'Multi-workspace test data ready. Log in as sam@loop.app / sam-loop-2026 to see the switcher.';
end $$;
