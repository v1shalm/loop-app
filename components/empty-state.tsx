"use client";

import Link from "next/link";
import { Plus, UserPlus, CheckCircle } from "@/components/icons";
import { useQuickAdd } from "@/components/quick-add-context";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  /** Phosphor icon (or any React node) rendered inside the badge tile. */
  icon: React.ReactNode;
  title: string;
  hint: string;
  /** Primary CTA, defaults to "Add task" opening QuickAdd. */
  actionLabel?: string;
  onAction?: () => void;
  /** Set to false to render the empty state without any CTA. */
  showAction?: boolean;
  /** Optional secondary CTA shown next to the primary. */
  secondary?: EmptyStateAction;
  /** Short list of "things you can do here" rendered under the CTAs. */
  tips?: string[];
}

/**
 * Empty state for list pages — full-width card with a primary CTA, an
 * optional secondary CTA, and an optional "what you can do here" list.
 * Replaces the old narrow centered card so the canvas doesn't feel
 * placeholder-y when a user lands on an empty view.
 */
export function EmptyState({
  icon,
  title,
  hint,
  actionLabel = "Add task",
  onAction,
  showAction = true,
  secondary,
  tips,
}: EmptyStateProps) {
  const { open } = useQuickAdd();
  const action = onAction ?? open;

  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card px-8 py-12 shadow-soft-xs sm:px-12">
      <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
        <div className="relative grid place-items-center">
          {/* Soft violet halo behind the tile — the "purple hint" */}
          <div
            aria-hidden
            className="absolute inset-0 -m-6 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.28),oklch(0.62_0.22_295/0.08)_55%,transparent_75%)] blur-md"
          />
          {/* The tile itself — gradient bed + inner highlight + layered shadow */}
          <div
            className="relative grid size-16 place-items-center rounded-2xl border border-border/60 bg-[linear-gradient(140deg,var(--card)_0%,var(--card)_55%,oklch(0.62_0.22_295/0.08)_100%)] text-primary"
            style={{
              boxShadow:
                "inset 0 1px 0 0 rgba(255,255,255,0.75), 0 1px 2px 0 rgba(15,23,42,0.04), 0 8px 24px -10px oklch(0.62 0.22 295 / 0.35), 0 2px 6px -2px rgba(15,23,42,0.08)",
            }}
          >
            {/* Inner subtle inner ring for extra depth */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[3px] rounded-[14px] ring-1 ring-inset ring-white/40"
            />
            <span className="relative">{icon}</span>
          </div>
        </div>
        <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-2 max-w-[420px] text-[13.5px] leading-relaxed text-muted-foreground">
          {hint}
        </p>

        {showAction && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={action}
              className="focus-ring surface-brand surface-brand-hover inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <Plus size={13} weight="bold" />
              {actionLabel}
            </button>
            {secondary && <SecondaryButton action={secondary} />}
          </div>
        )}

        {showAction && !secondary && (
          <p className="mt-2.5 text-[11.5px] text-muted-foreground/70">
            or press{" "}
            <kbd className="chip-3d ml-px inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-background px-1 text-[10.5px] font-semibold text-foreground">
              Q
            </kbd>
          </p>
        )}

        {tips && tips.length > 0 && (
          <ul className="mt-7 grid w-full max-w-[420px] gap-2 border-t border-border/50 pt-5 text-left">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12.5px] text-muted-foreground"
              >
                <CheckCircle
                  size={14}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-primary/70"
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SecondaryButton({ action }: { action: EmptyStateAction }) {
  const className =
    "focus-ring inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent/40";

  const inner = (
    <>
      {action.icon ?? <UserPlus size={13} weight="bold" />}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={action.onClick} className={className}>
      {inner}
    </button>
  );
}
