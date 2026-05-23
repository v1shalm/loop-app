-- Rich seed for the reviewer demo.
--
-- Goals (from the May 23 UX audit):
--   1. Both admin and member accounts land on real data (no dead pages)
--   2. Inbox has untriaged assignments so reviewers see the triage flow
--   3. Every project column has cards so /projects looks alive
--   4. /upcoming has future-dated tasks
--   5. /assigned-to-me has overdue + today + upcoming buckets
--   6. Comments exist so the task drawer demos the conversation thread
--   7. No em dashes, no profanity, no placeholder copy
--
-- Idempotent: re-running drops the demo-only fixtures and reinserts them.
-- Real user-created data (anything outside the seeded title set) is left alone.

do $$
declare
  v_workspace uuid;
  v_design_team uuid;
  v_eng_team uuid;

  v_alex uuid;  -- Design admin
  v_mia uuid;   -- Design member
  v_ravi uuid;  -- Engineering admin
  v_priya uuid; -- Engineering member

  -- Design projects
  v_p_brand uuid;
  v_p_onboarding uuid;
  v_p_dashboard uuid;
  -- Engineering projects
  v_p_realtime uuid;
  v_p_storage uuid;
  v_p_platform uuid;

  v_now timestamptz := now();
begin
  -- ── Lookup workspace + teams ──────────────────────────────────────────
  select id into v_workspace from public.workspaces limit 1;
  if v_workspace is null then
    raise notice 'No workspace yet — run 0001_init seed first.';
    return;
  end if;

  select id into v_design_team from public.teams
    where workspace_id = v_workspace and name = 'Design' limit 1;
  select id into v_eng_team from public.teams
    where workspace_id = v_workspace and name = 'Engineering' limit 1;

  if v_design_team is null or v_eng_team is null then
    raise notice 'Teams missing — run seed-teams-demo.sql first to create accounts.';
    return;
  end if;

  -- ── Demo accounts (created by seed-teams-demo.sql) ────────────────────
  select id into v_alex  from auth.users where email = 'alex@loop.app';
  select id into v_mia   from auth.users where email = 'mia@loop.app';
  select id into v_ravi  from auth.users where email = 'ravi@loop.app';
  select id into v_priya from auth.users where email = 'priya@loop.app';

  if v_alex is null or v_mia is null or v_ravi is null or v_priya is null then
    raise notice 'Demo accounts missing — run seed-teams-demo.sql first.';
    return;
  end if;

  -- ── Sync profile.role (the trigger creates the row before the seed can
  --    populate role; the previous ON CONFLICT DO NOTHING left it null,
  --    so the sidebar footer fell back to "Team member" for everyone).
  update public.profiles set role = 'Design lead'        where id = v_alex;
  update public.profiles set role = 'Product designer'   where id = v_mia;
  update public.profiles set role = 'Engineering lead'   where id = v_ravi;
  update public.profiles set role = 'Frontend engineer'  where id = v_priya;

  -- The developer (Vishal) signed in during build-out and auto-joined the
  -- Design team. Remove him from the team roster so reviewers see a clean
  -- two-person Design team. His workspace_members row and auth user stay
  -- intact so the personal account still works.
  delete from public.team_members
  where team_id = v_design_team
    and user_id in (
      select p.id from public.profiles p
      where p.id not in (v_alex, v_mia)
    );

  -- Give each demo user a status so Team Pulse and team cards have variety
  update public.profiles set status = null    where id = v_alex;
  update public.profiles set status = 'focus' where id = v_mia;
  update public.profiles set status = 'busy'  where id = v_ravi;
  update public.profiles set status = 'done'  where id = v_priya;

  -- ── Wipe seed fixtures so reseed is clean ─────────────────────────────
  -- Tasks: delete by exact title list (anything else is user-created).
  delete from public.tasks where title in (
    -- old seeds (from seed-teams-demo.sql)
    'Polish onboarding empty states',
    'Sync component naming with engineering',
    'Review dashboard chart spacing',
    'Wire up workflow status backend',
    'Fix realtime reconnect on tab focus',
    'Migrate avatar uploads to Supabase Storage',
    -- new seeds (from this file)
    'Refresh marketing site hero illustration',
    'Audit brand colors for WCAG AA contrast',
    'Ship new logomark to /press',
    'Wire empty states across onboarding flow',
    'Write copy for the welcome email sequence',
    'Settle on icon weight (regular vs duotone)',
    'Polish dashboard chart spacing on small laptops',
    'Spec the project workflow status picker',
    'Document the design system token names',
    'Reduce realtime channel chatter on tab refocus',
    'Stand up Supabase Storage bucket for avatars',
    'Add server-side pagination to the activity feed',
    'Move workflow_status migration to projects table',
    'Investigate slow first-paint on /assigned-to-me',
    'Backfill team_id on legacy task rows',
    'Set up preview deployments for PRs',
    'Tighten typecheck CI to fail on new any',
    'Cron job to compact old realtime presence rows'
  );

  -- Projects: delete by name list.
  delete from public.projects where name in (
    'Brand refresh',
    'Office ops',
    'Team Setup Guide',
    'Onboarding revamp',
    'Dashboard polish',
    'Realtime hardening',
    'Storage & uploads',
    'Platform debt'
  );

  -- ── Projects (3 per team) ─────────────────────────────────────────────
  -- Design
  insert into public.projects
    (workspace_id, team_id, name, emoji, color, created_by, workflow_status, description)
  values
    (v_workspace, v_design_team, 'Brand refresh', '🎨', '#8B5CF6', v_alex,
     'in_progress',
     'Refreshing the visual identity for the v2 site relaunch. Logomark, '
     'palette, and a tighter type ramp.')
  returning id into v_p_brand;

  insert into public.projects
    (workspace_id, team_id, name, emoji, color, created_by, workflow_status, description)
  values
    (v_workspace, v_design_team, 'Onboarding revamp', '🚀', '#06B6D4', v_alex,
     'in_progress',
     'Replace the placeholder onboarding with illustrated empty states + a '
     'three-step welcome flow. Goal is to cut first-task time in half.')
  returning id into v_p_onboarding;

  insert into public.projects
    (workspace_id, team_id, name, emoji, color, created_by, workflow_status, description)
  values
    (v_workspace, v_design_team, 'Dashboard polish', '📊', '#F59E0B', v_alex,
     'waiting_approval',
     'Spacing, density, and chart legibility pass on the analytics '
     'dashboard. Tracking towards the Q3 leadership review.')
  returning id into v_p_dashboard;

  -- Engineering
  insert into public.projects
    (workspace_id, team_id, name, emoji, color, created_by, workflow_status, description)
  values
    (v_workspace, v_eng_team, 'Realtime hardening', '⚡', '#10B981', v_ravi,
     'in_progress',
     'Stop the realtime channel from going stale on tab refocus and reduce '
     'cross-tab chatter when a user has the app open in two windows.')
  returning id into v_p_realtime;

  insert into public.projects
    (workspace_id, team_id, name, emoji, color, created_by, workflow_status, description)
  values
    (v_workspace, v_eng_team, 'Storage & uploads', '🗂️', '#EC4899', v_ravi,
     'draft',
     'Move avatar storage from external URLs to a Supabase Storage bucket so '
     'users can upload a custom avatar.')
  returning id into v_p_storage;

  insert into public.projects
    (workspace_id, team_id, name, emoji, color, created_by, workflow_status, description)
  values
    (v_workspace, v_eng_team, 'Platform debt', '🛠️', '#64748B', v_ravi,
     'in_progress',
     'Boring-but-necessary cleanup: CI, types, legacy migrations, and the '
     'cron jobs nobody loves but everyone needs.')
  returning id into v_p_platform;

  -- ── Tasks ─────────────────────────────────────────────────────────────
  -- Mix of buckets per assignee, using v_now as anchor.
  -- Layout key for due_at offsets:
  --   v_now - 2 days     → overdue
  --   v_now              → today
  --   v_now + 1..14 days → upcoming
  --   null               → no date
  --
  -- triaged_at:
  --   null when author != assignee AND we want it in the inbox
  --   v_now when accepted (default for assigner=self or pre-accepted)

  -- ── DESIGN team (8 tasks) ─────────────────────────────────────────────

  -- Alex (admin) tasks — give the admin real work so My Work isn't empty
  insert into public.tasks (
    workspace_id, team_id, project_id, title, description, priority, status,
    assignee_id, author_id, triaged_at, due_at
  ) values
    (v_workspace, v_design_team, v_p_brand,
     'Refresh marketing site hero illustration',
     'New homepage hero needs an illustration that ties to the brand refresh '
     'palette. Coordinate with the freelancer about delivery format.',
     2, 'doing', v_alex, v_alex, v_now, v_now),

    (v_workspace, v_design_team, v_p_dashboard,
     'Polish dashboard chart spacing on small laptops',
     'Charts feel cramped on 13" screens. Add breathing room between '
     'series labels and tighten the axis ticks.',
     2, 'todo', v_alex, v_alex, v_now, v_now + interval '1 day'),

    (v_workspace, v_design_team, v_p_onboarding,
     'Settle on icon weight (regular vs duotone)',
     'We are mixing two icon weights across surfaces. Pick one and document '
     'the call in the design system page.',
     3, 'todo', v_alex, v_mia, null, v_now + interval '3 days'),

    -- Mia (member) tasks — assigned by Alex, mix of inbox + accepted
    (v_workspace, v_design_team, v_p_onboarding,
     'Wire empty states across onboarding flow',
     'Replace the placeholder gray boxes with the illustrated set from the '
     'brand refresh. Three screens: invite, first task, first comment.',
     1, 'doing', v_mia, v_alex, v_now - interval '1 day', v_now),

    (v_workspace, v_design_team, v_p_brand,
     'Audit brand colors for WCAG AA contrast',
     'Run the new palette through a contrast checker. Flag any token pair '
     'that fails 4.5:1 on text or 3:1 on UI.',
     2, 'todo', v_mia, v_alex, null, v_now + interval '2 days'),

    (v_workspace, v_design_team, v_p_brand,
     'Ship new logomark to /press',
     'Export PNG + SVG at the standard sizes, drop them in the press kit, '
     'and ping marketing to update their slide deck.',
     3, 'todo', v_mia, v_alex, null, v_now + interval '5 days'),

    (v_workspace, v_design_team, v_p_onboarding,
     'Write copy for the welcome email sequence',
     'Three emails: day 0 (set up your team), day 2 (invite teammates), '
     'day 7 (here is what good looks like). Keep each under 80 words.',
     3, 'todo', v_mia, v_alex, v_now, v_now + interval '7 days'),

    -- Older completed task so the activity feed has history
    (v_workspace, v_design_team, v_p_dashboard,
     'Spec the project workflow status picker',
     'Eight states with tinted pills. Picker width equals trigger width.',
     2, 'done', v_mia, v_alex, v_now - interval '3 days',
     v_now - interval '2 days');

  -- ── ENGINEERING team (10 tasks) ───────────────────────────────────────

  -- Ravi (admin) tasks
  insert into public.tasks (
    workspace_id, team_id, project_id, title, description, priority, status,
    assignee_id, author_id, triaged_at, due_at
  ) values
    (v_workspace, v_eng_team, v_p_realtime,
     'Reduce realtime channel chatter on tab refocus',
     'Every refocus opens a fresh channel without closing the previous one. '
     'Track channel handles in a Map keyed by table, close on unmount.',
     1, 'doing', v_ravi, v_ravi, v_now, v_now),

    (v_workspace, v_eng_team, v_p_platform,
     'Investigate slow first-paint on /assigned-to-me',
     'Vercel logs show first-paint averaging 9-11s. Fan out queries, add '
     'Suspense boundaries, dedupe getCurrentProfile across loaders.',
     1, 'todo', v_ravi, v_ravi, v_now, v_now + interval '1 day'),

    (v_workspace, v_eng_team, v_p_platform,
     'Tighten typecheck CI to fail on new any',
     'Add eslint rule that bans new any types. Allowlist the existing call '
     'sites so the rule does not flag the migration that introduced them.',
     3, 'todo', v_ravi, v_ravi, v_now, null),

    -- Priya (member) tasks — three in inbox so triage demo works
    (v_workspace, v_eng_team, v_p_realtime,
     'Document the design system token names',
     'There is no canonical reference for token names in code vs Figma. '
     'Write a one-page index linking each name to its OKLCH value.',
     3, 'todo', v_priya, v_ravi, null, v_now + interval '4 days'),

    (v_workspace, v_eng_team, v_p_storage,
     'Stand up Supabase Storage bucket for avatars',
     'Create the bucket, write the RLS policies (read-public, write-own), '
     'and expose a signed-upload action.',
     1, 'doing', v_priya, v_ravi, v_now - interval '2 days', v_now),

    (v_workspace, v_eng_team, v_p_storage,
     'Migrate avatar uploads to Supabase Storage',
     'Swap the avatar component to read from Storage. Keep the Google URL '
     'as a fallback for users who never upload.',
     2, 'todo', v_priya, v_ravi, null, v_now + interval '6 days'),

    (v_workspace, v_eng_team, v_p_platform,
     'Backfill team_id on legacy task rows',
     'A handful of pre-teams tasks have null team_id. Backfill them into '
     'Design (the only team that existed when they were created).',
     2, 'todo', v_priya, v_ravi, null, v_now + interval '2 days'),

    (v_workspace, v_eng_team, v_p_realtime,
     'Add server-side pagination to the activity feed',
     'Activity feed loads all events since signup. Page it to 50 at a time, '
     'add a cursor to the query.',
     3, 'todo', v_priya, v_ravi, v_now, v_now + interval '8 days'),

    -- Overdue + completed to demonstrate full state coverage
    (v_workspace, v_eng_team, v_p_platform,
     'Set up preview deployments for PRs',
     'Wire Vercel preview URLs into PR comments. Bonus: drop a screenshot '
     'of the home page taken via Playwright.',
     2, 'todo', v_ravi, v_ravi, v_now, v_now - interval '2 days'),

    (v_workspace, v_eng_team, v_p_platform,
     'Cron job to compact old realtime presence rows',
     'Presence rows accumulate forever. Drop anything older than 30 days '
     'nightly.',
     4, 'done', v_priya, v_ravi, v_now - interval '5 days',
     v_now - interval '4 days');

  -- ── Comments + reactions ──────────────────────────────────────────────
  -- Tasks were deleted at the top of this block, which cascades through
  -- task_comments (and from there through comment_reactions). So we can
  -- re-insert without dedup checks.
  --
  -- Each block: get the task id once into a temp variable, then insert
  -- comments and their reactions in order.
  declare
    v_t uuid;
    v_c1 uuid;
    v_c2 uuid;
    v_c3 uuid;
    v_c4 uuid;
  begin
    -- ── Design / Wire empty states across onboarding flow ─────────────
    select id into v_t from public.tasks
      where title = 'Wire empty states across onboarding flow' limit 1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_alex,
        'Looks great so far. Can we make sure the invite state has a '
        'clear secondary action for solo users who do not have a team yet?',
        v_now - interval '6 hours')
      returning id into v_c1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_mia,
        'Good catch. I will add a "set up later" link as the secondary '
        'so the flow does not feel like a dead end.',
        v_now - interval '5 hours')
      returning id into v_c2;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_alex,
        'Perfect. While you are in there, can you also drop the celebratory '
        'state for finishing all three steps? Something quiet, not confetti.',
        v_now - interval '2 hours')
      returning id into v_c3;

    -- A handful of reactions across those comments
    insert into public.comment_reactions (comment_id, user_id, emoji) values
      (v_c1, v_mia,  '👍'),
      (v_c1, v_ravi, '👍'),
      (v_c2, v_alex, '🎉'),
      (v_c2, v_ravi, '🚀'),
      (v_c3, v_mia,  '👍'),
      (v_c3, v_mia,  '❤️');

    -- ── Eng / Reduce realtime channel chatter ─────────────────────────
    select id into v_t from public.tasks
      where title = 'Reduce realtime channel chatter on tab refocus' limit 1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_priya,
        'I can grab the channel-map work this week if you want to focus '
        'on the first-paint investigation.',
        v_now - interval '3 hours')
      returning id into v_c1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_ravi,
        'Sounds good. Open a PR against the realtime-hardening branch '
        'so we can review the channel-handle Map without merging early.',
        v_now - interval '2 hours')
      returning id into v_c2;

    insert into public.comment_reactions (comment_id, user_id, emoji) values
      (v_c1, v_ravi,  '🙏'),
      (v_c1, v_alex,  '👍'),
      (v_c2, v_priya, '👍');

    -- ── Design / Polish dashboard chart spacing ───────────────────────
    select id into v_t from public.tasks
      where title = 'Polish dashboard chart spacing on small laptops' limit 1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_mia,
        'I dropped the latest density spec in the design system page. '
        'Take a look when you get a chance.',
        v_now - interval '40 minutes')
      returning id into v_c1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_alex,
        'Read it. Tightening the tick labels to 11px feels right. The '
        'series gap at 12px is the right call too, anything tighter and '
        'the legend bleeds into the chart on 13-inch laptops.',
        v_now - interval '15 minutes')
      returning id into v_c2;

    insert into public.comment_reactions (comment_id, user_id, emoji) values
      (v_c1, v_alex, '👀'),
      (v_c2, v_mia,  '💯'),
      (v_c2, v_mia,  '🔥');

    -- ── Eng / Stand up Supabase Storage bucket for avatars ────────────
    select id into v_t from public.tasks
      where title = 'Stand up Supabase Storage bucket for avatars' limit 1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_priya,
        'Bucket is up. Read policy is public, write policy keys off '
        'auth.uid() so users only ever write to their own avatar.',
        v_now - interval '1 day')
      returning id into v_c1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_ravi,
        'Nice. Can you double-check the upload size limit before we hand '
        'it off to the migrate-uploads task? Probably want to cap at 2MB.',
        v_now - interval '20 hours')
      returning id into v_c2;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_priya,
        '2MB cap added, with a friendlier error when the file is bigger. '
        'Ready for the migrate-uploads task to pick this up.',
        v_now - interval '1 hour')
      returning id into v_c3;

    insert into public.comment_reactions (comment_id, user_id, emoji) values
      (v_c1, v_ravi,  '🚀'),
      (v_c1, v_alex,  '👍'),
      (v_c2, v_priya, '👍'),
      (v_c3, v_ravi,  '🎉'),
      (v_c3, v_alex,  '🎉');

    -- ── Eng / Set up preview deployments for PRs (overdue) ────────────
    select id into v_t from public.tasks
      where title = 'Set up preview deployments for PRs' limit 1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_ravi,
        'Pushed this past the deadline because the Vercel webhook needs '
        'a service token I do not have yet. Pinged ops to provision one.',
        v_now - interval '4 hours')
      returning id into v_c1;

    insert into public.comment_reactions (comment_id, user_id, emoji) values
      (v_c1, v_priya, '🙏');

    -- ── Design / Refresh marketing site hero illustration ─────────────
    select id into v_t from public.tasks
      where title = 'Refresh marketing site hero illustration' limit 1;

    insert into public.task_comments (task_id, author_id, body, created_at)
      values (v_t, v_mia,
        'The freelancer can deliver SVG by Tuesday. Should I push for '
        'PNG fallbacks too in case the SVG has font issues?',
        v_now - interval '30 minutes')
      returning id into v_c1;

    insert into public.comment_reactions (comment_id, user_id, emoji) values
      (v_c1, v_alex, '👍');
  end;

end $$;
