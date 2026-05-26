"use client";

import { useId } from "react";
import { motion } from "motion/react";

/**
 * Premium-feel illustrations for empty states. Each is an organic blob
 * with a soft gradient interior, a grain texture, glowing eyes, a few
 * sparkle accents, and an optional small "glyph badge" floating next to
 * the blob.
 *
 * Built as inline SVG so the whole illustration is one render-able
 * unit, scales crisply at any size, and the per-page colour tone is
 * driven by a single hue value (no asset swapping per page).
 */

export type IllustrationTone = "green" | "pink" | "blue" | "purple" | "amber";

interface ToneSpec {
  /** Three-stop gradient: top highlight → midtone → deep base. */
  top: string;
  mid: string;
  deep: string;
  /** Tiny accent dots and sparkle glyphs around the blob. */
  spark: string;
  /** Outer drop-shadow glow colour. */
  glow: string;
}

const TONES: Record<IllustrationTone, ToneSpec> = {
  green: {
    top: "oklch(0.92 0.14 158)",
    mid: "oklch(0.72 0.22 158)",
    deep: "oklch(0.55 0.20 158)",
    spark: "oklch(0.72 0.22 158)",
    glow: "oklch(0.72 0.22 158 / 0.35)",
  },
  pink: {
    top: "oklch(0.92 0.12 348)",
    mid: "oklch(0.70 0.24 348)",
    deep: "oklch(0.55 0.22 348)",
    spark: "oklch(0.70 0.24 348)",
    glow: "oklch(0.70 0.24 348 / 0.35)",
  },
  blue: {
    top: "oklch(0.92 0.12 248)",
    mid: "oklch(0.66 0.20 252)",
    deep: "oklch(0.50 0.22 256)",
    spark: "oklch(0.66 0.20 252)",
    glow: "oklch(0.66 0.20 252 / 0.35)",
  },
  purple: {
    top: "oklch(0.92 0.10 295)",
    mid: "oklch(0.68 0.22 295)",
    deep: "oklch(0.50 0.22 295)",
    spark: "oklch(0.68 0.22 295)",
    glow: "oklch(0.68 0.22 295 / 0.35)",
  },
  amber: {
    top: "oklch(0.94 0.10 75)",
    mid: "oklch(0.78 0.18 70)",
    deep: "oklch(0.60 0.18 60)",
    spark: "oklch(0.78 0.18 70)",
    glow: "oklch(0.78 0.18 70 / 0.35)",
  },
};

interface Props {
  tone?: IllustrationTone;
  /** A small floating badge to the lower-right of the blob — typically
   *  a tiny page-specific glyph like a check, plus, bell, calendar. */
  glyph?: React.ReactNode;
  /** Pixel size of the illustration box (square). Defaults to 180. */
  size?: number;
  className?: string;
}

/**
 * Sized container. We size both the SVG and any HTML-positioned glyph
 * badge to the same square so the badge can use absolute percentages
 * relative to the SVG without measuring.
 */
