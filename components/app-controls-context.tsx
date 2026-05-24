"use client";

import { createContext, useContext } from "react";

/**
 * App-level affordances that the top bar needs to render: the search
 * trigger and the current user's id (for the notifications popover to
 * query its own data).
 *
 * Why a context: the search palette state lives in AppShell, but the
 * search trigger button lives in PageHeader on every route. Passing
 * the opener through every page's props would couple every page to a
 * concern that's not page-specific. A context keeps PageHeader
 * decoupled from any single page and lets AppShell own the modal.
 */
interface AppControls {
  openSearch: () => void;
  currentUserId: string;
  /** Inbox-untriaged count, surfaced as a faint dot on the bell when > 0.
   *  Independent of the in-popover "unread" computation which is local. */
  inboxCount: number;
}

const Context = createContext<AppControls | null>(null);

export function AppControlsProvider({
  value,
  children,
}: {
  value: AppControls;
  children: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppControls(): AppControls | null {
  return useContext(Context);
}
