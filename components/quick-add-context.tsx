"use client";

import { createContext, useContext } from "react";

type QuickAddContextValue = {
  open: () => void;
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
