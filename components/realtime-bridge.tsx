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
          // Coalesce refresh calls to avoid spamming the server on bursts.
          const now = Date.now();
          if (now - lastRefresh.current > 250) {
            lastRefresh.current = now;
            router.refresh();
          }

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, workspaceId, router]);

  return null;
}
