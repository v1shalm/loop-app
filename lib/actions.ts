"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getDefaultWorkspace,
  getMyTeam,
  getMyTeams,
  hasTaskSortOrder,
} from "@/lib/queries";
import type { ProfileStatus } from "@/lib/queries";

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  project_name: string | null;
  project_emoji: string | null;
  assignee_name: string | null;
  assignee_color: string | null;
  assignee_initials: string | null;
  assignee_avatar_url: string | null;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  emoji: string | null;
  open_count: number;
}

export interface SearchPersonResult {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
  avatar_url: string | null;
  role: string | null;
}

export interface SearchResults {
  tasks: SearchTaskResult[];
  projects: SearchProjectResult[];
  people: SearchPersonResult[];
}

/**
 * Cmd+K palette search. Looks across tasks, projects, and teammates in one
 * call and groups the results. RLS scopes everything to the workspace.
 */
export async function searchAll(query: string): Promise<SearchResults> {
  const empty: SearchResults = { tasks: [], projects: [], people: [] };
  const q = query.trim();
  if (q.length < 2) return empty;

  const supabase = await getSupabaseServer();
  if (!supabase) return empty;

  const like = `%${q}%`;

  const tasksP = (supabase
    .from("tasks")
    .select(
      "id, title, status, project:projects(name, emoji), assignee:profiles!tasks_assignee_id_fkey(name, avatar_color, initials, avatar_url)"
    )
    .or(`title.ilike.${like},description.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(6) as any);

  const projectsP = supabase
    .from("projects")
    .select("id, name, emoji")
    .ilike("name", like)
    .limit(4);

  const peopleP = supabase
    .from("profiles")
    .select("id, name, initials, avatar_color, avatar_url, role")
    .ilike("name", like)
    .limit(4);

  const [tasksR, projectsR, peopleR] = await Promise.all([
    tasksP,
    projectsP,
    peopleP,
  ]);

  type TaskRow = {
    id: string;
    title: string;
    status: string;
    project: { name: string; emoji: string | null } | null;
    assignee: {
      name: string;
      avatar_color: string;
      initials: string;
      avatar_url: string | null;
    } | null;
  };
  type ProjectRow = { id: string; name: string; emoji: string | null };
  type PersonRow = {
    id: string;
    name: string;
    initials: string;
    avatar_color: string;
    avatar_url: string | null;
    role: string | null;
  };

  // Count open tasks per matched project so the result shows "N open"
  const projectIds = ((projectsR.data ?? []) as ProjectRow[]).map((p) => p.id);
  const counts = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: openTasks } = await supabase
      .from("tasks")
      .select("project_id")
      .neq("status", "done")
      .in("project_id", projectIds);
    for (const row of openTasks ?? []) {
      if (row.project_id) {
        counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
      }
    }
  }

  return {
    tasks: ((tasksR.data ?? []) as TaskRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      project_name: r.project?.name ?? null,
      project_emoji: r.project?.emoji ?? null,
      assignee_name: r.assignee?.name ?? null,
      assignee_color: r.assignee?.avatar_color ?? null,
      assignee_initials: r.assignee?.initials ?? null,
      assignee_avatar_url: r.assignee?.avatar_url ?? null,
    })),
    projects: ((projectsR.data ?? []) as ProjectRow[]).map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      open_count: counts.get(p.id) ?? 0,
    })),
    people: ((peopleR.data ?? []) as PersonRow[]).map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      avatar_color: p.avatar_color,
      avatar_url: p.avatar_url,
      role: p.role,
    })),
  };
}

export async function createProject(
  input: { name: string; color?: string | null; emoji?: string | null } | string,
  emojiCompat?: string | null
): Promise<{ ok?: true; projectId?: string; error?: string }> {
  // Back-compat: legacy callers passed `(name, emoji?)`. New callers pass
  // an input object so the action can grow (color now, description later)
  // without churning every call site again.
  const args =
    typeof input === "string"
      ? { name: input, emoji: emojiCompat ?? null, color: null }
      : input;

  const trimmed = args.name?.trim();
  if (!trimmed) return { error: "Project name required." };
  if (trimmed.length > 60) return { error: "Project name too long." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  // Atomic create: the RPC inserts the project AND the creator's
  // project_members row in one transaction. Without that, RLS would
  // block the select-back of the new project id (the creator isn't a
  // member yet at .select() time).
  const { data, error } = await (supabase as any).rpc(
    "create_project_for_me",
    {
      p_name: trimmed,
      p_color: args.color?.trim() || null,
      p_emoji: args.emoji?.trim() || null,
    }
  );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, projectId: data as string };
}

/**
 * Delete a project. RLS (`projects_all_members`) limits this to members
 * of the project's workspace. Tasks aren't lost: the `tasks.project_id`
 * FK is `on delete set null`, so they fall back to the Inbox instead of
 * being deleted with the project.
 */
export async function deleteProject(
  projectId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  dueAt?: string | null; // ISO
  projectId?: string | null;
  assigneeId?: string | null;
  /** Recurrence rule (see lib/recurrence.ts). Completing the task then
   *  advances its due date instead of marking it done. */
  recurrence?: string | null;
}

function revalidateTaskRoutes(_projectId?: string | null) {
  // One layout-level revalidation invalidates every (app) page + the sidebar
  // counts in a single hop, instead of 8 path-by-path stale signals.
  revalidatePath("/", "layout");
}

// ── Team management (admin-only via RLS) ─────────────────────────────────

/**
 * Onboarding step for first-time users: create a brand-new team and add
 * the caller as its admin. Models the "first one in is the owner"
 * convention that Linear, Notion, Slack, and Asana all share. The user
 * never picks their own role; the role flows from how they arrived
 * (creator → admin, invitee → whatever the inviter chose).
 *
 * Returns the new team's id so the caller can route into the app
 * immediately without a refetch.
 */
export async function createTeam(input: {
  name: string;
  color?: string | null;
  /** When true, seed 5 starter tasks + 1 sample project so the new
   *  team's surfaces aren't empty on first paint. Mirrors how Todoist
   *  defaults a fresh inbox into a partly-filled state instead of a
   *  blank canvas. */
  seedSamples?: boolean;
}): Promise<{ ok?: true; teamId?: string; error?: string }> {
  const name = input.name?.trim();
  if (!name) return { error: "Team name is required." };
  if (name.length > 60) return { error: "Team name is too long." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const workspace = await getDefaultWorkspace();
  if (!workspace) return { error: "Workspace missing." };

  // Multi-membership: a user can belong to (and create) several teams,
  // so there's no longer a one-team-per-user gate here.

  const teamIns = await (supabase as any)
    .from("teams")
    .insert({
      workspace_id: workspace.id,
      name,
      color: input.color ?? "#8B5CF6",
    })
    .select("id")
    .single();

  if (teamIns.error) return { error: teamIns.error.message };

  const memberIns = await (supabase as any).from("team_members").insert({
    team_id: teamIns.data.id,
    user_id: profile.id,
    role: "admin",
  });

  if (memberIns.error) {
    // Best-effort rollback: drop the empty team we just created so the
    // workspace doesn't accumulate ghost rows on the failure path.
    await (supabase as any).from("teams").delete().eq("id", teamIns.data.id);
    // Translate the RLS bootstrap error into something a user can act on.
    // If they hit this it almost certainly means migration 0016 hasn't
    // been applied to their Supabase yet.
    const msg = memberIns.error.message ?? "";
    if (
      msg.includes("row-level security") &&
      msg.includes("team_members")
    ) {
      return {
        error:
          "Apply migration 0016_team_members_first_admin_bootstrap.sql in your Supabase SQL editor, then try again.",
      };
    }
    return { error: msg || "Could not add you to the new team." };
  }

  // Land the creator in the team they just made (active workspace). RLS
  // lets a user write only their own selection row.
  await (supabase as any)
    .from("team_active_selection")
    .upsert(
      { user_id: profile.id, team_id: teamIns.data.id },
      { onConflict: "user_id" }
    );

  // Optional starter content. Five short, generic tasks that work for
  // any team type (eng / design / marketing / etc.). One sample project
  // so the projects board has a column. Failures here don't fail the
  // create — the team exists, the user can still use the app.
  if (input.seedSamples) {
    const proj = await (supabase as any)
      .from("projects")
      .insert({
        workspace_id: workspace.id,
        team_id: teamIns.data.id,
        name: "Starter project",
        emoji: "✨",
        color: input.color ?? "#8B5CF6",
        created_by: profile.id,
        workflow_status: "active",
        description:
          "Sample project so the board has a column on first paint. " +
          "Delete it when your real work is in.",
      })
      .select("id")
      .single();

    const projectId = proj.data?.id ?? null;
    const now = new Date();
    const day = (offset: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      return d.toISOString();
    };

    const samples = [
      {
        title: "Welcome to Loop. Take a quick look around.",
        description:
          "My Day is your daily list. Inbox is anything teammates send you. Upcoming covers the next two weeks.",
        priority: 3,
        due_at: day(0),
      },
      {
        title: "Invite a teammate",
        description:
          "Loop works best with at least one other person. Open Team → Manage from the sidebar, generate an invite link, and share it with them.",
        priority: 2,
        due_at: day(1),
      },
      {
        title: "Add a project for your real work",
        description:
          "Group related tasks under a project. Use the + next to Projects in the sidebar.",
        priority: 2,
        due_at: day(2),
      },
      {
        title: "Try the natural-language quick add",
        description:
          "Hit Q anywhere to open Add task. Type something like \"Spec review @teammate p1 friday\".",
        priority: 3,
        due_at: null,
      },
      {
        title: "Delete this starter project when you're done",
        description: "Right-click the project in the sidebar to remove it.",
        priority: 4,
        due_at: day(7),
      },
    ];

    await (supabase as any).from("tasks").insert(
      samples.map((s) => ({
        workspace_id: workspace.id,
        team_id: teamIns.data.id,
        project_id: projectId,
        title: s.title,
        description: s.description,
        priority: s.priority,
        status: "todo",
        assignee_id: profile.id,
        author_id: profile.id,
        triaged_at: new Date().toISOString(),
        due_at: s.due_at,
      }))
    );
  }

  revalidatePath("/", "layout");
  return { ok: true, teamId: teamIns.data.id };
}

export async function addTeamMember(
  email: string,
  role: "admin" | "member"
): Promise<{ ok?: true; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Email required." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const team = await getMyTeam();
  if (!team) return { error: "You're not on a team." };

  // Look up the profile by email via auth.users → profiles join
  const { data: target } = await (supabase
    .from("profiles")
    .select("id")
    .ilike("name", `%${trimmed.split("@")[0]}%`)
    .limit(1) as any);

  if (!target || target.length === 0) {
    return {
      error:
        "No user with that email is in the workspace. They'll need to sign up first.",
    };
  }

  const { error } = await (supabase.from("team_members").insert({
    team_id: team.id,
    user_id: target[0].id,
    role,
  }) as any);

  if (error) {
    if (error.message.includes("duplicate")) {
      return { error: "Already on a team." };
    }
    return { error: error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeTeamMember(
  userId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const team = await getMyTeam();
  if (!team) return { error: "You're not on a team." };

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", team.id)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeTeamMemberRole(
  userId: string,
  role: "admin" | "member"
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const team = await getMyTeam();
  if (!team) return { error: "You're not on a team." };

  const { error } = await (supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", team.id)
    .eq("user_id", userId) as any);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Switch which team (workspace) the user is currently viewing. The
 * active selection drives app_private.my_team_id(), so this re-scopes
 * every team-scoped query and RLS check to the chosen team.
 */
export async function setActiveTeam(
  teamId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  // Only switch to a team they actually belong to.
  const teams = await getMyTeams();
  if (!teams.some((t) => t.id === teamId)) {
    return { error: "You're not a member of that workspace." };
  }

  const { error } = await (supabase as any)
    .from("team_active_selection")
    .upsert(
      { user_id: profile.id, team_id: teamId },
      { onConflict: "user_id" }
    );
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Team invitations ──────────────────────────────────────────────────────────
//
// Admins generate a token-keyed invitation row that yields a shareable
// URL (`<origin>/accept-invite/<token>`). The admin pastes that link
// into Slack/email; the recipient signs in to Loop (Google OAuth or
// magic link), then accepts via the accept_team_invitation RPC.
//
// We deliberately don't auto-send the email here — no SMTP dependency,
// no service-role-key requirement. The migration is set up for an
// email-delivery path to be bolted on later without schema changes.

/**
 * URL-safe random token. 32 bytes → 43 chars in base64url, ~256 bits of
 * entropy. Brute-forcing this is infeasible, so the token itself is
 * the auth credential for the lookup_invitation_by_token RPC.
 */
function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url, no padding
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface SendInviteResult {
  ok?: true;
  error?: string;
  /** Token to build the accept-invite URL on the client. */
  token?: string;
}

export async function sendInvite(
  email: string,
  role: "admin" | "member"
): Promise<SendInviteResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Email required." };
  // Light validation — Postgres won't reject malformed addresses, and
  // a typo silently creates an invitation that no one can accept.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return { error: "That doesn't look like an email address." };
  }

  // Everything below runs in a try so any unexpected throw (network
  // failure, missing table/RPC, a runtime error) comes back as a
  // readable toast. Without it, an uncaught throw makes the server
  // action return an error page, which the client surfaces as the
  // opaque "An unexpected response was received from the server".
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return { error: "Supabase not configured." };

    const [profile, team] = await Promise.all([
      getCurrentProfile(),
      getMyTeam(),
    ]);
    if (!profile) return { error: "Not signed in." };
    if (!team) return { error: "You're not on a team." };

    const token = generateInviteToken();

    // team_invitations isn't in the generated database.types yet — use
    // the same `(supabase as any)` cast pattern as the other recent
    // tables (saved_views, etc.).
    const { error } = await (supabase as any)
      .from("team_invitations")
      .insert({
        team_id: team.id,
        email: trimmed,
        role,
        token,
        invited_by: profile.id,
      });

    if (error) {
      if (
        error.message.includes("team_invitations_one_pending_per_email") ||
        error.message.toLowerCase().includes("duplicate")
      ) {
        return {
          error:
            "There's already a pending invite for that email. Cancel it first.",
        };
      }
      return { error: error.message };
    }

    revalidatePath("/workspace/manage");
    return { ok: true, token };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't send the invite.",
    };
  }
}

export async function cancelInvite(
  invitationId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  // RLS handles the admin check — non-admins get a no-op update.
  const { error, data } = await (supabase as any)
    .from("team_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending")
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Couldn't cancel — invitation may already be accepted." };
  }
  revalidatePath("/team/manage");
  return { ok: true };
}

/**
 * Called by the accept-invite page when the signed-in invitee clicks
 * the Accept button. Delegates to the accept_team_invitation Postgres
 * RPC, which enforces all the cross-table constraints (email match,
 * one-team-per-user, status, expiry) atomically.
 */
export async function acceptInvite(
  token: string
): Promise<{ teamId?: string; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  // RPC isn't in the generated types (database.types only knows the
  // pre-existing helpers). Cast to any to bypass the union check.
  const { data, error } = await (supabase as any).rpc(
    "accept_team_invitation",
    { t: token }
  );

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { teamId: data as string };
}

export async function createTask(
  input: CreateTaskInput
): Promise<{ ok?: true; taskId?: string; error?: string }> {
  const title = input.title?.trim();
  if (!title) return { error: "Task title required." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const [profile, workspace] = await Promise.all([
    getCurrentProfile(),
    getDefaultWorkspace(),
  ]);
  if (!profile) return { error: "Not signed in." };
  if (!workspace)
    return {
      error:
        "No workspace yet. Run supabase/seed.sql in the Supabase SQL Editor.",
    };

  // Self-assigned tasks are auto-triaged so they don't show up in the Inbox.
  const assigneeId = input.assigneeId ?? profile.id;
  const triagedAt = assigneeId === profile.id ? new Date().toISOString() : null;

  // sort_order = current epoch ms means new tasks land at the top of
  // any list ordered by sort_order DESC (migration 0015). When the
  // migration hasn't been applied yet, we drop the column from the
  // payload so insert doesn't 400.
  const useSortOrder = await hasTaskSortOrder();
  const insertPayload: Record<string, unknown> = {
    workspace_id: workspace.id,
    project_id: input.projectId ?? null,
    title,
    description: input.description ?? null,
    priority: input.priority ?? 4,
    due_at: input.dueAt ?? null,
    assignee_id: assigneeId,
    author_id: profile.id,
    triaged_at: triagedAt,
  };
  if (useSortOrder) insertPayload.sort_order = Date.now();
  // Only attach recurrence when set, so task creation still works before
  // migration 0029 lands (only recurring tasks need the new column).
  if (input.recurrence) insertPayload.recurrence = input.recurrence;
  const { data, error } = await (supabase as any)
    .from("tasks")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Auto-add the assignee to the project so the task they own is
  // visible to them. RLS lets any workspace member do this.
  if (input.projectId && assigneeId && assigneeId !== profile.id) {
    await (supabase as any)
      .from("project_members")
      .upsert(
        { project_id: input.projectId, user_id: assigneeId, role: "member" },
        { onConflict: "project_id,user_id", ignoreDuplicates: true }
      );
  }

  revalidateTaskRoutes(input.projectId ?? null);
  return { ok: true, taskId: data?.id as string | undefined };
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: 1 | 2 | 3 | 4;
  dueAt?: string | null;
  projectId?: string | null;
  assigneeId?: string | null;
  recurrence?: string | null;
}

export async function updateTask(
  id: string,
  patch: UpdateTaskInput
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const update: {
    title?: string;
    description?: string | null;
    priority?: number;
    due_at?: string | null;
    project_id?: string | null;
    assignee_id?: string | null;
    recurrence?: string | null;
  } = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.projectId !== undefined) update.project_id = patch.projectId;
  if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId;
  if (patch.recurrence !== undefined) update.recurrence = patch.recurrence;
  if (Object.keys(update).length === 0) return { ok: true };

  // `recurrence` isn't in the generated Row type until types are
  // regenerated post-0029, so widen the payload.
  const { error } = await supabase
    .from("tasks")
    .update(update as never)
    .eq("id", id);
  if (error) return { error: error.message };

  // If we just reassigned the task and it lives in a project, make
  // sure the new assignee is a project member so the task is visible
  // to them. ignoreDuplicates leaves an existing 'admin' row alone.
  if (patch.assigneeId) {
    const { data: t } = await (supabase as any)
      .from("tasks")
      .select("project_id")
      .eq("id", id)
      .maybeSingle();
    if (t?.project_id) {
      await (supabase as any)
        .from("project_members")
        .upsert(
          {
            project_id: t.project_id,
            user_id: patch.assigneeId,
            role: "member",
          },
          { onConflict: "project_id,user_id", ignoreDuplicates: true }
        );
    }
  }

  revalidateTaskRoutes(patch.projectId ?? undefined);
  return { ok: true };
}

export interface UpdateProjectInput {
  name?: string;
  emoji?: string | null;
  description?: string | null;
  workflowStatus?: import("@/lib/queries").WorkflowStatus | null;
}

export async function updateProject(
  id: string,
  patch: UpdateProjectInput
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const update: {
    name?: string;
    emoji?: string | null;
    description?: string | null;
    workflow_status?: string | null;
  } = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.emoji !== undefined) update.emoji = patch.emoji;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.workflowStatus !== undefined)
    update.workflow_status = patch.workflowStatus;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("projects")
    .update(update as any)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface CommentRow {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  /** Null for top-level comments; set to the root comment's id for
   *  replies. The data model is one-level (replies cannot themselves be
   *  replied to) — enforced by a DB trigger and mirrored client-side. */
  parent_comment_id: string | null;
  author: {
    id: string;
    name: string;
    initials: string;
    avatar_color: string;
    avatar_url: string | null;
  } | null;
  /** Raw reaction rows for this comment, joined from comment_reactions.
   *  The UI rolls them up into emoji + count + did-I-react. Server-side
   *  joining means we avoid an extra round-trip when the drawer opens. */
  reactions?: { emoji: string; user_id: string }[];
}

export async function addComment(
  taskId: string,
  body: string,
  parentCommentId?: string | null
): Promise<{ ok?: true; comment?: CommentRow; error?: string }> {
  const text = body?.trim();
  if (!text) return { error: "Comment can't be empty." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const { data, error } = await ((supabase as any)
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_id: profile.id,
      body: text,
      parent_comment_id: parentCommentId ?? null,
    })
    .select(
      "id, task_id, author_id, body, parent_comment_id, created_at, author:profiles!task_comments_author_id_fkey(id, name, initials, avatar_color, avatar_url), reactions:comment_reactions(emoji, user_id)"
    )
    .single());

  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true, comment: data as CommentRow };
}

export async function deleteComment(
  id: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Toggle the current user's reaction on a comment. Returns the new state
 * so the client can drop its optimistic mirror with confidence.
 *
 * Behaviour:
 *  - if the (comment, user, emoji) row exists → delete it (removes reaction)
 *  - otherwise → insert it (adds reaction)
 *
 * RLS in 0010 already constrains writes to (user_id = auth.uid()), so we
 * can trust the action without re-checking in app code.
 */
export async function toggleCommentReaction(
  commentId: string,
  emoji: string
): Promise<{ ok?: true; added?: boolean; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const existing = await (supabase as any)
    .from("comment_reactions")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing.data) {
    const del = await (supabase as any)
      .from("comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", profile.id)
      .eq("emoji", emoji);
    if (del.error) return { error: del.error.message };
    // Reactions are optimistic in the UI (useOptimistic) and aren't
    // surfaced on any task list, so skip the full-layout revalidate.
    return { ok: true, added: false };
  }

  const ins = await (supabase as any).from("comment_reactions").insert({
    comment_id: commentId,
    user_id: profile.id,
    emoji,
  });
  if (ins.error) return { error: ins.error.message };
  // See above: reactions are optimistic and not surfaced on task lists.
  return { ok: true, added: true };
}

// ── Task attachments ─────────────────────────────────────────────────────

export interface TaskAttachmentRow {
  id: string;
  task_id: string;
  kind: "file" | "link";
  url: string;
  label: string;
  content_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Persist a link attachment on a task. Links cost ~100 bytes in the DB
 * and zero in storage, so this is the path we nudge users toward for
 * anything over 1 MB. The URL is stored verbatim; the caller already
 * normalized it (https:// prefix added if missing).
 */
export async function addTaskAttachmentLink(
  taskId: string,
  url: string,
  label: string
): Promise<{ ok?: true; attachment?: TaskAttachmentRow; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const workspace = await getDefaultWorkspace();
  if (!workspace) return { error: "No workspace." };

  const { data, error } = await ((supabase as any)
    .from("task_attachments")
    .insert({
      task_id: taskId,
      workspace_id: workspace.id,
      kind: "link",
      url,
      label,
      created_by: profile.id,
    })
    .select("*")
    .single());

  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true, attachment: data as TaskAttachmentRow };
}

/**
 * Persist a file attachment on a task. The client has already uploaded
 * the blob to the `task-attachments` storage bucket; this action just
 * records the metadata pointing at it. Two-step flow (upload → record)
 * means we never proxy bytes through the Next server, which would burn
 * function execution time + memory for no benefit.
 */
export async function addTaskAttachmentFile(
  taskId: string,
  input: {
    storagePath: string;
    label: string;
    contentType: string;
    sizeBytes: number;
  }
): Promise<{ ok?: true; attachment?: TaskAttachmentRow; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };
  const workspace = await getDefaultWorkspace();
  if (!workspace) return { error: "No workspace." };

  // Compute the public URL so the caller doesn't have to construct it.
  // Public bucket means no signing — reads are free of egress charges.
  const {
    data: { publicUrl },
  } = supabase.storage.from("task-attachments").getPublicUrl(input.storagePath);

  const { data, error } = await ((supabase as any)
    .from("task_attachments")
    .insert({
      task_id: taskId,
      workspace_id: workspace.id,
      kind: "file",
      url: publicUrl,
      label: input.label,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      created_by: profile.id,
    })
    .select("*")
    .single());

  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true, attachment: data as TaskAttachmentRow };
}

/**
 * Remove an attachment. For files, also deletes the underlying storage
 * object so we reclaim quota. For links there's no object to delete.
 *
 * RLS in 0027 enforces that only the uploader or the task's author /
 * assignee can call this, so we don't re-check authorization here.
 */
export async function removeTaskAttachment(
  id: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  // Read the row first so we know whether to chase the storage object.
  // Failing to read = the user isn't allowed to delete it; surface that
  // up as a clean error.
  const { data: row, error: readErr } = await ((supabase as any)
    .from("task_attachments")
    .select("kind, url")
    .eq("id", id)
    .maybeSingle()) as {
    data: { kind: "file" | "link"; url: string } | null;
    error: { message: string } | null;
  };
  if (readErr) return { error: readErr.message };
  if (!row) return { error: "Attachment not found." };

  if (row.kind === "file") {
    // The `url` column is the public URL. Extract the path inside the
    // bucket (everything after "/task-attachments/") so we can call
    // storage.remove() with a clean key.
    const marker = "/task-attachments/";
    const idx = row.url.indexOf(marker);
    if (idx >= 0) {
      const path = row.url.slice(idx + marker.length);
      // Best-effort: if the storage delete fails (object already gone,
      // RLS denial), still proceed to drop the metadata row so the UI
      // doesn't keep showing a broken attachment.
      await supabase.storage.from("task-attachments").remove([path]);
    }
  }

  const { error } = await (supabase as any)
    .from("task_attachments")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

// ── Bulk actions ─────────────────────────────────────────────────────────

/**
 * Mark all of `ids` complete (or undo). Server-side bulk update means
 * one DB round-trip instead of N. RLS still scopes the write per row.
 */
export async function bulkSetTaskStatus(
  ids: string[],
  status: "todo" | "done"
): Promise<{ ok?: true; error?: string }> {
  if (ids.length === 0) return { ok: true };
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const upd = await (supabase as any)
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .in("id", ids);
  if (upd.error) return { error: upd.error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

export async function bulkSetTaskAssignee(
  ids: string[],
  userId: string | null
): Promise<{ ok?: true; error?: string }> {
  if (ids.length === 0) return { ok: true };
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const upd = await (supabase as any)
    .from("tasks")
    .update({ assignee_id: userId })
    .in("id", ids);
  if (upd.error) return { error: upd.error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

export async function bulkSetTaskDueDate(
  ids: string[],
  dueAt: string | null
): Promise<{ ok?: true; error?: string }> {
  if (ids.length === 0) return { ok: true };
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const upd = await (supabase as any)
    .from("tasks")
    .update({ due_at: dueAt })
    .in("id", ids);
  if (upd.error) return { error: upd.error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

export async function bulkDeleteTasks(
  ids: string[]
): Promise<{ ok?: true; error?: string }> {
  if (ids.length === 0) return { ok: true };
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { error } = await supabase.from("tasks").delete().in("id", ids);
  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Add a co-assignee to a task. The primary `assignee_id` column is
 * untouched (existing queries depend on it); this row goes into the
 * task_assignees join table so the drawer's avatar stack can show
 * multiple owners.
 */
export async function addTaskAssignee(
  taskId: string,
  userId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const ins = await (supabase as any)
    .from("task_assignees")
    .insert({ task_id: taskId, user_id: userId });
  if (ins.error && !String(ins.error.message).includes("duplicate")) {
    return { error: ins.error.message };
  }
  revalidateTaskRoutes();
  return { ok: true };
}

export async function removeTaskAssignee(
  taskId: string,
  userId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  // If removing the primary, also clear assignee_id (otherwise the
  // trigger would re-add the row on the next task update).
  const task = await (supabase as any)
    .from("tasks")
    .select("assignee_id")
    .eq("id", taskId)
    .maybeSingle();

  if (task.data?.assignee_id === userId) {
    await (supabase as any)
      .from("tasks")
      .update({ assignee_id: null } as any)
      .eq("id", taskId);
  }

  const del = await (supabase as any)
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);
  if (del.error) return { error: del.error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Subtask creation. The child inherits the parent's workspace, team,
 * and project so the kanban board doesn't drop it into an orphan column.
 * Assignee defaults to the parent's assignee so quick-checklists don't
 * force the user through a picker; can be changed in the drawer later.
 */
export async function createSubtask(input: {
  parentId: string;
  title: string;
}): Promise<{ ok?: true; id?: string; error?: string }> {
  const title = input.title?.trim();
  if (!title) return { error: "Title required." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const parent = await (supabase as any)
    .from("tasks")
    .select("id, workspace_id, project_id, assignee_id")
    .eq("id", input.parentId)
    .maybeSingle();

  if (parent.error || !parent.data) {
    return { error: "Parent task not found." };
  }

  const subAssignee = parent.data.assignee_id ?? profile.id;
  const ins = await (supabase as any)
    .from("tasks")
    .insert({
      workspace_id: parent.data.workspace_id,
      project_id: parent.data.project_id,
      parent_task_id: input.parentId,
      title,
      description: null,
      priority: 4,
      status: "todo",
      assignee_id: subAssignee,
      author_id: profile.id,
      triaged_at: subAssignee === profile.id ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (ins.error) return { error: ins.error.message };
  revalidateTaskRoutes();
  return { ok: true, id: ins.data.id };
}

export async function deleteTask(
  id: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Persist a new drag-and-drop order for the given task IDs.
 *
 * We write descending sort_order values so the first ID lands at the top
 * of the list. Spacing is 1,000 so we never have to renumber siblings
 * when someone inserts a new task between two reordered rows — the new
 * row just claims an ms-precision timestamp and slots above the
 * appropriate sort_order.
 */
export async function reorderTasks(
  orderedIds: string[]
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  if (orderedIds.length === 0) return { ok: true };
  // No-op (with a clear error) until migration 0015 ships the column.
  const useSortOrder = await hasTaskSortOrder();
  if (!useSortOrder) {
    return {
      error:
        "Reordering needs migration 0015_task_sort_order.sql — apply it in the Supabase SQL editor first.",
    };
  }

  // Top of list = highest sort_order, anchored above the current Date.now()
  // so reordered tasks always sit above passively-created ones.
  const top = Date.now() + orderedIds.length * 1000;
  // sort_order column was added in migration 0015 — generated DB types
  // don't include it yet, so we widen the update payload locally.
  const updates = orderedIds.map((id, i) =>
    supabase
      .from("tasks")
      .update({ sort_order: top - i * 1000 } as never)
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) return { error: firstError.error.message };

  // No revalidation: the list already shows the new order optimistically,
  // this only writes sort_order (no count or badge change), and realtime
  // nudges other clients. A full-layout revalidate here would just stall
  // the next interaction for nothing.
  return { ok: true };
}

export async function setTaskStatus(
  id: string,
  status: "todo" | "doing" | "done"
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Inbox quick action: "Accept" — acknowledges that the assignee has seen the
 * task, removing it from the Inbox without changing anything else.
 */
export async function triageTask(
  id: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const { error } = await supabase
    .from("tasks")
    .update({ triaged_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Inbox quick action: "Mark later" — triages the task and pushes its due
 * date forward by a week so it surfaces again then.
 */
export async function snoozeTask(
  id: string,
  until?: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  let wakeAt: Date;
  if (until) {
    wakeAt = new Date(until);
  } else {
    wakeAt = new Date();
    wakeAt.setDate(wakeAt.getDate() + 7);
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      triaged_at: new Date().toISOString(),
      due_at: wakeAt.toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
}

/**
 * Saved views — currently scoped to /inbox. `config` is freeform JSON
 * so we can add filter dimensions without a schema migration each time.
 * The component owns the shape; the action only needs name + scope +
 * config + an optional id for updates.
 */
export interface SavedView {
  id: string;
  scope: "inbox";
  name: string;
  config: Record<string, unknown>;
}

export async function listSavedViews(
  scope: "inbox"
): Promise<{ views?: SavedView[]; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const res = await (supabase as any)
    .from("saved_views")
    .select("id, scope, name, config")
    .eq("user_id", profile.id)
    .eq("scope", scope)
    .order("created_at", { ascending: true });

  if (res.error) return { error: res.error.message };
  return { views: (res.data ?? []) as SavedView[] };
}

export async function saveView(input: {
  scope: "inbox";
  name: string;
  config: Record<string, unknown>;
}): Promise<{ ok?: true; view?: SavedView; error?: string }> {
  const name = input.name?.trim();
  if (!name) return { error: "Name is required." };
  if (name.length > 40) return { error: "Name is too long." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const ins = await (supabase as any)
    .from("saved_views")
    .insert({
      user_id: profile.id,
      scope: input.scope,
      name,
      config: input.config,
    })
    .select("id, scope, name, config")
    .single();

  if (ins.error) return { error: ins.error.message };
  revalidatePath("/", "layout");
  return { ok: true, view: ins.data as SavedView };
}

export async function deleteSavedView(
  id: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const del = await (supabase as any).from("saved_views").delete().eq("id", id);
  if (del.error) return { error: del.error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Toggle a project's pin state for the current user. Pins are stored as
 * an ordered uuid[] on profiles so the slot order in the sidebar is the
 * insertion order (new pins go to the top, removing collapses the gap).
 */
export async function togglePinnedProject(
  projectId: string
): Promise<{ ok?: true; pinned?: boolean; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const cur = await (supabase as any)
    .from("profiles")
    .select("pinned_project_ids")
    .eq("id", profile.id)
    .maybeSingle();

  const existing: string[] = cur.data?.pinned_project_ids ?? [];
  const has = existing.includes(projectId);
  const next = has
    ? existing.filter((id) => id !== projectId)
    : [projectId, ...existing].slice(0, 12); // cap to keep the section sane

  const upd = await (supabase as any)
    .from("profiles")
    .update({ pinned_project_ids: next })
    .eq("id", profile.id);

  if (upd.error) return { error: upd.error.message };
  revalidatePath("/", "layout");
  return { ok: true, pinned: !has };
}

export async function updateMyProfile(patch: {
  name?: string;
  role?: string | null;
}): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const update: { name?: string; initials?: string; role?: string | null } = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return { error: "Name can't be empty." };
    update.name = trimmed;
    // Keep initials in sync with the new name.
    update.initials = computeInitials(trimmed);
  }
  if (patch.role !== undefined) {
    const trimmed = patch.role?.trim();
    update.role = trimmed ? trimmed : null;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

function computeInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Team Pulse: sets the current user's mood status. Null clears it. */
export async function setMyStatus(
  status: ProfileStatus
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Bumps the current user's notifications read cursor to now(). Everything
 * created after this point reads as "unread" until they open the inbox
 * again. Backed by a security-definer RPC so the client never has to
 * send the user id.
 */
export async function markNotificationsRead(): Promise<{
  ok?: true;
  readAt?: string;
  error?: string;
}> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const { data, error } = await (supabase.rpc as any)(
    "mark_notifications_read"
  );
  if (error) return { error: error.message };
  return { ok: true, readAt: typeof data === "string" ? data : undefined };
}

// ── Project membership ───────────────────────────────────────────────────────

/**
 * Add a teammate to a project. Anyone in the company can invite anyone
 * else in the company; RLS enforces "must be a workspace member of the
 * project's workspace." ignoreDuplicates means re-adding an existing
 * member is a silent no-op (doesn't downgrade an 'admin' to 'member').
 */
export async function addProjectMember(
  projectId: string,
  userId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const { error } = await (supabase as any)
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: userId, role: "member" },
      { onConflict: "project_id,user_id", ignoreDuplicates: true }
    );
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/**
 * Remove a teammate from a project. Any project member can remove
 * anyone (including themselves to leave). RLS gates this.
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const { error } = await (supabase as any)
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ── Department label ─────────────────────────────────────────────────────────

/**
 * Update the caller's department label (Design, Engineering, ...). A
 * free-text field on profiles in the post-0030 model; replaces the
 * structured teams table for grouping people in the People directory.
 */
export async function updateMyDepartment(
  department: string | null
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  const value = department?.trim() || null;
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ department: value })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/workspace");
  return { ok: true };
}
