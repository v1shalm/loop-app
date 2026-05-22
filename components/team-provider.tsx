"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/queries";

interface TeamContextValue {
  members: Profile[];
  currentUserId: string;
}

const TeamContext = createContext<TeamContextValue>({
  members: [],
  currentUserId: "",
});

export function TeamProvider({
  members,
  currentUserId,
  children,
}: TeamContextValue & { children: React.ReactNode }) {
  return (
    <TeamContext.Provider value={{ members, currentUserId }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  return useContext(TeamContext);
}
