"use client";

import { useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CircleNotch, Warning } from "@/components/icons";
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
  cancelLabel = "Cancel",
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
        className="max-w-[420px] gap-0 p-0 shadow-soft-md sm:rounded-xl"
      >
        <div className="flex items-start gap-3 p-5">
          {variant === "destructive" && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-500/12 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <Warning size={18} weight="fill" />
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.005em] text-foreground">
              {title}
            </h2>
            {description && (
              <div className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/65">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="focus-ring inline-flex h-9 items-center rounded-md px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent/60 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            autoFocus
            className={cn(
              "focus-ring inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition-[background-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100",
              variant === "destructive"
                ? "bg-rose-600 text-white shadow-[0_1px_2px_oklch(0_0_0/0.08),inset_0_1px_0_oklch(1_0_0/0.18)] hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400"
                : "surface-brand surface-brand-hover text-primary-foreground shadow-[var(--shadow-cta)]"
            )}
          >
            {pending && <CircleNotch size={13} className="animate-spin" />}
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
