"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sileo } from "sileo";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { playSound } from "@/lib/sounds";

interface TaskPayload {
  id: string;
  workspace_id: string;
  title: string;
  assignee_id: string | null;
  author_id: string | null;
  priority: number;
  status: string;
}

interface AssigneePayload {
  task_id: string;
  user_id: string;
  created_at: string;
}

const NOTIFICATIONS_PAUSED_KEY = "loop:notifications-paused";
const TOAST_DEDUPE_MS = 5_000;

function isPaused(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NOTIFICATIONS_PAUSED_KEY) === "1";
}

/**
 * Subscribes to Supabase realtime task changes for the active workspace.
 * Mounted once near the top of the (app) tree (inside <AppShell>).
 *
 * What it does:
 *
 *   1. On any task change in the workspace → router.refresh() so server
 *      components re-fetch. Skipped if the user authored the change
 *      (their server action already revalidated) or the tab isn't
 *      focused (data refreshes on next focus).
 *
 *   2. When a task is INSERTED or UPDATED so that the *current* user is
 *      the primary assignee, and the change was made by someone else,
 *      fire the "assigned to you" toast + sound. A short-TTL dedupe
 *      set prevents the same task from re-toasting if multiple updates
 *      land in a burst.
 *
 *   3. When a row in `task_assignees` is inserted with user_id === me,
 *      fire the "added as co-assignee" toast — unless we already fired
 *      a toast for that task in the last 5s (the primary-assignee path
 *      gets there first when a creator picks themselves).
 *
 *   4. Every notification path checks `loop:notifications-paused` in
 *      localStorage. The profile menu's "Pause notifications" toggle
 *      flips that flag, so all toasts respect it.
 */
export function RealtimeBridge({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRefresh = useRef(0);

  // Tracks task IDs we've toast'd for in the last ~5s. Prevents
  // double-popping when a task INSERT and its task_assignees INSERT
  // arrive back-to-back (the sync_primary_assignee trigger fires the
  // second event automatically).
  const recentlyToasted = useRef<Map<string, number>>(new Map());

  // Stash the always-changing router/pathname/searchParams in a ref so
  // the subscribe effect can stay subscribed across navigations. Without
  // this, every route change would tear down and rebuild both channels.
  const navRef = useRef({ router, pathname, searchParams });
  useEffect(() => {
    navRef.current = { router, pathname, searchParams };
  });

  // Build the path that opens a task in the drawer: preserves current
  // page, appends/replaces ?task=<id>.
  const taskUrl = (taskId: string) => {
    const { pathname: p, searchParams: sp } = navRef.current;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("task", taskId);
    const qs = params.toString();
    return qs ? `${p}?${qs}` : p;
  };

  const openTaskAction = (taskId: string) => ({
    title: "View",
    onClick: () => {
      // history.pushState integrates with useSearchParams and skips the
      // RSC refetch router.push would trigger for the same ?task swap.
      window.history.pushState(null, "", taskUrl(taskId));
    },
  });

  const wasRecentlyToasted = (taskId: string): boolean => {
    const now = Date.now();
    // Purge stale entries opportunistically — keeps the map from growing
    // unbounded over a long session.
    for (const [id, ts] of recentlyToasted.current.entries()) {
      if (now - ts > TOAST_DEDUPE_MS) recentlyToasted.current.delete(id);
    }
    return recentlyToasted.current.has(taskId);
  };

  const markToasted = (taskId: string) => {
    recentlyToasted.current.set(taskId, Date.now());
  };

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    // ── Channel 1: task INSERT/UPDATE/DELETE for the workspace ─────────
    const tasksChannel = supabase
      .channel(`tasks:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const task =
            (payload.new as TaskPayload | null) ??
            (payload.old as TaskPayload | null);

          // Assignment-to-me detection: INSERT or UPDATE where the new
          // primary assignee is me and the change wasn't authored by
          // me. We can't reliably compare old.assignee_id ↔ new on
          // UPDATEs (Supabase default REPLICA IDENTITY only sends the
          // PK in `old`), so we dedupe across events with a TTL set.
          if (
            (payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE") &&
            payload.new
          ) {
            const next = payload.new as TaskPayload;
            const authoredByMe = next.author_id === userId;
            const assignedToMe = next.assignee_id === userId;

            if (
              assignedToMe &&
              !authoredByMe &&
              !wasRecentlyToasted(next.id) &&
              !isPaused()
            ) {
              markToasted(next.id);
              playSound("assignedToMe");
              sileo.info({
                title:
                  payload.eventType === "INSERT"
                    ? "New task assigned to you"
                    : "A task was assigned to you",
                description: next.title,
                button: openTaskAction(next.id),
              });
            }
          }

          // Refresh server components in the background. Skip if the
          // change was authored by me (server action already revalidated)
          // or the tab isn't visible (refresh happens on next focus).
          if (task?.author_id === userId) return;
          if (
            typeof document !== "undefined" &&
            document.visibilityState !== "visible"
          ) {
            return;
          }
          const now = Date.now();
          if (now - lastRefresh.current > 1500) {
            lastRefresh.current = now;
            navRef.current.router.refresh();
          }
        }
      )
      .subscribe();

    // ── Channel 2: task_assignees INSERT where user_id = me ─────────────
    // Server-side filter narrows the event to just rows about me.
    const assigneesChannel = supabase
      .channel(`assignees:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_assignees",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as AssigneePayload;
          // Suppress if the primary-assignee path already toasted this
          // task — most commonly the case when the task creator picked
          // themselves and the sync trigger fired this insert.
          if (wasRecentlyToasted(row.task_id)) return;
          if (isPaused()) return;

          markToasted(row.task_id);
          playSound("assignedToMe");
          sileo.info({
            title: "You were added to a task",
            description: "Open it to see what's needed.",
            button: openTaskAction(row.task_id),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(assigneesChannel);
    };
    // Intentionally subscribes once per user/workspace. router / pathname /
    // searchParams are read via navRef so navigations don't resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, workspaceId]);

  return null;
}
