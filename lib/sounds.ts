"use client";

/**
 * Sound vocabulary for Loop. The actual Web Audio implementation and the
 * crisp patch live in ./sounds-impl.ts and are dynamically imported on the
 * first sound play, so the audio runtime stays out of the initial bundle.
 *
 * The light prefs (mute toggle) live here so the sidebar's SoundSwitch can
 * read/write them without pulling the audio code.
 */

const MUTE_KEY = "tist:sounds-muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export type SoundName =
  | "added"
  | "assignedToMe"
  | "completed"
  | "uncomplete"
  | "streak"
  | "reaction"
  | "dropped"
  | "pin"
  | "deleted"
  | "error";

type CompletedArgs = [priority?: 1 | 2 | 3 | 4];
type ArgsFor<N extends SoundName> = N extends "completed" ? CompletedArgs : [];

export function playSound<N extends SoundName>(
  name: N,
  ...args: ArgsFor<N>
): void {
  if (isMuted()) return;
  if (typeof window === "undefined") return;
  // Fire-and-forget chunk fetch; UI never waits for audio.
  import("./sounds-impl").then((m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m.play as any)(name, ...args);
  });
}
