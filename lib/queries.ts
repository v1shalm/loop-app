import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

/** Manual overlays for columns added after database.types.ts was generated. */
export type ProfileStatus = "coffee" | "focus" | "done" | "busy" | null;

export type Profile = Tables["profiles"]["Row"] & {
  status?: ProfileStatus;
  role?: string | null;
  avatar_url?: string | null;
  /** Per-user pinned projects (Notion-style favourites). Insertion
   *  order is the slot order in the sidebar. */
  pinned_project_ids?: string[] | null;
};
export type WorkflowStatus =
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export type Task = Tables["tasks"]["Row"] & {
  triaged_at?: string | null;
  parent_task_id?: string | null;
};
export type Project = Omit<Tables["projects"]["Row"], "workflow_status"> & {
  workflow_status?: WorkflowStatus | null;
  description?: string | null;
};
export type Workspace = Tables["workspaces"]["Row"];

export type TaskWithRelations = Task & {
  project?: Pick<Project, "id" | "name" | "emoji"> | null;
  assignee?: Pick<
    Profile,
    "id" | "name" | "initials" | "avatar_color" | "avatar_url"
  > | null;
  author?: Pick<
    Profile,
    "id" | "name" | "initials" | "avatar_color" | "avatar_url"
  > | null;
  comments?: { count: number }[];
};

