"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser-side Supabase client.
 * Returns `null` when env vars are missing so the app still renders
 * (with mock data) during local setup, before Supabase is wired up.
 */
function readEnv() {
  // Supabase renamed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  // in early 2026. Accept either, prefer the new name.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

export function getSupabaseBrowser() {
  const { url, key } = readEnv();
  if (!url || !key) return null;
  return createBrowserClient<Database>(url, key);
}

export const isSupabaseConfigured = () => {
  const { url, key } = readEnv();
  return Boolean(url && key);
};
