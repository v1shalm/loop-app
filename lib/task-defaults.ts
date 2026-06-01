/**
 * Single source of truth for what a new task should default to based on
 * the route it's created from. Both task-creation entry points use this
 * so "add a task on My Day" means the same thing whether it came from the
 * bottom composer bar, the quick-add modal, the top-nav CTA, or an empty
 * state — they no longer derive defaults independently and disagree.
 *
 *   - My Day  -> due end of today (it's the "today" surface)
 *   - Project -> tagged to that project
 *   - elsewhere (Inbox, Upcoming, ...) -> no due date, no project
 *
 * Assignee defaults to the current user everywhere, so it isn't part of
 * the route derivation.
 */
export interface RouteTaskDefaults {
  dueAt: string | null;
  projectId: string | null;
}

export function deriveTaskDefaults(pathname: string): RouteTaskDefaults {
  if (
    pathname === "/assigned-to-me" ||
    pathname === "/today" ||
    pathname === "/my-tasks"
  ) {
    const eod = new Date();
    eod.setHours(23, 59, 0, 0);
    return { dueAt: eod.toISOString(), projectId: null };
  }
  if (pathname.startsWith("/projects/")) {
    return { dueAt: null, projectId: pathname.split("/")[2] ?? null };
  }
  return { dueAt: null, projectId: null };
}
