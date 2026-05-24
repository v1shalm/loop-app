"use client";

import { useEffect, useMemo, useState } from "react";
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
import { MobileSheet } from "@/components/mobile-sheet";
import { useIsMobile } from "@/lib/use-is-mobile";
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
 * Notifications bell + popover. The single notifications surface in the
 * app — there is no `/notifications` route. Renders in the top bar.
 *
 * Seen-state lives in localStorage as `notifications_last_seen_at`:
 * any item with `at > seenAt` is "unread" and contributes to the
 * red-dot badge. "Mark all read" sets seenAt = now. localStorage was
 * chosen over a server column because for an internal team app the
 * cost of a migration + sync isn't worth single-device read state.
 */
const SEEN_AT_KEY = "loop:notifications-seen-at";

function loadSeenAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(SEEN_AT_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function saveSeenAt(at: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_AT_KEY, String(at));
  } catch {
    // ignore quota/permission errors
  }
}

export function NotificationsPopover({
  currentUserId,
  className,
}: {
  currentUserId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    setSeenAt(loadSeenAt());
  }, []);

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

  // "Unread" = items more recent than the last seen timestamp.
  // Recomputed locally because seen-state isn't on the server.
  const unreadCount = useMemo(() => {
    if (!mounted) return 0;
    return items.filter((it) => new Date(it.at).getTime() > seenAt).length;
  }, [items, seenAt, mounted]);

  const hasAnyUnread = unreadCount > 0;

  const filtered = tab === "tasks" ? items : items;

  const markAllRead = () => {
    const now = Date.now();
    setSeenAt(now);
    saveSeenAt(now);
  };

  const body = (
    <NotificationsBody
      loading={loading}
      items={filtered}
      tab={tab}
      onTabChange={setTab}
      onItemClick={() => setOpen(false)}
      onMarkAllRead={markAllRead}
      hasAnyUnread={hasAnyUnread}
      seenAt={seenAt}
    />
  );

  // Mobile: native-style bottom sheet from the bell trigger. The trigger
  // is a plain button that opens the sheet; on desktop the trigger is
  // the PopoverTrigger anchor.
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Notifications"
          className={cn(
            "focus-ring relative grid size-9 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]",
            className
          )}
        >
          <Bell size={18} />
          {hasAnyUnread && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 grid size-1.5 place-items-center"
            >
              <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative size-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
            </span>
          )}
        </button>
        <MobileSheet
          open={open}
          onClose={() => setOpen(false)}
          ariaLabel="Notifications"
        >
          {body}
        </MobileSheet>
      </>
    );
  }

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
              {hasAnyUnread && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 grid size-1.5 place-items-center"
                >
                  <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative size-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
                </span>
              )}
            </PopoverTrigger>
          }
        />
        <TooltipContent side="bottom">
          Notifications
          {hasAnyUnread && (
            <span className="ml-1.5 text-background/70">
              · {unreadCount} new
            </span>
          )}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[380px] gap-0 p-0 shadow-soft-md"
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}

function NotificationsBody({
  loading,
  items,
  tab,
  onTabChange,
  onItemClick,
  onMarkAllRead,
  hasAnyUnread,
  seenAt,
}: {
  loading: boolean;
  items: Item[];
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onItemClick: () => void;
  onMarkAllRead: () => void;
  hasAnyUnread: boolean;
  seenAt: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/60 px-4 pt-3 max-md:pt-2">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground max-md:text-[15px]">
          Notifications
        </h3>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={!hasAnyUnread}
          className="text-[11.5px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 max-md:text-[13px]"
        >
          Mark all read
        </button>
      </div>
      <nav className="flex items-center gap-0.5 border-b border-border/60 px-2">
        {(["all", "tasks"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={cn(
              "focus-ring -mb-px border-b-2 px-2.5 py-2 text-[12.5px] transition-[color,border-color] duration-150 ease-[var(--ease-out)] max-md:min-h-[44px] max-md:px-4 max-md:text-[14px]",
              tab === t
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "all" ? "All" : "Tasks"}
          </button>
        ))}
      </nav>
      <div className="max-h-[460px] overflow-y-auto max-md:max-h-none max-md:flex-1">
        {loading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <CircleNotch size={16} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
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
            {items.map((item) => {
              const isNew = new Date(item.at).getTime() > seenAt;
              return (
                <li key={item.id}>
                  <NotificationRow
                    item={item}
                    onClose={onItemClick}
                    isNew={isNew}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function NotificationRow({
  item,
  onClose,
  isNew,
}: {
  item: Item;
  onClose: () => void;
  isNew: boolean;
}) {
  const href = item.project_id
    ? `/projects/${item.project_id}?task=${item.task_id}`
    : `/assigned-to-me?task=${item.task_id}`;

  return (
    <Link
      href={href}
      onClick={onClose}
      className="focus-ring relative flex items-start gap-2.5 px-4 py-2.5 transition-[background-color] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 max-md:py-3.5"
    >
      {/* Unread indicator — a tiny brand-pink dot at the left edge */}
      {isNew && (
        <span
          aria-hidden
          className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
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
