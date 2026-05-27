"use client";

import { useEffect, useState, useTransition } from "react";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import { setMyStatus } from "@/lib/actions";
import { STATUS_META } from "@/components/status-picker";
import type { ProfileStatus } from "@/lib/queries";

export function ProfileStatusRow({ current }: { current: ProfileStatus }) {
  const [pending, startTransition] = useTransition();
  // Flip the chip instantly instead of waiting for a full revalidation;
  // adopt server truth when it changes, revert if the write fails.
  const [selected, setSelected] = useState<ProfileStatus>(current);
  useEffect(() => setSelected(current), [current]);

  const choose = (next: ProfileStatus) => {
    if (pending || next === selected) return;
    const previous = selected;
    setSelected(next);
    startTransition(async () => {
      const res = await setMyStatus(next);
      if (res.error) {
        setSelected(previous);
        sileo.error({ title: res.error });
      }
    });
  };

  const items = Object.keys(STATUS_META) as Array<NonNullable<ProfileStatus>>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((k) => {
        const active = selected === k;
        return (
          <button
            key={k}
            onClick={() => choose(k)}
            aria-pressed={active}
            className={cn(
              "chip-3d focus-ring flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[12px] transition-[background-color,color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-60",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-accent/40"
            )}
          >
            <span>{STATUS_META[k].label}</span>
          </button>
        );
      })}
      {selected !== null && (
        <button
          onClick={() => choose(null)}
          className="focus-ring rounded-full px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
