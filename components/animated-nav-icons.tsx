"use client";

import { motion, type Variants } from "motion/react";

/**
 * Bespoke animated nav icons for the sidebar. Each icon's *internals*
 * move on hover (rays pulse, a letter drops, a page lifts, a check
 * draws on) rather than the whole glyph rigidly tilting.
 *
 * Motion is driven by variant propagation: the NavRow sets
 * `whileHover="hover"` on its root, and these sub-elements resolve the
 * "rest" / "hover" label from that parent. No per-icon hover wiring.
 *
 * `<MotionConfig reducedMotion="user">` in AppShell makes all of this
 * degrade to instant for users who ask for reduced motion, so there's
 * no per-icon guard here.
 */

type IconProps = {
  size?: number;
  /** Filled treatment for the active row (currently just a thicker
   *  stroke + filled accents — keeps the line language consistent). */
  active?: boolean;
};

const STROKE = 2;

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

// ── My Day: sun. Core breathes, rays retract-and-extend with a stagger,
//    whole disc gives a tiny rotational nudge. ─────────────────────────
export function MyDayIcon({ size = 18, active }: IconProps) {
  const rays = [
    [12, 2, 12, 4],
    [19.07, 4.93, 17.66, 6.34],
    [22, 12, 20, 12],
    [19.07, 19.07, 17.66, 17.66],
    [12, 22, 12, 20],
    [4.93, 19.07, 6.34, 17.66],
    [2, 12, 4, 12],
    [4.93, 4.93, 6.34, 6.34],
  ] as const;

  const rayVariants: Variants = {
    rest: { scale: 1, opacity: 1 },
    hover: (i: number) => ({
      scale: [1, 0.55, 1.15, 1],
      opacity: [1, 0.65, 1, 1],
      transition: { duration: 0.5, delay: i * 0.025, ease: "easeOut" },
    }),
  };

  return (
    <motion.svg {...svgProps(size)} aria-hidden>
      <motion.g
        variants={{ hover: { rotate: [0, 14, 0] } }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ transformOrigin: "12px 12px" }}
      >
        {rays.map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            custom={i}
            variants={rayVariants}
            style={{ transformOrigin: "12px 12px" }}
          />
        ))}
      </motion.g>
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.16 : 0}
        variants={{ hover: { scale: [1, 1.22, 1] } }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{ transformOrigin: "12px 12px" }}
      />
    </motion.svg>
  );
}

// ── Inbox: tray with a letter that drops in on hover. ─────────────────
export function InboxIcon({ size = 18, active }: IconProps) {
  return (
    <motion.svg {...svgProps(size)} aria-hidden>
      {/* Falling letter: a small rounded slip that drops into the tray
          mouth and fades in. Clipped by the tray opening below it. */}
      <motion.g
        variants={{
          rest: { y: 0, opacity: 1 },
          hover: {
            y: [-5, 0],
            opacity: [0, 1],
            transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
          },
        }}
      >
        <rect x="8" y="3.5" width="8" height="6" rx="1.2" />
        <path d="M9.5 6 L12 7.6 L14.5 6" />
      </motion.g>
      {/* Tray body — static. Outer walls + the inbox lip. */}
      <path d="M4 13 h4 l1.4 2.2 h3.2 L15 13 h5" />
      <path d="M5.2 13 V18.5 a1 1 0 0 0 1 1 h11.6 a1 1 0 0 0 1 -1 V13" />
      {active && (
        <path
          d="M5.2 14 V18.5 a1 1 0 0 0 1 1 h11.6 a1 1 0 0 0 1 -1 V14 h-4 L13.6 16.2 H10.4 L9 14 Z"
          fill="currentColor"
          fillOpacity={0.16}
          stroke="none"
        />
      )}
    </motion.svg>
  );
}

// ── Upcoming: calendar. Binding tabs bob, a day cell pops in. ─────────
export function UpcomingIcon({ size = 18, active }: IconProps) {
  return (
    <motion.svg {...svgProps(size)} aria-hidden>
      {/* Binding tabs — give a quick bob on hover. */}
      <motion.line
        x1="8"
        y1="2.5"
        x2="8"
        y2="5.5"
        variants={{ hover: { y: [0, -1.6, 0] } }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <motion.line
        x1="16"
        y1="2.5"
        x2="16"
        y2="5.5"
        variants={{ hover: { y: [0, -1.6, 0] } }}
        transition={{ duration: 0.4, delay: 0.06, ease: "easeOut" }}
      />
      {/* Calendar body + header rule. */}
      <rect x="3.5" y="4" width="17" height="16.5" rx="2.5" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      {/* Day cell that pops in on hover. */}
      <motion.rect
        x="7"
        y="12"
        width="4"
        height="4"
        rx="1"
        fill="currentColor"
        stroke="none"
        fillOpacity={active ? 0.9 : 0.0}
        variants={{
          rest: { scale: active ? 1 : 0.2, opacity: active ? 1 : 0 },
          hover: {
            scale: [0.2, 1.2, 1],
            opacity: [0, 1, 1],
            transition: { duration: 0.4, ease: "easeOut" },
          },
        }}
        style={{ transformOrigin: "9px 14px" }}
      />
    </motion.svg>
  );
}

// ── Completed: check in a circle. Check draws itself on hover. ────────
export function CompletedIcon({ size = 18, active }: IconProps) {
  return (
    <motion.svg {...svgProps(size)} aria-hidden>
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.16 : 0}
        variants={{ hover: { scale: [1, 0.92, 1] } }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ transformOrigin: "12px 12px" }}
      />
      <motion.path
        d="M8 12.2 L11 15 L16 9.2"
        variants={{
          rest: { pathLength: 1, opacity: 1 },
          hover: {
            pathLength: [0, 1],
            opacity: [0.4, 1],
            transition: { duration: 0.42, ease: "easeOut" },
          },
        }}
      />
    </motion.svg>
  );
}

export type AnimatedNavIcon = typeof MyDayIcon;
