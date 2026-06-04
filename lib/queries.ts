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
  /** Free-text department label (Design, Engineering, ...). Added in
   *  migration 0030 as the simple replacement for the teams table. */
  department?: string | null;
  /** Per-user pinned projects (Notion-style favourites). Insertion
   *  order is the slot order in the sidebar. */
  pinned_project_ids?: string[] | null;
};
export type WorkflowStatus =
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

/** Task lifecycle. 'in_review' (migration 0037) sits between work and
 *  completion: a member submits, a team manager approves to 'done' or sends
 *  it back. Project-less Inbox tasks skip review entirely. */
export type TaskStatus = "todo" | "doing" | "in_review" | "done";

export type Task = Tables["tasks"]["Row"] & {
  triaged_at?: string | null;
  parent_task_id?: string | null;
  /** Approval bookkeeping (migration 0037). Present via `*` once applied. */
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
};

/** Workspace-level role. 'superadmin' (migration 0035) is company-wide
 *  god mode — every team, project, and task, plus manager/role admin. */
export type WorkspaceRole = "member" | "admin" | "superadmin";
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
  /** Attachment count on the task. Same pattern as `comments`. Used
   *  to render the row's paperclip indicator without fetching the
   *  full attachment list. */
  attachments?: { count: number }[];
  /** All assignees from the task_assignees join table — primary
   *  (tasks.assignee_id) is in there too. Used to render the avatar
   *  stack on rows; the popover in the drawer is the authoritative
   *  editor. */
  assignees?: { user_id: string }[];
  /** Recurrence rule (lib/recurrence.ts). Present once migration 0029 is
   *  applied; fetched via the `*` in TASK_RELATIONS_SELECT. */
  recurrence?: string | null;
};

