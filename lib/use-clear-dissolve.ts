"use client";

import { useCallback, useRef } from "react";

/**
 * transitions.dev "input clear with dissolve" (`.t-clear*` in globals.css).
 * When a search field is cleared, the typed text flies down + blurs +
 * fades while a soft per-word streak ignites under each word.
 *
 * This variant is decoupled from the field's React state: the caller
 * clears its own controlled value immediately (so search resets at once),
 * then calls `play(text)` with the text that was cleared. The flourish
 * runs over an overlay mirror + glow layer, independent of the now-empty
 * input — so React's controlled value never fights the per-frame writes.
 *
 * Per-frame JS is unavoidable: the streak's rise/peak/fall envelope and
 * the per-word radial-gradient stack can't be expressed as static
 * @keyframes. Timing/geometry are read from the CSS vars each call so
 * retuning them in globals.css applies on the next clear.
 *
 * Wire the refs to: the `.t-clear` wrapper, the input, a `.t-clear-mirror`
 * overlay, and a `.t-clear-glow` overlay.
 */

// Minimal cubic-bezier(x1,y1,x2,y2) sampler so JS easing matches CSS.
function bezier(str: string) {
  const m = String(str).match(
    /cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/
  );
  if (!m) return (t: number) => t;
  const [x1, y1, x2, y2] = m.slice(1).map(parseFloat);
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6 || d === 0) break;
      s -= dx / d;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}

export function useClearDissolve() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const clearing = useRef(false);
  const canvasCtx = useRef<CanvasRenderingContext2D | null>(null);

  const play = useCallback((text: string) => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const glow = glowRef.current;
    if (!wrap || !input || !mirror || !glow || clearing.current || !text)
      return;
    clearing.current = true;

    const root = document.documentElement;
    const num = (name: string, fb: number) => {
      const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const isDark = root.classList.contains("dark");

    if (!canvasCtx.current) {
      canvasCtx.current = document.createElement("canvas").getContext("2d");
    }
    const ctx = canvasCtx.current;

    const buildGlow = (str: string) => {
      if (!ctx) return "";
      ctx.font = getComputedStyle(input).font;
      const rgb = isDark ? "255,255,255" : "0,0,0";
      const w = wrap.clientWidth || 280;
      const padLeft = parseFloat(getComputedStyle(input).paddingLeft) || 0;
      const spread = num("--glow-spread", 1.5);
      const layers: string[] = [];
      let x = 0;
      str.split(/(\s+)/).forEach((seg) => {
        const segW = ctx.measureText(seg).width;
        if (seg.trim()) {
          const cx = padLeft + x + segW / 2;
          const hw = Math.max(segW * 0.45, 8) * spread;
          (
            [
              [0, 0.8, 7, 0.22],
              [hw * 0.45, 0.55, 8, 0.18],
              [-hw * 0.4, 0.65, 6, 0.16],
              [hw * 0.15, 0.9, 5, 0.14],
            ] as const
          ).forEach(([dx, rwm, rh, a]) => {
            const lx = (((cx + dx) / w) * 100).toFixed(2);
            layers.push(
              `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(
                1
              )}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`
            );
          });
        }
        x += segW;
      });
      return layers.join(", ");
    };

    const total = num("--clear-dur", 1000);
    const outDur = num("--clear-out-dur", 400);
    const outFly = num("--clear-out-fly", 12);
    const blur = num("--clear-blur", 2);
    const delay = num("--glow-delay", 50);
    const peakAt = num("--glow-peak-at", 0.15);
    const gOp = isDark ? 0.85 : num("--glow-opacity", 0.42);
    const easeOut = bezier(
      getComputedStyle(root).getPropertyValue("--clear-out-ease")
    );

    mirror.textContent = text.replace(/ /g, " ");
    wrap.classList.add("is-clearing");
    glow.style.background = buildGlow(text);
    glow.style.opacity = "0";

    const t0 = performance.now();
    requestAnimationFrame(function tick(now) {
      const el = now - t0;
      const eo = easeOut(Math.min(1, el / outDur));
      mirror.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
      mirror.style.opacity = (1 - eo).toFixed(3);
      mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;

      let g = 0;
      if (el > delay) {
        const gp = Math.min(1, (el - delay) / Math.max(1, total - delay));
        g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
      }
      glow.style.opacity = (g * gOp).toFixed(3);

      if (el < total) {
        requestAnimationFrame(tick);
      } else {
        wrap.classList.remove("is-clearing");
        mirror.style.cssText = "";
        mirror.textContent = "";
        glow.style.opacity = "0";
        glow.style.background = "";
        clearing.current = false;
      }
    });
  }, []);

  return { wrapRef, inputRef, mirrorRef, glowRef, play };
}
