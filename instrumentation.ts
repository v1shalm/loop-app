/**
 * Server instrumentation — runs once, before the server handles any request.
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */
export function register() {
  // Node 26 ships an experimental `localStorage` global behind a lazy getter that
  // emits `ExperimentalWarning: localStorage is not available because
  // --localstorage-file was not provided` on ANY access (even a `typeof` check).
  //
  // @supabase/auth-js reads `globalThis.localStorage` at module-load time
  // (node_modules/@supabase/auth-js/dist/main/lib/locks.js) to decide a debug flag.
  // That probe runs on the server even though we use cookie-based storage, so the
  // warning fires once per server start. Redefining the property here — before any
  // route imports Supabase — swaps the warning getter for a plain `undefined`. The
  // probe still correctly concludes "no localStorage on the server", and Node stays quiet.
  //
  // Remove this once @supabase/auth-js guards the access (or we drop to Node ≤24).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }
}
