"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

/**
 * Matches Tailwind's `max-md:` breakpoint. Returns `false` on the server
 * and on first client render to keep SSR markup stable, then flips
 * synchronously on mount and on every viewport change.
 *
 * Used for surfaces that need genuinely different DOM on mobile vs
 * desktop — e.g. popovers that become bottom sheets, dropdowns that
 * become full-width menu sheets. CSS-only `md:` toggles aren't enough
 * when the *behaviour* (drag-to-dismiss, focus trap, animation
 * direction) differs between sizes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}
