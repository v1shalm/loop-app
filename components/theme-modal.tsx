"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, Desktop, MoonStars, Sun, X } from "@/components/icons";
import { useTheme } from "@/components/theme-provider";
import { ACCENT_GROUPS, baseToCss } from "@/lib/accents";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

const MODES: { key: Mode; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Light", Icon: Sun },
  { key: "dark", label: "Dark", Icon: MoonStars },
  { key: "system", label: "System", Icon: Desktop },
];

/**
 * Theme modal — appearance (light/dark/system) and accent color in one
 * place, opened from the "Theme" row in the profile menu. Both controls
 * apply instantly to the whole app, so the modal itself recolors live as
 * you pick. That live recolor is the preview.
 */
export function ThemeModal() {
  const {
    theme,
    accentId,
    accentColor,
    customHex,
    setTheme,
    setPreset,
    setCustom,
    themeModalOpen,
    closeThemeModal,
  } = useTheme();

  return (
    <Dialog
      open={themeModalOpen}
      onOpenChange={(v) => {
        if (!v) closeThemeModal();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="block w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[468px]"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <p className="text-[14px] font-semibold tracking-tight text-foreground">
            Theme
          </p>
          <button
            type="button"
            onClick={closeThemeModal}
            aria-label="Close"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-5 py-5">
          {/* Appearance */}
          <section>
            <p className="mb-2 text-[12px] font-medium text-foreground">
              Appearance
            </p>
            <div
              role="radiogroup"
              aria-label="Appearance"
              className="grid grid-cols-3 gap-2.5"
            >
              {MODES.map((m) => (
                <AppearanceTile
                  key={m.key}
                  mode={m.key}
                  label={m.label}
                  Icon={m.Icon}
                  accentColor={accentColor}
                  active={theme === m.key}
                  onSelect={() => {
                    if (theme !== m.key) playSound("pin");
                    setTheme(m.key);
                  }}
                />
              ))}
            </div>
          </section>

          {/* Accent color — grouped presets + custom */}
          <section>
            <p className="mb-2.5 text-[12px] font-medium text-foreground">
              Accent color
            </p>
            <div className="flex flex-col gap-3.5">
              {ACCENT_GROUPS.map((group) => (
                <div key={group.name}>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    {group.name}
                  </p>
                  <div
                    role="radiogroup"
                    aria-label={`${group.name} accents`}
                    className="flex flex-wrap items-center gap-2.5"
                  >
                    {group.presets.map((preset) => (
                      <Swatch
                        key={preset.id}
                        color={baseToCss(preset.base)}
                        label={preset.name}
                        active={accentId === preset.id}
                        onSelect={() => {
                          if (accentId !== preset.id) playSound("pin");
                          setPreset(preset);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Custom */}
              <div>
                <p className="mb-2 text-[11px] text-muted-foreground">Custom</p>
                <div className="flex items-center gap-2.5">
                  <CustomSwatch
                    hex={customHex}
                    active={accentId === "custom"}
                    onPick={(hex) => setCustom(hex)}
                  />
                  <span className="text-[12px] text-muted-foreground">
                    Pick any color
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Live preview — real tokens, reflects mode + accent */}
          <section>
            <p className="mb-2.5 text-[12px] font-medium text-foreground">
              Preview
            </p>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 shadow-soft-xs">
              <span className="surface-brand inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)]">
                <Check size={13} weight="bold" />
                Add task
              </span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/8 px-2.5 text-[12px] font-medium text-primary-readable">
                In progress
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span aria-hidden className="size-2.5 rounded-full bg-primary" />
                Accent
              </span>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Swatch({
  color,
  label,
  active,
  onSelect,
}: {
  color: string;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={cn(
        "focus-ring grid size-8 place-items-center rounded-full transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.9]",
        active ? "ring-2 ring-offset-2 ring-offset-popover" : "hover:scale-[1.1]"
      )}
      style={
        active
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ({ ["--tw-ring-color" as any]: color })
          : undefined
      }
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full text-white shadow-soft-xs ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: color }}
      >
        {active && <Check size={13} weight="bold" />}
      </span>
    </button>
  );
}

/** Native color input rendered as a swatch; click opens the OS picker. */
function CustomSwatch({
  hex,
  active,
  onPick,
}: {
  hex: string;
  active: boolean;
  onPick: (hex: string) => void;
}) {
  return (
    <label
      className={cn(
        "focus-within:focus-ring grid size-8 cursor-pointer place-items-center rounded-full transition-transform duration-200 ease-[var(--ease-out)] active:scale-[0.9]",
        active ? "ring-2 ring-offset-2 ring-offset-popover" : "hover:scale-[1.1]"
      )}
      style={
        active
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ({ ["--tw-ring-color" as any]: hex })
          : undefined
      }
      title="Custom color"
    >
      <input
        type="color"
        value={hex}
        onChange={(e) => onPick(e.target.value)}
        className="sr-only"
        aria-label="Custom accent color"
      />
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full text-white shadow-soft-xs ring-1 ring-inset ring-black/10"
        // Conic ring hints "any color"; the chosen hex fills the center.
        style={{
          background: active
            ? hex
            : `conic-gradient(from 0deg, oklch(0.7 0.2 20), oklch(0.8 0.2 90), oklch(0.7 0.2 150), oklch(0.7 0.2 240), oklch(0.7 0.2 320), oklch(0.7 0.2 20))`,
        }}
      >
        {active && <Check size={13} weight="bold" />}
      </span>
    </label>
  );
}

/**
 * One appearance option, rendered as a miniature of the app in that
 * mode. Preview colors are literal (not the active theme's tokens) so
 * the Light tile always looks light and the Dark tile always looks
 * dark, while the accent pill tracks the chosen accent.
 */
function AppearanceTile({
  mode,
  label,
  Icon,
  accentColor,
  active,
  onSelect,
}: {
  mode: Mode;
  label: string;
  Icon: typeof Sun;
  accentColor: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "focus-ring group relative flex flex-col items-stretch gap-2 rounded-xl border p-1.5 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.98]",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-border/70 hover:border-foreground/30"
      )}
    >
      <span
        aria-hidden
        className="relative block h-14 overflow-hidden rounded-lg"
        style={{
          background:
            mode === "dark"
              ? "oklch(0.2 0.006 250)"
              : mode === "system"
                ? "linear-gradient(110deg, oklch(1 0 0) 0 50%, oklch(0.2 0.006 250) 50% 100%)"
                : "oklch(1 0 0)",
          boxShadow: "inset 0 0 0 1px oklch(0 0 0 / 0.06)",
        }}
      >
        <span
          className="absolute inset-y-1 left-1 w-3 rounded-[3px]"
          style={{
            background:
              mode === "dark" ? "oklch(0.27 0.006 250)" : "oklch(0.96 0.004 250)",
          }}
        />
        <span
          className="absolute left-5 top-2 h-2 w-7 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="absolute left-5 top-5 h-1.5 w-9 rounded-full"
          style={{
            background:
              mode === "dark" ? "oklch(0.4 0.008 250)" : "oklch(0.85 0.006 250)",
          }}
        />
        <span
          className="absolute left-5 top-7.5 h-1.5 w-6 rounded-full"
          style={{
            background:
              mode === "dark" ? "oklch(0.4 0.008 250)" : "oklch(0.85 0.006 250)",
          }}
        />
      </span>
      <span className="flex items-center justify-center gap-1.5 pb-0.5 text-[12px] font-medium text-foreground">
        <Icon size={13} weight={active ? "fill" : "regular"} />
        {label}
      </span>
      {active && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid size-[18px] place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-popover"
        >
          <Check size={10} weight="bold" />
        </span>
      )}
    </button>
  );
}
