"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, UserPlus, CheckCircle, FunnelSimple } from "@/components/icons";
import { useQuickAdd } from "@/components/quick-add-context";
import {
  EmptyStateIllustration,
  type IllustrationTone,
} from "@/components/empty-state-illustration";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  /** Icon shown at the centre of the achievement badge. A small glyph
   *  (check, plus, bell, calendar). Skip for a clean badge-only state. */
  icon?: React.ReactNode;
  /** Colour tone of the badge illustration. Defaults to "accent".
   *  Ignored when illustrationSrc is provided. */
  tone?: IllustrationTone;
  /** Optional custom illustration (PNG/SVG path under /public). When
   *  provided, replaces the generated blob — useful for hand-illustrated
   *  states that need more art direction than the SVG blob can give. */
  illustrationSrc?: string;
  /** Pixel size of the illustration. Defaults to 200. */
  illustrationSize?: number;
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
  showAction?: boolean;
  secondary?: EmptyStateAction;
  secondarySlot?: React.ReactNode;
  tips?: React.ReactNode[];
  filterActive?: boolean;
  onClearFilters?: () => void;
}

// Shared entry motion — slight rise + fade. Same recipe used elsewhere
// in the app so empty surfaces feel like part of the same vocabulary.
const enterMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

/**
 * Page-level empty state. Free-floating achievement-badge illustration
 * on top, then title, hint, and CTAs stacked below. No outer card
 * chrome — the canvas itself is the background. Reaching an empty state
 * means the work is cleared, so the illustration reads as a reward.
 */
export function EmptyState({
  icon,
  tone = "accent",
  illustrationSrc,
  illustrationSize = 200,
  title,
  hint,
  actionLabel = "Add task",
  onAction,
  showAction = true,
  secondary,
  secondarySlot,
  tips,
  filterActive,
  onClearFilters,
}: EmptyStateProps) {
  const { open } = useQuickAdd();
  const action = onAction ?? open;

  // Filter-active variant: this list isn't empty, the filter is. Swap
  // the illustration tone + glyph + copy so the user can recover with
  // one click instead of getting the misleading "All caught up" message.
  if (filterActive) {
    return (
      <motion.div
        {...enterMotion}
        className="mx-auto flex w-full max-w-[440px] flex-col items-center pt-8 text-center"
      >
        <EmptyStateIllustration
          tone="accent"
          glyph={<FunnelSimple size={20} weight="duotone" />}
        />
        <h3 className="mt-6 text-[20px] font-semibold tracking-tight text-foreground">
          No results found
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Your filter is too narrow. Clear it to see the full list.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.97]"
          >
            <FunnelSimple size={12} weight="bold" />
            Clear filters
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...enterMotion}
      className="mx-auto flex w-full max-w-[520px] flex-col items-center pt-8 text-center"
    >
      {illustrationSrc ? (
        // Custom illustration. Renders the bitmap free on the canvas
        // (no container, no background) so it sits like the SVG blob.
        // Slight rise + fade entry handled by the parent motion.div.
        // scale-90 on mobile keeps the art from dominating narrow
        // viewports; sm:scale-100 restores full size on tablet+.
        // No `priority` — empty states are off the critical path
        // (the page only shows them when the list is empty, by
        // which point the rest of the page has already rendered).
        <Image
          src={illustrationSrc}
          alt=""
          aria-hidden
          width={illustrationSize}
          height={illustrationSize}
          loading="lazy"
          sizes={`(max-width: 640px) ${Math.round(illustrationSize * 0.9)}px, ${illustrationSize}px`}
          className="select-none scale-90 sm:scale-100"
          style={{ width: illustrationSize, height: "auto" }}
        />
      ) : (
        <div className="scale-90 sm:scale-100">
          <EmptyStateIllustration
            tone={tone}
            glyph={icon}
            size={illustrationSize}
          />
        </div>
      )}

      <h3 className="mt-6 text-[20px] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-[420px] text-[13px] leading-relaxed text-muted-foreground">
        {hint}
      </p>

      {showAction && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => action()}
            className="focus-ring surface-brand surface-brand-hover inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            <Plus size={13} weight="bold" />
            {actionLabel}
          </button>
          {secondarySlot ??
            (secondary && <SecondaryButton action={secondary} />)}
        </div>
      )}

      {tips && tips.length > 0 && (
        <ul className="mt-7 grid w-full max-w-[420px] gap-2 border-t border-border/50 pt-5 text-left">
          {tips.map((tip, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] text-muted-foreground"
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
    </motion.div>
  );
}

function SecondaryButton({ action }: { action: EmptyStateAction }) {
  const className =
    "focus-ring inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.97]";

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