export const TASK_RELATIONS_SELECT = `
  *,
  project:projects(id, name, emoji),
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, avatar_color, avatar_url),
  author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color, avatar_url),
  comments:task_comments(count),
  attachments:task_attachments(count),
  assignees:task_assignees(user_id)
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

/**
 * Projects for the sidebar — only the ones the current user actually
 * belongs to. We filter on project_members explicitly rather than leaning
 * on RLS: post-0036 a superadmin (and a team manager) can *reach* every
 * project in their scope, which would flood the sidebar. The admin and
 * team surfaces are where "all projects" lives; the sidebar stays personal.
 */
export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const { data } = await (supabase as any)
    .from("projects")
    .select("*, project_members!inner(user_id)")
    .eq("project_members.user_id", profile.id)
    .order("created_at");
  return ((data ?? []) as Project[]).map((p) => {
    // Drop the join artifact so callers see a clean Project.
    const { project_members: _pm, ...rest } = p as Project & {
      project_members?: unknown;
    };
    return rest as Project;
  });
});

// ── Teams ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
}

export interface TeamMember extends Profile {
  /** Workspace role (member / admin / superadmin), surfaced in the roster. */
  team_role: WorkspaceRole;
}

/**
 * Every team (department) the current user belongs to, earliest first.
 * A user can be on several now; this is the universe for the workspace
 * switcher.
 */
export const getMyTeams = cache(async (): Promise<Team[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const profile = await getCurrentProfile();
  if (!profile) return [];

  const { data } = await (supabase
    .from("team_members")
    .select("team:teams(id, workspace_id, name, color)")
    .eq("user_id", profile.id)
    .order("joined_at") as any);
  return ((data ?? []) as Array<{ team: Team | null }>)
    .map((r) => r.team)
    .filter((t): t is Team => t != null);
});

/**
 * The team the user is currently viewing — their active selection, or
 * the earliest team they joined as a fallback. Mirrors the DB's
 * app_private.my_team_id() so server queries and RLS agree on which
 * team is "current".
 */
export const getMyTeam = cache(async (): Promise<Team | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const teams = await getMyTeams();
  if (teams.length === 0) return null;
  if (teams.length === 1) return teams[0];

  const { data: sel } = await (supabase as any)
    .from("team_active_selection")
    .select("team_id")
    .eq("user_id", profile.id)
    .maybeSingle();
  const activeId = sel?.team_id as string | undefined;
  return teams.find((t) => t.id === activeId) ?? teams[0];
});

/** The current user's role in their ACTIVE team. */
export const getMyTeamRole = cache(
  async (): Promise<"admin" | "member" | null> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return null;
    const profile = await getCurrentProfile();
    if (!profile) return null;
    const team = await getMyTeam();
    if (!team) return null;

    const { data } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", profile.id)
      .eq("team_id", team.id)
      .maybeSingle();
    return (data?.role as "admin" | "member" | null) ?? null;
  }
);

// ── Superadmin & team managers (migrations 0035–0037) ──────────────────────────

/** The current user's workspace role: member / admin / superadmin. */
export const getMyWorkspaceRole = cache(
  async (): Promise<WorkspaceRole | null> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return null;
    const profile = await getCurrentProfile();
    if (!profile) return null;
    const ws = await getDefaultWorkspace();
    if (!ws) return null;

    const { data } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", ws.id)
      .eq("user_id", profile.id)
      .maybeSingle();
    return (data?.role as WorkspaceRole | null) ?? null;
  }
);

export const isSuperadmin = cache(async (): Promise<boolean> => {
  return (await getMyWorkspaceRole()) === "superadmin";
});

/** Team ids the current user is a MANAGER (approver) of. */
export const getMyManagedTeamIds = cache(async (): Promise<string[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const { data } = await (supabase as any)
    .from("team_managers")
    .select("team_id")
    .eq("user_id", profile.id);
  return ((data ?? []) as Array<{ team_id: string }>).map((r) => r.team_id);
});

export interface TeamRosterRow extends Profile {
  role: WorkspaceRole;
  is_manager: boolean;
}

export interface TeamAdminRow {
  id: string;
  name: string;
  color: string | null;
  memberCount: number;
  projectCount: number;
  managers: Pick<
    Profile,
    "id" | "name" | "initials" | "avatar_color" | "avatar_url"
  >[];
  /** Full team roster, each member flagged manager-or-not. */
  roster: TeamRosterRow[];
}

/**
 * Every team in the workspace with its member/project counts, manager list,
 * and full roster — everything the superadmin admin area needs, in a FIXED
 * number of queries regardless of team count. Teams, members, managers, and
 * projects are each fetched once and grouped in memory (no per-team
 * round-trips). Relies on superadmin RLS reach for projects + team_managers,
 * so it returns full data only for a superadmin (the page is superadmin-gated).
 */
export const getTeamsAdminOverview = cache(
  async (): Promise<TeamAdminRow[]> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];
    const [teamsR, membersR, managersR, projectsR] = await Promise.all([
      supabase.from("teams").select("id, name, color").order("name"),
      (supabase as any)
        .from("team_members")
        .select("team_id, role, profile:profiles!inner(*)")
        .order("joined_at"),
      (supabase as any).from("team_managers").select("team_id, user_id"),
      supabase.from("projects").select("id, team_id"),
    ]);

    const projectCount = new Map<string, number>();
    for (const r of (projectsR.data ?? []) as Array<{
      team_id: string | null;
    }>) {
      if (r.team_id)
        projectCount.set(r.team_id, (projectCount.get(r.team_id) ?? 0) + 1);
    }

    // Manager user-ids per team → drives the is_manager flag on each roster
    // row (and the managers list is then just the manager rows of the roster).
    const managerIds = new Map<string, Set<string>>();
    for (const r of (managersR.data ?? []) as Array<{
      team_id: string;
      user_id: string;
    }>) {
      const set = managerIds.get(r.team_id) ?? new Set<string>();
      set.add(r.user_id);
      managerIds.set(r.team_id, set);
    }

    const rosterByTeam = new Map<string, TeamRosterRow[]>();
    for (const r of (membersR.data ?? []) as Array<{
      team_id: string;
      role: string;
      profile: Profile;
    }>) {
      const row: TeamRosterRow = {
        ...r.profile,
        role: r.role as WorkspaceRole,
        is_manager: managerIds.get(r.team_id)?.has(r.profile.id) ?? false,
      };
      const arr = rosterByTeam.get(r.team_id) ?? [];
      arr.push(row);
      rosterByTeam.set(r.team_id, arr);
    }

    return (
      (teamsR.data ?? []) as Array<{
        id: string;
        name: string;
        color: string | null;
      }>
    ).map((t) => {
      const roster = rosterByTeam.get(t.id) ?? [];
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        memberCount: roster.length,
        projectCount: projectCount.get(t.id) ?? 0,
        managers: roster
          .filter((m) => m.is_manager)
          .map((m) => ({
            id: m.id,
            name: m.name,
            initials: m.initials,
            avatar_color: m.avatar_color,
            avatar_url: m.avatar_url,
          })),
        roster,
      };
    });
  }
);

/**
 * Members of the company workspace. The universe for assignee pickers,
 * the People directory, and the "add to project" picker. Projects can
 * pull anyone from the company in (cross-department), so visibility of
 * a teammate is gated by workspace membership, not team.
 */
export const getWorkspaceMembers = cache(async (): Promise<Profile[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const ws = await getDefaultWorkspace();
  if (!ws) return [];

  const { data } = await (supabase
    .from("workspace_members")
    .select("profile:profiles!inner(*)")
    .eq("workspace_id", ws.id)
    .order("joined_at") as any);
  const all = ((data ?? []) as Array<{ profile: Profile }>).map((r) => r.profile);

  // Directory restriction (lobby model). A "General-only" lobby user — in the
  // shared General team, on no real team, and not an admin/superadmin/manager —
  // shouldn't see the whole company roster (or be able to assign to anyone).
  // Anyone on a real team, plus admins/superadmins/managers, sees everyone so
  // they can find people to invite. Latent today (every current user is on a
  // real team, so they fall through to "see everyone"); it engages once
  // external people sign in to the lobby.
  const [role, myTeams, managed] = await Promise.all([
    getMyWorkspaceRole(),
    getMyTeams(),
    getMyManagedTeamIds(),
  ]);
  const privileged =
    role === "admin" || role === "superadmin" || managed.length > 0;
  const onRealTeam = myTeams.some(
    (t) => (t.name ?? "").toLowerCase() !== "general"
  );
  if (privileged || onRealTeam) return all;

  // General-only: show only people who share the General team.
  const generalTeamIds = myTeams
    .filter((t) => (t.name ?? "").toLowerCase() === "general")
    .map((t) => t.id);
  if (generalTeamIds.length === 0) return all;
  const { data: gm } = await (supabase
    .from("team_members")
    .select("user_id")
    .in("team_id", generalTeamIds) as any);
  const visible = new Set(
    ((gm ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)
  );
  return all.filter((m) => visible.has(m.id));
});

/** Same as getWorkspaceMembers but each row carries its workspace role. */
export const getTeamMembersWithRole = cache(
  async (): Promise<TeamMember[]> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];
    const ws = await getDefaultWorkspace();
    if (!ws) return [];

    const { data } = await (supabase
      .from("workspace_members")
      .select("role, profile:profiles!inner(*)")
      .eq("workspace_id", ws.id)
      .order("joined_at") as any);
    return ((data ?? []) as Array<{ role: string; profile: Profile }>).map(
      (r) => ({ ...r.profile, team_role: r.role as WorkspaceRole })
    );
  }
);

/**
 * Members of a specific project. Project membership gates visibility of
 * the project and its tasks in the new (post-0030) model, so the project
 * page surfaces this list and the assignee picker filters against it.
 */
export interface ProjectMember extends Profile {
  project_role: "admin" | "member";
  joined_at: string;
}

export const getProjectMembers = cache(
  async (projectId: string): Promise<ProjectMember[]> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];

    // project_members is post-0030; not in generated database.types yet.
    const { data } = await ((supabase as any)
      .from("project_members")
      .select("role, joined_at, profile:profiles!inner(*)")
      .eq("project_id", projectId)
      .order("joined_at"));
    return (
      (data ?? []) as Array<{
        role: string;
        joined_at: string;
        profile: Profile;
      }>
    ).map((r) => ({
      ...r.profile,
      project_role: r.role as "admin" | "member",
      joined_at: r.joined_at,
    }));
  }
);

// ── Invitations ──────────────────────────────────────────────────────────────

export interface PendingInvitation {
  id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expires_at: string;
  created_at: string;
}

/**
 * Pending invitations for the current user's team. RLS already scopes
 * the read to admins of the team — non-admins get an empty list.
 */
export const getPendingInvitations = cache(
  async (): Promise<PendingInvitation[]> => {
    const supabase = await getSupabaseServer();
    if (!supabase) return [];
    const team = await getMyTeam();
    if (!team) return [];

    // team_invitations isn't in the generated database.types yet —
    // cast supabase to any (same pattern as saved_views, etc.).
    const { data } = await (supabase as any)
      .from("team_invitations")
      .select("id, email, role, token, expires_at, created_at")
      .eq("team_id", team.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    return (data ?? []) as PendingInvitation[];
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
  const { data, error } = (await (build(base as any) as unknown as Promise<{
    data: TaskWithRelations[] | null;
    error: unknown;
  }>)) as { data: TaskWithRelations[] | null; error: unknown };
  if (error) {
    // Surface the cause in dev — silent empty lists made the
    // missing-migration case look like "no tasks exist".
    if (process.env.NODE_ENV !== "production") {
      console.error("[fetchTasks] query failed:", error);
    }
    return [];
  }
  return data ?? [];
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
 * All completed tasks assigned to me, newest first. Used by the
 * /completed page so the user has a single surface for "what I've
 * already shipped" beyond the today-only chip on My Day.
 */
export async function getCompletedAssignedToMe(): Promise<TaskWithRelations[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  return fetchTasks((q: any) =>
    q
      .eq("assignee_id", profile.id)
      .eq("status", "done")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(200)
  );
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
  const useSortOrder = await hasTaskSortOrder();
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

/**
 * Approval queue — team tasks sitting in 'in_review' that the current user
 * can sign off: tasks in teams they manage, or everything if a superadmin.
 * RLS already scopes what they can see; we filter by status + managed teams
 * for the focused queue. Oldest submission first (clear the backlog).
 */
export async function getTasksAwaitingMyApproval(): Promise<
  TaskWithRelations[]
> {
  const [superadmin, managed] = await Promise.all([
    isSuperadmin(),
    getMyManagedTeamIds(),
  ]);
  if (!superadmin && managed.length === 0) return [];
  return fetchTasks((q: any) => {
    let chain = q.eq("status", "in_review");
    if (!superadmin) chain = chain.in("team_id", managed);
    return chain.order("submitted_at", { ascending: true, nullsFirst: false });
  });
}

/** Badge count for the approval queue (managers / superadmins). */
export const getApprovalQueueCount = cache(async (): Promise<number> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return 0;
  const [superadmin, managed] = await Promise.all([
    isSuperadmin(),
    getMyManagedTeamIds(),
  ]);
  if (!superadmin && managed.length === 0) return 0;
  let q = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_review");
  if (!superadmin) q = q.in("team_id", managed);
  const { count } = await q;
  return count ?? 0;
});

export async function getProjectTasks(
  projectId: string
): Promise<TaskWithRelations[]> {
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

/**
 * Completed tasks for a project, newest-finished first. Powers the
 * collapsible "Completed" disclosure on the project page so a finished
 * task is still reachable (and reopenable) instead of vanishing.
 */
export async function getProjectDoneTasks(
  projectId: string,
  limit = 50
): Promise<TaskWithRelations[]> {
  return fetchTasks((q: any) =>
    q
      .eq("project_id", projectId)
      .eq("status", "done")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(limit)
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
}

/** Members with their open/done task counts. Powers the /workspace grid and the app-wide member list. */
export const getMembersWithPulse = cache(async (): Promise<MemberPulse[]> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const members = await getWorkspaceMembers();
  if (members.length === 0) return [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const ids = members.map((m) => m.id);

  // Two count-only scans: open tasks per user, and tasks each user
  // finished today. We only need the assignee column to tally.
  const [openRes, doneRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("assignee_id")
      .neq("status", "done")
      .in("assignee_id", ids),
    supabase
      .from("tasks")
      .select("assignee_id")
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

  const supabase = await getSupabaseServer();
  if (!supabase) return [];

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  // Lean select on purpose: the activity feed (right rail) shows only
  // the top 4 entries and reads just the task title + author. Fetching
  // through TASK_RELATIONS_SELECT here pulled 50 rows hydrated with the
  // comment/attachment count subqueries and the project/assignee joins —
  // none of which the feed renders — on every My Day and Inbox load.
  // Limit 8 leaves a small buffer above the 4 shown after the in-memory
  // sort.
  const { data } = await supabase
    .from("tasks")
    .select(
      `id, title, status, created_at, completed_at,
       author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color, avatar_url)`
    )
    .or(
      `and(assignee_id.eq.${profile.id},author_id.neq.${profile.id},created_at.gte.${sinceIso}),and(assignee_id.eq.${profile.id},status.eq.done,completed_at.gte.${sinceIso})`
    )
    .order("created_at", { ascending: false })
    .limit(8);

  const rows = (data ?? []) as unknown as TaskWithRelations[];
  const items: ActivityItem[] = rows.map((t) => {
    if (t.status === "done" && t.completed_at) {
      return { kind: "i-completed", task: t, at: t.completed_at };
    }
    return { kind: "assigned-to-me", task: t, at: t.created_at };
  });
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
