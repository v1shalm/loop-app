"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RelativeTime } from "@/components/relative-time";
import {
  Bell,
  CheckCircle,
  CircleNotch,
  Tray,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Tab = "all" | "tasks";

interface Item {
  id: string;
  kind: "i-completed" | "assigned-to-me";
  task_id: string;
  title: string;
  at: string;
  project_id: string | null;
  author_name: string | null;
}

/**
 * Bell trigger + popover. Replaces the standalone /notifications page
 * for the common case — keeps the route around as a deep link, but the
 * popover is the primary surface.
 */
export function NotificationsPopover({
  unreadCount,
  currentUserId,
  className,
}: {
  unreadCount: number;
  currentUserId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceIso = since.toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase
      .from("tasks")
      .select(
        "id, title, status, created_at, completed_at, project_id, assignee_id, author_id, author:profiles!tasks_author_id_fkey(name)"
      )
      .or(
        `and(assignee_id.eq.${currentUserId},author_id.neq.${currentUserId},created_at.gte.${sinceIso}),and(assignee_id.eq.${currentUserId},status.eq.done,completed_at.gte.${sinceIso})`
      )
      .order("created_at", { ascending: false })
      .limit(20) as any).then((res: { data: unknown[] | null }) => {
      type Row = {
        id: string;
        title: string;
        status: string;
        created_at: string;
        completed_at: string | null;
        project_id: string | null;
        author: { name: string } | null;
      };
      const rows = (res.data ?? []) as Row[];
      const mapped: Item[] = rows.map((r) => {
        const completed = r.status === "done" && r.completed_at;
        return {
          id: `${r.id}-${completed ? "done" : "assigned"}`,
          kind: completed ? "i-completed" : "assigned-to-me",
          task_id: r.id,
          title: r.title,
          at: completed ? r.completed_at! : r.created_at,
          project_id: r.project_id,
          author_name: r.author?.name ?? null,
        };
      });
      setItems(mapped.sort((a, b) => b.at.localeCompare(a.at)));
      setLoading(false);
    });
  }, [open, currentUserId]);

  const filtered = tab === "tasks" ? items : items;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              aria-label="Notifications"
              className={cn(
                "focus-ring relative grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]",
                className
              )}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 grid size-1.5 place-items-center"
                >
                  <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative size-1.5 rounded-full bg-rose-500 ring-2 ring-sidebar" />
                </span>
              )}
            </PopoverTrigger>
          }
        />
        <TooltipContent side="bottom">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-1.5 text-background/70">
              · {unreadCount} unread
            </span>
          )}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[360px] gap-0 p-0 shadow-soft-md"
      >
        {/* Header with tabs */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 pt-3">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
            Notifications
          </h3>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <nav className="flex items-center gap-0.5 border-b border-border/60 px-2">
          {(["all", "tasks"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "focus-ring -mb-px border-b-2 px-2.5 py-2 text-[12.5px] transition-colors",
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All" : "Tasks"}
            </button>
          ))}
        </nav>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <CircleNotch size={16} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center px-4 py-10 text-center">
              <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                <Bell size={16} />
              </span>
              <p className="mt-2.5 text-[13px] font-medium text-foreground">
                All caught up
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                New assignments will show up here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col py-1">
              {filtered.map((item) => (
                <li key={item.id}>
                  <NotificationRow item={item} onClose={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  item,
  onClose,
}: {
  item: Item;
  onClose: () => void;
}) {
  const href = item.project_id
    ? `/projects/${item.project_id}?task=${item.task_id}`
    : `/assigned-to-me?task=${item.task_id}`;

  return (
    <Link
      href={href}
      onClick={onClose}
      className="focus-ring flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-accent/40"
    >
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted">
        {item.kind === "i-completed" ? (
          <CheckCircle
            size={12}
            weight="fill"
            className="text-emerald-600"
          />
        ) : (
          <Tray size={11} className="text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-snug text-muted-foreground">
          {item.kind === "i-completed" ? (
            <>
              <span className="font-medium text-foreground">You</span>{" "}
              completed{" "}
              <span className="font-medium text-foreground">{item.title}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {item.author_name ?? "Someone"}
              </span>{" "}
              assigned you{" "}
              <span className="font-medium text-foreground">{item.title}</span>
            </>
          )}
        </p>
        <RelativeTime
          date={item.at}
          className="mt-0.5 block text-[11px] text-muted-foreground/70"
        />
      </div>
    </Link>
  );
}
