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
  | { kind: "task"; id: string; title: string; status: string; project: string | null; projectEmoji: string | null; assignee: string | null; assigneeColor: string | null; assigneeInitials: string | null }
  | { kind: "project"; id: string; name: string; emoji: string | null; openCount: number }
  | { kind: "person"; id: string; name: string; initials: string; avatarColor: string; role: string | null };

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
        className="max-w-[600px] gap-0 border-border/60 p-0 shadow-soft-xl sm:rounded-xl"
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <MagnifyingGlass
            size={15}
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
              size={13}
              className="animate-spin text-muted-foreground"
            />
          )}
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto px-1.5 py-2">
          {noResults ? (
            <Hint>No matches for &ldquo;{query.trim()}&rdquo;.</Hint>
          ) : (
            (() => {
              let runningIdx = 0;
              return groups.map((g) => (
                <section key={g.label} className="mb-2 last:mb-0">
                  <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
        <div className="flex items-center gap-3 border-t border-border/60 bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <KeyHint k="↑↓" label="navigate" />
          <KeyHint k="↵" label="open" />
          <KeyHint k="Esc" label="close" />
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
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
        active && "bg-accent"
      )}
    >
      {renderLeading(row)}
      {renderBody(row)}
      {renderTrailing(row)}
    </button>
  );
}

function renderLeading(row: ResultRow) {
  if (row.kind === "jump") {
    const Icon = row.Icon;
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon size={13} />
      </span>
    );
  }
  if (row.kind === "task") {
    return row.status === "done" ? (
      <CheckCircle
        size={15}
        weight="fill"
        className="shrink-0 text-emerald-600"
      />
    ) : (
      <span className="grid size-4 shrink-0 place-items-center rounded-full border border-border" />
    );
  }
  if (row.kind === "project") {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[14px]">
        {row.emoji ?? <Hash size={13} className="text-muted-foreground" />}
      </span>
    );
  }
  // person
  return (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-zinc-900"
      style={{
        backgroundColor: row.avatarColor,
        boxShadow: "var(--shadow-avatar)",
      }}
    >
      {row.initials}
    </span>
  );
}

function renderBody(row: ResultRow) {
  if (row.kind === "jump") {
    return (
      <span className="flex-1 truncate text-[13.5px] font-medium text-foreground">
        {row.label}
      </span>
    );
  }
  if (row.kind === "task") {
    return (
      <span
        className={cn(
          "flex-1 truncate text-[13.5px]",
          row.status === "done"
            ? "text-muted-foreground line-through"
            : "text-foreground"
        )}
      >
        {row.title}
      </span>
    );
  }
  if (row.kind === "project") {
    return (
      <span className="flex-1 truncate text-[13.5px] font-medium text-foreground">
        {row.name}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13.5px] font-medium text-foreground">
        {row.name}
      </span>
      {row.role && (
        <span className="truncate text-[11.5px] text-muted-foreground">
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
          <span
            className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-zinc-900"
            style={{
              backgroundColor: row.assigneeColor,
              boxShadow: "var(--shadow-avatar)",
            }}
            title={row.assignee}
          >
            {row.assigneeInitials}
          </span>
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
  if (row.kind === "jump") {
    return (
      <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-muted-foreground/60">
        Page
      </span>
    );
  }
  return null;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
      {children}
    </p>
  );
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="chip-3d inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-background px-1 text-[10.5px] font-semibold text-foreground">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
