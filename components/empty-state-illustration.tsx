"use client";

import { useId } from "react";
import { motion } from "motion/react";

/**
 * Calm "achievement badge" illustration for empty states. Reaching an
 * empty state in Loop means you cleared the work, so it reads as a quiet
 * reward rather than a blank slate:
 *
 *   1. A soft accent halo bleeding into the page.
 *   2. A squircle reward badge (matches the app's squircle language)
 *      filled with a beveled accent gradient, a glassy top gloss, and a
 *      hairline rim so it reads like a minted medal.
 *   3. The page glyph centered in white.
 *
 * Everything is accent-driven (--accent-h), so the reward matches the
 * user's brand colour. Motion is a single one-time entrance only (the
 * badge and glyph settle in, then rest) — no looping rays, shine,
 * confetti, or float. Degrades to near-instant under the app-wide
 * prefers-reduced-motion config.
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
    glow: "oklch(0.66 0.24 var(--accent-h, 252) / 0.5)",
  },
  green: {
    light: "oklch(0.96 0.12 152)",
    mid: "oklch(0.78 0.24 148)",
    deep: "oklch(0.62 0.24 145)",
    halo: "oklch(0.92 0.14 152 / 0.55)",
    glow: "oklch(0.78 0.24 148 / 0.5)",
  },
  pink: {
    light: "oklch(0.94 0.10 350)",
    mid: "oklch(0.70 0.28 350)",
    deep: "oklch(0.55 0.26 350)",
    halo: "oklch(0.90 0.14 350 / 0.55)",
    glow: "oklch(0.70 0.28 350 / 0.5)",
  },
  blue: {
    light: "oklch(0.93 0.10 250)",
    mid: "oklch(0.65 0.22 260)",
    deep: "oklch(0.50 0.22 264)",
    halo: "oklch(0.88 0.12 252 / 0.55)",
    glow: "oklch(0.65 0.22 260 / 0.5)",
  },
  purple: {
    light: "oklch(0.93 0.10 295)",
    mid: "oklch(0.66 0.24 295)",
    deep: "oklch(0.50 0.24 295)",
    halo: "oklch(0.90 0.14 295 / 0.55)",
    glow: "oklch(0.66 0.24 295 / 0.5)",
  },
  amber: {
    light: "oklch(0.96 0.10 78)",
    mid: "oklch(0.80 0.18 72)",
    deep: "oklch(0.62 0.18 60)",
    halo: "oklch(0.92 0.12 75 / 0.55)",
    glow: "oklch(0.80 0.18 72 / 0.5)",
  },
};

// Squircle (superellipse) badge path, centred in the 200 viewBox and
// spanning ~96px. Same squircle language as the checkboxes: rounder than
// a rect, flatter than a circle.
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
  const glyphPx = Math.round(size * 0.27);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={`relative inline-block ${className ?? ""}`}
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

          {/* Top gloss — white fading down, a glassy minted highlight. */}
          <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.45" />
            <stop offset="45%" stopColor="white" stopOpacity="0.08" />
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

          {/* Clip used to keep the gloss inside the badge. */}
          <clipPath id={`clip-${id}`}>
            <path d={BADGE_PATH} />
          </clipPath>
        </defs>

        {/* Ambient halo. */}
        <rect x="0" y="0" width="200" height="200" fill={`url(#halo-${id})`} />

        {/* Bloom underneath the badge. */}
        <g
          filter={`url(#bloom-${id})`}
          transform="translate(100 100) scale(1.04) translate(-100 -100)"
        >
          <path d={BADGE_PATH} fill={t.glow} />
        </g>

        {/* The badge body, settling in once on mount. */}
        <motion.g
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.05 }}
          style={{ originX: "100px", originY: "100px" }}
        >
          <path d={BADGE_PATH} fill={`url(#badge-${id})`} />
          <g clipPath={`url(#clip-${id})`}>
            <path d={BADGE_PATH} fill={`url(#gloss-${id})`} />
          </g>
          <path
            d={BADGE_PATH}
            fill="none"
            stroke="white"
            strokeOpacity={0.28}
            strokeWidth={1.5}
          />
        </motion.g>
      </svg>

      {/* Center glyph — the conquered surface's icon, in white, scaled to
          the badge. HTML overlay so it can be a node from the app's icon
          set; size-full overrides the icon's intrinsic dimensions so
          every call site lands at the same medallion scale. */}
      {glyph && (
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center text-white drop-shadow-[0_1px_2px_oklch(0_0_0/0.25)]"
        >
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.16 }}
            className="grid place-items-center [&>svg]:size-full"
            style={{ width: glyphPx, height: glyphPx }}
          >
            {glyph}
          </motion.span>
        </div>
      )}
    </motion.div>
  );
}
