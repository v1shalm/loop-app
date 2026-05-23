"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * Selection model for bulk actions on task lists.
 *
 * Two pieces of state:
 *   • `mode` — whether the user has entered selection mode. When OFF
 *     the rest of the list works normally (checkbox marks complete,
 *     row click opens the drawer). When ON, the row checkbox toggles
 *     selection and a floating action bar appears.
 *   • `ids` — Set of selected task ids.
 *
 * Why a context (vs prop drilling): the page header turns mode on/off,
 * every task row checks `mode`, and the action bar reads the full
 * selection set. Threading those through props would hit every row.
 */

interface BulkSelectionState {
  mode: boolean;
  ids: Set<string>;
  setMode: (next: boolean) => void;
  toggle: (id: string) => void;
  clear: () => void;
  selectAll: (ids: string[]) => void;
}

const Ctx = createContext<BulkSelectionState | null>(null);

export function BulkSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState(false);
  const [ids, setIds] = useState<Set<string>>(new Set());

  const setMode = useCallback((next: boolean) => {
    setModeState(next);
    if (!next) setIds(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setIds(new Set()), []);

  const selectAll = useCallback((all: string[]) => {
    setIds(new Set(all));
  }, []);

  const value = useMemo(
    () => ({ mode, ids, setMode, toggle, clear, selectAll }),
    [mode, ids, setMode, toggle, clear, selectAll]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBulkSelection(): BulkSelectionState {
  const v = useContext(Ctx);
  if (!v) {
    // Safe fallback so components mounted outside a provider don't
    // crash. They just see "no selection mode".
    return {
      mode: false,
      ids: new Set(),
      setMode: () => {},
      toggle: () => {},
      clear: () => {},
      selectAll: () => {},
    };
  }
  return v;
}
