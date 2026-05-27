"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "loop:theme";

function resolveTheme(t: Theme): "light" | "dark" {
  if (t !== "system") return t;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (resolved === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
  // For native form controls (date pickers, scrollbars).
  html.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Initialise from storage on mount. The inline script in <head>
  // (see ThemeInitScript below) has already set the class, so we just
  // mirror it into React state here. No FOUC.
  useEffect(() => {
    let stored: Theme = "system";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {}
    setThemeState(stored);
    setResolved(resolveTheme(stored));

    // Watch system preference when in system mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const r = mq.matches ? "dark" : "light";
        setResolved(r);
        apply(r);
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
    apply(r);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Safe fallback so server components / tests don't crash.
    return {
      theme: "system",
      resolved: "light",
      setTheme: () => {},
    };
  }
  return v;
}

/**
 * Inline script that runs synchronously in <head>, before React mounts,
 * so the first paint already has the right `.dark` class. Without this
 * we'd flash light → dark on every dark-mode load.
 */
export function ThemeInitScript() {
  // Plain string so Next inlines it as-is. Avoid template-literal pitfalls
  // by using single quotes inside the script body.
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
  } catch (e) {}
})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
