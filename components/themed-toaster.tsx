"use client";

import { Toaster } from "sileo";
import { useTheme } from "@/components/theme-provider";

/**
 * Wraps sileo's <Toaster> so it picks up the active theme. Without this,
 * the toast surface stays white-on-light even when the rest of the app
 * has flipped to dark mode.
 *
 * `duration` is set explicitly here so every toast auto-dismisses after
 * ~4.5s — sileo's default is `null` (persistent) which would leave
 * realtime "assigned to you" popups stacking up on the screen.
 *
 * Visual styling (background, text colors, contrast) is overridden in
 * globals.css under "Sileo toast overrides" — sileo's default
 * description color is inverted (light text in light mode, dark text in
 * dark mode) which makes the secondary line unreadable.
 */
export function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      theme={resolved}
      options={{ duration: 4500 }}
    />
  );
}
