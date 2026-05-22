"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Tray } from "@/components/icons";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import type { ActivityItem } from "@/lib/queries";

type Tab = "all" | "tasks";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tasks", label: "Tasks" },
];

export function NotificationsList({
  items,
  activeTab,
}: {
  items: ActivityItem[];
  activeTab: Tab;
}) {
  // Both tabs surface the same task-derived feed for now. Filter hook is
  // here so Mentions / Comments can plug in later without restructuring.
  const filtered = items;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1 border-b border-border/50">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "all" ? "/notifications" : `/notifications?tab=${t.id}`}
            scroll={false}
            className={cn(
              "focus-ring -mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              activeTab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="All caught up"
          hint="New assignments and completions show up here as they happen."
          showAction={false}
        />
      ) : (
        <ul className="flex flex-col">
          {filtered.map((a, i) => (
            <li key={`${a.task.id}-${a.kind}-${i}`}>
              <NotificationRow item={a} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NotificationRow({ item }: { item: ActivityItem }) {
  const ago = formatDistanceToNow(new Date(item.at), { addSuffix: true });
  const href = item.task.project
    ? `/projects/${item.task.project.id}`
    : "/assigned-to-me";

  const body =
    item.kind === "i-completed" ? (
      <>
        You completed{" "}
        <span className="text-foreground">{item.task.title}</span>
      </>
    ) : (
      <>
        <span className="text-foreground">
          {item.task.author?.name ?? "Someone"}
        </span>{" "}
        assigned you{" "}
        <span className="text-foreground">{item.task.title}</span>
      </>
    );

  return (
    <Link
      href={href}
      className="focus-ring flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-accent/40"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
        {item.kind === "i-completed" ? (
          <CheckCircle
            size={15}
            weight="fill"
            className="text-emerald-600"
          />
        ) : (
          <Tray size={14} className="text-muted-foreground" />
        )}
      </span>
      <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">
        {body}
      </p>
      <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground/70">
        {ago}
      </span>
    </Link>
  );
}
