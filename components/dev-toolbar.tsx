"use client";

import dynamic from "next/dynamic";

// Agentation is a ~3.5 MB dev-only visual-feedback toolbar. It was being pulled
// into the production bundle by a static `import` in the root layout — the
// NODE_ENV check stopped it rendering, but not shipping. Loading it through a
// guarded dynamic import keeps it entirely out of the production initial load:
// in prod we return before the import() expression is ever reached, so the
// browser never fetches the chunk. In dev it lazy-loads on mount as before.
const Agentation = dynamic(
  () => import("agentation").then((m) => m.Agentation),
  { ssr: false }
);

export function DevToolbar() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Agentation />;
}
