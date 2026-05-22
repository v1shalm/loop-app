"use client";

import { useEffect, useState } from "react";
import { SpeakerHigh, SpeakerSlash } from "@/components/icons";
import { cn } from "@/lib/utils";
import { isMuted, setMuted, playSound } from "@/lib/sounds";

/**
 * iOS-style sound toggle that lives in a card at the bottom of the sidebar.
 * Replaces the icon-only SoundToggle so the affordance is more visible to
 * non-technical users.
 */
export function SoundSwitch() {
  const [muted, setLocalMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocalMuted(isMuted());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !muted;
    setLocalMuted(next);
    setMuted(next);
    if (!next) playSound("added");
  };

  const on = mounted && !muted;

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={on}
      aria-label={on ? "Mute sounds" : "Unmute sounds"}
      className="focus-ring flex w-full items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-soft-xs transition-colors hover:bg-accent/40"
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        {on ? <SpeakerHigh size={13} /> : <SpeakerSlash size={13} />}
      </span>
      <span className="flex-1 text-left text-[12.5px] font-medium text-foreground">
        Sounds
      </span>
      <span
        className={cn(
          "text-[10.5px] font-semibold uppercase tracking-wider",
          on ? "text-primary" : "text-muted-foreground/70"
        )}
      >
        {on ? "On" : "Off"}
      </span>
      {/* iOS-style track */}
      <span
        className={cn(
          "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full transition-colors duration-200 ease-[var(--ease-out)]",
          on ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute size-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out)]",
            on ? "translate-x-[14px]" : "translate-x-[2px]"
          )}
        />
      </span>
    </button>
  );
}
