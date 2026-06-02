"use client";

import { createContext, useContext } from "react";
import type { Profile, Project } from "@/lib/queries";

interface TeamContextValue {
  members: Profile[];
  projects: Project[];
  currentUserId: string;
  /** Company-wide god mode — can approve any task, see everything. */
  isSuperadmin: boolean;
  /** Team ids the current user is a manager (approver) of. */
  managedTeamIds: string[];
}

const TeamContext = createContext<TeamContextValue>({
  members: [],
  projects: [],
  currentUserId: "",
  isSuperadmin: false,
  managedTeamIds: [],
});

export function TeamProvider({
  members,
  projects,
  currentUserId,
  isSuperadmin = false,
  managedTeamIds = [],
  children,
}: Partial<TeamContextValue> &
  Pick<TeamContextValue, "members" | "projects" | "currentUserId"> & {
    children: React.ReactNode;
  }) {
  return (
    <TeamContext.Provider
      value={{ members, projects, currentUserId, isSuperadmin, managedTeamIds }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  return useContext(TeamContext);
}

/**
 * Whether the current user can approve/finalize tasks in `teamId`:
 * superadmins always, plus managers of that specific team. Tasks with no
 * team (Inbox / personal) aren't gated — callers handle that separately.
 */
export function useCanApprove() {
  const { isSuperadmin, managedTeamIds } = useTeamContext();
  return (teamId: string | null | undefined): boolean =>
    isSuperadmin || (teamId != null && managedTeamIds.includes(teamId));
}
