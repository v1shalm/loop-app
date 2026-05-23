"use client";

import {
  Archive,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  Pause,
  Prohibit,
  Tag,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Project lifecycle status. Four states that mean something at the
 * project level (the container of tasks), as opposed to the content
 * workflow vocabulary an individual deliverable would move through.
 *
 *   active     — work is happening; the default for any live project
 *   on_hold    — paused intentionally; usually waiting on something
 *   completed  — done shipping, kept around for reference
 *   archived   — out of the way; hidden from the active board
 *
 * Picker mirrors the same chip-as-trigger shape we use elsewhere so a
 * set status renders identically to the option that produced it.
 */

export type WorkflowStatus = "active" | "on_hold" | "completed" | "archived";

interface StatusMeta {
  label: string;
  icon: React.ReactNode;
  /** Tinted bg + matching text used both on the trigger pill and the option. */
  pill: string;
  /** Icon color paired with the pill — kept separate so the icon stays vivid. */
  iconColor: string;
}

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, StatusMeta> = {
  active: {
    label: "Active",
    icon: <CircleNotch size={12} weight="bold" className="animate-spin" />,
    pill:
      "bg-sky-100/70 text-sky-700 border-sky-200/70 " +
      "dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/25",
    iconColor: "text-sky-600 dark:text-sky-300",
  },
  on_hold: {
    label: "On hold",
    icon: <Pause size={12} weight="fill" />,
    pill:
      "bg-amber-100/70 text-amber-700 border-amber-200/70 " +
      "dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/25",
    iconColor: "text-amber-600 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle size={12} weight="fill" />,
    pill:
      "bg-emerald-100/70 text-emerald-700 border-emerald-200/70 " +
      "dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/25",
    iconColor: "text-emerald-600 dark:text-emerald-300",
  },
  archived: {
    label: "Archived",
    icon: <Archive size={12} weight="fill" />,
    pill:
      "bg-zinc-200/70 text-zinc-700 border-zinc-300/70 " +
      "dark:bg-zinc-500/15 dark:text-zinc-200 dark:border-zinc-400/25",
    iconColor: "text-zinc-600 dark:text-zinc-300",
  },
};

const ORDER: WorkflowStatus[] = ["active", "on_hold", "completed", "archived"];

export function workflowStatusLabel(status: WorkflowStatus | null): string {
  if (!status) return "Set status";
  return WORKFLOW_STATUS_META[status].label;
}

export function WorkflowStatusPicker({
  value,
  onChange,
  align = "start",
  variant = "default",
}: {
  value: WorkflowStatus | null;
  onChange: (next: WorkflowStatus | null) => void;
  align?: "start" | "end";
  /** "quiet" = border-only chip, used in dense headers where a filled
   *  pill would compete with surrounding controls. */
  variant?: "default" | "quiet";
}) {
  const meta = value ? WORKFLOW_STATUS_META[value] : null;
  const quiet = variant === "quiet";

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Set project status"
        className={cn(
          STATUS_CHIP_BASE,
          "transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
          quiet
            ? "border-border bg-transparent text-foreground hover:bg-accent/30"
            : meta
            ? cn(meta.pill, "hover:brightness-[0.97]")
            : "border-border bg-card text-muted-foreground hover:text-foreground"
        )}
      >
        {meta ? (
          <span className={meta.iconColor}>{meta.icon}</span>
        ) : (
          <Tag size={12} weight="bold" />
        )}
        {meta ? meta.label : "Set status"}
        <CaretDown size={10} weight="bold" className="opacity-60" />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-fit min-w-[180px] gap-1 p-1.5"
        sideOffset={6}
      >
        <button
          onClick={() => onChange(null)}
          className={cn(
            "focus-ring flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
            value === null
              ? "bg-accent/50 font-medium text-foreground"
              : "text-foreground hover:bg-accent/40"
          )}
        >
          <Prohibit size={13} className="text-muted-foreground" />
          <span className="flex-1">No status</span>
          {value === null && (
            <Check size={13} weight="bold" className="text-muted-foreground" />
          )}
        </button>

        <div className="mt-1 flex flex-col gap-1">
          {ORDER.map((status) => {
            const m = WORKFLOW_STATUS_META[status];
            const selected = value === status;
            return (
              <button
                key={status}
                onClick={() => onChange(status)}
                aria-pressed={selected}
                className={cn(
                  STATUS_CHIP_BASE,
                  "w-full justify-start transition-[transform,filter]",
                  "hover:brightness-[0.97] active:scale-[0.98]",
                  m.pill,
                  selected && "ring-2 ring-inset ring-current/40"
                )}
              >
                <span className={m.iconColor}>{m.icon}</span>
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const STATUS_CHIP_BASE =
  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium";

export function WorkflowStatusChip({
  status,
  size = "sm",
}: {
  status: WorkflowStatus;
  size?: "sm" | "xs";
}) {
  const meta = WORKFLOW_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium",
        meta.pill,
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-1 text-[10.5px]"
      )}
    >
      <span className={meta.iconColor}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export type { WorkflowStatus as TaskWorkflowStatus };
