"use client";

import { createContext, useContext } from "react";

/**
 * Lets any surface (sidebar switcher, the "+" menu, a project header,
 * empty states) open the single invite dialog in place instead of
 * routing to /workspace/manage. Mirrors QuickAddProvider — one dialog lives
 * in AppShell, everyone else just calls open().
 */
type InviteContextValue = { open: () => void };

const InviteContext = createContext<InviteContextValue>({ open: () => {} });

export function InviteProvider({
  open,
  children,
}: InviteContextValue & { children: React.ReactNode }) {
  return (
    <InviteContext.Provider value={{ open }}>{children}</InviteContext.Provider>
  );
}

export function useInvite() {
  return useContext(InviteContext);
}
