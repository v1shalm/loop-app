"use client";

import { useTransition } from "react";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import { setMyStatus } from "@/lib/actions";
import { STATUS_META } from "@/components/status-picker";
import type { ProfileStatus } from "@/lib/queries";

export function ProfileStatusRow({ current }: { current: ProfileStatus }) {
  const [pending, startTransition] = useTransition();

  const choose = (next: ProfileStatus) => {
    if (pending) return;
    startTransition(async () => {
      const res = await setMyStatus(next);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const items = Object.keys(STATUS_META) as Array<NonNullable<ProfileStatus>>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((k) => {
        const active = current === k;
        return (
          <button
            key={k}
            onClick={() => choose(k)}
            disabled={pending}
            className={cn(
              "chip-3d focus-ring flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] transition-[background-color,color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-60",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-accent/40"
            )}
          >
            <span>{STATUS_META[k].label}</span>
          </button>
        );
      })}
      {current !== null && (
        <button
          onClick={() => choose(null)}
          disabled={pending}
          className="focus-ring rounded-full px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
