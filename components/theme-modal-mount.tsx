"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

// The theme studio (color canvas, saturation slider, preset carousel, grain
// dial) is ~700 lines of client code that's only needed once someone opens
// settings — but it was shipping in the First Load JS of every route. Defer it:
// load the chunk the first time the modal opens, then keep it mounted so the
// open/close animations behave exactly as before from that point on.
const ThemeModal = dynamic(
  () => import("@/components/theme-modal").then((m) => m.ThemeModal),
  { ssr: false }
);

export function ThemeModalMount() {
  const { themeModalOpen } = useTheme();
  // Latch on first open and stay mounted, so open/close animations keep working
  // after the chunk loads. Conditional set-during-render is React's supported
  // pattern for deriving state from a prop without an extra effect tick.
  const [everOpened, setEverOpened] = useState(false);
  if (themeModalOpen && !everOpened) setEverOpened(true);
  return everOpened ? <ThemeModal /> : null;
}
