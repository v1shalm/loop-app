"use client";

import { motion, type Variants } from "motion/react";

/**
 * Animated sidebar nav icons.
 *
 * Phosphor ships each icon as one compound filled path, so its internals
 * can't be moved independently. These are faithful reconstructions of the
 * Phosphor *regular* geometry (256 viewBox, 16-unit stroke, round caps)
 * rebuilt from separate SVG primitives — so the resting shape reads as the
 * exact Phosphor icon, but individual parts can animate: the sun's rays
 * twinkle and the disc rotates, a chevron drops into the inbox tray, the
 * calendar's binding tabs bob while a day cell pops, and the check draws
 * itself on.
 *
 * Hover accents (the dropping chevron, the calendar day) are invisible at
 * rest, so a row that isn't hovered shows the plain Phosphor glyph.
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

// ── Inbox: tray. Resting = plain Phosphor tray. On hover a chevron drops
//    into the mouth and the lip gives a small catch-bob. ────────────────
export function InboxIcon({ size = 18, active }: IconProps) {
  return (
    <motion.svg {...svgBase(size)}>
      {/* Chevron that drops in — hidden at rest. */}
      <motion.path
        d="M104 56 L128 78 L152 56"
        variants={{
          rest: { y: 0, opacity: 0 },
          hover: {
            y: [-18, 0],
            opacity: [0, 1, 1, 0],
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          },
        }}
      />
      {/* Tray outer frame. */}
      <rect x="40" y="40" width="176" height="176" rx="14" />
      {/* Tray mouth — the inner lip with the central dip. Gives a small
          downward catch-bob on hover, as if receiving the chevron. */}
      <motion.polyline
        points="40,152 77,152 96,172 148,172 168,152 216,152"
        variants={{
          rest: { y: 0 },
          hover: {
            y: [0, 5, 0],
            transition: { duration: 0.5, delay: 0.16, ease: "easeOut" },
          },
        }}
      />
      {active && (
        <path
          d="M40,152 H77 L96,172 H148 L168,152 H216 V202 a14 14 0 0 1 -14 14 H54 a14 14 0 0 1 -14 -14 Z"
          fill="currentColor"
          fillOpacity={0.16}
          stroke="none"
        />
      )}
    </motion.svg>
  );
}

// ── Upcoming: calendar. Binding tabs bob; a day cell pops in on hover
//    (hidden at rest, so resting = plain blank Phosphor calendar). ──────
export function UpcomingIcon({ size = 18, active }: IconProps) {
  return (
    <motion.svg {...svgBase(size)}>
      {/* Binding tabs. */}
      <motion.line
        x1="88"
        y1="28"
        x2="88"
        y2="60"
        variants={{ hover: { y: [0, -7, 0] } }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      <motion.line
        x1="168"
        y1="28"
        x2="168"
        y2="60"
        variants={{ hover: { y: [0, -7, 0] } }}
        transition={{ duration: 0.45, delay: 0.07, ease: "easeOut" }}
      />
      {/* Body + header rule. */}
      <rect x="40" y="56" width="176" height="160" rx="14" />
      <line x1="40" y1="96" x2="216" y2="96" />
      {/* Day cell — pops in on hover, hidden at rest unless active. */}
      <motion.rect
        x="76"
        y="124"
        width="34"
        height="34"
        rx="6"
        fill="currentColor"
        stroke="none"
        variants={{
          rest: { scale: active ? 1 : 0.1, opacity: active ? 0.9 : 0 },
          hover: {
            scale: [0.1, 1.18, 1],
            opacity: [0, 1, 1],
            transition: { duration: 0.45, delay: 0.12, ease: "easeOut" },
          },
        }}
        style={selfOrigin}
      />
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
