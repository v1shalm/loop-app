"use client";

import { Plus } from "@/components/icons";

/**
 * Floating "+" button on mobile. Sits above the bottom tab bar, in the
 * thumb-reach corner. Hidden on md+ — the desktop sidebar already carries
 * its own "Add task" CTA.
 */
export function MobileFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add task"
      className="surface-brand surface-brand-hover focus-ring fixed right-4 z-30 grid size-14 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-cta)] transition-[transform,box-shadow] duration-150 ease-[var(--ease-out)] active:scale-[0.94] md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      <Plus size={26} weight="bold" />
    </button>
  );
}
