/**
 * Accent theming. One source of truth for the theme picker and the
 * no-flash init script.
 *
 * An accent is a base OKLCH color {l,c,h}. `computeThemeVars` turns that
 * base into the full set of brand CSS variables for a given mode (light
 * or dark), with all the relationships the hand-tuned blue palette used
 * (readable text variant, gradient endpoints, hover surfaces, ring) plus
 * an adaptive foreground so text on the primary stays legible for light
 * pastels and dark saturated colors alike.
 *
 * These vars are applied as inline custom properties on <html>, so they
 * always win over the static defaults in globals.css and apply instantly.
 */

export interface AccentBase {
  l: number;
  c: number;
  h: number;
}

export interface AccentPreset {
  id: string;
  name: string;
  base: AccentBase;
}

export interface AccentGroup {
  name: string;
  presets: AccentPreset[];
}

export const DEFAULT_ACCENT_ID = "blue";
export const DEFAULT_CUSTOM_HEX = "#0080ff";

// Grouped presets. Classic = the tuned vivid family (Blue is the brand
// default, identical to the original). Bright = high-chroma pops.
// Pastel = soft, high-lightness, low-chroma. Names sentence case.
export const ACCENT_GROUPS: AccentGroup[] = [
  {
    name: "Classic",
    presets: [
      { id: "blue", name: "Blue", base: { l: 0.612, c: 0.219, h: 252 } },
      { id: "violet", name: "Violet", base: { l: 0.57, c: 0.2, h: 296 } },
      { id: "pink", name: "Pink", base: { l: 0.62, c: 0.21, h: 350 } },
      { id: "red", name: "Red", base: { l: 0.6, c: 0.21, h: 25 } },
      { id: "green", name: "Green", base: { l: 0.66, c: 0.16, h: 150 } },
      { id: "amber", name: "Amber", base: { l: 0.7, c: 0.16, h: 70 } },
    ],
  },
  {
    name: "Bright",
    presets: [
      { id: "cobalt", name: "Cobalt", base: { l: 0.62, c: 0.27, h: 264 } },
      { id: "magenta", name: "Magenta", base: { l: 0.64, c: 0.28, h: 352 } },
      { id: "scarlet", name: "Scarlet", base: { l: 0.6, c: 0.26, h: 22 } },
      { id: "tangerine", name: "Tangerine", base: { l: 0.72, c: 0.2, h: 55 } },
      { id: "lime", name: "Lime", base: { l: 0.8, c: 0.22, h: 132 } },
      { id: "cyan", name: "Cyan", base: { l: 0.74, c: 0.15, h: 210 } },
    ],
  },
  {
    name: "Pastel",
    presets: [
      { id: "sky", name: "Sky", base: { l: 0.86, c: 0.06, h: 240 } },
      { id: "lavender", name: "Lavender", base: { l: 0.84, c: 0.07, h: 296 } },
      { id: "blush", name: "Blush", base: { l: 0.86, c: 0.07, h: 350 } },
      { id: "peach", name: "Peach", base: { l: 0.88, c: 0.07, h: 55 } },
      { id: "mint", name: "Mint", base: { l: 0.89, c: 0.06, h: 162 } },
      { id: "periwinkle", name: "Periwinkle", base: { l: 0.83, c: 0.07, h: 268 } },
    ],
  },
];

export const ACCENTS: AccentPreset[] = ACCENT_GROUPS.flatMap((g) => g.presets);

export const ACCENT_BY_ID: Record<string, AccentPreset> = Object.fromEntries(
  ACCENTS.map((a) => [a.id, a])
);

export function presetById(id: string | null | undefined): AccentPreset {
  return (id && ACCENT_BY_ID[id]) || ACCENT_BY_ID[DEFAULT_ACCENT_ID];
}

// ── Color helpers ──────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const round = (v: number, p = 4) => {
  const f = 10 ** p;
  return Math.round(v * f) / f;
};

/** An OKLCH css string. Lightness clamped to [0,1], chroma to >= 0. */
export function oklch(l: number, c: number, h: number, a?: number): string {
  const L = round(clamp(l, 0, 1));
  const C = round(Math.max(0, c));
  const H = round(((h % 360) + 360) % 360, 2);
  return a == null
    ? `oklch(${L} ${C} ${H})`
    : `oklch(${L} ${C} ${H} / ${round(a, 3)})`;
}

export function baseToCss(base: AccentBase, alpha?: number): string {
  return oklch(base.l, base.c, base.h, alpha);
}

// ── Contrast ───────────────────────────────────────────────────────────
// Choose text color on a colored fill by real WCAG luminance, not a
// lightness guess — so saturated mid-tones (vivid blue, lime) get the
// legible choice rather than a hopeful one.

