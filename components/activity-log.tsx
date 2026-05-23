"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CircleNotch, Plus, CheckCircle, UserPlus, ArrowsClockwise, Trash } from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Profile } from "@/lib/queries";

export interface ActivityLog {
  id: string;
  task_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor: Profile | null;
}

export function ActivityLogs({ taskId, members }: { taskId: string; members: Profile[] }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      const supabase = getSupabaseBrowser();
      if (!supabase) return;

      // task_activity_logs isn't in the generated DB types yet — widen
      // the client locally so the query compiles.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("task_activity_logs")
        .select(`
          id, task_id, action, old_value, new_value, created_at,
          actor_id
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (!active || !data) return;

      type Row = {
        id: string;
        task_id: string;
        action: string;
        old_value: string | null;
        new_value: string | null;
        created_at: string;
        actor_id: string | null;
      };
      const enriched = (data as Row[]).map((log) => {
        const actor = members.find((m) => m.id === log.actor_id) ?? null;
        return { ...log, actor };
      });

      setLogs(enriched);
      setLoading(false);
    };

    fetchLogs();

    return () => { active = false; };
  }, [taskId, members]);

  if (loading) {
    return (
      <div className="flex h-12 items-center justify-center text-muted-foreground">
        <CircleNotch size={14} className="animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-[12.5px] text-muted-foreground">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pl-1">
      {logs.map((log) => (
        <div key={log.id} className="relative flex gap-3">
          <div className="relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-accent/50 ring-4 ring-card">
            <ActionIcon action={log.action} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[12.5px] text-foreground">
              <span className="font-medium">{log.actor?.name ?? "Someone"}</span>{" "}
              <ActionText log={log} members={members} />
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {format(new Date(log.created_at), "MMM d, h:mm a")}
            </p>
          </div>
          <div className="absolute bottom-[-16px] left-[11px] top-[24px] w-px bg-border/60 last-of-type:hidden" />
        </div>
      ))}
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  switch (action) {
    case "created": return <Plus size={12} className="text-muted-foreground" />;
    case "status_changed": return <CheckCircle size={12} className="text-emerald-500" />;
    case "assignee_changed": return <UserPlus size={12} className="text-amber-500" />;
    case "deleted": return <Trash size={12} className="text-rose-500" />;
    default: return <ArrowsClockwise size={12} className="text-muted-foreground" />;
  }
}

function ActionText({ log, members }: { log: ActivityLog; members: Profile[] }) {
  if (log.action === "created") return <>created this task</>;
  if (log.action === "status_changed") {
    const to = log.new_value === "done" ? "completed" : "todo";
    return <>marked task as <strong>{to}</strong></>;
  }
  if (log.action === "assignee_changed") {
    if (!log.new_value) return <>removed the assignee</>;
    const newAssignee = members.find(m => m.id === log.new_value)?.name ?? "someone";
    return <>assigned task to <strong>{newAssignee}</strong></>;
  }
  return <>updated the task</>;
}
