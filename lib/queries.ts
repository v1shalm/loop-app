import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

/** Manual overlays for columns added after database.types.ts was generated. */
export type ProfileStatus = "coffee" | "focus" | "done" | "busy" | null;

export type Profile = Tables["profiles"]["Row"] & {
  status?: ProfileStatus;
  role?: string | null;
};
export type Task = Tables["tasks"]["Row"] & { triaged_at?: string | null };
export type Project = Tables["projects"]["Row"];
export type Workspace = Tables["workspaces"]["Row"];

export type TaskWithRelations = Task & {
  project?: Pick<Project, "id" | "name" | "emoji"> | null;
  assignee?: Pick<Profile, "id" | "name" | "initials" | "avatar_color"> | null;
  author?: Pick<Profile, "id" | "name" | "initials" | "avatar_color"> | null;
  comments?: { count: number }[];
};

export const TASK_RELATIONS_SELECT = `
  *,
  project:projects(id, name, emoji),
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, avatar_color),
  author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color),
  comments:task_comments(count)
`;

/**
 * Auth'd user + their profile row.
 * `cache()` dedupes within a single React render pass.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data ?? null) as Profile | null;
});

export const getDefaultWorkspace = cache(async (): Promise<Workspace | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data ?? null;
});

export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at");
  return data ?? [];
});

export const getWorkspaceMembers = cache(async (): Promise<Profile[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const { data } = await supabase
    .from("workspace_members")
    .select("profiles!inner(*)")
    .order("joined_at");
  return ((data ?? []) as Array<{ profiles: Profile }>).map((r) => r.profiles);
});

// ── Task lists ────────────────────────────────────────────────────────────────

async function fetchTasks(
  build: (
    q: ReturnType<
      NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>["from"]
    >
  ) => unknown
): Promise<TaskWithRelations[]> {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const base = supabase.from("tasks").select(TASK_RELATIONS_SELECT);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (build(base as any) as unknown as Promise<{
    data: TaskWithRelations[] | null;
    error: unknown;
  }>)) as { data: TaskWithRelations[] | null; error: unknown };
  if (error) return [];
  return data ?? [];
}

export async function getTodayTasks(): Promise<TaskWithRelations[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetchTasks((q: any) =>
    q
      .eq("assignee_id", profile.id)
      .neq("status", "done")
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString())
      .order("priority", { ascending: true })
      .order("due_at", { ascending: true })
  );
}

export async function getUpcomingTasks(): Promise<TaskWithRelations[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 14);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetchTasks((q: any) =>
    q
      .eq("assignee_id", profile.id)
      .neq("status", "done")
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString())
      .order("due_at", { ascending: true })
  );
}

/**
 * Assigned-to-me sections — replaces the old "My tasks" list.
 *   • overdue: past due, not done
 *   • today: due today (or no due date), not done
 *   • upcoming: due in the future, not done
 *   • completedToday: completed_at on today
 *
 * Single fetch + in-memory partition so the page doesn't fire four queries.
 */
export interface AssignedSections {
  overdue: TaskWithRelations[];
  today: TaskWithRelations[];
  upcoming: TaskWithRelations[];
  completedToday: TaskWithRelations[];
}

