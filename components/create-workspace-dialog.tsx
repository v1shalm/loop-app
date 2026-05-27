"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, CircleNotch, X } from "@/components/icons";
import { createTeam } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

// Same six accents the onboarding form offers, so a workspace created
// later matches the visual language of the first one.
const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "#8B5CF6", label: "Violet" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#10B981", label: "Emerald" },
  { value: "#EC4899", label: "Pink" },
  { value: "#64748B", label: "Slate" },
];

/**
 * Spin up a new workspace (department) from the sidebar switcher. Reuses
 * the createTeam action, which also makes the creator its admin and sets
 * it as the active workspace — so on success we just refresh and the app
 * lands in the new workspace.
 */
export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setName("");
      setColor(COLOR_OPTIONS[0].value);
      setError(null);
    }
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createTeam({ name: trimmed, color, seedSamples: false });
      if (res.error) {
        setError(res.error);
        return;
      }
      playSound("added");
      sileo.success({ title: `${trimmed} created` });
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[440px]"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <p className="text-[14px] font-semibold tracking-tight text-foreground">
            New workspace
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <label className="block">
            <span className="block text-[12px] font-medium text-foreground">
              Workspace name
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
              placeholder="Design, Engineering, Marketing…"
              className="focus-ring mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/40 disabled:opacity-60"
            />
          </label>

          <div>
            <span className="text-[12px] font-medium text-foreground">Color</span>
            <div
              className="mt-2 flex items-center gap-2"
              role="radiogroup"
              aria-label="Workspace color"
            >
              {COLOR_OPTIONS.map((c) => {
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
                      "focus-ring relative grid size-8 place-items-center rounded-full transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.92] disabled:opacity-60",
                      active
                        ? "ring-2 ring-offset-2 ring-offset-card"
                        : "hover:scale-[1.08]"
                    )}
                    style={{
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ["--tw-ring-color" as any]: c.value,
                    }}
                  >
                    <span
                      aria-hidden
                      className="grid size-5 place-items-center rounded-full text-white shadow-soft-xs"
                      style={{ backgroundColor: c.value }}
                    >
                      {active && <Check size={11} weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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
            onClick={() => onOpenChange(false)}
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
            {pending ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
