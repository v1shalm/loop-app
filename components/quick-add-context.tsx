"use client";

import { createContext, useContext } from "react";

/** Optional seed values applied when the quick-add dialog opens.
 *  Used by the Upcoming page's per-day `+` to pre-set the due date, and
 *  by a project row's `…` menu to pre-tag the new task to that project. */
export type QuickAddDefaults = { dueAt?: Date | null; projectId?: string | null };

type QuickAddContextValue = {
  open: (defaults?: QuickAddDefaults) => void;
};

const QuickAddContext = createContext<QuickAddContextValue>({
  open: () => {},
});

export function QuickAddProvider({
  open,
  children,
}: QuickAddContextValue & { children: React.ReactNode }) {
  return (
    <QuickAddContext.Provider value={{ open }}>
      {children}
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  return useContext(QuickAddContext);
}
