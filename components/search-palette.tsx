"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  CheckCircle,
  CircleNotch,
  MagnifyingGlass,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { searchTasks } from "@/lib/actions";

type Result = Awaited<ReturnType<typeof searchTasks>>[number];

/**
 * Ctrl/Cmd+K command palette — searches tasks by title/description.
 * Picking a result opens that task's drawer.
 */
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
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      // Autofocus is handled by inputRef autoFocus prop below
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await searchTasks(q);
        setResults(r);
        setActive(0);
      });
    }, 120);
    return () => clearTimeout(t);
  }, [query, open]);

  const openTask = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("task", id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) openTask(r.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[560px] gap-0 border-border/60 p-0 shadow-soft-xl sm:rounded-xl"
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
            placeholder="Search tasks…"
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          {pending && (
            <CircleNotch
              size={13}
              className="animate-spin text-muted-foreground"
            />
          )}
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto px-1.5 py-2">
          {query.trim().length < 2 ? (
            <Hint text="Type at least 2 characters to search." />
          ) : results.length === 0 && !pending ? (
            <Hint text="No tasks match that." />
          ) : (
            results.map((r, i) => (
              <ResultRow
                key={r.id}
                result={r}
                active={i === active}
                onHover={() => setActive(i)}
                onClick={() => openTask(r.id)}
              />
            ))
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

function ResultRow({
  result,
  active,
  onHover,
  onClick,
}: {
  result: Result;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const done = result.status === "done";
  return (
    <button
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
        active && "bg-accent"
      )}
    >
      {done ? (
        <CheckCircle
          size={15}
          weight="fill"
          className="shrink-0 text-emerald-600"
        />
      ) : (
        <span className="grid size-4 shrink-0 place-items-center rounded-full border border-border" />
      )}
      <span
        className={cn(
          "flex-1 truncate text-[13.5px]",
          done
            ? "text-muted-foreground line-through"
            : "text-foreground"
        )}
      >
        {result.title}
      </span>
      {result.project_name && (
        <span className="shrink-0 text-[12px] text-muted-foreground">
          {result.project_emoji ?? "#"} {result.project_name}
        </span>
      )}
      {result.assignee_name && result.assignee_color && result.assignee_initials && (
        <span
          className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-zinc-900"
          style={{
            backgroundColor: result.assignee_color,
            boxShadow: "var(--shadow-avatar)",
          }}
          title={result.assignee_name}
        >
          {result.assignee_initials}
        </span>
      )}
    </button>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <p className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
      {text}
    </p>
  );
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="chip-3d inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium text-foreground">
        {k}
      </kbd>
      <span>{label}</span>
    </span>
  );
}
