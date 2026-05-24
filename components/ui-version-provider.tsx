"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * UI version toggle — v1 is the original Loop look, v2 borrows the
 * resume-builder design system (amber accent, layered gradients,
 * puffy chips, radial body). The active version is a single class
 * (`theme-v2`) on <html>; every other token in the app is derived
 * from CSS variables under that class, so the toggle propagates
 * everywhere without per-component changes.
 *
 * Default is v1. Stored in localStorage. The inline init script in
 * <head> applies the class synchronously before paint so there's no
 * flash on reload.
 */

export type UiVersion = "v1" | "v2";

interface UiVersionCtx {
  version: UiVersion;
  setVersion: (v: UiVersion) => void;
  toggle: () => void;
}

const Ctx = createContext<UiVersionCtx | null>(null);

const STORAGE_KEY = "loop:ui-version";

function apply(version: UiVersion) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (version === "v2") html.classList.add("theme-v2");
  else html.classList.remove("theme-v2");
}

export function UiVersionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersionState] = useState<UiVersion>("v1");

  useEffect(() => {
    let stored: UiVersion = "v1";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "v1" || raw === "v2") stored = raw;
    } catch {}
    setVersionState(stored);
  }, []);

  const setVersion = useCallback((v: UiVersion) => {
    setVersionState(v);
    apply(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setVersion(version === "v1" ? "v2" : "v1");
  }, [version, setVersion]);

  return (
    <Ctx.Provider value={{ version, setVersion, toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUiVersion(): UiVersionCtx {
  const v = useContext(Ctx);
  if (!v) {
    return {
      version: "v1",
      setVersion: () => {},
      toggle: () => {},
    };
  }
  return v;
}

export function UiVersionInitScript() {
  const script = `
(function(){
  try {
    var v = localStorage.getItem('${STORAGE_KEY}');
    if (v === 'v2') document.documentElement.classList.add('theme-v2');
  } catch (e) {}
})();`;
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
