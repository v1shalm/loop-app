"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

/**
 * Subscribes to Supabase realtime task changes for the active workspace.
 * Mount once near the top of the (app) tree. Mounted in <AppShell>.
 *
 * What it does:
 *   • On any task change → router.refresh() so server components re-fetch.
 *   • On INSERT where the new task is assigned to me by someone else →
 *     fire the "assignedToMe" sound + toast.
 */
export function RealtimeBridge({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase
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
          // Fire the "assigned to you" toast/sound immediately — it's cheap
          // and the user needs the feedback right away.
          if (payload.eventType === "INSERT") {
            const task = payload.new as TaskPayload;
            if (
              task.assignee_id === userId &&
              task.author_id &&
              task.author_id !== userId
            ) {
              playSound("assignedToMe");
              sileo.info({
                title: "New task assigned to you",
                description: task.title,
              });
            }
          }

          // Skip the expensive router.refresh() if the user authored the
          // change themselves (their server action already revalidated) or
          // if the tab isn't focused — they'll get fresh data when they
          // come back.
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

          // Coalesce burst refreshes (multiple rows updated in one tx).
          const now = Date.now();
          if (now - lastRefresh.current > 1500) {
            lastRefresh.current = now;
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, workspaceId, router]);

  return null;
}
