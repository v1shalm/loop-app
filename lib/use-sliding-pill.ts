"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Slides a "pill" element between the options of a segmented control
 * (transitions.dev "tabs sliding"). The pill's transform / width / height
 * are written from the active option's measured box; the CSS
 * (`.t-tabs-pill` in globals.css) owns the tween. Colors and shape are the
 * caller's — style the pill element however the control needs.
 *
 * Usage:
 *   const { pillRef, setTabRef } = useSlidingPill(activeIndex);
 *   <span ref={pillRef} aria-hidden className="t-tabs-pill rounded bg-primary/12" />
 *   <button ref={setTabRef(0)} className="t-tab" … />
 *   <button ref={setTabRef(1)} className="t-tab" … />
 *
 * The pill anchors to its nearest positioned ancestor, so give that
 * element `position` (the `t-tabs` class, or an existing `absolute`).
 * On first paint and on resize the pill is positioned with the transition
 * suspended so it snaps into place instead of flying in from
 * translateX(0)/width:0. Honors prefers-reduced-motion via the CSS.
 */
export function useSlidingPill(activeIndex: number) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const tabs = useRef<(HTMLElement | null)[]>([]);
  const placed = useRef(false);

  const setTabRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      tabs.current[i] = el;
    },
    []
  );

  const place = useCallback(
    (animate: boolean) => {
      const pill = pillRef.current;
      const active = tabs.current[activeIndex];
      if (!pill || !active) return;
      const write = () => {
        pill.style.transform = `translateX(${active.offsetLeft}px)`;
        pill.style.top = `${active.offsetTop}px`;
        pill.style.width = `${active.offsetWidth}px`;
        pill.style.height = `${active.offsetHeight}px`;
      };
      if (animate) {
        write();
      } else {
        const prev = pill.style.transition;
        pill.style.transition = "none";
        write();
        void pill.offsetWidth; // reflow so the snap doesn't tween
        pill.style.transition = prev;
      }
    },
    [activeIndex]
  );

  useLayoutEffect(() => {
    place(placed.current); // first run snaps (false); later runs animate
    placed.current = true;
  }, [place]);

  useEffect(() => {
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  return { pillRef, setTabRef };
}
