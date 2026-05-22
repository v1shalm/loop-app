"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCurrentProfile, getDefaultWorkspace } from "@/lib/queries";
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

export async function createTask(
  input: CreateTaskInput
): Promise<{ ok?: true; error?: string }> {
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

  const { error } = await supabase.from("tasks").insert({
    workspace_id: workspace.id,
    project_id: input.projectId ?? null,
    title,
    description: input.description ?? null,
    priority: input.priority ?? 4,
    due_at: input.dueAt ?? null,
    assignee_id: assigneeId,
    author_id: profile.id,
    triaged_at: triagedAt,
  });

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
      "id, task_id, author_id, body, created_at, author:profiles(id, name, initials, avatar_color, avatar_url)"
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
  id: string
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };

  const week = new Date();
  week.setDate(week.getDate() + 7);

  const { error } = await supabase
    .from("tasks")
    .update({
      triaged_at: new Date().toISOString(),
      due_at: week.toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateTaskRoutes();
  return { ok: true };
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
