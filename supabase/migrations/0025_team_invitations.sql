-- Email-link invitations for inviting NEW users into a team.
--
-- The pre-existing addTeamMember flow could only add people who had
-- already signed up to Loop AND whose display name matched their email
-- prefix (a profile.name ILIKE search). So it failed for the actual
-- invite path: a new hire, no Loop account yet, can't be "added".
--
-- This migration adds a token-keyed invitation row that admins generate
-- from /team/manage. The admin pastes the link into Slack/email
-- manually — no SMTP dependency. When the invitee opens the link, they
-- sign in (Google OAuth or magic link), and the accept page calls the
-- accept_team_invitation RPC which adds them to team_members.
--
-- Why the two SECURITY DEFINER RPCs live in `public` (not app_private,
-- which is where other definer helpers were moved in 0022):
--   * lookup_invitation_by_token is intentionally callable as RPC — the
--     accept page renders for an unauthenticated user reading by token.
--     The token IS the credential; ~256 bits of entropy makes brute-force
--     infeasible. The function returns only public-ish fields (team name,
--     role, inviter name) so there's nothing sensitive to leak.
--   * accept_team_invitation is also intentionally an RPC — the invitee
--     calls it from the client. It cross-checks auth.uid()'s email
--     against the invitation email so a hijacked token can't be used by
--     the wrong user.

begin;

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  -- Stored lowercased so duplicate detection + email match is case-insensitive.
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  -- URL-safe random token. The accept page looks invitations up by
  -- token via lookup_invitation_by_token — the invitee isn't a team
  -- member yet and can't see the row through admin-only RLS.
  token text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- One pending invite per (team, email). Cancelled/accepted rows don't
-- count, so re-inviting after a cancel/expiry works without manual cleanup.
create unique index if not exists team_invitations_one_pending_per_email
  on public.team_invitations(team_id, lower(email))
  where status = 'pending';

create index if not exists team_invitations_team_id_idx
  on public.team_invitations(team_id);
create index if not exists team_invitations_token_idx
  on public.team_invitations(token);

alter table public.team_invitations enable row level security;

-- Admins of the team see + write their team's invitations through normal
-- RLS. Non-admins on the same team can't see them (no privacy reason —
-- just keeps the surface area minimal). Anyone outside the team is fully
-- locked out; they can only reach a specific invitation through the
-- token-keyed RPC below.
--
-- `drop policy if exists` before each create so the migration is safe to
-- re-run after a partial failure (matches the pattern in 0009, 0022).
drop policy if exists "team_invitations_select_admin" on public.team_invitations;
create policy "team_invitations_select_admin" on public.team_invitations
  for select using (app_private.is_team_admin(team_id));

drop policy if exists "team_invitations_insert_admin" on public.team_invitations;
create policy "team_invitations_insert_admin" on public.team_invitations
  for insert with check (app_private.is_team_admin(team_id));

drop policy if exists "team_invitations_update_admin" on public.team_invitations;
create policy "team_invitations_update_admin" on public.team_invitations
  for update
  using (app_private.is_team_admin(team_id))
  with check (app_private.is_team_admin(team_id));

drop policy if exists "team_invitations_delete_admin" on public.team_invitations;
create policy "team_invitations_delete_admin" on public.team_invitations
  for delete using (app_private.is_team_admin(team_id));

-- Lookup-by-token RPC: anon + authenticated. Returns null for unknown
-- or revoked tokens so the page can render a friendly "this link isn't
-- valid" screen instead of leaking which tokens exist.
create or replace function public.lookup_invitation_by_token(t text)
returns table (
  id uuid,
  team_id uuid,
  team_name text,
  email text,
  role text,
  status text,
  expires_at timestamptz,
  invited_by_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.id,
    i.team_id,
    tm.name as team_name,
    i.email,
    i.role,
    -- Synthesise an "expired" status on the fly so the UI doesn't need
    -- to compare timestamps itself.
    case
      when i.status = 'pending' and i.expires_at < now() then 'expired'
      else i.status
    end as status,
    i.expires_at,
    p.name as invited_by_name
  from public.team_invitations i
  join public.teams tm on tm.id = i.team_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = t
  limit 1
$$;

grant execute on function public.lookup_invitation_by_token(text)
  to anon, authenticated, service_role;

-- Accept RPC: validates token + email match, inserts team_members row,
-- marks invitation accepted. SECURITY DEFINER so the invitee can write
-- across both tables atomically without needing admin rights.
--
-- Surfaces clear error messages for each failure mode so the client
-- can render them directly instead of mapping cryptic Postgres errors.
create or replace function public.accept_team_invitation(t text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv record;
  current_uid uuid := (select auth.uid());
  current_email text;
  current_team_id uuid;
begin
  if current_uid is null then
    raise exception 'Not signed in';
  end if;

  select * into inv from public.team_invitations where token = t;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invitation has expired';
  end if;

  -- Cross-check the auth user's email against the invitation email so
  -- a hijacked link can't be used by the wrong person.
  select email into current_email from auth.users where id = current_uid;
  if lower(current_email) <> lower(inv.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  -- One team per user is enforced by team_members_one_team_per_user
  -- (migration 0009). If the user is already on a different team,
  -- surface a clear error instead of letting the unique-index violation
  -- bubble up as a cryptic Postgres error.
  select team_id into current_team_id from public.team_members
    where user_id = current_uid limit 1;
  if current_team_id is not null and current_team_id <> inv.team_id then
    raise exception 'You are already on another team. Leave it first.';
  end if;

  -- Idempotent: re-accepting an already-joined team is a no-op insert.
  insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, current_uid, inv.role)
    on conflict (team_id, user_id) do nothing;

  update public.team_invitations
    set status = 'accepted', accepted_at = now()
    where id = inv.id;

  return inv.team_id;
end;
$$;

grant execute on function public.accept_team_invitation(text)
  to authenticated, service_role;

commit;
