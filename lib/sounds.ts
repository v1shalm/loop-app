"use client";

/**
 * Sound vocabulary for Loop, played from the Crisp patch (@web-kits/audio).
 * The patch lives at .web-kits/crisp.ts and ships ~25 named sounds; we map
 * Loop's five moments onto the most fitting ones.
 *
 * Browsers suspend AudioContext until a user gesture — definePatch is lazy
 * so the first user click bootstraps everything cleanly.
 */
import { definePatch, type AudioPatch } from "@web-kits/audio";
import { _patch as crispPatch } from "@/.web-kits/crisp";

const MUTE_KEY = "tist:sounds-muted";

let patch: AudioPatch | null = null;
function getPatch(): AudioPatch | null {
  if (typeof window === "undefined") return null;
  if (!patch) patch = definePatch(crispPatch);
  return patch;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

const SOUNDS = {
  /** Task created — ascending sweep, "outbound" feel. */
  added() {
    getPatch()?.play("send");
  },

  /** A teammate assigned a task TO you — two-layer chime. */
  assignedToMe() {
    getPatch()?.play("notification");
  },

  /**
   * Task completed — C-E-G arpeggio. Detuned upward for higher-priority
   * tasks so finishing a P1 feels brighter than a P4.
   */
  completed(priority: 1 | 2 | 3 | 4 = 4) {
    const detune = (4 - priority) * 67; // P1 → +200¢, P4 → 0¢
    getPatch()?.play("success", { detune });
  },

  /** Streak / milestone — louder, brighter arpeggio. (Reserved.) */
  streak() {
    getPatch()?.play("success", { detune: 200, volume: 1.15 });
  },

  /** Error — short low descent. */
  error() {
    getPatch()?.play("error");
  },
} as const;

export type SoundName = keyof typeof SOUNDS;

export function playSound(
  name: SoundName,
  ...args: Parameters<(typeof SOUNDS)[SoundName]>
) {
  if (isMuted()) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (SOUNDS[name] as any)(...args);
}
