"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { CaretLeft, Hash, Plus, UserPlus } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createProject } from "@/lib/actions";

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
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Whenever the popover closes, reset to the menu so the next open
  // starts from the picker — not whatever sub-screen the user last
  // bailed out of.
  useEffect(() => {
    if (!open) {
      setMode("menu");
      setName("");
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
      const res = await createProject(trimmed);
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
            ? "w-[220px] gap-0 p-1"
            : "w-[260px] gap-0 p-3"
        }
      >
        {mode === "menu" ? (
          <>
            <button
              type="button"
              onClick={() => setMode("new")}
              className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent/40"
            >
              <Hash size={14} className="text-muted-foreground" />
              <span className="flex-1">New project</span>
              <span className="text-[10.5px] font-medium text-muted-foreground/70">
                Alt P
              </span>
            </button>
            <Link
              href="/team"
              onClick={() => setOpen(false)}
              className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-accent/40"
            >
              <UserPlus size={14} className="text-muted-foreground" />
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
                className="focus-ring grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                <CaretLeft size={11} weight="bold" />
              </button>
              <p className="text-[12px] font-semibold text-foreground">
                New project
              </p>
            </div>
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
              className="focus-ring h-8 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/50"
            />
            <div className="mt-2.5 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="focus-ring rounded-md px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!name.trim() || pending}
                className="focus-ring surface-brand surface-brand-hover inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-60"
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