export function EmptyStateIllustration({
  tone = "blue",
  glyph,
  size = 180,
  className,
}: Props) {
  const t = TONES[tone];
  // Unique id suffix so multiple illustrations on the same page don't
  // collide on their gradient + filter ids.
  const id = useId().replace(/:/g, "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
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
          {/* Three-stop gradient: top is pearlescent, mid is the brand
              hue, bottom is the deep grounded base. Diagonal so the
              "light" reads as coming from the top-left. */}
          <linearGradient
            id={`g-${id}`}
            x1="30%"
            y1="10%"
            x2="70%"
            y2="100%"
          >
            <stop offset="0%" stopColor={t.top} />
            <stop offset="55%" stopColor={t.mid} />
            <stop offset="100%" stopColor={t.deep} />
          </linearGradient>

          {/* Inner specular highlight — small bright spot at the top. */}
          <radialGradient
            id={`s-${id}`}
            cx="40%"
            cy="28%"
            r="40%"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="60%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Grain texture — gives the blob its sparkly speckle look.
              fractalNoise at high frequency, screened over the blob so
              it brightens random pixels without washing out the colour. */}
          <filter id={`grain-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.8"
              numOctaves="2"
              seed="3"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0.5 0"
              result="grain"
            />
            <feComposite in="grain" in2="SourceGraphic" operator="in" result="masked" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="masked" />
            </feMerge>
          </filter>

          {/* Eye glow — small Gaussian bloom around each pill. */}
          <filter id={`eye-${id}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Outer soft glow under the blob so it lifts off the page. */}
          <filter id={`shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Soft colored halo under the blob. Renders first so the blob
            sits on top of its own glow. */}
        <ellipse
          cx="100"
          cy="115"
          rx="72"
          ry="58"
          fill={t.glow}
          filter={`url(#shadow-${id})`}
          opacity="0.85"
        />

        {/* The blob itself. Path is hand-tuned organic — slightly
            asymmetric so it doesn't read as a perfect oval. */}
        <g filter={`url(#grain-${id})`}>
          <path
            d="
              M 50 95
              C 38 70, 58 38, 92 36
              C 124 34, 158 52, 158 92
              C 158 128, 138 156, 102 158
              C 64 160, 40 138, 42 110
              C 43 102, 46 99, 50 95
              Z
            "
            fill={`url(#g-${id})`}
          />
          {/* Specular highlight overlay — sits inside the blob and
              reads as the bright top-left of a glossy surface. */}
          <path
            d="
              M 50 95
              C 38 70, 58 38, 92 36
              C 124 34, 158 52, 158 92
              C 158 128, 138 156, 102 158
              C 64 160, 40 138, 42 110
              C 43 102, 46 99, 50 95
              Z
            "
            fill={`url(#s-${id})`}
          />
        </g>

        {/* Eyes — two thin glowing vertical pills, slightly off-center
            and tilted in toward each other for a friendly "looking up"
            expression. */}
        <g filter={`url(#eye-${id})`}>
          <rect
            x="82"
            y="78"
            width="5"
            height="18"
            rx="2.5"
            fill="white"
            transform="rotate(-4 84.5 87)"
          />
          <rect
            x="113"
            y="78"
            width="5"
            height="18"
            rx="2.5"
            fill="white"
            transform="rotate(4 115.5 87)"
          />
        </g>

        {/* Sparkle accents — tiny plus-marks and dots scattered around
            the blob. Same colour as the brand spark token so they
            feel part of the illustration, not stuck on. */}
        <g fill={t.spark}>
          <circle cx="30" cy="58" r="1.6" />
          <circle cx="172" cy="68" r="1.4" />
          <circle cx="178" cy="118" r="1.8" />
          <circle cx="22" cy="120" r="1.4" />
          <Plus cx={42} cy={32} size={5} stroke={t.spark} />
          <Plus cx={166} cy={42} size={6} stroke={t.spark} />
          <Plus cx={158} cy={150} size={5} stroke={t.spark} />
        </g>
      </svg>

      {/* Glyph badge — a small frosted-glass rounded square that floats
          off the blob's lower-right edge, holding a page-specific icon
          (check, plus, bell, calendar, etc.). Positioned in HTML so the
          icon can be a normal React node from @phosphor-icons/react. */}
      {glyph && (
        <div
          aria-hidden
          className="absolute grid size-[44px] place-items-center rounded-[12px] bg-white/70 text-foreground/70 shadow-[0_4px_12px_-2px_oklch(0_0_0/0.08),inset_0_1px_0_0_oklch(1_0_0/0.8)] ring-1 ring-inset ring-white/60 backdrop-blur-md dark:bg-white/15 dark:text-foreground/85 dark:ring-white/20"
          style={{
            right: `${size * 0.05}px`,
            bottom: `${size * 0.16}px`,
          }}
        >
          {glyph}
        </div>
      )}
    </motion.div>
  );
}

/** SVG cross — used for the corner sparkle marks. Two crossed lines
 *  at the given center, scaled by `size`. */
function Plus({
  cx,
  cy,
  size,
  stroke,
}: {
  cx: number;
  cy: number;
  size: number;
  stroke: string;
}) {
  const h = size / 2;
  return (
    <g stroke={stroke} strokeWidth={1.2} strokeLinecap="round">
      <line x1={cx - h} y1={cy} x2={cx + h} y2={cy} />
      <line x1={cx} y1={cy - h} x2={cx} y2={cy + h} />
    </g>
  );
}

