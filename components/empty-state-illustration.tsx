"use client";

import { useId } from "react";
import { motion } from "motion/react";

/**
 * Premium organic-blob illustrations for empty states. Each blob is a
 * single inline SVG built from layered filters:
 *
 *   1. A wide, soft pastel cloud halo behind everything — the ambient
 *      glow that bleeds the blob's colour into the canvas.
 *   2. A large blurred copy of the blob underneath the crisp one — the
 *      bloom that makes the blob look like it's emitting light.
 *   3. The crisp blob filled with a radial gradient that places the
 *      brightest part top-left and grades into the deep saturated base.
 *   4. A high-contrast threshold-noise overlay clipped to the blob —
 *      sparse pure-white speckles that read as glittery grain.
 *   5. Two pure-white pill eyes with a strong Gaussian bloom.
 *   6. Tiny sparkle accents (+ and dot) around the blob in the tone
 *      colour.
 *   7. Optional frosted-glass glyph badge floating off the bottom-right.
 */

export type IllustrationTone = "green" | "pink" | "blue" | "purple" | "amber";

interface ToneSpec {
  /** Inner bright highlight (near-white tinted with the hue). */
  light: string;
  /** Saturated midtone — the visual identity of the blob. */
  mid: string;
  /** Deep saturated base — the bottom-right shadow side. */
  deep: string;
  /** Tone for the ambient cloud halo (very pastel). */
  halo: string;
  /** Tone for sparkle accents. */
  spark: string;
  /** Tone for the bloom glow underneath the blob. */
  glow: string;
}

const TONES: Record<IllustrationTone, ToneSpec> = {
  green: {
    light: "oklch(0.96 0.12 152)",
    mid: "oklch(0.78 0.28 148)",
    deep: "oklch(0.62 0.26 145)",
    halo: "oklch(0.92 0.14 152 / 0.55)",
    spark: "oklch(0.72 0.26 148)",
    glow: "oklch(0.78 0.28 148 / 0.55)",
  },
  pink: {
    light: "oklch(0.94 0.10 350)",
    mid: "oklch(0.70 0.30 350)",
    deep: "oklch(0.55 0.26 350)",
    halo: "oklch(0.90 0.14 350 / 0.55)",
    spark: "oklch(0.68 0.30 350)",
    glow: "oklch(0.70 0.30 350 / 0.55)",
  },
  blue: {
    light: "oklch(0.93 0.10 250)",
    mid: "oklch(0.65 0.24 260)",
    deep: "oklch(0.50 0.24 264)",
    halo: "oklch(0.88 0.12 252 / 0.55)",
    spark: "oklch(0.62 0.24 258)",
    glow: "oklch(0.65 0.24 260 / 0.55)",
  },
  purple: {
    light: "oklch(0.93 0.10 295)",
    mid: "oklch(0.66 0.26 295)",
    deep: "oklch(0.50 0.26 295)",
    halo: "oklch(0.90 0.14 295 / 0.55)",
    spark: "oklch(0.64 0.26 295)",
    glow: "oklch(0.66 0.26 295 / 0.55)",
  },
  amber: {
    light: "oklch(0.96 0.10 78)",
    mid: "oklch(0.80 0.20 72)",
    deep: "oklch(0.62 0.20 60)",
    halo: "oklch(0.92 0.12 75 / 0.55)",
    spark: "oklch(0.78 0.20 72)",
    glow: "oklch(0.80 0.20 72 / 0.55)",
  },
};

// One organic blob path. Hand-tuned so it's clearly asymmetric — the
// top-left bulges out, the right side has a small inward pinch, and
// the bottom is the widest. Reads as "soft creature", not "oval".
const BLOB_PATH = `
  M 52 88
  C 38 60, 64 30, 100 32
  C 132 34, 162 50, 162 92
  C 162 124, 144 156, 110 162
  C 70 168, 38 144, 40 110
  C 41 100, 47 94, 52 88
  Z
`;

interface Props {
  tone?: IllustrationTone;
  glyph?: React.ReactNode;
  size?: number;
  className?: string;
}

