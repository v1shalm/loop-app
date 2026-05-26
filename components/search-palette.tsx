"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowUp,
  CalendarDots,
  Check,
  CheckCircle,
  CircleNotch,
  Crosshair,
  Hash,
  MagnifyingGlass,
  Tray,
  UsersThree,
} from "@/components/icons";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import { searchAll, type SearchResults } from "@/lib/actions";

/**
 * Loop's search modal. Intentionally not a command palette.
 *
 * The earlier version was a Linear-style ⌘K with grouped headers,
 * keyboard-hint chips, and Quick Actions — too developer-toolly for a
 * task tracker aimed at non-engineers. This rewrite drops the chrome:
 * one input row, one flat list of results, no group titles, no footer.
 * Result rows speak in two lines (title + subtitle) so a mixed list of
 * tasks, projects, people, and page jumps reads consistently the way
 * Spotlight / Brief / Notion's quick find do.
 *
 * Keyboard navigation is kept (Arrow + Enter + Esc) because that's
 * universal muscle memory, not because we're trying to be a command
 * palette — there are simply no visible kbd hints to advertise it.
 */

type JumpItem = {
  kind: "jump";
  id: string;
  label: string;
  sublabel: string;
  href: string;
  Icon: React.ElementType;
};

type ResultRow =
  | JumpItem
  | {
      kind: "task";
      id: string;
      title: string;
      status: string;
      project: string | null;
      projectEmoji: string | null;
      assignee: string | null;
      assigneeColor: string | null;
      assigneeInitials: string | null;
      assigneeAvatarUrl: string | null;
    }
  | { kind: "project"; id: string; name: string; emoji: string | null; openCount: number }
  | {
      kind: "person";
      id: string;
      name: string;
      initials: string;
      avatarColor: string;
      avatarUrl: string | null;
      role: string | null;
    };

// Page jumps live alongside tasks/projects/people in the same flat
// list — typing "in" finds Inbox the same way it finds a project
// called "Internal site". Sublabels keep the row two-line so the
// visual rhythm matches the other result types.
const JUMP_TARGETS: JumpItem[] = [
  {
    kind: "jump",
    id: "my-day",
    label: "My Day",
    sublabel: "Page · your daily list",
    href: "/assigned-to-me",
    Icon: Crosshair,
  },
  {
    kind: "jump",
    id: "inbox",
    label: "Inbox",
    sublabel: "Page · tasks teammates sent you",
    href: "/inbox",
    Icon: Tray,
  },
  {
    kind: "jump",
    id: "upcoming",
    label: "Upcoming",
    sublabel: "Page · next two weeks",
    href: "/upcoming",
    Icon: CalendarDots,
  },
  {
    kind: "jump",
    id: "completed",
    label: "Completed",
    sublabel: "Page · what you've shipped",
    href: "/completed",
    Icon: Check,
  },
  {
    kind: "jump",
    id: "team",
    label: "Team",
    sublabel: "Page · everyone in the workspace",
    href: "/team",
    Icon: UsersThree,
  },
];

