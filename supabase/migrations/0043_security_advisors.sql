-- 0043 — Security advisor fixes: SECURITY DEFINER function exposure.
--
-- From the Supabase security advisor (lints 0028/0029): every SECURITY
-- DEFINER function in the public schema is EXECUTE-able by PUBLIC + anon
-- (Supabase's default grants). None of these is reachable by an
-- unauthenticated request — the proxy redirects signed-out users to /login
-- before any RPC runs (including the /accept-invite lookup) — so:
--
--   • The 7 callable RPCs: revoke EXECUTE from PUBLIC + anon; keep it for
--     authenticated (the app calls them as a signed-in user) + service_role.
--     The bodies still validate auth.uid()/permissions internally — this just
--     removes the unauthenticated attack surface.
--   • enforce_comment_same_task is a TRIGGER function (returns trigger) and
--     should never be REST-callable. Triggers fire as the table owner
--     regardless of EXECUTE grants, so revoke it from every API role.
--
-- The 0029 "authenticated can execute" advisory remains BY DESIGN for the 7
-- RPCs — they must be callable by signed-in users. That warning is
-- informational; the functions are internally guarded.
--
-- Idempotent and re-runnable.

begin;

-- Callable RPCs → authenticated + service_role only --------------------------
revoke execute on function public.accept_team_invitation(text)                                  from public, anon;
revoke execute on function public.add_team_member(uuid, uuid, text)                             from public, anon;
revoke execute on function public.create_project_for_me(text, uuid, text, text)                 from public, anon;
revoke execute on function public.create_task_for_me(text, text, integer, timestamptz, uuid, uuid, text) from public, anon;
revoke execute on function public.ensure_in_general()                                           from public, anon;
revoke execute on function public.lookup_invitation_by_token(text)                              from public, anon;
revoke execute on function public.mark_notifications_read()                                     from public, anon;

grant execute on function public.accept_team_invitation(text)                                  to authenticated, service_role;
grant execute on function public.add_team_member(uuid, uuid, text)                             to authenticated, service_role;
grant execute on function public.create_project_for_me(text, uuid, text, text)                 to authenticated, service_role;
grant execute on function public.create_task_for_me(text, text, integer, timestamptz, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.ensure_in_general()                                           to authenticated, service_role;
grant execute on function public.lookup_invitation_by_token(text)                              to authenticated, service_role;
grant execute on function public.mark_notifications_read()                                     to authenticated, service_role;

-- Trigger function → not callable by any API role ----------------------------
revoke execute on function public.enforce_comment_same_task() from public, anon, authenticated;

commit;
