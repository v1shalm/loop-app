"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "motion/react";

/**
 * Bottom sheet primitive for mobile. Used to convert popovers and
 * dropdown menus into native-feeling sheets at `max-md:` widths
 * without rewriting the surrounding component logic — wrap the
 * existing content in `<MobileSheet>` instead of `<PopoverContent>`
 * or `<DropdownMenuContent>` on the mobile branch.
 *
 * Behaviour:
 *   - Slides up from the bottom edge with a spring transition.
 *   - Backdrop click and Esc close.
 *   - Drag-to-dismiss from the handle bar only (so inner content
 *     keeps default touch scrolling).
 *   - Safe-area inset bottom padding so action rows clear the
 *     iPhone home indicator.
 *
 * NOTE: this is intentionally not a full base-ui Dialog replacement.
 * It carries the visual and gesture layer; the caller controls open
 * state and accessibility semantics (aria-label, focus restoration)
 * at the trigger site.
 */
export function MobileSheet({
  open,
  onClose,
  children,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const dragControls = useDragControls();

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock background scroll while open. Without this the page behind
  // the backdrop scrolls when the user pans inside the sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            onClick={onClose}
            className="absolute inset-0 bg-black/25 supports-backdrop-filter:backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 32,
              stiffness: 320,
              mass: 0.8,
            }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col"
          >
            <div className="flex max-h-[88svh] flex-col overflow-hidden rounded-t-2xl border-t border-border/60 bg-popover shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.32)]">
              <div
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden
                className="flex shrink-0 cursor-grab items-center justify-center py-2.5 active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <span className="block h-1 w-9 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
