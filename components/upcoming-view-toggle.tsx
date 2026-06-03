"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarBlank, SlidersHorizontal } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useSlidingPill } from "@/lib/use-sliding-pill";

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
  const { pillRef, setTabRef } = useSlidingPill(current === "list" ? 0 : 1);

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
      className="t-tabs inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      {/* Sliding indicator: position is measured from the active tab and
          tweened in CSS (transitions.dev tabs-sliding). */}
      <span
        ref={pillRef}
        aria-hidden
        className="t-tabs-pill rounded bg-primary/12"
      />
      <ToggleBtn
        buttonRef={setTabRef(0)}
        active={current === "list"}
        onClick={() => setView("list")}
        label="List"
      >
        <SlidersHorizontal size={11} />
      </ToggleBtn>
      <ToggleBtn
        buttonRef={setTabRef(1)}
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
  buttonRef,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        // The active fill is the sliding pill behind the row, so the
        // button itself only owns its text color (+ hover when inactive).
        "t-tab focus-ring inline-flex h-6 items-center gap-1.5 rounded px-2 text-[11px] font-medium transition-colors duration-150 ease-[var(--ease-out)]",
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {children}
      {label}
    </button>
  );
}