export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    tasks: [],
    projects: [],
    people: [],
  });
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ tasks: [], projects: [], people: [] });
      setActive(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults({ tasks: [], projects: [], people: [] });
      setActive(0);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAll(q);
        setResults(r);
        setActive(0);
      });
    }, 120);
    return () => clearTimeout(t);
  }, [query, open]);

  // Flat list — no group sections. Order: search results first (tasks,
  // projects, people), then page jumps that match the query, then any
  // remaining jumps when the user hasn't typed yet so the modal opens
  // with something actionable.
  const rows: ResultRow[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    const taskRows: ResultRow[] = results.tasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      status: t.status,
      project: t.project_name,
      projectEmoji: t.project_emoji,
      assignee: t.assignee_name,
      assigneeColor: t.assignee_color,
      assigneeInitials: t.assignee_initials,
      assigneeAvatarUrl: t.assignee_avatar_url,
    }));
    const projectRows: ResultRow[] = results.projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      openCount: p.open_count,
    }));
    const peopleRows: ResultRow[] = results.people.map((p) => ({
      kind: "person" as const,
      id: p.id,
      name: p.name,
      initials: p.initials,
      avatarColor: p.avatar_color,
      avatarUrl: p.avatar_url,
      role: p.role,
    }));

    if (q.length < 2) {
      // Empty state is intentionally blank — just the input pill.
      // Listing recents / page jumps when nothing has been typed
      // gives the modal the "command palette idle pane" look the
      // user explicitly didn't want. The modal becomes a quiet
      // search field; results appear only once there's a query.
      return [];
    }

    // Active query: filter jumps inline so typing "comp" surfaces the
    // Completed page next to any matching tasks/projects.
    const matchingJumps = JUMP_TARGETS.filter((j) =>
      j.label.toLowerCase().includes(q)
    );

    return [...taskRows, ...projectRows, ...peopleRows, ...matchingJumps];
  }, [query, results]);

  const totalRows = rows.length;

  const go = (row: ResultRow) => {
    if (row.kind === "jump") {
      router.push(row.href);
    } else if (row.kind === "task") {
      const next = new URLSearchParams(params.toString());
      next.set("task", row.id);
      // Soft URL sync via the history API skips the route's RSC refetch
      // that router.push would trigger — no server component reads
      // ?task, so the refetch was wasted time. Drawer reacts via
      // useSearchParams.
      window.history.pushState(null, "", `${pathname}?${next.toString()}`);
    } else if (row.kind === "project") {
      router.push(`/projects/${row.id}`);
    } else if (row.kind === "person") {
      router.push(`/team/${row.id}`);
    }
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (totalRows === 0 ? 0 : Math.min(i + 1, totalRows - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) go(row);
    }
  };

  const hasQuery = query.trim().length >= 2;
  const noResults = hasQuery && !pending && totalRows === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[28px] border-0 bg-popover p-0 shadow-[0_24px_80px_-12px_oklch(0.25_0.06_265_/_0.22),0_8px_24px_-6px_oklch(0.25_0.06_265_/_0.08),0_0_0_1px_oklch(0.25_0.06_265_/_0.04)] sm:max-w-[640px]"
      >
        {/* Input — pill row. The reference is a soft floating search
            field, not a dialog header, so we drop the border below
            (only appears once results need separating) and let the
            outer card carry the shape. */}
        <div
          className={cn(
            "flex items-center gap-3 px-6 py-4",
            totalRows > 0 && "border-b border-border/40"
          )}
        >
          <MagnifyingGlass
            size={18}
            className="shrink-0 text-muted-foreground/80"
          />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, projects, teammates…"
            className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/55"
          />
          {pending ? (
            <CircleNotch
              size={14}
              className="shrink-0 animate-spin text-muted-foreground"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full bg-muted/60 text-muted-foreground/70"
            >
              <ArrowUp size={13} weight="bold" />
            </span>
          )}
        </div>

        {/* Body — flat list. Only renders once there's a result;
            empty modal stays as the lone pill input. */}
        {totalRows > 0 && (
          <div className="max-h-[440px] overflow-y-auto p-2">
            {rows.map((row, idx) => (
              <Row
                key={`${row.kind}-${"id" in row ? row.id : idx}`}
                row={row}
                active={idx === active}
                onHover={() => setActive(idx)}
                onClick={() => go(row)}
              />
            ))}
          </div>
        )}

        {noResults && (
          <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
            No matches for &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  row,
  active,
  onHover,
  onClick,
}: {
  row: ResultRow;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  return (
    <button
      onMouseEnter={onHover}
      onClick={onClick}
      data-active={active || undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ease-[var(--ease-out)]",
        active ? "bg-accent/60" : "hover:bg-accent/40"
      )}
    >
      <Leading row={row} />
      <Body row={row} />
    </button>
  );
}

function Leading({ row }: { row: ResultRow }) {
  if (row.kind === "person") {
    return (
      <Avatar
        src={row.avatarUrl}
        initials={row.initials}
        color={row.avatarColor}
        size={28}
      />
    );
  }

  // Tasks, projects, jumps — a 28px tinted square with the type's
  // glyph. Mirrors the actor-disc treatment in the notifications
  // popover so the search results share that visual vocabulary.
  let icon: React.ReactNode;
  if (row.kind === "task") {
    icon =
      row.status === "done" ? (
        <CheckCircle size={14} weight="fill" />
      ) : (
        <Crosshair size={14} weight="regular" />
      );
  } else if (row.kind === "project") {
    icon = <Hash size={14} weight="bold" />;
  } else {
    const Icon = row.Icon;
    icon = <Icon size={14} weight="regular" />;
  }

  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground shadow-[var(--shadow-soft-xs)]">
      {icon}
    </span>
  );
}

function Body({ row }: { row: ResultRow }) {
  let title: string;
  let subtitle: string | null = null;

  if (row.kind === "jump") {
    title = row.label;
    subtitle = row.sublabel;
  } else if (row.kind === "task") {
    title = row.title;
    const bits: string[] = [];
    if (row.project) bits.push(row.project);
    if (row.status === "done") bits.push("Completed");
    if (row.assignee) bits.push(row.assignee);
    subtitle = bits.length > 0 ? bits.join(" · ") : "Task";
  } else if (row.kind === "project") {
    title = row.name;
    subtitle = `${row.openCount} open ${row.openCount === 1 ? "task" : "tasks"}`;
  } else {
    title = row.name;
    subtitle = row.role ?? "Teammate";
  }

  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span
        className={cn(
          "truncate text-[13.5px] font-medium text-foreground",
          row.kind === "task" && row.status === "done"
            ? "text-muted-foreground line-through"
            : ""
        )}
      >
        {title}
      </span>
      {subtitle && (
        <span className="truncate text-[11.5px] text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  );
}
