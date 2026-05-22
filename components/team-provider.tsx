"use client";

import { createContext, useContext } from "react";
import type { Profile, Project } from "@/lib/queries";

interface TeamContextValue {
  members: Profile[];
  projects: Project[];
  currentUserId: string;
}

const TeamContext = createContext<TeamContextValue>({
  members: [],
  projects: [],
  currentUserId: "",
});

export function TeamProvider({
  members,
  projects,
  currentUserId,
  children,
}: TeamContextValue & { children: React.ReactNode }) {
  return (
    <TeamContext.Provider value={{ members, projects, currentUserId }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  return useContext(TeamContext);
}
