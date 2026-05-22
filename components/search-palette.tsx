"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Bell,
  CalendarBlank,
  CalendarDots,
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

type JumpItem = {
  kind: "jump";
  id: string;
  label: string;
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

type Group = { label: string; rows: ResultRow[] };

const JUMP_TARGETS: JumpItem[] = [
  { kind: "jump", id: "inbox", label: "Inbox", href: "/inbox", Icon: Tray },
  { kind: "jump", id: "assigned", label: "Assigned to me", href: "/assigned-to-me", Icon: Crosshair },
  { kind: "jump", id: "today", label: "Today", href: "/today", Icon: CalendarBlank },
  { kind: "jump", id: "upcoming", label: "Upcoming", href: "/upcoming", Icon: CalendarDots },
  { kind: "jump", id: "team", label: "Team", href: "/team", Icon: UsersThree },
  { kind: "jump", id: "notifications", label: "Notifications", href: "/notifications", Icon: Bell },
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

  // Build the flat row order for keyboard navigation + render
  const groups: Group[] = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) {
      return [{ label: "Jump to", rows: JUMP_TARGETS }];
    }
    const out: Group[] = [];
    if (results.tasks.length > 0) {
      out.push({
        label: "Tasks",
        rows: results.tasks.map((t) => ({
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
        })),
      });
    }
    if (results.projects.length > 0) {
      out.push({
        label: "Projects",
        rows: results.projects.map((p) => ({
          kind: "project" as const,
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          openCount: p.open_count,
        })),
      });
    }
    if (results.people.length > 0) {
      out.push({
        label: "Team",
        rows: results.people.map((p) => ({
          kind: "person" as const,
          id: p.id,
          name: p.name,
          initials: p.initials,
          avatarColor: p.avatar_color,
          avatarUrl: p.avatar_url,
          role: p.role,
        })),
      });
    }
    return out;
  }, [query, results]);

  const flatRows: ResultRow[] = useMemo(
    () => groups.flatMap((g) => g.rows),
    [groups]
  );
  const totalRows = flatRows.length;

  const go = (row: ResultRow) => {
    if (row.kind === "jump") {
      router.push(row.href);
    } else if (row.kind === "task") {
      const next = new URLSearchParams(params.toString());
      next.set("task", row.id);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
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
      const row = flatRows[active];
      if (row) go(row);
    }
  };

  const hasQuery = query.trim().length >= 2;
  const noResults = hasQuery && !pending && totalRows === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[600px] gap-0 p-0 shadow-soft-md sm:rounded-xl"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
          <MagnifyingGlass
            size={16}
            className="shrink-0 text-muted-foreground"
          />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, projects, teammates…"
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          {pending && (
            <CircleNotch
              size={14}
              className="animate-spin text-muted-foreground"
            />
          )}
        </div>

        {/* Body */}
        <div className="max-h-[440px] overflow-y-auto p-2">
          {noResults ? (
            <Hint>No matches for &ldquo;{query.trim()}&rdquo;.</Hint>
          ) : (
            (() => {
              let runningIdx = 0;
              return groups.map((g, i) => (
                <section
                  key={g.label}
                  className={cn("flex flex-col", i > 0 && "mt-3")}
                >
                  <p className="px-2 pb-1 pt-1 text-[11.5px] font-medium text-muted-foreground">
                    {g.label}
                  </p>
                  {g.rows.map((row) => {
                    const idx = runningIdx++;
                    return (
                      <Row
                        key={`${row.kind}-${"id" in row ? row.id : idx}`}
                        row={row}
                        active={idx === active}
                        onHover={() => setActive(idx)}
                        onClick={() => go(row)}
                      />
                    );
                  })}
                </section>
              ));
            })()
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[11.5px] text-muted-foreground">
          <KeyHint k="↑↓" label="Navigate" />
          <KeyHint k="↵" label="Open" />
          <KeyHint k="Esc" label="Close" />
        </div>
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
        "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sidebar-foreground/90 transition-colors duration-150 ease-[var(--ease-out)]",
        active
          ? "bg-primary/8 font-medium text-primary"
          : "hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {renderLeading(row, active)}
      {renderBody(row, active)}
      {renderTrailing(row)}
    </button>
  );
}

function renderLeading(row: ResultRow, active: boolean) {
  if (row.kind === "jump") {
    const Icon = row.Icon;
    return (
      <Icon
        size={16}
        className={cn(
          "shrink-0",
          active ? "text-primary" : "text-muted-foreground/90"
        )}
      />
    );
  }
  if (row.kind === "task") {
    return row.status === "done" ? (
      <CheckCircle
        size={16}
        weight="fill"
        className="shrink-0 text-emerald-600"
      />
    ) : (
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          active ? "border-primary/40" : "border-border"
        )}
      />
    );
  }
  if (row.kind === "project") {
    return (
      <span className="text-[15px] leading-none">
        {row.emoji ?? (
          <Hash
            size={16}
            className={cn(
              "shrink-0",
              active ? "text-primary" : "text-muted-foreground/90"
            )}
          />
        )}
      </span>
    );
  }
  // person
  return (
    <Avatar
      src={row.avatarUrl}
      initials={row.initials}
      color={row.avatarColor}
      size={24}
    />
  );
}

function renderBody(row: ResultRow, active: boolean) {
  if (row.kind === "jump") {
    return (
      <span className="flex-1 truncate text-[13.5px] font-medium">
        {row.label}
      </span>
    );
  }
  if (row.kind === "task") {
    return (
      <span
        className={cn(
          "flex-1 truncate text-[13.5px]",
          row.status === "done" && "text-muted-foreground line-through"
        )}
      >
        {row.title}
      </span>
    );
  }
  if (row.kind === "project") {
    return (
      <span className="flex-1 truncate text-[13.5px] font-medium">
        {row.name}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13.5px] font-medium">{row.name}</span>
      {row.role && (
        <span
          className={cn(
            "truncate text-[11.5px]",
            active ? "text-primary/70" : "text-muted-foreground"
          )}
        >
          {row.role}
        </span>
      )}
    </span>
  );
}

function renderTrailing(row: ResultRow) {
  if (row.kind === "task") {
    return (
      <>
        {row.project && (
          <span className="shrink-0 text-[12px] text-muted-foreground">
            {row.projectEmoji ?? "#"} {row.project}
          </span>
        )}
        {row.assignee && row.assigneeColor && row.assigneeInitials && (
          <Avatar
            src={row.assigneeAvatarUrl}
            initials={row.assigneeInitials}
            color={row.assigneeColor}
            size={20}
          />
        )}
      </>
    );
  }
  if (row.kind === "project") {
    return (
      <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
        {row.openCount} open
      </span>
    );
  }
  return null;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
      {children}
    </p>
  );
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="chip-3d inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[5px] border border-border bg-card px-1.5 text-[11px] font-semibold text-foreground/80">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
