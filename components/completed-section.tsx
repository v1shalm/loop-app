"use client";

import { useState } from "react";
import { CaretRight } from "@/components/icons";
import { SectionCount } from "@/components/section-count";
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
        className="focus-ring group/comp flex w-full items-center justify-between border-b border-border/50 pb-2 text-left transition-colors duration-150 ease-[var(--ease-out)] hover:border-border"
      >
        <div className="flex items-center gap-2">
          <span className="grid size-4 place-items-center rounded text-muted-foreground/70 transition-[color,background-color] duration-150 ease-[var(--ease-out)] group-hover/comp:bg-accent/50 group-hover/comp:text-foreground">
            <CaretRight
              size={11}
              weight="bold"
              className={cn(
                "transition-transform duration-200 ease-[var(--ease-out)]",
                open && "rotate-90"
              )}
            />
          </span>
          <h2 className="text-[13px] font-semibold tracking-tight text-muted-foreground transition-colors duration-150 ease-[var(--ease-out)] group-hover/comp:text-foreground">
            Completed today
          </h2>
        </div>
        <SectionCount n={count} />
      </button>
      {open && <div className="mt-3 flex flex-col gap-2">{children}</div>}
    </section>
  );
}
