"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { Check, CircleNotch } from "@/components/icons";
import { createTeam } from "@/lib/actions";
import { cn } from "@/lib/utils";

// Six accent options the user can pick for their team. The same swatch
// shows in the sidebar dot, on project chips, and in the avatar of
// teammates so the brand reads consistently.
const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "#8B5CF6", label: "Violet" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#10B981", label: "Emerald" },
  { value: "#EC4899", label: "Pink" },
  { value: "#64748B", label: "Slate" },
];

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [seedSamples, setSeedSamples] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createTeam({ name: trimmed, color, seedSamples });
      if (res.error) {
        setError(res.error);
        return;
      }
      sileo.success({
        title: `${trimmed} is live`,
        description: "You're the admin. Invite teammates from workspace settings.",
      });
      router.push("/assigned-to-me");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border/60 bg-card p-7 shadow-soft-sm"
    >
      <label className="block">
        <span className="block text-[12px] font-medium text-foreground">
          Workspace name
        </span>
        <input
          type="text"
          required
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Design, Engineering, Marketing…"
          aria-invalid={!!error}
          aria-describedby={error ? "create-team-error" : undefined}
          disabled={pending}
          className="focus-ring mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] text-foreground outline-none transition-[border-color,background-color] duration-150 ease-[var(--ease-out)] placeholder:text-muted-foreground/60 hover:border-border focus:border-ring/50 disabled:opacity-60"
        />
      </label>

      <fieldset className="mt-6">
        <legend className="text-[12px] font-medium text-foreground">
          Color
        </legend>
        <div
          className="mt-2.5 flex items-center gap-2"
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
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-white shadow-soft-xs transition-transform duration-200 ease-[var(--ease-out)]",
                    active && "scale-[1.04]"
                  )}
                  style={{ backgroundColor: c.value }}
                >
                  {active && <Check size={11} weight="bold" />}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="group mt-6 flex cursor-pointer items-center gap-2.5 text-[13px] text-foreground">
        <input
          type="checkbox"
          checked={seedSamples}
          onChange={(e) => setSeedSamples(e.target.checked)}
          disabled={pending}
          className="size-4 cursor-pointer accent-primary"
        />
        Start with sample tasks
      </label>

      {error && (
        <p
          id="create-team-error"
          role="alert"
          className="mt-5 rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim()}
        aria-disabled={pending || !name.trim()}
        className={cn(
          "focus-ring mt-8 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md text-[14px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)]",
          pending || !name.trim()
            ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
            : "surface-brand surface-brand-hover text-primary-foreground shadow-[var(--shadow-cta)] active:scale-[0.97]"
        )}
      >
        {pending && <CircleNotch size={14} className="animate-spin" />}
        {pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
