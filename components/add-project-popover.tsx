"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { CaretLeft, Check, Hash, Plus, UserPlus } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createProject } from "@/lib/actions";
import { cn } from "@/lib/utils";

// Same swatches as the team-create flow. Keeps the project's identity
// chip language consistent across the app — a freshly-made project
// inherits the visual vocabulary of the team it lives in.
const PROJECT_COLORS: { value: string; label: string }[] = [
  { value: "#8B5CF6", label: "Violet" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#10B981", label: "Emerald" },
  { value: "#EC4899", label: "Pink" },
  { value: "#64748B", label: "Slate" },
];

/**
 * Sidebar "+" entry point. Mirrors Todoist's pattern: the bare button
 * opens a tiny menu of *kinds* of things you can add, then the chosen
 * action takes over the same popover surface.
 *
 * Two modes:
 *   menu  — picker (default): "New project", "Invite people"
 *   new   — project name input
 *
 * Staying inside one Popover (instead of routing through a separate
 * DropdownMenu) avoids the focus + portal fighting that happens when a
 * menu item tries to open a child popover. The CaretLeft button gives
 * the user a clear way back to the menu without closing the popover.
 */
export function AddProjectPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "new">("menu");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0].value);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Whenever the popover closes, reset to the menu so the next open
  // starts from the picker — not whatever sub-screen the user last
  // bailed out of.
  useEffect(() => {
    if (!open) {
      setMode("menu");
      setName("");
      setColor(PROJECT_COLORS[0].value);
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === "new") {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, mode]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createProject({ name: trimmed, color });
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      sileo.success({ title: "Project created" });
      setName("");
      setOpen(false);
      if (res.projectId) router.push(`/projects/${res.projectId}`);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Add to sidebar"
        className="focus-ring grid size-5 place-items-center rounded text-muted-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
      >
        <Plus size={12} weight="bold" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={
          mode === "menu"
            ? "w-[220px]"
            : "w-[260px] gap-0 p-3"
        }
      >
        {mode === "menu" ? (
          <>
            <button
              type="button"
              onClick={() => setMode("new")}
              className="focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              <Hash size={15} className="text-muted-foreground" />
              <span className="flex-1">New project</span>
              <span className="text-[10.5px] font-medium text-muted-foreground/70">
                Alt P
              </span>
            </button>
            <Link
              href="/team"
              onClick={() => setOpen(false)}
              className="focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.04]"
            >
              <UserPlus size={15} className="text-muted-foreground" />
              <span className="flex-1">Invite people</span>
            </Link>
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMode("menu")}
                aria-label="Back"
                className="focus-ring grid size-5 place-items-center rounded text-muted-foreground transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.92]"
              >
                <CaretLeft size={11} weight="bold" />
              </button>
              <p className="text-[12px] font-semibold text-foreground">
                New project
              </p>
            </div>

            {/* Name + leading color swatch acting as a live preview of
                how this project will appear in the sidebar. Clicking
                the swatch opens the color row below. */}
            <div className="focus-within:border-ring/50 flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-2 transition-colors">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full transition-colors duration-150 ease-[var(--ease-out)]"
                style={{ backgroundColor: color }}
              />
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setMode("menu");
                  }
                }}
                placeholder="Project name"
                disabled={pending}
                className="h-full flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Color swatches — six options matching the team palette */}
            <div
              className="mt-2.5 flex items-center justify-between"
              role="radiogroup"
              aria-label="Project color"
            >
              {PROJECT_COLORS.map((c) => {
                const active = c.value === color;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.label}
                    onClick={() => setColor(c.value)}
                    disabled={pending}
                    className={cn(
                      "focus-ring relative grid size-6 place-items-center rounded-full transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.92] disabled:opacity-60",
                      active
                        ? "ring-2 ring-offset-2 ring-offset-popover"
                        : "hover:scale-[1.12]"
                    )}
                    style={{
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ["--tw-ring-color" as any]: c.value,
                    }}
                  >
                    <span
                      aria-hidden
                      className="grid size-4 place-items-center rounded-full text-white shadow-soft-xs"
                      style={{ backgroundColor: c.value }}
                    >
                      {active && <Check size={9} weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground/80">
              Description and status get set on the project page.
            </p>

            <div className="mt-2.5 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="focus-ring rounded-md px-2.5 py-1 text-[12px] text-muted-foreground transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!name.trim() || pending}
                className={cn(
                  "focus-ring inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
                  !name.trim() || pending
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "surface-brand surface-brand-hover text-primary-foreground shadow-[var(--shadow-cta)]"
                )}
              >
                {pending ? "Creating..." : "Create"}
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
