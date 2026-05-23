"use client";

import {
  Archive,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  Eye,
  FlagBanner,
  PencilSimple,
  Play,
  Prohibit,
  Tag,
  Warning,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Workflow status — separate from completion (todo/done). Optional label
 * that tracks the design / dev review loop a task is in.
 *
 * Picker matches the Figma reference: a "Set status" trigger pill that
 * opens a popover with "No status" at the top followed by 8 tinted
 * status pills. Selecting a status updates the chip in place.
 */

export type WorkflowStatus =
  | "draft"
  | "in_progress"
  | "waiting_approval"
  | "changes_requested"
  | "approved"
  | "live"
  | "archived"
  | "do_not_use";

interface StatusMeta {
  label: string;
  icon: React.ReactNode;
  /** Tinted bg + matching text used both on the picker pill and the chip. */
  pill: string;
  /** Icon color paired with the pill — separated so the icon stays vivid. */
  iconColor: string;
}

export const WORKFLOW_STATUS_META: Record<WorkflowStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    icon: <PencilSimple size={12} weight="fill" />,
    pill:
      "bg-indigo-100/70 text-indigo-700 border-indigo-200/70 " +
      "dark:bg-indigo-500/15 dark:text-indigo-200 dark:border-indigo-400/25",
    iconColor: "text-indigo-600 dark:text-indigo-300",
  },
  in_progress: {
    label: "In Progress",
    icon: <CircleNotch size={12} weight="bold" className="animate-spin" />,
    pill:
      "bg-sky-100/70 text-sky-700 border-sky-200/70 " +
      "dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/25",
    iconColor: "text-sky-600 dark:text-sky-300",
  },
  waiting_approval: {
    label: "Waiting for approval",
    icon: <Eye size={12} weight="fill" />,
    pill:
      "bg-violet-100/70 text-violet-700 border-violet-200/70 " +
      "dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/25",
    iconColor: "text-violet-600 dark:text-violet-300",
  },
  changes_requested: {
    label: "Changes requested",
    icon: <FlagBanner size={12} weight="fill" />,
    pill:
      "bg-orange-100/70 text-orange-700 border-orange-200/70 " +
      "dark:bg-orange-500/15 dark:text-orange-200 dark:border-orange-400/25",
    iconColor: "text-orange-600 dark:text-orange-300",
  },
  approved: {
    label: "Approved",
    icon: <Check size={12} weight="bold" />,
    pill:
      "bg-emerald-100/70 text-emerald-700 border-emerald-200/70 " +
      "dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/25",
    iconColor: "text-emerald-600 dark:text-emerald-300",
  },
  live: {
    label: "Live",
    icon: <Play size={12} weight="fill" />,
    pill:
      "bg-lime-100/70 text-lime-800 border-lime-200/70 " +
      "dark:bg-lime-500/15 dark:text-lime-200 dark:border-lime-400/25",
    iconColor: "text-lime-700 dark:text-lime-300",
  },
  archived: {
    label: "Archived",
    icon: <Archive size={12} weight="fill" />,
    pill:
      "bg-yellow-100/70 text-yellow-800 border-yellow-200/70 " +
      "dark:bg-yellow-500/15 dark:text-yellow-200 dark:border-yellow-400/25",
    iconColor: "text-yellow-700 dark:text-yellow-300",
  },
  do_not_use: {
    label: "Do not use",
    icon: <Warning size={12} weight="fill" />,
    pill:
      "bg-rose-100/70 text-rose-700 border-rose-200/70 " +
      "dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-400/25",
    iconColor: "text-rose-600 dark:text-rose-300",
  },
};

const ORDER: WorkflowStatus[] = [
  "draft",
  "in_progress",
  "waiting_approval",
  "changes_requested",
  "approved",
  "live",
  "archived",
  "do_not_use",
];

export function workflowStatusLabel(status: WorkflowStatus | null): string {
  if (!status) return "Set status";
  return WORKFLOW_STATUS_META[status].label;
}

/**
 * Trigger + popover. Renders as a chip when status is set, as a "Set
 * status" outline pill when it isn't.
 */
export function WorkflowStatusPicker({
  value,
  onChange,
  align = "start",
}: {
  value: WorkflowStatus | null;
  onChange: (next: WorkflowStatus | null) => void;
  align?: "start" | "end";
}) {
  const meta = value ? WORKFLOW_STATUS_META[value] : null;

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Set workflow status"
        className={cn(
          STATUS_CHIP_BASE,
          "transition-colors hover:brightness-[0.97]",
          meta
            ? meta.pill
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
        {/* No status — plain row, no pill */}
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

        {/* Status pills — same dimensions as the trigger chip; selected
            gets a stronger ring instead of a trailing checkmark so the
            chip stays the unit of meaning */}
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

// Shared chip dimensions — used by both the trigger pill and every option
// inside the popover so the trigger looks like one of its own options.
const STATUS_CHIP_BASE =
  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium";

/**
 * Read-only chip — used in task rows and other display surfaces.
 */
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

// Small completion-state guard used elsewhere — also re-export the type
// so consumers don't pull from queries.
export type { WorkflowStatus as TaskWorkflowStatus };
// Keep CheckCircle live in the import graph for parity in downstream
// consumers that may want the success icon next to a status mention.
export const _CheckCircle = CheckCircle;
