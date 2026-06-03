"use client";

import { useCallback, useRef } from "react";

/**
 * transitions.dev "avatar group hover" (`.t-avatar` in globals.css).
 * Hovering one item in a horizontal stack lifts + scales it, lifts its
 * neighbours less with a power-falloff, and springs everything back with
 * an overshoot on mouseleave.
 *
 * The direction-aware feel comes from setting transition-timing-function
 * inline BEFORE writing --shift / --scale-active: the browser uses
 * whichever timing-function is current when the property changes, so we
 * get a clean ease-in on the way up and a bouncy ease-out on the return
 * without a second class.
 *
 * Usage:
 *   const { rootRef, onItemEnter, onLeave } = useAvatarGroupHover();
 *   <div ref={rootRef} onMouseLeave={onLeave}>
 *     {items.map((it, i) => (
 *       <div key={it.id} className="t-avatar" onMouseEnter={() => onItemEnter(i)}>…</div>
 *     ))}
 *   </div>
 *
 * Items are matched in DOM order via `.t-avatar`, so the index passed to
 * onItemEnter must line up with each item's position in the row.
 */
export function useAvatarGroupHover<T extends HTMLElement = HTMLDivElement>() {
  const rootRef = useRef<T>(null);

  const apply = useCallback((activeIdx: number | null, phase: "in" | "out") => {
    const root = rootRef.current;
    if (!root) return;

    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (name: string, fb: string) =>
      cs.getPropertyValue(name).trim() || fb;

    const lift = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale = num("--avatar-scale", 1.05);
    const tf =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");

    root.querySelectorAll<HTMLElement>(".t-avatar").forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty(
        "--shift",
        (lift * Math.pow(falloff, d)).toFixed(3) + "px"
      );
      el.style.setProperty(
        "--scale-active",
        i === activeIdx ? String(scale) : "1"
      );
    });
  }, []);

  const onItemEnter = useCallback((i: number) => apply(i, "in"), [apply]);
  const onLeave = useCallback(() => apply(null, "out"), [apply]);

  return { rootRef, onItemEnter, onLeave };
}
