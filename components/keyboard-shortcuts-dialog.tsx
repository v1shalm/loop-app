"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "@/components/icons";
import { useEffect, useState } from "react";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Q"], label: "Add task" },
  { keys: ["⌘", "K"], label: "Search" },
  { keys: ["?"], label: "Show this list" },
  { keys: ["Esc"], label: "Close dialog or drawer" },
];

const TASK_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Click checkbox"], label: "Complete task" },
  { keys: ["Click title"], label: "Open detail drawer" },
  { keys: ["Click date"], label: "Set due date" },
  { keys: ["Click priority"], label: "Set priority" },
  { keys: ["Click avatar"], label: "Reassign" },
];

/**
 * `?` opens this overlay. Lists every keyboard shortcut + click affordance
 * in the app so non-technical users can discover what's clickable.
 */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Detect mac vs others to show the right modifier glyph
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    );
  }, []);

  const modifier = isMac ? "⌘" : "Ctrl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 border-border/60 p-0 shadow-soft-xl sm:rounded-xl"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <h2 className="flex-1 text-[14px] font-semibold tracking-tight text-foreground">
            Keyboard shortcuts
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="px-5 py-4">
          <Section title="Global">
            {SHORTCUTS.map((s) => (
              <ShortcutRow
                key={s.label}
                label={s.label}
                keys={s.keys.map((k) => (k === "⌘" ? modifier : k))}
              />
            ))}
          </Section>

          <Section title="Tasks" extraTop>
            {TASK_SHORTCUTS.map((s) => (
              <ShortcutRow key={s.label} label={s.label} keys={s.keys} />
            ))}
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
  extraTop,
}: {
  title: string;
  children: React.ReactNode;
  extraTop?: boolean;
}) {
  return (
    <div className={extraTop ? "mt-5" : ""}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/40">
      <span className="text-[13px] text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="chip-3d inline-flex h-[20px] min-w-[20px] items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[11px] font-medium text-foreground"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
