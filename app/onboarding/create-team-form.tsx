"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { CircleNotch } from "@/components/icons";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createTeam({ name: trimmed, color });
      if (res.error) {
        setError(res.error);
        return;
      }
      sileo.success({
        title: `${trimmed} is live`,
        description: "You're the admin. Invite teammates from /team.",
      });
      router.push("/assigned-to-me");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft-sm"
    >
      <label className="block">
        <span className="block text-[12.5px] font-medium text-foreground">
          Team name
        </span>
        <input
          type="text"
          required
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Design, Engineering, Marketing"
          aria-invalid={!!error}
          aria-describedby={error ? "create-team-error" : undefined}
          disabled={pending}
          className="focus-ring mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring/50 disabled:opacity-60"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-[12.5px] font-medium text-foreground">
          Accent color
        </legend>
        <div
          className="mt-2 flex items-center gap-2"
          role="radiogroup"
          aria-label="Accent color"
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
                  "focus-ring relative grid size-8 place-items-center rounded-full transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.92]",
                  active
                    ? "ring-2 ring-offset-2 ring-offset-card"
                    : "hover:scale-[1.06]"
                )}
                style={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ["--tw-ring-color" as any]: c.value,
                }}
              >
                <span
                  aria-hidden
                  className="block size-5 rounded-full shadow-soft-xs"
                  style={{ backgroundColor: c.value }}
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p
          id="create-team-error"
          role="alert"
          className="mt-4 rounded-md border border-rose-200/70 bg-rose-50 px-3 py-2 text-[12px] text-rose-700"
        >
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground/80">
          You&apos;ll be the team&apos;s admin.
        </p>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="focus-ring surface-brand surface-brand-hover inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100"
        >
          {pending && <CircleNotch size={13} className="animate-spin" />}
          {pending ? "Creating…" : "Create team"}
        </button>
      </div>
    </form>
  );
}
