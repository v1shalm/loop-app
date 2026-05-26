"use client";

import { useId } from "react";
import { motion, type Variants } from "motion/react";
import Calendar03 from "@hugeicons/core-free-icons/Calendar03Icon";

/**
 * Animated sidebar nav icons.
 *
 * Each icon is built from separate SVG primitives (256 viewBox, 16-unit
 * stroke — the same relative weight as the HugeIcons set used elsewhere)
 * so individual parts can animate: the sun's rays twinkle and the disc
 * rotates, the inbox document's three list lines draw in left-to-right
 * with a sheen sweep, and the check draws itself on. Upcoming uses the
 * real HugeIcons calendar with a subtle breathe + tab bob on hover.
 *
 * Motion is driven by variant propagation: the NavRow sets
 * `whileHover="hover"` and these elements resolve the "rest" / "hover"
 * label from it. `<MotionConfig reducedMotion="user">` in AppShell
 * degrades it to instant for reduced-motion users.
 */

type IconProps = { size?: number; active?: boolean };

const SVG = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 16,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Scale/rotate around the element's own centre, robustly across browsers.
const selfOrigin = {
  transformBox: "fill-box" as const,
  transformOrigin: "center" as const,
};

function svgBase(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 256 256",
    "aria-hidden": true,
    ...SVG,
  };
}

// ── My Day: sun. Rays twinkle with a stagger, the disc rotates, core
//    breathes. ──────────────────────────────────────────────────────────
export function MyDayIcon({ size = 18, active }: IconProps) {
  // 8 rays, each a short round-capped segment sitting in the 88–112 radius
  // band (matches Phosphor's ray length once the 8-unit caps are added).
  const dirs = [
    [0, -1],
    [0.7071, -0.7071],
    [1, 0],
    [0.7071, 0.7071],
    [0, 1],
    [-0.7071, 0.7071],
    [-1, 0],
    [-0.7071, -0.7071],
  ] as const;
  const rays = dirs.map(([ux, uy]) => ({
    x1: 128 + 96 * ux,
    y1: 128 + 96 * uy,
    x2: 128 + 104 * ux,
    y2: 128 + 104 * uy,
  }));

  const rayVariants: Variants = {
    rest: { scale: 1, opacity: 1 },
    hover: (i: number) => ({
      scale: [1, 0.45, 1.25, 1],
      opacity: [1, 0.6, 1, 1],
      transition: { duration: 0.55, delay: i * 0.03, ease: "easeOut" },
    }),
  };

  return (
    <motion.svg {...svgBase(size)}>
      <motion.g
        variants={{ hover: { rotate: [0, 20, 0] } }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={selfOrigin}
      >
        {rays.map((r, i) => (
          <motion.line
            key={i}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            custom={i}
            variants={rayVariants}
            style={selfOrigin}
          />
        ))}
      </motion.g>
      <motion.circle
        cx="128"
        cy="128"
        r="56"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.16 : 0}
        variants={{ hover: { scale: [1, 1.16, 1] } }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={selfOrigin}
      />
    </motion.svg>
  );
}

// ── Inbox: document with three list lines. On hover the lines redraw
//    left-to-right with a stagger, then a sheen sweeps across them once.
//    Resting = a plain document/list glyph. ─────────────────────────────
const INBOX_LINES = [
  { x: 76, y: 96, w: 104 },
  { x: 76, y: 128, w: 104 },
  { x: 76, y: 160, w: 68 },
] as const;

const inboxLineVariants: Variants = {
  rest: { scaleX: 1 },
  hover: (i: number) => ({
    scaleX: [0, 1],
    transition: { duration: 0.24, delay: i * 0.08, ease: [0.25, 1, 0.5, 1] },
  }),
};

export function InboxIcon({ size = 18, active }: IconProps) {
  const uid = useId();
  const clipId = `inbox-lines-${uid}`;
  const sheenId = `inbox-sheen-${uid}`;

  return (
    <motion.svg {...svgBase(size)}>
      <defs>
        <linearGradient id={sheenId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          {INBOX_LINES.map((l, i) => (
            <rect key={i} x={l.x} y={l.y} width={l.w} height="16" rx="8" />
          ))}
        </clipPath>
      </defs>

      {/* Document frame. */}
      <rect
        x="40"
        y="40"
        width="176"
        height="176"
        rx="32"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.16 : 0}
      />

      {/* Three list lines — filled pills so they can be both scaleX-drawn
          and used as the sheen clip. Each grows from its left edge. */}
      {INBOX_LINES.map((l, i) => (
        <motion.rect
          key={i}
          x={l.x}
          y={l.y}
          width={l.w}
          height="16"
          rx="8"
          fill="currentColor"
          stroke="none"
          custom={i}
          variants={inboxLineVariants}
          style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
        />
      ))}

      {/* Sheen sweep, clipped to the lines, fires once after they draw. */}
      <g clipPath={`url(#${clipId})`}>
        <motion.rect
          x="0"
          y="84"
          width="256"
          height="96"
          fill={`url(#${sheenId})`}
          variants={{
            rest: { x: -256 },
            hover: {
              x: [-256, 384],
              transition: { duration: 0.4, delay: 0.45, ease: "linear" },
            },
          }}
        />
      </g>
    </motion.svg>
  );
}

// ── Upcoming: a normal HugeIcons calendar (Calendar03). Subtle on hover:
//    the whole glyph gives a soft scale breathe, the binding tabs bob a
//    hair, and the day dots pulse once. ─────────────────────────────────
export function UpcomingIcon({ size = 18, active }: IconProps) {
  // Calendar03 ships as [tabs, body, header, dots].
  const [tabs, body, header, dots] = Calendar03;
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <motion.g
        variants={{ hover: { scale: [1, 1.06, 1] } }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={selfOrigin}
      >
        <path
          d={body[1].d}
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.14 : 0}
        />
        <motion.path
          d={tabs[1].d}
          variants={{ hover: { y: [0, -1.4, 0] } }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <path d={header[1].d} />
        <motion.path
          d={dots[1].d}
          variants={{ hover: { opacity: [1, 0.5, 1] } }}
          transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
        />
      </motion.g>
    </motion.svg>
  );
}

// ── Completed: check in a circle. The check draws itself on; the ring
//    gives a small pulse. ───────────────────────────────────────────────
export function CompletedIcon({ size = 18, active }: IconProps) {
  return (
    <motion.svg {...svgBase(size)}>
      <motion.circle
        cx="128"
        cy="128"
        r="96"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.16 : 0}
        variants={{ hover: { scale: [1, 0.92, 1] } }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={selfOrigin}
      />
      <motion.path
        d="M84 130 L112 156 L172 96"
        variants={{
          rest: { pathLength: 1, opacity: 1 },
          hover: {
            pathLength: [0, 1],
            opacity: [0.35, 1],
            transition: { duration: 0.45, ease: "easeOut" },
          },
        }}
      />
    </motion.svg>
  );
}

export type NavIcon = typeof MyDayIcon;