/** OKLCH → WCAG relative luminance (0..1) via linear sRGB. */
function luminance(l: number, c: number, h: number): number {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = (v: number) => Math.min(1, Math.max(0, v));
  const r = lin(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = lin(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const bl = lin(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const contrastRatio = (y1: number, y2: number) =>
  (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

/**
 * Text color for a colored fill: the darker the color, the whiter the
 * text; the lighter the color, the darker the text.
 *
 * Decided by perceived luminance, not raw max-contrast. The ~0.27
 * threshold matches the convention max-contrast gets wrong: rich,
 * saturated colors (blue, magenta, red) read as "dark" and carry white
 * text even though black is technically higher contrast, while luminous
 * colors (green, amber, lime, cyan) and pastels carry dark text. A
 * guardrail flips the choice only if it would be nearly illegible and
 * the other option is clearly fine.
 */
function foregroundFor(l: number, c: number, h: number): string {
  const white = oklch(1, 0, 0);
  // Near-black, faintly tinted toward the hue so it doesn't read as a
  // dead pure black on the colored fill.
  const dark = oklch(0.2, Math.min(c * 0.18, 0.035), h);

  const y = luminance(l, c, h);
  const wantWhite = y < 0.27;

  const onWhite = contrastRatio(y, 1);
  const onDark = contrastRatio(y, luminance(0.2, Math.min(c * 0.18, 0.035), h));
  if (wantWhite && onWhite < 2.6 && onDark >= 4.5) return dark;
  if (!wantWhite && onDark < 2.6 && onWhite >= 4.5) return white;

  return wantWhite ? white : dark;
}

/** Convert a #rrggbb hex to an OKLCH base (Björn Ottosson's transform). */
export function hexToBase(hex: string): AccentBase {
  const m = hex.trim().replace(/^#/, "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return { ...ACCENT_BY_ID[DEFAULT_ACCENT_ID].base };
  }

  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const lr = lin(r),
    lg = lin(g),
    lb = lin(b);

  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  );

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const aa = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(aa * aa + bb * bb);
  let H = (Math.atan2(bb, aa) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: round(L), c: round(C), h: round(H, 2) };
}

// ── The brand variables, derived from a base for a given mode ──────────

/** Every brand var the app reads. Used to apply and to clear. */
export const THEME_VAR_NAMES = [
  // Raw accent hue (degrees), exposed so illustrations and any
  // hue-driven art (e.g. the empty-state badge) can build their own
  // oklch() colours that track the theme. Set in both modes.
  "--accent-h",
  "--primary",
  "--primary-foreground",
  "--primary-readable",
  "--primary-light",
  "--primary-dark",
  "--ring",
  "--accent",
  "--accent-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-ring",
  "--rb-focus",
  "--rb-selection-bg",
] as const;

export type ThemeVars = Record<string, string>;

/**
 * Build the brand variables for `base` in the given mode. The recipe
 * reproduces the original blue palette when given the Blue base, and
 * generalizes to any color: light text on dark colors, dark text on
 * light pastels, a lightness lift in dark mode so saturated colors
 * still read against the deep background.
 */
export function computeThemeVars(
  base: AccentBase,
  mode: "light" | "dark"
): ThemeVars {
  const { c: C, h: H } = base;

  if (mode === "light") {
    const L = base.l;
    const primary = oklch(L, C, H);
    // Legible text on the fill, chosen by real luminance contrast.
    const fg = foregroundFor(L, C, H);
    return {
      "--accent-h": String(H),
      "--primary": primary,
      "--primary-foreground": fg,
      "--primary-readable": oklch(Math.min(L - 0.12, 0.5), Math.min(C, 0.2), H),
      "--primary-light": oklch(Math.min(L + 0.14, 0.96), C * 0.73, H),
      "--primary-dark": oklch(Math.max(L - 0.13, 0.32), C, H),
      "--ring": primary,
      "--accent": oklch(0.955, Math.min(C * 0.12, 0.03), H),
      "--accent-foreground": oklch(0.24, Math.min(C * 0.32, 0.06), H),
      "--sidebar-primary": primary,
      "--sidebar-primary-foreground": fg,
      "--sidebar-accent": oklch(0.94, Math.min(C * 0.13, 0.032), H),
      "--sidebar-accent-foreground": oklch(0.22, Math.min(C * 0.32, 0.06), H),
      "--sidebar-ring": primary,
      "--rb-focus": oklch(L, C, H, 0.7),
      "--rb-selection-bg": oklch(L, C, H, 0.3),
    };
  }

  // Dark: lift lightness so the color pops on the deep background.
  const dl = clamp(base.l + (base.l < 0.6 ? 0.12 : 0.08), 0.6, 0.86);
  const primary = oklch(dl, C, H);
  const fg = foregroundFor(dl, C, H);
  return {
    "--accent-h": String(H),
    "--primary": primary,
    "--primary-foreground": fg,
    "--primary-readable": oklch(clamp(dl + 0.08, 0.74, 0.92), Math.min(C * 0.85, 0.16), H),
    "--primary-light": oklch(Math.min(dl + 0.1, 0.9), C * 0.7, H),
    "--primary-dark": oklch(Math.max(dl - 0.15, 0.45), C * 0.95, H),
    "--ring": primary,
    "--accent": oklch(0.29, Math.min(C * 0.28, 0.06), H),
    "--accent-foreground": oklch(0.955, Math.min(C * 0.12, 0.02), H),
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": fg,
    "--sidebar-accent": oklch(0.27, Math.min(C * 0.28, 0.06), H),
    "--sidebar-accent-foreground": oklch(0.94, Math.min(C * 0.12, 0.02), H),
    "--sidebar-ring": primary,
    "--rb-focus": oklch(dl, C, H, 0.7),
    "--rb-selection-bg": oklch(dl, C, H, 0.35),
  };
}
