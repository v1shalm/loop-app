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

export type NotificationKind =
  | "assigned"
  | "completed"
  | "rescheduled"
  | "comment"
  | "mention";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  taskId: string | null;
  taskTitle: string;
  actor: NotificationActor | null;
  at: string;
  /** Trimmed comment body for comment/mention; null otherwise. */
  preview: string | null;
  /** Reschedule only: previous and new due timestamps. */
  fromDueAt: string | null;
  toDueAt: string | null;
}

interface NotificationsCtx {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  items: NotificationItem[];
  loading: boolean;
  readAt: string | null;
  unreadCount: number;
  refresh: () => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsCtx | null>(null);

const PANEL_W_OPEN = "340px";
const PANEL_W_CLOSED = "0px";
const LOOKBACK_DAYS = 14;
const RESULT_CAP = 60;

/**
 * Owns the bell drawer's open/close + the inbox feed. The feed now reads
 * from the `notifications` table (migration 0032), so adding a new event
 * type doesn't require a new query here — just a new trigger and a row
 * in the renderer. Unread is still cursor-based off
 * `profiles.notifications_last_read_at`.
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const [profileRes, notifRes] = await Promise.all([
      sb
        .from("profiles")
        .select("notifications_last_read_at")
        .eq("id", currentUserId)
        .maybeSingle(),
      sb
        .from("notifications")
        .select(
          `id, kind, task_id, payload, created_at,
           actor:profiles!notifications_actor_id_fkey(id, name, initials, avatar_color, avatar_url)`
        )
        .eq("recipient_id", currentUserId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(RESULT_CAP),
    ]);

    type Row = {
      id: string;
      kind: NotificationKind;
      task_id: string | null;
      payload: {
        task_title?: string;
        preview?: string;
        from_due_at?: string | null;
        to_due_at?: string | null;
      } | null;
      created_at: string;
      actor: NotificationActor | null;
    };

    const rows = (notifRes.data ?? []) as Row[];
    const mapped: NotificationItem[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      taskId: r.task_id,
      taskTitle: r.payload?.task_title ?? "a task",
      actor: r.actor,
      at: r.created_at,
      preview: r.payload?.preview ?? null,
      fromDueAt: r.payload?.from_due_at ?? null,
      toDueAt: r.payload?.to_due_at ?? null,
    }));

    setItems(mapped);
    setReadAt(
      (profileRes.data?.notifications_last_read_at as string | null) ?? null
    );
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);
  useEffect(() => {
    if (open) void fetchFeed();
  }, [open, fetchFeed]);

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
