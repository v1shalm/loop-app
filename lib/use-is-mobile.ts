"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = "(max-width: 767px)";

// One MediaQueryList for the whole app, created lazily on first use.
// Every useIsMobile() consumer reads the same snapshot and shares a
// single change subscription, instead of each component (every task
// row, popover, etc.) allocating its own matchMedia + listener.
let mql: MediaQueryList | null = null;

function getMql(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (!mql) mql = window.matchMedia(MOBILE_BREAKPOINT);
  return mql;
}

function subscribe(onChange: () => void): () => void {
  const m = getMql();
  if (!m) return () => {};
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return getMql()?.matches ?? false;
}

// Server (and first client render) must agree on `false` to keep SSR
// markup stable; useSyncExternalStore's server snapshot enforces that,
// then React reconciles to the real value on hydration.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Matches Tailwind's `max-md:` breakpoint. Returns `false` on the server
 * and on first client render to keep SSR markup stable, then flips to
 * the real viewport state on hydration and on every viewport change.
 *
 * Used for surfaces that need genuinely different DOM on mobile vs
 * desktop — e.g. popovers that become bottom sheets, dropdowns that
 * become full-width menu sheets. CSS-only `md:` toggles aren't enough
 * when the *behaviour* (drag-to-dismiss, focus trap, animation
 * direction) differs between sizes.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
