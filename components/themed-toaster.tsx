"use client";

import { Toaster } from "sileo";
import { useTheme } from "@/components/theme-provider";

/**
 * Wraps sileo's <Toaster> so it picks up the active theme. Without this,
 * the toast surface stays white-on-light even when the rest of the app
 * has flipped to dark mode.
 */
export function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster position="bottom-center" theme={resolved} />;
}
