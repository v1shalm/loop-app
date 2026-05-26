"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { markNotificationsRead as markNotificationsReadAction } from "@/lib/actions";

export interface NotificationActor {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
  avatar_url: string | null;
}

export type NotificationKind = "assigned" | "comment";

export interface NotificationItem {
  /** Composite key: "<kind>-<source row id>". Stable across refreshes. */
  id: string;
  kind: NotificationKind;
  taskId: string;
  projectId: string | null;
  taskTitle: string;
  actor: NotificationActor | null;
  /** ISO timestamp the event happened (task created_at for assignments,
   *  comment created_at for comments). */
  at: string;
  /** First line of the comment body for comment notifications. Null for
   *  assignments. */
  preview: string | null;
}

interface NotificationsCtx {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  items: NotificationItem[];
  loading: boolean;
  /** ISO timestamp the user last opened the inbox. Anything created
   *  after this point is "unread". Null while still loading. */
  readAt: string | null;
  unreadCount: number;
  refresh: () => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsCtx | null>(null);

const PANEL_W_OPEN = "340px";
const PANEL_W_CLOSED = "0px";
// How far back to look. Two weeks keeps the inbox useful without
// dragging in stale activity. Tune later if it feels too long/short.
const LOOKBACK_DAYS = 14;
const RESULT_CAP = 50;

/**
 * Owns the desktop notifications drawer's open/close state AND the
 * inbox feed itself. The feed is shared between the topbar bell (which
 * needs the unread count to render its red dot) and the drawer (which
 * renders the full list), so co-locating them in one provider avoids
 * double-fetching and keeps the two surfaces consistent.
 *
 * Read state lives server-side as `profiles.notifications_last_read_at`
 * (migration 0028). Anything in the feed that's newer than that
 * cursor is "unread"; "Mark all read" bumps the cursor to now().
 *
 * The panel width is mirrored to `--notif-w` on the document root so
 * the BottomAddTaskBar (and any other fixed surface) can shift in sync
 * without subscribing to React state.
 */
export function NotificationsProvider({
  currentUserId,
  children,
}: {
  currentUserId: string;
  children: ReactNode;
}) {
  const [open, setOpenState] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [, startMarkAllRead] = useTransition();

  // Sync panel width to a CSS custom property so the BottomAddTaskBar
  // (fixed position) can shift in step with the panel without
  // subscribing to React state.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--notif-w",
      open ? PANEL_W_OPEN : PANEL_W_CLOSED
    );
    return () => {
      document.documentElement.style.removeProperty("--notif-w");
    };
  }, [open]);

  const fetchFeed = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);
    const sinceIso = since.toISOString();

    // Three queries in parallel. The read cursor is its own query so it
    // refreshes on every feed refetch (useful if mark-all-read is
    // triggered from another device).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [profileRes, assignedRes, commentsRes] = await Promise.all([
      sb
        .from("profiles")
        .select("notifications_last_read_at")
        .eq("id", currentUserId)
        .maybeSingle(),
      sb
        .from("tasks")
        .select(
          `id, title, project_id, created_at, author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color, avatar_url)`
        )
        .eq("assignee_id", currentUserId)
        .neq("author_id", currentUserId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(RESULT_CAP),
      sb
        .from("task_comments")
        .select(
          `id, task_id, body, created_at, task:tasks!inner(id, title, assignee_id, project_id), author:profiles!task_comments_author_id_fkey(id, name, initials, avatar_color, avatar_url)`
        )
        .eq("task.assignee_id", currentUserId)
        .neq("author_id", currentUserId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(RESULT_CAP),
    ]);

    type AssignedRow = {
      id: string;
      title: string;
      project_id: string | null;
      created_at: string;
      author: NotificationActor | null;
    };
    type CommentRow = {
      id: string;
      task_id: string;
      body: string;
      created_at: string;
      task: { id: string; title: string; project_id: string | null } | null;
      author: NotificationActor | null;
    };

    const merged: NotificationItem[] = [];
    for (const t of (assignedRes.data ?? []) as AssignedRow[]) {
      merged.push({
        id: `assign-${t.id}`,
        kind: "assigned",
        taskId: t.id,
        projectId: t.project_id,
        taskTitle: t.title,
        actor: t.author,
        at: t.created_at,
        preview: null,
      });
    }
    for (const c of (commentsRes.data ?? []) as CommentRow[]) {
      merged.push({
        id: `comment-${c.id}`,
        kind: "comment",
        taskId: c.task_id,
        projectId: c.task?.project_id ?? null,
        taskTitle: c.task?.title ?? "this task",
        actor: c.author,
        at: c.created_at,
        // Strip @[Name](uuid) legacy markup so the preview doesn't leak
        // uuids if anyone has old-format comments hanging around.
        preview: c.body
          .replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
    merged.sort((a, b) => b.at.localeCompare(a.at));

    setItems(merged.slice(0, RESULT_CAP));
    setReadAt(
      (profileRes.data?.notifications_last_read_at as string | null) ?? null
    );
    setLoading(false);
  }, [currentUserId]);

  // Initial load + reload whenever the panel is opened. Doesn't poll on
  // an interval; the realtime bridge will already invalidate the cache
  // when tasks/comments change, and we re-fetch on open anyway.
  // The async fetcher resolves its first setState inside a microtask
  // (after the synchronous useEffect body returns), so the React 19
  // "setState in effect" purity rule fires a false positive here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);
  useEffect(() => {
    if (open) void fetchFeed();
  }, [open, fetchFeed]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const unreadCount = useMemo(() => {
    if (!readAt) return 0;
    const cutoff = new Date(readAt).getTime();
    return items.filter((it) => new Date(it.at).getTime() > cutoff).length;
  }, [items, readAt]);

  const setOpen = useCallback((v: boolean) => setOpenState(v), []);
  const toggle = useCallback(() => setOpenState((p) => !p), []);

  const refresh = useCallback(() => {
    void fetchFeed();
  }, [fetchFeed]);

  const markAllRead = useCallback(() => {
    // Optimistic: bump the local cursor immediately so the dot
    // disappears and "N new" pill goes away. Server call confirms;
    // the next refresh syncs the canonical value.
    const optimistic = new Date().toISOString();
    setReadAt(optimistic);
    startMarkAllRead(async () => {
      const res = await markNotificationsReadAction();
      if (res.readAt) setReadAt(res.readAt);
    });
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        open,
        toggle,
        setOpen,
        items,
        loading,
        readAt,
        unreadCount,
        refresh,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      open: false,
      toggle: () => {},
      setOpen: () => {},
      items: [] as NotificationItem[],
      loading: false,
      readAt: null,
      unreadCount: 0,
      refresh: () => {},
      markAllRead: () => {},
    };
  }
  return ctx;
}
