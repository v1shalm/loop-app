"use client";

/**
 * Heavy half of the sound module — only loaded on first playSound() call.
 * Keeps @web-kits/audio + the patch out of the initial JS bundle.
 *
 * Uses the Core patch (raphaelsalaja/audio), a rich vocabulary of ~65
 * distinct UI sounds. Each named event below maps to a *different* base
 * sound (not the same one detuned), so actions actually sound different:
 * a create pops, a delete thuds, a drop ticks, a completion chimes.
 */
import { definePatch, type AudioPatch } from "@web-kits/audio";
import { _patch as corePatch } from "@/.web-kits/core";
import type { SoundName } from "./sounds";

// Nudge everything up a touch — the raw patch gains are conservative.
// `volume` on a play() call scales the sound's base gain (1 = as-authored).
const MASTER = 1.35;

let patch: AudioPatch | null = null;
function getPatch(): AudioPatch | null {
  if (typeof window === "undefined") return null;
  if (!patch) patch = definePatch(corePatch);
  return patch;
}

/**
 * Map of our event vocabulary onto distinct Core sounds:
 *
 *   added        pop          — a task springs into the list
 *   assignedToMe notification + mention — "someone handed you a thing"
 *   completed    complete (+ sparkle) — reward chime, brighter for higher priority
 *   uncomplete   undo         — soft reverse
 *   streak       level-up + confetti — milestone celebration
 *   reaction     heart        — warm little pop for an emoji reaction
 *   dropped      tick         — mechanical detent as a drag settles
 *   pin          select       — crisp pick (theme swatch, pin, small toggles)
 *   deleted      delete       — downward "tucked away"
 *   error        error        — something went wrong
 */
export function play(name: SoundName, ...args: unknown[]): void {
  const p = getPatch();
  if (!p) return;

  // Helper: play with the master volume applied on top of any per-call
  // scale, so the relative mix the patch authored is preserved.
  const ping = (
    sound: string,
    opts: { detune?: number; volume?: number } = {}
  ) =>
    p.play(sound, {
      detune: opts.detune,
      volume: (opts.volume ?? 1) * MASTER,
    });

  switch (name) {
    case "added":
      ping("pop");
      return;

    case "assignedToMe":
      // Two-beat "you've got something": the notification, then a softer
      // mention tone just behind it.
      ping("notification");
      setTimeout(() => ping("mention", { volume: 0.8 }), 100);
      return;

    case "completed": {
      // Brighter the higher the priority. A sparkle overtone trails it so
      // finishing something feels like a small reward.
      const priority = (args[0] as 1 | 2 | 3 | 4 | undefined) ?? 4;
      const detune = (4 - priority) * 70;
      ping("complete", { detune });
      setTimeout(() => ping("sparkle", { detune, volume: 0.5 }), 70);
      return;
    }

    case "uncomplete":
      ping("undo", { volume: 0.9 });
      return;

    case "streak":
      // Milestone — level-up, then confetti just behind it.
      ping("level-up");
      setTimeout(() => ping("confetti", { volume: 0.9 }), 120);
      return;

    case "reaction":
      ping("heart", { volume: 0.95 });
      return;

    case "dropped":
      ping("tick");
      return;

    case "pin":
      ping("select", { volume: 0.9 });
      return;

    case "deleted":
      ping("delete", { volume: 0.9 });
      return;

    case "error":
      ping("error");
      return;
  }
}
