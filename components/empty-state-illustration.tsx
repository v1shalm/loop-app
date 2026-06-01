"use client";

import { useId } from "react";
import { motion } from "motion/react";

/**
 * Gamified "achievement badge" illustration for empty states. Reaching
 * an empty state in Loop means you cleared the work, so the illustration
 * reads as a reward you earned rather than a sad blank slate:
 *
 *   1. A soft accent halo bleeding into the page.
 *   2. A slowly rotating starburst of thin rays behind the badge —
 *      the "achievement unlocked" radiance.
 *   3. A squircle reward badge (matches the app's squircle language)
 *      filled with a beveled accent gradient: bright top-left highlight
 *      grading into the deep saturated base, a glassy rim, and a top
 *      gloss so it reads like a minted medal.
 *   4. A diagonal shine that sweeps across the badge on a loop.
 *   5. The page glyph centered in white — the thing you conquered
 *      (inbox, calendar, bell, ...).
 *   6. A one-shot confetti pop on mount, plus a couple of restrained
 *      twinkles.
 *
 * Everything is accent-driven (--accent-h) so the reward matches the
 * user's brand colour. All motion is transform/opacity only and degrades
 * to near-instant under the app-wide prefers-reduced-motion config.
 */

export type IllustrationTone =
  | "accent"
  | "green"
  | "pink"
  | "blue"
  | "purple"
  | "amber";

interface ToneSpec {
  /** Inner bright highlight (near-white tinted with the hue). */
  light: string;
  /** Saturated midtone — the visual identity of the badge. */
  mid: string;
  /** Deep saturated base — the bottom-right shadow side. */
  deep: string;
  /** Tone for the ambient halo (very pastel). */
  halo: string;
  /** Tone for rays + sparkle accents. */
  spark: string;
  /** Tone for the bloom glow underneath the badge. */
  glow: string;
}

const TONES: Record<IllustrationTone, ToneSpec> = {
  // Follows the user's chosen accent so the reward matches the brand.
  accent: {
    light: "oklch(0.93 0.10 var(--accent-h, 252))",
    mid: "oklch(0.66 0.24 var(--accent-h, 252))",
    deep: "oklch(0.51 0.24 var(--accent-h, 252))",
    halo: "oklch(0.88 0.12 var(--accent-h, 252) / 0.55)",
    spark: "oklch(0.63 0.24 var(--accent-h, 252))",
    glow: "oklch(0.66 0.24 var(--accent-h, 252) / 0.5)",
  },
  green: {
    light: "oklch(0.96 0.12 152)",
    mid: "oklch(0.78 0.24 148)",
    deep: "oklch(0.62 0.24 145)",
    halo: "oklch(0.92 0.14 152 / 0.55)",
    spark: "oklch(0.72 0.24 148)",
    glow: "oklch(0.78 0.24 148 / 0.5)",
  },
  pink: {
    light: "oklch(0.94 0.10 350)",
    mid: "oklch(0.70 0.28 350)",
    deep: "oklch(0.55 0.26 350)",
    halo: "oklch(0.90 0.14 350 / 0.55)",
    spark: "oklch(0.68 0.28 350)",
    glow: "oklch(0.70 0.28 350 / 0.5)",
  },
  blue: {
    light: "oklch(0.93 0.10 250)",
    mid: "oklch(0.65 0.22 260)",
    deep: "oklch(0.50 0.22 264)",
    halo: "oklch(0.88 0.12 252 / 0.55)",
    spark: "oklch(0.62 0.22 258)",
    glow: "oklch(0.65 0.22 260 / 0.5)",
  },
  purple: {
    light: "oklch(0.93 0.10 295)",
    mid: "oklch(0.66 0.24 295)",
    deep: "oklch(0.50 0.24 295)",
    halo: "oklch(0.90 0.14 295 / 0.55)",
    spark: "oklch(0.64 0.24 295)",
    glow: "oklch(0.66 0.24 295 / 0.5)",
  },
  amber: {
    light: "oklch(0.96 0.10 78)",
    mid: "oklch(0.80 0.18 72)",
    deep: "oklch(0.62 0.18 60)",
    halo: "oklch(0.92 0.12 75 / 0.55)",
    spark: "oklch(0.78 0.18 72)",
    glow: "oklch(0.80 0.18 72 / 0.5)",
  },
};

