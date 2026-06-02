"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MoonStars, Plus, Sparkles, Sun } from "@/components/icons";
import { useTheme } from "@/components/theme-provider";
import {
  ColorField,
  GradientCarousel,
  GrainDial,
  PresetCarousel,
  SaturationSlider,
} from "@/components/theme-studio";
import {
  type AccentBase,
  ACCENTS,
  GRADIENT_PRESETS,
  nearestGradientPreset,
} from "@/lib/accents";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

// The reference's three glyphs: sparkle (auto/system), sun (light), moon (dark).
const MODES: { key: Mode; label: string; Icon: typeof Sun }[] = [
  { key: "system", label: "System", Icon: Sparkles },
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: MoonStars },
];

const samePreset = (a: AccentBase, b: AccentBase) =>
  Math.abs(a.l - b.l) < 0.005 &&
  Math.abs(a.c - b.c) < 0.005 &&
  Math.abs(a.h - b.h) < 0.5;

/**
 * Theme studio — a self-contained control panel that follows the app's
 * light/dark theme. A dotted canvas holds one or more color nodes; the −/+
 * keys remove/add colors and the set blends into the brand gradient. The
 * selected node is the live accent. A saturation wave tunes its chroma, a
 * preset carousel snaps it, and a knob adds optional grain. No chrome — it
 * dismisses on Escape or a click outside.
 */
export function ThemeModal() {
  const {
    theme,
    accentBase,
    setTheme,
    setCustomBase,
    gradient,
    setGradient,
    grain,
    setGrain,
    themeModalOpen,
    closeThemeModal,
  } = useTheme();

  const nodes = gradient.length ? gradient : [accentBase];
  const [selectedRaw, setSelected] = useState(0);
  const selected = Math.min(selectedRaw, nodes.length - 1);
  const selBase = nodes[selected];

  const selectNode = (i: number) => {
    setSelected(i);
    setCustomBase(nodes[i]);
  };
  const changeNode = (i: number, base: AccentBase) => {
    const next = nodes.map((n, j) => (j === i ? base : n));
    setGradient(next);
    if (i === selected) setCustomBase(base);
  };
  const addColor = () => {
    playSound("added");
    if (nodes.length === 1) {
      // Going to two colors — snap to the curated preset nearest the current
      // color so the gradient looks designed immediately.
      const preset = nearestGradientPreset(selBase ?? accentBase);
      setGradient(preset.stops);
      const last = preset.stops.length - 1;
      setSelected(last);
      setCustomBase(preset.stops[last]);
      return;
    }
    const src = selBase ?? accentBase;
    const nb: AccentBase = { ...src, h: Math.round((src.h + 40) % 360) };
    setGradient([...nodes, nb]);
    setSelected(nodes.length);
    setCustomBase(nb);
  };
  const applyGradientPreset = (stops: AccentBase[]) => {
    playSound("pin");
    setGradient(stops);
    setSelected(0);
    setCustomBase(stops[0]);
  };
  const removeColor = () => {
    if (nodes.length <= 1) return;
    const next = nodes.filter((_, i) => i !== selected);
    const ns = Math.min(selected, next.length - 1);
    playSound("deleted");
    setGradient(next);
    setSelected(ns);
    setCustomBase(next[ns]);
  };

  const activeId = selBase
    ? ACCENTS.find((p) => samePreset(p.base, selBase))?.id ?? ""
    : "";
  const activeGradientId =
    nodes.length > 1
      ? GRADIENT_PRESETS.find(
          (g) =>
            g.stops.length === nodes.length &&
            g.stops.every((s, i) => samePreset(s, nodes[i]))
        )?.id ?? ""
      : "";

  return (
    <Dialog
      open={themeModalOpen}
      onOpenChange={(v) => {
        if (!v) closeThemeModal();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-label="Theme"
        className="block w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[28px] border border-border bg-card p-0 shadow-[var(--shadow-soft-xl)] sm:max-w-[400px]"
      >
        {/* Canvas: dotted plane with the color nodes; appearance row and the
            add/remove-color stepper overlaid. */}
        <div className="p-3">
          <div className="relative h-[340px] overflow-hidden rounded-[18px] bg-muted/60 ring-1 ring-inset ring-border/60">
            <ColorField
              nodes={nodes}
              selected={selected}
              onSelectNode={selectNode}
              onChangeNode={changeNode}
            />

            {/* Appearance */}
            <div
              role="radiogroup"
              aria-label="Appearance"
              className="absolute inset-x-0 top-3.5 z-[3] flex items-center justify-center gap-3"
            >
              {MODES.map((m) => {
                const active = theme === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={m.label}
                    title={m.label}
                    onClick={() => {
                      if (!active) playSound("pin");
                      setTheme(m.key);
                    }}
                    className={cn(
                      "grid size-11 place-items-center rounded-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "bg-foreground/[0.08] text-foreground"
                        : "text-muted-foreground/80 hover:text-foreground"
                    )}
                  >
                    <m.Icon size={24} weight={active ? "fill" : "regular"} />
                  </button>
                );
              })}
            </div>

            {/* Add / remove color */}
            <div className="absolute inset-x-0 bottom-4 z-[3] flex items-center justify-center gap-5 text-muted-foreground">
              <button
                type="button"
                aria-label="Remove this color"
                disabled={nodes.length <= 1}
                onClick={removeColor}
                className="grid size-7 place-items-center rounded-md transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-30"
              >
                <span className="block h-[2px] w-3.5 rounded-full bg-current" />
              </button>
              <span aria-hidden className="text-[11px] tabular-nums opacity-70">
                {nodes.length}
              </span>
              <button
                type="button"
                aria-label="Add a color"
                onClick={addColor}
                className="grid size-7 place-items-center rounded-md transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus size={16} weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div aria-hidden className="h-px bg-border" />

        {/* Controls: preset carousel, then saturation wave + grain knob. */}
        <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
          {nodes.length > 1 ? (
            <GradientCarousel
              activeId={activeGradientId}
              onSelect={(g) => applyGradientPreset(g.stops)}
            />
          ) : (
            <PresetCarousel
              activeId={activeId}
              onSelect={(p) => {
                if (!samePreset(p.base, selBase)) playSound("pin");
                changeNode(selected, p.base);
              }}
            />
          )}
          <div className="flex items-center gap-5">
            {selBase && (
              <SaturationSlider
                base={selBase}
                onChange={(b) => changeNode(selected, b)}
              />
            )}
            <GrainDial value={grain} onChange={setGrain} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
