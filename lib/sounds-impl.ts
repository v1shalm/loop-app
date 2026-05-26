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

/**
 * Sound vocabulary, mapped onto the four underlying patches in the
 * crisp pack (send / notification / success / error). We layer plays
 * with setTimeout + tweak detune/volume to give each named event its
 * own character — without needing to ship more audio assets.
 *
 *   added       send, +80 cents — quick, snappy
 *   assignedToMe notification ×2, second a fourth up — gentle two-tone ping
 *   completed   success with priority-driven detune + sparkle overtone
 *   uncomplete  send, low + half volume — soft "tuck back" reverse
 *   streak      success arpeggio (root / third / fifth) at +volume
 *   reaction    send, very high + half volume — bright pop
 *   dropped     send ×2, high-then-mid detune — tactile dial detent click
 *   pin         send, sparkly high + low volume — crisp click
 *   deleted     send, deep down-shift + low volume — "tucked away forever"
 *   error       error
 */
export function play(name: SoundName, ...args: unknown[]): void {
  const p = getPatch();
  if (!p) return;

  switch (name) {
    case "added":
      p.play("send", { detune: 80 });
      return;

    case "assignedToMe":
      // Two-note "you have a thing" — first plain, second a fourth up.
      p.play("notification");
      setTimeout(() => p.play("notification", { detune: 500, volume: 0.85 }), 110);
      return;

    case "completed": {
      const priority = (args[0] as 1 | 2 | 3 | 4 | undefined) ?? 4;
      const baseDetune = (4 - priority) * 80;
      p.play("success", { detune: baseDetune });
      // Sparkle overtone — quieter, an octave + a bit, slightly delayed.
      setTimeout(
        () => p.play("success", { detune: baseDetune + 700, volume: 0.45 }),
        60
      );
      return;
    }

    case "uncomplete":
      // Soft "put it back" — same patch as added but darker + quieter.
      p.play("send", { detune: -180, volume: 0.55 });
      return;

    case "streak": {
      // Three-note arpeggio for milestones (e.g. ring fills to 100%).
      // Root → major third → fifth, escalating volume.
      p.play("success", { detune: 0, volume: 0.9 });
      setTimeout(() => p.play("success", { detune: 400, volume: 1.0 }), 90);
      setTimeout(() => p.play("success", { detune: 700, volume: 1.15 }), 180);
      return;
    }

    case "reaction":
      // Bright pop — high detune, half volume, no layering.
      p.play("send", { detune: 350, volume: 0.6 });
      return;

    case "dropped":
      // Tactile dial-click on drop. Two send-patch hits layered ~40ms
      // apart: a bright high "tick" followed by a softer mid "settle,"
      // so the release lands like a knob clicking into its next detent
      // instead of a soft thud disappearing into the carpet.
      p.play("send", { detune: 340, volume: 0.6 });
      setTimeout(
        () => p.play("send", { detune: 160, volume: 0.32 }),
        42
      );
      return;

    case "pin":
      // Crisp short click — very high, very quiet.
      p.play("send", { detune: 500, volume: 0.55 });
      return;

    case "deleted":
      // Destructive but quiet — "tucked away forever". Deeper than
      // `uncomplete` (which is a same-day reverse) and softer than
      // `error` (which means something went wrong, not that the
      // user *chose* to remove something).
      p.play("send", { detune: -360, volume: 0.5 });
      return;

    case "error":
      p.play("error");
      return;
  }
}
