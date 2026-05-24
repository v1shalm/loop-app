"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Shared "this task is being deleted" state.
 *
 * Why this exists: both TaskRow's own delete (more-menu → Delete task)
 * and TaskDrawer's actuallyDelete need to hide the affected row from
 * the list *immediately*, before the server delete + revalidation
 * round-trip completes. Without a shared store the drawer can't tell
 * the row "you're gone now, animate out" — the row would sit visible
 * underneath until the next revalidate (200–700ms).
 *
 * The set is keyed by task id; any TaskRow whose id is in the set
 * renders nothing (or animates out via AnimatePresence). On server
 * error the caller un-hides; on success the revalidated data no
 * longer contains the row, so the entry can be dropped from the set
 * without flicker.
 *
 * Bulk delete uses the same primitive — `hideMany` adds a batch in
 * one render cycle so the rows disappear together.
 */
interface Ctx {
  isHidden: (id: string) => boolean;
  hide: (id: string) => void;
  hideMany: (ids: string[]) => void;
  unhide: (id: string) => void;
}

const Context = createContext<Ctx | null>(null);

export function OptimisticDeletesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  const hide = useCallback((id: string) => {
    setHidden((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const hideMany = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setHidden((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const unhide = useCallback((id: string) => {
    setHidden((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);

  return (
    <Context.Provider value={{ isHidden, hide, hideMany, unhide }}>
      {children}
    </Context.Provider>
  );
}

export function useOptimisticDeletes(): Ctx {
  const ctx = useContext(Context);
  // Fall back to a no-op store when the provider isn't mounted (e.g.
  // a standalone TaskRow in Storybook). Keeps the API safe to call
  // unconditionally without forcing every consumer to defend with `?.`.
  return (
    ctx ?? {
      isHidden: () => false,
      hide: () => {},
      hideMany: () => {},
      unhide: () => {},
    }
  );
}