// Squircle (superellipse) badge path, centred in the 200 viewBox and
// spanning ~96px. Hand-fitted so the corners read rounder-than-rect but
// flatter-than-circle — the same squircle language as the checkboxes.
const BADGE_PATH = `
  M 100 50
  C 124 50, 138 51, 144.5 57.5
  C 151 64, 152 78, 152 100
  C 152 122, 151 136, 144.5 142.5
  C 138 149, 124 150, 100 150
  C 76 150, 62 149, 55.5 142.5
  C 49 136, 48 122, 48 100
  C 48 78, 49 64, 55.5 57.5
  C 62 51, 76 50, 100 50
  Z
`;

// Number of starburst rays behind the badge.
const RAY_COUNT = 12;

// Confetti bits: offset from centre, colour role, shape, rotation. Hand
// placed so they fan upward and out from the badge like a small burst.
const CONFETTI: {
  dx: number;
  dy: number;
  role: "spark" | "gold" | "white";
  shape: "rect" | "circle";
  rot: number;
  delay: number;
}[] = [
  { dx: -64, dy: -52, role: "spark", shape: "rect", rot: -24, delay: 0 },
  { dx: -34, dy: -74, role: "gold", shape: "circle", rot: 0, delay: 0.04 },
  { dx: 2, dy: -82, role: "white", shape: "rect", rot: 16, delay: 0.08 },
  { dx: 40, dy: -72, role: "spark", shape: "circle", rot: 0, delay: 0.06 },
  { dx: 68, dy: -48, role: "gold", shape: "rect", rot: 28, delay: 0.02 },
  { dx: -76, dy: -10, role: "white", shape: "circle", rot: 0, delay: 0.1 },
  { dx: 80, dy: -6, role: "spark", shape: "rect", rot: -12, delay: 0.12 },
];

interface Props {
  tone?: IllustrationTone;
  glyph?: React.ReactNode;
  size?: number;
  className?: string;
}

