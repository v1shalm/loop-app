"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type AccentBase,
  type AccentPreset,
  baseToCss,
  baseToHex,
  computeThemeVars,
  DEFAULT_ACCENT_ID,
  DEFAULT_CUSTOM_HEX,
  hexToBase,
  presetById,
} from "@/lib/accents";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  /** Current accent preset id, or "custom". */
  accentId: string;
  /** CSS color of the current accent base, for swatches/dots. */
  accentColor: string;
  /** The live accent in OKLCH {l,c,h} — drives the color-studio controls. */
  accentBase: AccentBase;
  /** The hex backing the custom swatch (whether or not it's active). */
  customHex: string;
  setPreset: (preset: AccentPreset) => void;
  setCustom: (hex: string) => void;
  /** Set a custom accent directly in OKLCH (the studio field/slider). */
  setCustomBase: (base: AccentBase) => void;
  /** The gradient color stops the studio canvas blends. 1 stop = a solid
   *  accent; 2+ stops paint --brand-gradient. */
  gradient: AccentBase[];
  setGradient: (stops: AccentBase[]) => void;
  /** Surface grain amount, 0–1 (0 = off). Maps to a capped overlay opacity. */
  grain: number;
  setGrain: (amount: number) => void;
  themeModalOpen: boolean;
  openThemeModal: () => void;
  closeThemeModal: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "loop:theme";
const ACCENT_KEY = "loop:accent";
const ACCENT_MAPS_KEY = "loop:accent-maps";
const GRAIN_KEY = "loop:grain";
const GRADIENT_KEY = "loop:gradient";

/** A CSS value for the brand gradient. 1 stop → solid; 2+ → linear blend. */
function gradientCss(stops: AccentBase[]): string {
  if (stops.length === 0) return "transparent";
  if (stops.length === 1) return baseToCss(stops[0]);
  return `linear-gradient(135deg, ${stops.map((s) => baseToCss(s)).join(", ")})`;
}

function applyBrandGradient(stops: AccentBase[]) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--brand-gradient",
    gradientCss(stops)
  );
}

function readStoredGradient(fallback: AccentBase): AccentBase[] {
  try {
    const raw = window.localStorage.getItem(GRADIENT_KEY);
    if (!raw) return [fallback];
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((s) => s && typeof s.h === "number")
    ) {
      return parsed as AccentBase[];
    }
  } catch {}
  return [fallback];
}

// Grain is a tactile texture, not a filter: the user's 0–1 amount maps to a
// deliberately low max overlay opacity so it never fights text legibility.
const GRAIN_MAX = 0.06;
const grainOpacity = (amount: number) =>
  (Math.min(1, Math.max(0, amount)) * GRAIN_MAX).toFixed(4);

