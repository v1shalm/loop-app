"use client";

import { useState } from "react";
import { CaretRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export function CompletedSection({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring group flex w-full items-baseline justify-between border-b border-border/50 pb-2 text-left"
      >
        <div className="flex items-center gap-2">
          <CaretRight
            size={12}
            weight="bold"
            className={cn(
              "text-muted-foreground transition-transform duration-150 ease-[var(--ease-out)]",
              open && "rotate-90"
            )}
          />
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Completed today
          </h2>
        </div>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {count} {count === 1 ? "task" : "tasks"}
        </span>
      </button>
      {open && <div className="mt-3 flex flex-col gap-2">{children}</div>}
    </section>
  );
}