export function EmptyStateIllustration({
  tone = "blue",
  glyph,
  size = 200,
  className,
}: Props) {
  const t = TONES[tone];
  // Unique id so multiple illustrations don't collide on def ids.
  const id = useId().replace(/:/g, "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
          {/* Volumetric radial gradient — bright top-left highlight
              graded into the deep saturated base. cx/cy at 38%/30%
              places the light source so the blob reads as 3D. */}
          <radialGradient
            id={`blob-${id}`}
            cx="38%"
            cy="30%"
            r="80%"
          >
            <stop offset="0%" stopColor={t.light} />
            <stop offset="35%" stopColor={t.mid} />
            <stop offset="100%" stopColor={t.deep} />
          </radialGradient>

          {/* Ambient cloud halo behind everything. Pastel tone in the
              middle, fading to fully transparent. This is the soft
              colored mist that extends past the blob's edge and
              bleeds into the page background. */}
          <radialGradient
            id={`halo-${id}`}
            cx="50%"
            cy="50%"
            r="55%"
          >
            <stop offset="0%" stopColor={t.halo} />
            <stop offset="55%" stopColor={t.halo} stopOpacity="0.3" />
            <stop offset="100%" stopColor={t.halo} stopOpacity="0" />
          </radialGradient>

          {/* Bloom blur for the under-blob glow. Strong stdDeviation so
              the blurred copy reads as a halo of light rather than a
              second blob. */}
          <filter
            id={`bloom-${id}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="12" />
          </filter>

          {/* White sparkle speckles, threshold-noise. fractalNoise at
              high frequency → feColorMatrix that wipes RGB to pure
              white and threshold-clips the alpha so only the brightest
              ~30% of noise pixels survive. Composited inside the blob
              shape so speckles never escape the silhouette. */}
          <filter
            id={`sparkle-${id}`}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="2.6"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 2.4 -1.4"
              result="speckles"
            />
            <feComposite
              in="speckles"
              in2="SourceGraphic"
              operator="in"
              result="masked"
            />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="masked" />
            </feMerge>
          </filter>

          {/* Eye glow — strong bloom around each pill, multi-pass
              merge so the highlight stacks brighter than a single
              blur. */}
          <filter
            id={`eye-${id}`}
            x="-200%"
            y="-200%"
            width="500%"
            height="500%"
          >
            <feGaussianBlur stdDeviation="4" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b2" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="b1" />
              <feMergeNode in="b2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Layer 1 — ambient cloud halo. Soft pastel bleed into the
            page background. Slightly larger than the blob so its mist
            extends past the silhouette. */}
        <rect
          x="0"
          y="0"
          width="200"
          height="200"
          fill={`url(#halo-${id})`}
        />

        {/* Layer 2 — bloom underneath. The blob path duplicated, scaled
            slightly larger, blurred. Reads as the colored light the
            blob is emitting downward. */}
        <g
          filter={`url(#bloom-${id})`}
          transform="translate(100 100) scale(1.08) translate(-100 -100)"
        >
          <path d={BLOB_PATH} fill={t.glow} />
        </g>

        {/* Layer 3 + 4 — the crisp blob with white sparkle speckles
            applied via filter. The sparkle filter outputs the original
            graphic merged with the white-speckle mask. */}
        <g filter={`url(#sparkle-${id})`}>
          <path d={BLOB_PATH} fill={`url(#blob-${id})`} />
        </g>

        {/* Layer 5 — eyes. Two vertical pills, tilted slightly inward
            toward each other for a friendly "looking forward" feel.
            White fill, strong bloom filter so they glow like the
            reference. */}
        <g filter={`url(#eye-${id})`}>
          <rect
            x="84"
            y="80"
            width="6"
            height="22"
            rx="3"
            fill="white"
            transform="rotate(-5 87 91)"
          />
          <rect
            x="116"
            y="80"
            width="6"
            height="22"
            rx="3"
            fill="white"
            transform="rotate(5 119 91)"
          />
        </g>

        {/* Layer 6 — sparkle accents in the tone colour around the
            blob. Mix of dots and tiny + crosses. */}
        <g fill={t.spark}>
          <circle cx="28" cy="56" r="1.8" />
          <circle cx="178" cy="68" r="1.5" />
          <circle cx="186" cy="120" r="2" />
          <circle cx="18" cy="124" r="1.4" />
          <circle cx="100" cy="14" r="1.5" />
          <SparklePlus cx={36} cy={28} size={6} color={t.spark} />
          <SparklePlus cx={172} cy={42} size={7} color={t.spark} />
          <SparklePlus cx={166} cy={158} size={5} color={t.spark} />
          <SparklePlus cx={26} cy={170} size={6} color={t.spark} />
        </g>
      </svg>

      {/* Glyph badge — frosted glass tile floating off the lower-right
          edge of the blob. Holds a small page-specific icon (check,
          plus, bell, calendar, etc.). HTML overlay so the icon can be
          a regular React node from @phosphor-icons/react. */}
      {glyph && (
        <div
          aria-hidden
          className="absolute grid size-[48px] place-items-center rounded-[14px] bg-white/65 text-foreground/70 shadow-[0_6px_16px_-3px_oklch(0_0_0/0.08),inset_0_1px_0_0_oklch(1_0_0/0.85)] ring-1 ring-inset ring-white/70 backdrop-blur-md dark:bg-white/12 dark:text-foreground/85 dark:ring-white/15"
          style={{
            right: `${size * 0.05}px`,
            bottom: `${size * 0.18}px`,
          }}
        >
          {glyph}
        </div>
      )}
    </motion.div>
  );
}

/** Cross sparkle — two short crossed lines drawn at the given center. */
function SparklePlus({
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
  const h = size / 2;
  return (
    <g stroke={color} strokeWidth={1.4} strokeLinecap="round">
      <line x1={cx - h} y1={cy} x2={cx + h} y2={cy} />
      <line x1={cx} y1={cy - h} x2={cx} y2={cy + h} />
    </g>
  );
}