function resolveTheme(t: Theme): "light" | "dark" {
  if (t !== "system") return t;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (resolved === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
  html.style.colorScheme = resolved;
}

/** Set the brand vars for `base` + `mode` as inline custom properties. */
function applyAccentVars(base: AccentBase, mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  const vars = computeThemeVars(base, mode);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

/** Drive the global grain overlay opacity from a 0–1 amount. */
function applyGrain(amount: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--grain-opacity",
    grainOpacity(amount)
  );
}

function readStoredGrain(): number {
  try {
    const raw = window.localStorage.getItem(GRAIN_KEY);
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  } catch {
    return 0;
  }
}

interface StoredAccent {
  id: string;
  base: AccentBase;
  customHex: string;
}

function readStoredAccent(): StoredAccent {
  const fallback: StoredAccent = {
    id: DEFAULT_ACCENT_ID,
    base: presetById(DEFAULT_ACCENT_ID).base,
    customHex: DEFAULT_CUSTOM_HEX,
  };
  try {
    const raw = window.localStorage.getItem(ACCENT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.base && typeof parsed.base.h === "number") {
      return {
        id: typeof parsed.id === "string" ? parsed.id : DEFAULT_ACCENT_ID,
        base: parsed.base,
        customHex:
          typeof parsed.customHex === "string"
            ? parsed.customHex
            : DEFAULT_CUSTOM_HEX,
      };
    }
  } catch {}
  return fallback;
}

function persistAccent(next: StoredAccent) {
  try {
    window.localStorage.setItem(ACCENT_KEY, JSON.stringify(next));
    // Pre-computed maps for both modes, so the inline init script can
    // apply the right one before paint without re-running the math.
    window.localStorage.setItem(
      ACCENT_MAPS_KEY,
      JSON.stringify({
        light: computeThemeVars(next.base, "light"),
        dark: computeThemeVars(next.base, "dark"),
      })
    );
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [accentId, setAccentId] = useState(DEFAULT_ACCENT_ID);
  const [accentBase, setAccentBase] = useState<AccentBase>(
    presetById(DEFAULT_ACCENT_ID).base
  );
  const [customHex, setCustomHex] = useState(DEFAULT_CUSTOM_HEX);
  const [gradient, setGradientState] = useState<AccentBase[]>([
    presetById(DEFAULT_ACCENT_ID).base,
  ]);
  const [grain, setGrainState] = useState(0);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  // Keep the latest resolved mode + base in refs so the setters can read
  // current values without re-creating themselves on every change.
  const resolvedRef = useRef(resolved);
  const baseRef = useRef(accentBase);
  useEffect(() => {
    resolvedRef.current = resolved;
  }, [resolved]);
  useEffect(() => {
    baseRef.current = accentBase;
  }, [accentBase]);

  // Mount: mirror stored theme + accent into state. The inline init
  // script has already set the class and accent vars, so we just sync
  // state and re-apply once (in case the stored maps were stale after a
  // code change to the recipe).
  useEffect(() => {
    let stored: Theme = "system";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {}
    const r = resolveTheme(stored);
    setThemeState(stored);
    setResolved(r);

    const a = readStoredAccent();
    setAccentId(a.id);
    setAccentBase(a.base);
    setCustomHex(a.customHex);
    applyAccentVars(a.base, r);
    persistAccent(a);

    const g = readStoredGrain();
    setGrainState(g);
    applyGrain(g);

    const grad = readStoredGradient(a.base);
    setGradientState(grad);
    applyBrandGradient(grad);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const next = mq.matches ? "dark" : "light";
        setResolved(next);
        applyClass(next);
        applyAccentVars(baseRef.current, next);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const r = resolveTheme(t);
    setResolved(r);
    applyClass(r);
    applyAccentVars(baseRef.current, r);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  const commitAccent = useCallback(
    (id: string, base: AccentBase, hex: string) => {
      setAccentId(id);
      setAccentBase(base);
      setCustomHex(hex);
      applyAccentVars(base, resolvedRef.current);
      persistAccent({ id, base, customHex: hex });
    },
    []
  );

  const setPreset = useCallback(
    (preset: AccentPreset) => {
      commitAccent(preset.id, preset.base, customHex);
    },
    [commitAccent, customHex]
  );

  const setCustom = useCallback(
    (hex: string) => {
      commitAccent("custom", hexToBase(hex), hex);
    },
    [commitAccent]
  );

  const setCustomBase = useCallback(
    (base: AccentBase) => {
      commitAccent("custom", base, baseToHex(base));
    },
    [commitAccent]
  );

  const setGradient = useCallback((stops: AccentBase[]) => {
    const safe = stops.length ? stops : [presetById(DEFAULT_ACCENT_ID).base];
    setGradientState(safe);
    applyBrandGradient(safe);
    try {
      window.localStorage.setItem(GRADIENT_KEY, JSON.stringify(safe));
    } catch {}
  }, []);

  const setGrain = useCallback((amount: number) => {
    const a = Math.min(1, Math.max(0, amount));
    setGrainState(a);
    applyGrain(a);
    try {
      window.localStorage.setItem(GRAIN_KEY, String(a));
    } catch {}
  }, []);

  const openThemeModal = useCallback(() => setThemeModalOpen(true), []);
  const closeThemeModal = useCallback(() => setThemeModalOpen(false), []);

  return (
    <Ctx.Provider
      value={{
        theme,
        resolved,
        setTheme,
        accentId,
        accentColor: baseToCss(accentBase),
        accentBase,
        customHex,
        setPreset,
        setCustom,
        setCustomBase,
        gradient,
        setGradient,
        grain,
        setGrain,
        themeModalOpen,
        openThemeModal,
        closeThemeModal,
      }}
    >
      {children}
      {/* Optional film grain over the whole app; opacity driven by
          --grain-opacity (0 unless the studio's grain knob is turned up). */}
      <span className="grain-film" aria-hidden />
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) {
    return {
      theme: "system",
      resolved: "light",
      setTheme: () => {},
      accentId: DEFAULT_ACCENT_ID,
      accentColor: baseToCss(presetById(DEFAULT_ACCENT_ID).base),
      accentBase: presetById(DEFAULT_ACCENT_ID).base,
      customHex: DEFAULT_CUSTOM_HEX,
      setPreset: () => {},
      setCustom: () => {},
      setCustomBase: () => {},
      gradient: [presetById(DEFAULT_ACCENT_ID).base],
      setGradient: () => {},
      grain: 0,
      setGrain: () => {},
      themeModalOpen: false,
      openThemeModal: () => {},
      closeThemeModal: () => {},
    };
  }
  return v;
}

/**
 * Inline script that runs synchronously in <head>, before React mounts,
 * so the first paint already has the right `.dark` class AND the right
 * accent colors. Reads the pre-computed maps the provider persisted, so
 * there's no color math here, just application. No FOUC, no flash of the
 * default blue.
 */
export function ThemeInitScript() {
  const script = `
(function(){
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var t = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    var html = document.documentElement;
    if (resolved === 'dark') html.classList.add('dark');
    html.style.colorScheme = resolved;
    var raw = localStorage.getItem('${ACCENT_MAPS_KEY}');
    if (raw) {
      var maps = JSON.parse(raw);
      var m = maps[resolved];
      if (m) { for (var k in m) html.style.setProperty(k, m[k]); }
    }
    var g = parseFloat(localStorage.getItem('${GRAIN_KEY}'));
    if (isFinite(g) && g > 0) {
      html.style.setProperty('--grain-opacity', (Math.min(1, Math.max(0, g)) * ${GRAIN_MAX}).toFixed(4));
    }
  } catch (e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