export async function getAssignedToMe(): Promise<AssignedSections> {
  const profile = await getCurrentProfile();
  const empty: AssignedSections = {
    overdue: [],
    today: [],
    upcoming: [],
    completedToday: [],
  };
  if (!profile) return empty;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startIso = startOfToday.toISOString();
  const endIso = endOfToday.toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchTasks((q: any) =>
    q
      .eq("assignee_id", profile.id)
      .or(
        `status.neq.done,and(status.eq.done,completed_at.gte.${startIso})`
      )
      .order("priority", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
  );

  const sections: AssignedSections = {
    overdue: [],
    today: [],
    upcoming: [],
    completedToday: [],
  };
  for (const t of rows) {
    if (t.status === "done") {
      if (t.completed_at && t.completed_at >= startIso) {
        sections.completedToday.push(t);
      }
      continue;
    }
    if (!t.due_at) {
      sections.today.push(t);
    } else if (t.due_at < startIso) {
      sections.overdue.push(t);
    } else if (t.due_at <= endIso) {
      sections.today.push(t);
    } else {
      sections.upcoming.push(t);
    }
  }
  return sections;
}

/**
 * Upcoming bucketed by week.
 *   • tomorrow: due tomorrow
 *   • thisWeek: day-after-tomorrow through end of this week (Sun)
 *   • nextWeek: Mon–Sun of next week
 */
export interface UpcomingBuckets {
  tomorrow: TaskWithRelations[];
  thisWeek: TaskWithRelations[];
  nextWeek: TaskWithRelations[];
}

export async function getUpcomingBuckets(): Promise<UpcomingBuckets> {
  const profile = await getCurrentProfile();
  const empty: UpcomingBuckets = { tomorrow: [], thisWeek: [], nextWeek: [] };
  if (!profile) return empty;

  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // end of this week (Sunday 23:59)
  const thisWeekEnd = new Date(tomorrowStart);
  const daysUntilSun = 7 - thisWeekEnd.getDay(); // 0=Sun, returns 7..1
  thisWeekEnd.setDate(thisWeekEnd.getDate() + (daysUntilSun % 7));
  thisWeekEnd.setHours(23, 59, 59, 999);

  // next week Mon→Sun
  const nextWeekStart = new Date(thisWeekEnd);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
  nextWeekEnd.setHours(23, 59, 59, 999);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchTasks((q: any) =>
    q
      .eq("assignee_id", profile.id)
      .neq("status", "done")
      .gte("due_at", tomorrowStart.toISOString())
      .lte("due_at", nextWeekEnd.toISOString())
      .order("due_at", { ascending: true })
  );

  const tomorrowIso = tomorrowEnd.toISOString();
  const thisWeekIso = thisWeekEnd.toISOString();

  const result: UpcomingBuckets = { tomorrow: [], thisWeek: [], nextWeek: [] };
  for (const t of rows) {
    if (!t.due_at) continue;
    if (t.due_at <= tomorrowIso) result.tomorrow.push(t);
    else if (t.due_at <= thisWeekIso) result.thisWeek.push(t);
    else result.nextWeek.push(t);
  }
  return result;
}

/**
 * Inbox = "newly assigned, not yet triaged" — tasks where someone else
 * assigned me work I haven't acknowledged. Excludes self-created tasks.
 */
export async function getInboxAssignments(): Promise<TaskWithRelations[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetchTasks((q: any) =>
    q
      .eq("assignee_id", profile.id)
      .neq("author_id", profile.id)
      .is("triaged_at", null)
      .neq("status", "done")
      .order("created_at", { ascending: false })
  );
}

export async function getProjectTasks(
  projectId: string
): Promise<TaskWithRelations[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetchTasks((q: any) =>
    q
      .eq("project_id", projectId)
      .neq("status", "done")
      .order("priority", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Sidebar badge counts — one Supabase round-trip for all of them.
 * Inbox now means "untriaged assignments from someone else" (matches spec).
 */
export interface SidebarCounts {
  today: number;
  inbox: number;
  projectCounts: Record<string, number>;
}

export const getSidebarCounts = cache(async (): Promise<SidebarCounts> => {
  const supabase = await getSupabaseServer();
  const empty: SidebarCounts = { today: 0, inbox: 0, projectCounts: {} };
  if (!supabase) return empty;

  const profile = await getCurrentProfile();
  if (!profile) return empty;

  const { data } = await supabase
    .from("tasks")
    .select("assignee_id, author_id, project_id, due_at, triaged_at")
    .neq("status", "done");

  type Row = {
    assignee_id: string | null;
    author_id: string | null;
    project_id: string | null;
    due_at: string | null;
    triaged_at: string | null;
  };
  const rows = (data ?? []) as Row[];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startIso = startOfToday.toISOString();
  const endIso = endOfToday.toISOString();

  let today = 0;
  let inbox = 0;
  const projectCounts: Record<string, number> = {};

  for (const r of rows) {
    if (r.project_id) {
      projectCounts[r.project_id] = (projectCounts[r.project_id] ?? 0) + 1;
    }
    if (r.assignee_id === profile.id) {
      if (r.due_at && r.due_at >= startIso && r.due_at <= endIso) today += 1;
      if (
        r.author_id !== profile.id &&
        r.triaged_at == null
      ) {
        inbox += 1;
      }
    }
  }

  return { today, inbox, projectCounts };
});

// ── Team ─────────────────────────────────────────────────────────────────────

export interface MemberPulse extends Profile {
  open_tasks: number;
  completed_today: number;
}

/** Used by the sidebar Team Pulse list + /team grid. */
export const getMembersWithPulse = cache(async (): Promise<MemberPulse[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const members = await getWorkspaceMembers();
  if (members.length === 0) return [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const ids = members.map((m) => m.id);

  const [openRes, doneRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("assignee_id")
      .neq("status", "done")
      .in("assignee_id", ids),
    supabase
      .from("tasks")
      .select("assignee_id, completed_at")
      .eq("status", "done")
      .gte("completed_at", startOfToday.toISOString())
      .in("assignee_id", ids),
  ]);

  const openByUser = new Map<string, number>();
  for (const row of openRes.data ?? []) {
    if (!row.assignee_id) continue;
    openByUser.set(row.assignee_id, (openByUser.get(row.assignee_id) ?? 0) + 1);
  }
  const doneByUser = new Map<string, number>();
  for (const row of doneRes.data ?? []) {
    if (!row.assignee_id) continue;
    doneByUser.set(row.assignee_id, (doneByUser.get(row.assignee_id) ?? 0) + 1);
  }

  return members.map((m) => ({
    ...m,
    open_tasks: openByUser.get(m.id) ?? 0,
    completed_today: doneByUser.get(m.id) ?? 0,
  }));
});

export async function getTeammate(id: string): Promise<MemberPulse | null> {
  const all = await getMembersWithPulse();
  return all.find((m) => m.id === id) ?? null;
}

export async function getTasksAssignedTo(
  userId: string
): Promise<TaskWithRelations[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetchTasks((q: any) =>
    q
      .eq("assignee_id", userId)
      .neq("status", "done")
      .order("priority", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
  );
}

// ── My stats (Profile page) ──────────────────────────────────────────────────

export interface MyStats {
  completed_today: number;
  open_assigned: number;
  open_authored: number;
}

export async function getMyStats(): Promise<MyStats> {
  const profile = await getCurrentProfile();
  const empty: MyStats = {
    completed_today: 0,
    open_assigned: 0,
    open_authored: 0,
  };
  if (!profile) return empty;

  const supabase = await getSupabaseServer();
  if (!supabase) return empty;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [openAssigned, openAuthored, doneToday] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profile.id)
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id)
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", profile.id)
      .eq("status", "done")
      .gte("completed_at", startOfToday.toISOString()),
  ]);

  return {
    completed_today: doneToday.count ?? 0,
    open_assigned: openAssigned.count ?? 0,
    open_authored: openAuthored.count ?? 0,
  };
}

// ── Recent activity (Notifications page) ─────────────────────────────────────

export interface ActivityItem {
  kind: "assigned-to-me" | "i-completed" | "project-update";
  task: TaskWithRelations;
  at: string;
}

/**
 * Notifications feed — derived from recent task activity.
 * No dedicated notifications table; we read recent task changes filtered
 * to ones relevant to the current user.
 */
export async function getRecentActivity(): Promise<ActivityItem[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchTasks((q: any) =>
    q
      .or(
        `and(assignee_id.eq.${profile.id},author_id.neq.${profile.id},created_at.gte.${sinceIso}),and(assignee_id.eq.${profile.id},status.eq.done,completed_at.gte.${sinceIso})`
      )
      .order("created_at", { ascending: false })
      .limit(50)
  );

  const items: ActivityItem[] = rows.map((t) => {
    if (t.status === "done" && t.completed_at) {
      return { kind: "i-completed", task: t, at: t.completed_at };
    }
    return { kind: "assigned-to-me", task: t, at: t.created_at };
  });
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
