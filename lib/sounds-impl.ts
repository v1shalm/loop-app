"use client";

/**
 * Heavy half of the sound module — only loaded on first playSound() call.
 * Keeps @web-kits/audio + the crisp patch out of the initial JS bundle.
 */
import { definePatch, type AudioPatch } from "@web-kits/audio";
import { _patch as crispPatch } from "@/.web-kits/crisp";
import type { SoundName } from "./sounds";

let patch: AudioPatch | null = null;
function getPatch(): AudioPatch | null {
  if (typeof window === "undefined") return null;
  if (!patch) patch = definePatch(crispPatch);
  return patch;
}

export function play(name: SoundName, ...args: unknown[]): void {
  const p = getPatch();
  if (!p) return;
  if (name === "added") p.play("send");
  else if (name === "assignedToMe") p.play("notification");
  else if (name === "completed") {
    const priority = (args[0] as 1 | 2 | 3 | 4 | undefined) ?? 4;
    const detune = (4 - priority) * 67;
    p.play("success", { detune });
  } else if (name === "streak") p.play("success", { detune: 200, volume: 1.15 });
  else if (name === "error") p.play("error");
}
