"use client";

import Link from "next/link";
import { Plus, UserPlus, CheckCircle, FunnelSimple } from "@/components/icons";
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
  /** Custom secondary slot — overrides `secondary` entirely. Used when
   *  the secondary action needs its own state (e.g. opening a dialog)
   *  and the parent server component can't pass an onClick down. */
  secondarySlot?: React.ReactNode;
  /** Short list of "things you can do here" rendered under the CTAs. */
  tips?: React.ReactNode[];
  /** When true, the state is rendered as "no results for active filter"
   *  rather than the page-is-empty variant. Title/hint/icon/CTA are
   *  swapped to a filter-clearing affordance — calling out that the
   *  underlying list isn't *actually* empty, the filter is too narrow. */
  filterActive?: boolean;
  /** Required when `filterActive` is true — fired by the "Clear filters"
   *  button. */
  onClearFilters?: () => void;
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
  secondarySlot,
  tips,
  filterActive,
  onClearFilters,
}: EmptyStateProps) {
  const { open } = useQuickAdd();
  const action = onAction ?? open;

  // Filter-active variant: this list isn't empty, the filter is. Swap
  // icon, title, hint, and CTA so the user can recover with one click
  // instead of getting the misleading "All caught up" message.
  if (filterActive) {
    return (
      <div className="w-full rounded-2xl border border-border/60 bg-card px-8 py-12 shadow-soft-xs sm:px-12">
        <div className="mx-auto flex max-w-[440px] flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
            <FunnelSimple size={20} />
          </span>
          <h3 className="mt-4 text-[16px] font-semibold tracking-tight text-foreground">
            No tasks match this filter
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Your filter is too narrow. Clear it to see the full list.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.97]"
            >
              <FunnelSimple size={12} weight="bold" />
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card px-8 py-12 shadow-soft-xs sm:px-12">
      <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
        {/* Pedestal — pink metallic 3D illustration in place of the
            previous flat tile. The depth comes from layering, not from
            a 3D render: a soft halo behind, a contact shadow below,
            a multi-stop gradient face, inset highlights for the
            specular "shine" at the top, a darker bottom-inset for
            material weight, and a tinted outer shadow that grounds the
            pedestal in the surface. */}
        <div className="relative grid place-items-center pb-3">
          {/* Soft pink halo behind the pedestal — the brand glow. */}
          <div
            aria-hidden
            className="absolute inset-0 -m-10 rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.18_348/0.4),oklch(0.62_0.24_348/0.15)_50%,transparent_75%)] blur-xl"
          />

          {/* Contact shadow — a soft pink ellipse below the pedestal
              that visually anchors it to the surface. Pink rather than
              neutral black so the shadow reads as "in the same color
              world" as the pedestal, not a black blob underneath. */}
          <div
            aria-hidden
            className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 translate-y-1 rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.22_348/0.45),transparent_70%)] blur-[6px]"
          />

          {/* The pedestal itself. The big visual moves here:
                - A 4-stop metallic gradient (light top → mid → deep
                  bottom → subtle warm shift) so the face reads as a
                  reflective surface, not a flat fill.
                - Two inset highlights: bright white top (specular
                  shine) + dark bottom (material edge).
                - Three drop shadows: a tight hard shadow for
                  geometry, a medium colored shadow for the pink
                  glow, and a long soft shadow for depth.
                - rotate-[-2deg] on the icon side hints at the
                  "floating object photographed from slightly above"
                  feel of the reference image without breaking the
                  centered layout. */}
          <div
            className="relative grid size-20 place-items-center rounded-[22px] text-white sm:size-24"
            style={{
              background: `
                linear-gradient(
                  160deg,
                  oklch(0.88 0.10 348) 0%,
                  oklch(0.74 0.20 348) 32%,
                  oklch(0.58 0.24 348) 68%,
                  oklch(0.62 0.22 348) 100%
                )
              `,
              boxShadow: [
                // Top-edge bright specular highlight (chrome shine).
                "inset 0 1.5px 0 0 oklch(1 0 0 / 0.7)",
                // Top-left soft glow inside the surface.
                "inset 4px 6px 12px 0 oklch(1 0 0 / 0.18)",
                // Bottom-inner darkening — gives the face material weight.
                "inset 0 -2px 4px 0 oklch(0.3 0.18 348 / 0.35)",
                // Tight contact shadow underneath the pedestal.
                "0 2px 4px 0 oklch(0.35 0.20 348 / 0.35)",
                // Coloured mid-distance shadow — the pink "lift".
                "0 12px 28px -6px oklch(0.62 0.24 348 / 0.5)",
                // Long soft ambient shadow for depth.
                "0 28px 56px -12px oklch(0.4 0.18 348 / 0.35)",
              ].join(", "),
            }}
          >
            {/* Specular sheen — a thin bright stripe near the top edge
                that mimics the highlight reflection on metal. Sits
                inside the radius and clips with overflow on the parent. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 right-3 top-1 h-2 rounded-full bg-gradient-to-b from-white/55 to-white/0 blur-[1.5px]"
            />

            {/* Side-light wash — a soft diagonal sweep that catches the
                "top-right" of the face, suggesting an off-screen
                light source consistent with the reference image. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[2px] rounded-[20px]"
              style={{
                background:
                  "linear-gradient(155deg, oklch(1 0 0 / 0.18) 0%, oklch(1 0 0 / 0) 35%, oklch(1 0 0 / 0) 80%, oklch(0 0 0 / 0.06) 100%)",
              }}
            />

            {/* Inner subtle ring for crisp edge definition (concentric
                with the outer radius — pedestal radius is 22px, inner
                inset is 3px, so inner radius is 19px). */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[3px] rounded-[19px] ring-1 ring-inset ring-white/35"
            />

            {/* Icon — sits forward of the surface with a soft inner
                shadow so it looks "embossed" into the pedestal rather
                than stuck on top. text-white means the per-page icon
                takes the brand pink-on-white treatment automatically. */}
            <span
              className="relative text-white"
              style={{
                filter:
                  "drop-shadow(0 1px 0 oklch(0.35 0.20 348 / 0.45)) drop-shadow(0 2px 3px oklch(0 0 0 / 0.18))",
              }}
            >
              {icon}
            </span>
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
            {secondarySlot ??
              (secondary && <SecondaryButton action={secondary} />)}
          </div>
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
