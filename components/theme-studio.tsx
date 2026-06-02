"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@/components/icons";
import {
  type AccentBase,
  type AccentPreset,
  ACCENT_GROUPS,
  baseToCss,
  CHROMA_MAX,
} from "@/lib/accents";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const L_MAX = 0.95;
const L_MIN = 0.2;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round = (n: number, p = 4) => {
  const f = 10 ** p;
  return Math.round(n * f) / f;
};

const nodeXY = (b: AccentBase) => ({
  x: clamp01(b.h / 360),
  y: clamp01((L_MAX - b.l) / (L_MAX - L_MIN)),
});

const haptic = (ms = 6) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
};

// ── Color canvas: a dotted plane holding one or more color nodes ─────────────
// Each node is a color (position = hue × lightness at its chroma). With 2+
// nodes the canvas paints the blended gradient behind the dots so the result
// is visible as you build it. Theme-adaptive.

export function ColorField({
  nodes,
  selected,
  onSelectNode,
  onChangeNode,
}: {
  nodes: AccentBase[];
  selected: number;
  onSelectNode: (i: number) => void;
  onChangeNode: (i: number, base: AccentBase) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);

  const fracFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return { fx: 0, fy: 0 };
    const r = el.getBoundingClientRect();
    return {
      fx: clamp01((clientX - r.left) / r.width),
      fy: clamp01((clientY - r.top) / r.height),
    };
  };
  const colorAt = (fx: number, fy: number, chroma: number): AccentBase => ({
    l: round(L_MAX - fy * (L_MAX - L_MIN)),
    c: chroma,
    h: round((fx * 360) % 360, 2),
  });
  const hitTest = (fx: number, fy: number) => {
    let best = -1;
    let bd = 0.08;
    nodes.forEach((b, i) => {
      const p = nodeXY(b);
      const d = Math.hypot(p.x - fx, p.y - fy);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { fx, fy } = fracFromEvent(e.clientX, e.clientY);
    const hit = hitTest(fx, fy);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (hit >= 0) {
      dragIndex.current = hit;
      if (hit !== selected) onSelectNode(hit);
    } else {
      dragIndex.current = selected;
      onChangeNode(selected, colorAt(fx, fy, nodes[selected]?.c ?? 0.2));
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const i = dragIndex.current;
    if (i == null) return;
    const { fx, fy } = fracFromEvent(e.clientX, e.clientY);
    onChangeNode(i, colorAt(fx, fy, nodes[i]?.c ?? 0.2));
  };
  const endDrag = (e: React.PointerEvent) => {
    dragIndex.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const b = nodes[selected];
    if (!b) return;
    const hStep = e.shiftKey ? 24 : 6;
    const lStep = e.shiftKey ? 0.05 : 0.015;
    let next: AccentBase | null = null;
    if (e.key === "ArrowLeft")
      next = { ...b, h: round((((b.h - hStep) % 360) + 360) % 360, 2) };
    else if (e.key === "ArrowRight")
      next = { ...b, h: round((b.h + hStep) % 360, 2) };
    else if (e.key === "ArrowUp")
      next = { ...b, l: round(Math.min(L_MAX, b.l + lStep)) };
    else if (e.key === "ArrowDown")
      next = { ...b, l: round(Math.max(L_MIN, b.l - lStep)) };
    if (next) {
      e.preventDefault();
      onChangeNode(selected, next);
    }
  };

  // Blended gradient backdrop — one soft radial per node at its position.
  const mesh =
    nodes.length > 1
      ? nodes
          .map((b) => {
            const { x, y } = nodeXY(b);
            return `radial-gradient(circle at ${round(x * 100, 1)}% ${round(
              y * 100,
              1
            )}%, ${baseToCss(b, 0.85)} 0%, transparent 58%)`;
          })
          .join(", ")
      : undefined;

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label={`Color canvas with ${nodes.length} ${
        nodes.length === 1 ? "color" : "colors"
      }. Arrow keys adjust the selected color.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="absolute inset-0 cursor-crosshair touch-none outline-none"
    >
      {mesh && (
        <span
          aria-hidden
          className="absolute inset-0 transition-[background] duration-200"
          style={{ backgroundImage: mesh }}
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 text-foreground/[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1.1px, transparent 1.3px)",
          backgroundSize: "18px 18px",
          backgroundPosition: "center",
        }}
      />
      {nodes.map((b, i) => {
        const { x, y } = nodeXY(b);
        const isSel = i === selected;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[width,height] duration-150",
              isSel
                ? "z-[3] size-[40px] border-[4px]"
                : "z-[2] size-[26px] border-[3px] opacity-95"
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              backgroundColor: baseToCss(b),
            }}
          />
        );
      })}
    </div>
  );
}

// ── Saturation: a wave that's flat at 0 and curls more as chroma rises ───────

const WAVE_W = 320;
const WAVE_H = 44;

function waveD(v: number) {
  const mid = WAVE_H / 2;
  const amp = v * 13; // 0 → flat line
  const cycles = 1 + v * 7; // more waves the further along
  const k = (Math.PI * 2 * cycles) / WAVE_W;
  let d = `M 0 ${mid}`;
  for (let px = 4; px <= WAVE_W; px += 4)
    d += ` L ${px} ${round(mid + Math.sin(px * k) * amp, 2)}`;
  return d;
}

export function SaturationSlider({
  base,
  onChange,
}: {
  base: AccentBase;
  onChange: (base: AccentBase) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const v = clamp01(Math.min(base.c, CHROMA_MAX) / CHROMA_MAX);

  const setFromPoint = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = clamp01((clientX - r.left) / r.width);
    onChange({ ...base, c: round(f * CHROMA_MAX) });
  };
  const down = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPoint(e.clientX);
  };
  const move = (e: React.PointerEvent) => {
    if (dragging.current) setFromPoint(e.clientX);
  };
  const up = (e: React.PointerEvent) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };
  const key = (e: React.KeyboardEvent) => {
    const step = (e.shiftKey ? 0.05 : 0.01) * CHROMA_MAX;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange({ ...base, c: round(Math.max(0, base.c - step)) });
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange({ ...base, c: round(Math.min(CHROMA_MAX, base.c + step)) });
    }
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Saturation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      className="focus-ring relative h-12 flex-1 cursor-pointer touch-none rounded-lg text-foreground/45"
    >
      <svg
        viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          d={waveD(v)}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          style={{ transition: "d 120ms linear" }}
        />
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 h-[46px] w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
        style={{ left: `${v * 100}%` }}
      />
    </div>
  );
}

// ── Grain knob: dotted ring + rotating indicator, with ticks + haptics ───────

export function GrainDial({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const lastNotch = useRef(Math.round(value * 20));
  const pct = clamp01(value);
  const angle = -135 + pct * 270; // sweep lower-left → lower-right

  // Emit a change, with a soft tick + haptic when crossing a notch.
  const emit = (n: number) => {
    const c = clamp01(n);
    const notch = Math.round(c * 20);
    if (notch !== lastNotch.current) {
      lastNotch.current = notch;
      playSound("pin");
      haptic(c === 0 ? 12 : 5);
    }
    onChange(c);
  };

  const down = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, v: pct };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (drag.current)
      emit(drag.current.v + (drag.current.y - e.clientY) / 130);
  };
  const up = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };
  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.2 : 0.05;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      emit(pct + step);
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      emit(pct - step);
    } else if (e.key === "Home") {
      e.preventDefault();
      emit(0);
    } else if (e.key === "End") {
      e.preventDefault();
      emit(1);
    }
  };

  const dots = Array.from({ length: 24 });
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Grain"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-valuetext={pct === 0 ? "Off" : `${Math.round(pct * 100)} percent`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      title="Grain — drag up/down"
      className="focus-ring relative grid size-[84px] shrink-0 cursor-ns-resize touch-none place-items-center rounded-full text-muted-foreground"
    >
      {dots.map((_, i) => {
        const a = ((-240 + (i / (dots.length - 1)) * 300) * Math.PI) / 180;
        return (
          <span
            key={i}
            aria-hidden
            className="absolute size-[2.5px] rounded-full bg-current opacity-40"
            style={{
              transform: `translate(${Math.cos(a) * 39}px, ${
                Math.sin(a) * 39
              }px)`,
            }}
          />
        );
      })}
      <span
        aria-hidden
        className="relative grid size-[62px] place-items-center rounded-full bg-card shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-border"
      >
        {/* indicator: a short bar pointing outward at the value angle */}
        <span
          className="absolute h-[5px] w-[15px] rounded-full bg-foreground/75"
          style={{
            transform: `rotate(${angle}deg) translateX(13px)`,
          }}
        />
      </span>
    </div>
  );
}

// ── Preset carousel ──────────────────────────────────────────────────────────

export function PresetCarousel({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (preset: AccentPreset) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const presets = ACCENT_GROUPS.flatMap((g) => g.presets);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);
  useEffect(() => {
    sync();
  }, [sync]);
  const nudge = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * 180, behavior: "smooth" });

  return (
    <div className="flex items-center gap-2">
      <ArrowBtn dir="left" disabled={!canLeft} onClick={() => nudge(-1)} />
      <div
        ref={scroller}
        onScroll={sync}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-x-auto scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {presets.map((p) => {
          const active = activeId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-label={p.name}
              title={p.name}
              aria-pressed={active}
              onClick={() => onSelect(p)}
              className={cn(
                "size-[26px] shrink-0 rounded-full transition-transform duration-200 ease-[var(--ease-out)] active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-card"
                  : "hover:scale-110"
              )}
              style={{ backgroundColor: baseToCss(p.base) }}
            />
          );
        })}
      </div>
      <ArrowBtn dir="right" disabled={!canRight} onClick={() => nudge(1)} />
    </div>
  );
}

function ArrowBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "left" ? CaretLeft : CaretRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon size={16} weight="bold" />
    </button>
  );
}
