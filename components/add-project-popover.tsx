"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { CircleNotch, Plus, X } from "@/components/icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createProject } from "@/lib/actions";
import { playSound } from "@/lib/sounds";

// The project's sidebar/folder accent. We assign one automatically from
// this set (hashed off the name) instead of asking — a colour picker at
// creation time is friction for a choice that barely matters and can be
// changed later. Same palette the rest of the app uses.
const PROJECT_COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#F59E0B",
  "#10B981",
  "#EC4899",
  "#64748B",
];

function autoColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

/**
 * "New project" control next to the Projects heading. A focused dialog
 * that matches the rest of the app's create surfaces (workspace, invite):
 * one thing to do — name it — then you're on the project page where the
 * description and status live. Colour is assigned automatically.
 */
export function AddProjectPopover() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setName("");
      setError(null);
    }
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createProject({ name: trimmed, color: autoColor(trimmed) });
      if (res.error) {
        setError(res.error);
        return;
      }
      playSound("added");
      sileo.success({ title: "Project created" });
      setOpen(false);
      if (res.projectId) router.push(`/projects/${res.projectId}`);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="New project"
        className="focus-ring grid size-5 place-items-center rounded text-muted-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
      >
        <Plus size={12} weight="bold" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="block w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[440px]"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
            <p className="text-[14px] font-semibold tracking-tight text-foreground">
              New project
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
            >
              <X size={14} weight="bold" />
            </button>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            <label className="block">
              <span className="block text-[12px] font-medium text-foreground">
                Project name
              </span>
              <input
                type="text"
                autoFocus
                maxLength={60}
                value={name}
                disabled={pending}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !pending && name.trim()) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Website redesign, Q3 launch…"
                className="focus-ring mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/40 disabled:opacity-60"
              />
            </label>

            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Add a description and set the status from the project page.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="focus-ring rounded-md px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !name.trim()}
              className="focus-ring surface-brand surface-brand-hover inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
            >
              {pending && <CircleNotch size={13} className="animate-spin" />}
              {pending ? "Creating…" : "Create project"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
