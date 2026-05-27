"use client";

import { useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CircleNotch } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Replaces native `window.confirm(...)` everywhere a destructive
 * action wants explicit user acknowledgement. The browser-chrome
 * "localhost:3000 says" dialog reads as foreign UI and breaks the
 * app's visual rhythm — this is the in-app equivalent.
 *
 * Async-friendly: `onConfirm` can return a Promise. The Confirm
 * button shows a spinner while the promise is in flight, then the
 * dialog closes automatically on resolve.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Dismiss",
  variant = "destructive",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-label={title}
        className="max-w-[400px] gap-0 p-0 shadow-soft-md sm:rounded-xl"
      >
        <div className="px-6 pb-6 pt-7 text-center">
          <h2 className="text-[17px] font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <div className="mx-auto mt-2.5 max-w-[320px] text-[13px] leading-relaxed text-foreground/70">
              {description}
            </div>
          )}

          {/* Two equal-width pills. Dismiss is a quiet white/grey pill,
              confirm is the solid action colour (red when destructive).
              Dismiss sits first and autofocuses on destructive dialogs
              so Enter dismisses rather than fires the irreversible
              action. */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={pending}
              autoFocus={variant === "destructive"}
              className="focus-ring inline-flex h-11 flex-1 items-center justify-center rounded-full border-[1.5px] border-border bg-card text-[14px] font-semibold text-foreground transition-colors hover:bg-accent/50 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              autoFocus={variant !== "destructive"}
              className={cn(
                "focus-ring inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-[background-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100",
                variant === "destructive"
                  ? "bg-rose-600 text-white shadow-[0_1px_2px_oklch(0_0_0/0.08),inset_0_1px_0_oklch(1_0_0/0.18)] hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
                  : "surface-brand surface-brand-hover text-primary-foreground shadow-[var(--shadow-cta)]"
              )}
            >
              {pending && <CircleNotch size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
