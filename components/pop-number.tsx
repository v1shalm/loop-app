"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * transitions.dev "number pop-in" (`.t-digit-group` in globals.css).
 * Each character of a count re-enters from below with blur when the
 * value changes; the last two characters stagger so the number feels
 * alive without looking chaotic.
 *
 * Replay is driven by toggling `.is-animating` (remove → reflow → re-add)
 * whenever the rendered string changes. The very first paint is skipped
 * so a screen full of counts doesn't all pop on initial load — the
 * pop reads as "this number just updated", not "the page just rendered".
 */
export function PopNumber({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const str = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    if (first.current) {
      first.current = false; // no pop on the initial render
      return;
    }
    g.classList.remove("is-animating");
    void g.offsetHeight; // force reflow so the keyframes restart
    g.classList.add("is-animating");
  }, [str]);

  const chars = str.split("");

  return (
    <span ref={ref} className={cn("t-digit-group", className)}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="t-digit"
          data-stagger={
            i === chars.length - 2
              ? "1"
              : i === chars.length - 1
                ? "2"
                : undefined
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
