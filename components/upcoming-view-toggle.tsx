"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarBlank, SlidersHorizontal } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Segmented control for /upcoming: list vs calendar. Pinned in the page
 * header. Pressing C cycles to the other view (Notion-style shortcut).
 */
export function UpcomingViewToggle({
  current,
}: {
  current: "list" | "calendar";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setView = (next: "list" | "calendar") => {
    const sp = new URLSearchParams(params.toString());
    if (next === "list") sp.delete("view");
    else sp.set("view", "calendar");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Shortcut: c toggles between list and calendar. Ignore when typing
  // in a field so we don't fight the user's task title.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      setView(current === "list" ? "calendar" : "list");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div
      role="radiogroup"
      aria-label="View"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      <ToggleBtn
        active={current === "list"}
        onClick={() => setView("list")}
        label="List"
      >
        <SlidersHorizontal size={11} />
      </ToggleBtn>
      <ToggleBtn
        active={current === "calendar"}
        onClick={() => setView("calendar")}
        label="Calendar"
      >
        <CalendarBlank size={11} />
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex h-6 items-center gap-1.5 rounded px-2 text-[11.5px] font-medium transition-colors duration-150 ease-[var(--ease-out)]",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {children}
      {label}
    </button>
  );
}