export const TASK_RELATIONS_SELECT = `
  *,
  project:projects(id, name, emoji),
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, avatar_color, avatar_url),
  author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color, avatar_url),
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
  return (data ?? []) as Project[];
});

export interface ProjectBoardColumn {
  project: Project;
  open_count: number;
  done_count: number;
  tasks: TaskWithRelations[];
}

/**
 * Used by the /projects board view. Returns every project paired with its
 * open tasks (capped per column so a runaway list doesn't drag the board)
 * and the done count so the column header can show progress.
 */
export const getProjectsBoard = cache(
  async (perColumn = 8): Promise<ProjectBoardColumn[]> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];

    const projects = await getProjects();
    if (projects.length === 0) return [];

    const ids = projects.map((p) => p.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = (await (supabase
      .from("tasks")
      .select(TASK_RELATIONS_SELECT)
      .in("project_id", ids)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false }) as any)) as {
      data: TaskWithRelations[] | null;
    };
    const rows = (data ?? []) as TaskWithRelations[];

    const byProject = new Map<
      string,
      { open: TaskWithRelations[]; doneCount: number }
    >();
    for (const r of rows) {
      if (!r.project_id) continue;
      const bucket =
        byProject.get(r.project_id) ?? { open: [], doneCount: 0 };
      if (r.status === "done") bucket.doneCount += 1;
      else bucket.open.push(r);
      byProject.set(r.project_id, bucket);
    }

    return projects.map((p) => {
      const b = byProject.get(p.id) ?? { open: [], doneCount: 0 };
      return {
        project: p,
        open_count: b.open.length,
        done_count: b.doneCount,
        tasks: b.open.slice(0, perColumn),
      };
    });
  }
);

// ── Teams ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
}

export interface TeamMember extends Profile {
  team_role: "admin" | "member";
}

/** The team the current user belongs to. One per user (enforced by unique idx). */
export const getMyTeam = cache(async (): Promise<Team | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from("team_members")
    .select("role, team:teams(id, workspace_id, name, color)")
    .eq("user_id", profile.id)
    .maybeSingle() as any);
  if (!data || !data.team) return null;
  return data.team as Team;
});

/** Is the current user an admin of their team? */
export const getMyTeamRole = cache(
  async (): Promise<"admin" | "member" | null> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return null;
    const profile = await getCurrentProfile();
    if (!profile) return null;

    const { data } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", profile.id)
      .maybeSingle();
    return (data?.role as "admin" | "member" | null) ?? null;
  }
);

/**
 * Members of the current user's team — the universe for assignee pickers,
 * Team Pulse, the manage-team page, etc. The brief says "users can only
 * be assigned tasks within their team", so every member-facing surface
 * goes through here instead of returning the whole workspace.
 */
export const getWorkspaceMembers = cache(async (): Promise<Profile[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const team = await getMyTeam();
  if (!team) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from("team_members")
    .select("profile:profiles!inner(*)")
    .eq("team_id", team.id)
    .order("joined_at") as any);
  return ((data ?? []) as Array<{ profile: Profile }>).map((r) => r.profile);
});

/** Same as getWorkspaceMembers but each row carries its team role. */
export const getTeamMembersWithRole = cache(
  async (): Promise<TeamMember[]> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];
    const team = await getMyTeam();
    if (!team) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase
      .from("team_members")
      .select("role, profile:profiles!inner(*)")
      .eq("team_id", team.id)
      .order("joined_at") as any);
    return ((data ?? []) as Array<{ role: string; profile: Profile }>).map(
      (r) => ({ ...r.profile, team_role: r.role as "admin" | "member" })
    );
  }
);

// ── Task lists ────────────────────────────────────────────────────────────────

/**
 * One-time check for whether migration 0015 has been applied. Cached
 * per-request via React's cache(). When the column is missing we just
 * skip the sort_order order-by — pages still render with created-at
 * order, drag-reorder writes silently no-op until the migration lands.
 *
 * This guards against the "sidebar shows counts but page is empty" trap:
 * before this check, any task query that referenced sort_order errored
 * out with PostgREST code 42703 and fetchTasks returned an empty array
 * for the whole page.
 */
export const hasTaskSortOrder = cache(async (): Promise<boolean> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return false;
  const { error } = await supabase.from("tasks").select("sort_order").limit(1);
  return !error;
});

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
  if (error) {
    // Surface the cause in dev — silent empty lists made the
    // missing-migration case look like "no tasks exist".
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[fetchTasks] query failed:", error);
    }
    return [];
  }
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

  // Manual drag order (sort_order DESC) wins so users can curate their
  // own list. Priority becomes a visual signal via the flag color
  // instead of forcing list order. due_at falls back to keep stably
  // ordered between buckets when sort_order ties.
  const useSortOrder = await hasTaskSortOrder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchTasks((q: any) => {
    let chain = q
      .eq("assignee_id", profile.id)
      .or(
        `status.neq.done,and(status.eq.done,completed_at.gte.${startIso})`
      );
    if (useSortOrder) {
      chain = chain.order("sort_order", {
        ascending: false,
        nullsFirst: false,
      });
    }
    return chain.order("due_at", { ascending: true, nullsFirst: false });
  });

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

  const useSortOrder = await hasTaskSortOrder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchTasks((q: any) => {
    let chain = q
      .eq("assignee_id", profile.id)
      .neq("status", "done")
      .gte("due_at", tomorrowStart.toISOString())
      .lte("due_at", nextWeekEnd.toISOString());
    if (useSortOrder) {
      chain = chain.order("sort_order", {
        ascending: false,
        nullsFirst: false,
      });
    }
    return chain.order("due_at", { ascending: true });
  });

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
 * Wider range than getUpcomingBuckets — used by the calendar view on
 * /upcoming so the month grid has data. Fetches all open tasks assigned
 * to me with a due_at between `start` and `end`, sorted ascending.
 */
export async function getUpcomingTasksInRange(
  start: Date,
  end: Date
): Promise<TaskWithRelations[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
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
 * Inbox = "newly assigned, not yet triaged" — tasks where someone else
 * assigned me work I haven't acknowledged. Excludes self-created tasks.
 */
export async function getInboxAssignments(): Promise<TaskWithRelations[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useSortOrder = await hasTaskSortOrder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fetchTasks((q: any) => {
    let chain = q
      .eq("assignee_id", profile.id)
      .neq("author_id", profile.id)
      .is("triaged_at", null)
      .neq("status", "done");
    if (useSortOrder) {
      chain = chain.order("sort_order", {
        ascending: false,
        nullsFirst: false,
      });
    }
    return chain.order("created_at", { ascending: false });
  });
}

export async function getProjectTasks(
  projectId: string
): Promise<TaskWithRelations[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Manual drag order wins over auto-priority on project pages — Linear/
  // Todoist do the same. Tasks that haven't been reordered fall back to
  // their created_at-derived sort_order (set by migration 0015), so the
  // ordering stays stable for untouched tasks. When the migration hasn't
  // been applied yet we skip the sort_order order so the query doesn't
  // 400 — page still renders, drag just won't persist until then.
  const useSortOrder = await hasTaskSortOrder();
  return fetchTasks((q: any) => {
    let chain = q.eq("project_id", projectId).neq("status", "done");
    if (useSortOrder) {
      chain = chain.order("sort_order", {
        ascending: false,
        nullsFirst: false,
      });
    }
    return chain.order("created_at", { ascending: false });
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Project | null) ?? null;
}

/**
 * Sidebar badge counts — one Supabase round-trip for all of them.
 * Inbox now means "untriaged assignments from someone else" (matches spec).
 */
export interface SidebarCounts {
  today: number;
  inbox: number;
  /** Tasks I completed today — used by the profile menu progress card. */
  completedToday: number;
  projectCounts: Record<string, number>;
}

export const getSidebarCounts = cache(async (): Promise<SidebarCounts> => {
  const supabase = await getSupabaseServer();
  const empty: SidebarCounts = {
    today: 0,
    inbox: 0,
    completedToday: 0,
    projectCounts: {},
  };
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

  // Completed-today is cheap to add here: one extra round-trip with a
  // head-only count. We keep it separate from the open-task scan above
  // because that query filters to status != done.
  const { count: completedToday } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "done")
    .eq("assignee_id", profile.id)
    .gte("completed_at", startIso)
    .lte("completed_at", endIso);

  return {
    today,
    inbox,
    completedToday: completedToday ?? 0,
    projectCounts,
  };
});

// ── Team ─────────────────────────────────────────────────────────────────────

export interface MemberPulse extends Profile {
  open_tasks: number;
  completed_today: number;
  current_task_title: string | null;
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

  // One pass over open tasks — count them AND grab the highest-priority /
  // soonest-due title per user as the "currently working on" hint.
  const [openRes, doneRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("assignee_id, title, priority, due_at, created_at")
      .neq("status", "done")
      .in("assignee_id", ids)
      .order("priority", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("assignee_id, completed_at")
      .eq("status", "done")
      .gte("completed_at", startOfToday.toISOString())
      .in("assignee_id", ids),
  ]);

  const openByUser = new Map<string, number>();
  const topTitleByUser = new Map<string, string>();
  for (const row of openRes.data ?? []) {
    if (!row.assignee_id) continue;
    openByUser.set(row.assignee_id, (openByUser.get(row.assignee_id) ?? 0) + 1);
    if (!topTitleByUser.has(row.assignee_id)) {
      topTitleByUser.set(row.assignee_id, row.title);
    }
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
    current_task_title: topTitleByUser.get(m.id) ?? null,
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
