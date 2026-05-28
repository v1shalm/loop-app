"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { sileo } from "sileo";
import { format, isToday, isTomorrow } from "date-fns";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { playSound } from "@/lib/sounds";

interface TaskPayload {
  id: string;
  workspace_id: string;
  author_id: string | null;
}

interface NotificationPayload {
  id: string;
  kind: "assigned" | "completed" | "rescheduled" | "comment" | "mention";
  task_id: string | null;
  payload: {
    task_title?: string;
    preview?: string;
    to_due_at?: string | null;
  } | null;
}

const NOTIFICATIONS_PAUSED_KEY = "loop:notifications-paused";

function isPaused(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NOTIFICATIONS_PAUSED_KEY) === "1";
}

/**
 * Subscribes to Supabase realtime for the current user. Two channels:
 *
 *   1. `notifications:<userId>` — INSERT on public.notifications filtered
 *      to recipient_id=me. Each row fires a toast + sound with copy
 *      derived from `kind`. This is the only path that toasts; the row
 *      is also picked up by the bell drawer on next open.
 *
 *   2. `tasks:<workspaceId>` — any change to tasks in the workspace,
 *      used purely to `router.refresh()` so server components re-fetch
 *      stale data. Self-authored changes and changes while the tab is
 *      hidden are skipped.
 *
 * Notification toasts respect `loop:notifications-paused` in
 * localStorage, which the profile menu's pause toggle flips.
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

  const navRef = useRef({ router, pathname, searchParams });
  useEffect(() => {
    navRef.current = { router, pathname, searchParams };
  });

  const taskUrl = (taskId: string) => {
    const { pathname: p, searchParams: sp } = navRef.current;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("task", taskId);
    const qs = params.toString();
    return qs ? `${p}?${qs}` : p;
  };

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const notificationsChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (isPaused()) return;
          const row = payload.new as NotificationPayload;
          const toast = toastFor(row);
          if (!toast) return;
          playSound(row.kind === "assigned" ? "assignedToMe" : "added");
          const action = row.task_id
            ? {
                title: "View",
                onClick: () => {
                  window.history.pushState(null, "", taskUrl(row.task_id!));
                },
              }
            : undefined;
          sileo[toast.tone]({
            title: toast.title,
            description: toast.description,
            ...(action ? { button: action } : {}),
          });
        }
      )
      .subscribe();

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

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [userId, workspaceId]);

  return null;
}

type Toast = {
  tone: "info" | "success";
  title: string;
  description: string | undefined;
};

function toastFor(row: NotificationPayload): Toast | null {
  const title = row.payload?.task_title ?? "a task";
  const preview = row.payload?.preview ?? undefined;
  switch (row.kind) {
    case "assigned":
      return {
        tone: "info",
        title: "New task assigned to you",
        description: title,
      };
    case "completed":
      return {
        tone: "success",
        title: "Your task was completed",
        description: title,
      };
    case "rescheduled":
      return {
        tone: "info",
        title: `Moved to ${formatDue(row.payload?.to_due_at ?? null)}`,
        description: title,
      };
    case "comment":
      return {
        tone: "info",
        title: `New comment on ${title}`,
        description: preview ? stripMentionMarkup(preview) : undefined,
      };
    case "mention":
      return {
        tone: "info",
        title: `You were mentioned on ${title}`,
        description: preview ? stripMentionMarkup(preview) : undefined,
      };
    default:
      return null;
  }
}

function formatDue(iso: string | null): string {
  if (!iso) return "no date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "a new date";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  return format(d, "EEE, d MMM");
}

function stripMentionMarkup(s: string): string {
  return s.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
}
