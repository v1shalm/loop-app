"use client";

import { useEffect, useState } from "react";
import { useUiVersion } from "@/components/ui-version-provider";
import { cn } from "@/lib/utils";

/**
 * Floating v1/v2 toggle. Pill with two segments, fixed to the bottom-left
 * corner; lifts above the mobile bottom-nav via safe-area + extra inset.
 *
 * Render once at the root (next to the toaster) so it's available on
 * every route. Mounts deferred to client to avoid hydration churn —
 * server returns nothing, the init script in <head> has already applied
 * the right class before paint.
 */
export function V2Toggle() {
  const { version, setVersion } = useUiVersion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      className="fixed left-4 z-[60] flex select-none items-center gap-0 rounded-full border border-border bg-card/95 p-0.5 shadow-lg backdrop-blur-md max-md:bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] md:bottom-4"
      role="group"
      aria-label="UI version"
    >
      <Segment
        active={version === "v1"}
        onClick={() => setVersion("v1")}
        label="V1"
      />
      <Segment
        active={version === "v2"}
        onClick={() => setVersion("v2")}
        label="V2"
      />
    </div>
  );
}

function Segment({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-[40px] rounded-full px-3 py-1 text-[11.5px] font-semibold tracking-wide transition-colors duration-150",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
