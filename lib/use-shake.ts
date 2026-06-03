"use client";

import { useCallback, useRef } from "react";

/**
 * Replays the transitions.dev error shake (`.t-input.is-shaking` in
 * globals.css) on the referenced element. Attach `ref` to the field that
 * owns the visible border (and add the `t-input` class to it), then call
 * `shake()` when a submission is rejected — the percussive cue draws the
 * eye to the field while the app's own alert box / toast carries the
 * actual message.
 *
 * Remove → reflow → re-add is what lets the animation replay on repeated
 * failures. The cleanup delay is read from the CSS duration vars so it
 * stays in sync if they're retuned. Honors prefers-reduced-motion via the
 * CSS (the class is inert when the animation is disabled there).
 */
export function useShake<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  const shake = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-shaking");
    void el.offsetWidth; // force reflow so the keyframes restart
    el.classList.add("is-shaking");

    const cs = getComputedStyle(document.documentElement);
    const ms = (name: string, fallback: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    const shakeMs = ms("--shake-dur-a", 80) * 2 + ms("--shake-dur-b", 60) * 2;
    window.setTimeout(() => el.classList.remove("is-shaking"), shakeMs + 40);
  }, []);

  return { ref, shake };
}
