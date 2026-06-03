"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * transitions.dev "text states swap" (`.t-text-swap` in globals.css).
 * Swaps a status label in place with a blurred up-and-down move —
 * "Create workspace" → "Creating…", "Save" → "Saved". The old text
 * exits up + blurs + fades, the new text enters from below.
 *
 * The visible string is owned imperatively after mount so React's
 * render pass doesn't fight the three-phase swap. The initial value is
 * still rendered as children for SSR / first paint (no hydration flash);
 * because we always render that same initial string, React never
 * resets the textContent we mutate underneath it.
 */
export function TextSwap({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Captured once for SSR / first render (the setter is intentionally
  // unused — we always render this initial string and mutate the live
  // text imperatively underneath it, so React never resets our swap).
  const [initial] = useState(value);
  const current = useRef(value); // last committed text
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === current.current) return;

    const dur =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--text-swap-dur"
        )
      ) || 150;

    if (timer.current) window.clearTimeout(timer.current);
    el.classList.add("is-exit");
    timer.current = window.setTimeout(() => {
      el.textContent = value;
      current.current = value;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight; // force reflow so the next change transitions
      el.classList.remove("is-enter-start");
    }, dur);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value]);

  return (
    <span ref={ref} className={cn("t-text-swap", className)}>
      {initial}
    </span>
  );
}
