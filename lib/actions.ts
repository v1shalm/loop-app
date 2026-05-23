"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getDefaultWorkspace,
  getMyTeam,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const [workspace, team] = await Promise.all([
    getDefaultWorkspace(),
    getMyTeam(),
  ]);
  if (!workspace) return { error: "No workspace yet." };
  if (!team)
    return {
      error: "Join a team before creating projects.",
    };

  const { data, error } = await supabase
    .from("projects")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      workspace_id: workspace.id,
      team_id: team.id,
      name: trimmed,
      color: args.color?.trim() || null,
      emoji: args.emoji?.trim() || null,
    } as any)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, projectId: data?.id };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  dueAt?: string | null; // ISO
  projectId?: string | null;
  assigneeId?: string | null;
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

  // Block users who are already on a team (one team per user enforced
  // at the DB by team_members_one_team_per_user, but a friendlier
  // message here saves a database round-trip).
  const existing = await getMyTeam();
  if (existing) {
    return {
      error: "You're already on a team. Ask an admin to switch you over.",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberIns = await (supabase as any).from("team_members").insert({
    team_id: teamIns.data.id,
    user_id: profile.id,
    role: "admin",
  });

  if (memberIns.error) {
    // Best-effort rollback: drop the empty team we just created so the
    // workspace doesn't accumulate ghost rows on the failure path.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Optional starter content. Five short, generic tasks that work for
  // any team type (eng / design / marketing / etc.). One sample project
  // so the projects board has a column. Failures here don't fail the
  // create — the team exists, the user can still use the app.
  if (input.seedSamples) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          "My work is your daily list. Inbox is anything teammates send you. Upcoming covers the next two weeks.",
        priority: 3,
        due_at: day(0),
      },
      {
        title: "Invite a teammate from /team",
        description:
          "Loop works best with at least one other person. Open Team from the sidebar to invite someone.",
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", team.id)
    .eq("user_id", userId) as any);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createTask(
  input: CreateTaskInput
): Promise<{ ok?: true; error?: string }> {
  const title = input.title?.trim();
  if (!title) return { error: "Task title required." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const [profile, workspace, team] = await Promise.all([
    getCurrentProfile(),
    getDefaultWorkspace(),
    getMyTeam(),
  ]);
  if (!profile) return { error: "Not signed in." };
  if (!workspace)
    return {
      error:
        "No workspace yet. Run supabase/seed.sql in the Supabase SQL Editor.",
    };
  if (!team)
    return {
      error:
        "You're not on a team yet. Ask an admin to add you to one before creating tasks.",
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
    team_id: team.id,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("tasks").insert(insertPayload as any);

  if (error) return { error: error.message };

  revalidateTaskRoutes(input.projectId ?? null);
  return { ok: true };
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: 1 | 2 | 3 | 4;
  dueAt?: string | null;
  projectId?: string | null;
  assigneeId?: string | null;
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
  } = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.projectId !== undefined) update.project_id = patch.projectId;
  if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("tasks").update(update).eq("id", id);
  if (error) return { error: error.message };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  body: string
): Promise<{ ok?: true; comment?: CommentRow; error?: string }> {
  const text = body?.trim();
  if (!text) return { error: "Comment can't be empty." };

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: profile.id, body: text })
    .select(
      "id, task_id, author_id, body, created_at, author:profiles!task_comments_author_id_fkey(id, name, initials, avatar_color, avatar_url), reactions:comment_reactions(emoji, user_id)"
    )
    .single() as any);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (supabase as any)
    .from("comment_reactions")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing.data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const del = await (supabase as any)
      .from("comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", profile.id)
      .eq("emoji", emoji);
    if (del.error) return { error: del.error.message };
    revalidateTaskRoutes();
    return { ok: true, added: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins = await (supabase as any).from("comment_reactions").insert({
    comment_id: commentId,
    user_id: profile.id,
    emoji,
  });
  if (ins.error) return { error: ins.error.message };
  revalidateTaskRoutes();
  return { ok: true, added: true };
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task = await (supabase as any)
    .from("tasks")
    .select("assignee_id")
    .eq("id", taskId)
    .maybeSingle();

  if (task.data?.assignee_id === userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("tasks")
      .update({ assignee_id: null } as any)
      .eq("id", taskId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parent = await (supabase as any)
    .from("tasks")
    .select("id, workspace_id, team_id, project_id, assignee_id")
    .eq("id", input.parentId)
    .maybeSingle();

  if (parent.error || !parent.data) {
    return { error: "Parent task not found." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins = await (supabase as any)
    .from("tasks")
    .insert({
      workspace_id: parent.data.workspace_id,
      team_id: parent.data.team_id,
      project_id: parent.data.project_id,
      parent_task_id: input.parentId,
      title,
      description: null,
      priority: 4,
      status: "todo",
      assignee_id: parent.data.assignee_id ?? profile.id,
      author_id: profile.id,
      triaged_at: new Date().toISOString(),
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

  revalidateTaskRoutes();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