export function EmptyStateIllustration({
  tone = "accent",
  glyph,
  size = 200,
  className,
}: Props) {
  const t = TONES[tone];
  // Unique id so multiple illustrations don't collide on def ids.
  const id = useId().replace(/:/g, "");
  const goldSpark = "oklch(0.85 0.15 85)";
  const glyphPx = Math.round(size * 0.27);

  const confettiColor = (role: "spark" | "gold" | "white") =>
    role === "spark" ? t.spark : role === "gold" ? goldSpark : "white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={`relative inline-block ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {/* Gentle idle float for the whole reward so it feels alive but
          calm. Separate wrapper from the entrance fade above. */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            {/* Beveled badge gradient — bright top-left highlight graded
                into the deep saturated base for a minted-medal read. */}
            <radialGradient id={`badge-${id}`} cx="36%" cy="28%" r="82%">
              <stop offset="0%" stopColor={t.light} />
              <stop offset="42%" stopColor={t.mid} />
              <stop offset="100%" stopColor={t.deep} />
            </radialGradient>

            {/* Ambient halo bleeding into the page background. */}
            <radialGradient id={`halo-${id}`} cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor={t.halo} />
              <stop offset="55%" stopColor={t.halo} stopOpacity="0.28" />
              <stop offset="100%" stopColor={t.halo} stopOpacity="0" />
            </radialGradient>

            {/* Top gloss — white fading down, gives the badge a glassy
                minted highlight across its upper third. */}
            <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="45%" stopColor="white" stopOpacity="0.08" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Sweeping shine gradient — narrow white band, transparent
                at both edges. */}
            <linearGradient id={`shine-${id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.5" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Bloom for the under-badge glow. */}
            <filter
              id={`bloom-${id}`}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="11" />
            </filter>

            {/* Clip used to keep the gloss + shine inside the badge. */}
            <clipPath id={`clip-${id}`}>
              <path d={BADGE_PATH} />
            </clipPath>
          </defs>

          {/* Layer 1 — ambient halo. */}
          <rect x="0" y="0" width="200" height="200" fill={`url(#halo-${id})`} />

          {/* Layer 2 — rotating starburst rays behind the badge. */}
          <motion.g
            style={{ originX: "100px", originY: "100px" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
          >
            <g transform="translate(100 100)">
              {Array.from({ length: RAY_COUNT }).map((_, i) => (
                <path
                  key={i}
                  d="M -3.2 -74 L 3.2 -74 L 0 -97 Z"
                  fill={t.spark}
                  opacity={i % 2 === 0 ? 0.5 : 0.28}
                  transform={`rotate(${(360 / RAY_COUNT) * i})`}
                />
              ))}
            </g>
          </motion.g>

          {/* Layer 3 — bloom underneath the badge. */}
          <g
            filter={`url(#bloom-${id})`}
            transform="translate(100 100) scale(1.04) translate(-100 -100)"
          >
            <path d={BADGE_PATH} fill={t.glow} />
          </g>

          {/* Layer 4 — the badge body, springing in on mount. */}
          <motion.g
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 17, delay: 0.05 }}
            style={{ originX: "100px", originY: "100px" }}
          >
            <path d={BADGE_PATH} fill={`url(#badge-${id})`} />

            {/* Gloss + shine, clipped to the badge. */}
            <g clipPath={`url(#clip-${id})`}>
              <path d={BADGE_PATH} fill={`url(#gloss-${id})`} />
              <g transform="skewX(-14)">
                <motion.rect
                  y={30}
                  width={22}
                  height={150}
                  fill={`url(#shine-${id})`}
                  initial={{ x: -40 }}
                  animate={{ x: [-40, 250] }}
                  transition={{
                    duration: 1.15,
                    repeat: Infinity,
                    repeatDelay: 3.6,
                    ease: "easeIn",
                  }}
                />
              </g>
            </g>

            {/* Glassy rim — inset stroke catches the light. */}
            <path
              d={BADGE_PATH}
              fill="none"
              stroke="white"
              strokeOpacity={0.28}
              strokeWidth={1.5}
            />
          </motion.g>

          {/* Layer 5 — confetti pop. One-shot: bits fly out from centre
              and hold. No repeat — the celebration happens once on
              arrival. */}
          {CONFETTI.map((c, i) =>
            c.shape === "circle" ? (
              <motion.circle
                key={i}
                cx={100}
                cy={100}
                r={2.4}
                fill={confettiColor(c.role)}
                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, x: c.dx, y: c.dy, opacity: 1 }}
                transition={{
                  duration: 0.55,
                  delay: 0.22 + c.delay,
                  ease: [0.18, 0.9, 0.32, 1.2],
                }}
              />
            ) : (
              <motion.rect
                key={i}
                x={97}
                y={97.5}
                width={6}
                height={5}
                rx={1.2}
                fill={confettiColor(c.role)}
                initial={{ scale: 0, x: 0, y: 0, opacity: 0, rotate: 0 }}
                animate={{ scale: 1, x: c.dx, y: c.dy, opacity: 1, rotate: c.rot }}
                transition={{
                  duration: 0.55,
                  delay: 0.22 + c.delay,
                  ease: [0.18, 0.9, 0.32, 1.2],
                }}
                style={{ originX: "100px", originY: "100px" }}
              />
            )
          )}

          {/* Layer 6 — two restrained twinkles that breathe. */}
          {[
            { cx: 150, cy: 60, s: 7, d: 0 },
            { cx: 44, cy: 132, s: 5, d: 1.3 },
          ].map((tw, i) => (
            <motion.g
              key={i}
              animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.85, 1, 0.85] }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: tw.d,
              }}
              style={{ originX: `${tw.cx}px`, originY: `${tw.cy}px` }}
            >
              <Twinkle cx={tw.cx} cy={tw.cy} size={tw.s} color={t.spark} />
            </motion.g>
          ))}
        </svg>

        {/* Center glyph — the conquered surface's icon, in white, scaled
            to the badge. HTML overlay so it can be a node from the app's
            icon set; size-full overrides the icon's intrinsic dimensions
            so every call site lands at the same medallion scale. */}
        {glyph && (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center text-white drop-shadow-[0_1px_2px_oklch(0_0_0/0.25)]"
          >
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.18 }}
              className="grid place-items-center [&>svg]:size-full"
              style={{ width: glyphPx, height: glyphPx }}
            >
              {glyph}
            </motion.span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Four-point sparkle (star) drawn at the given centre. */
function Twinkle({
  cx,
  cy,
  size,
  color,
}: {
  cx: number;
  cy: number;
  size: number;
  color: string;
}) {
  const h = size;
  const w = size * 0.32;
  return (
    <path
      d={`M ${cx} ${cy - h}
          C ${cx + w * 0.2} ${cy - w}, ${cx + w} ${cy - w * 0.2}, ${cx + h} ${cy}
          C ${cx + w} ${cy + w * 0.2}, ${cx + w * 0.2} ${cy + w}, ${cx} ${cy + h}
          C ${cx - w * 0.2} ${cy + w}, ${cx - w} ${cy + w * 0.2}, ${cx - h} ${cy}
          C ${cx - w} ${cy - w * 0.2}, ${cx - w * 0.2} ${cy - w}, ${cx} ${cy - h}
          Z`}
      fill={color}
    />
  );
}
