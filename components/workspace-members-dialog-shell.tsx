"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceMembersDialog } from "@/components/workspace-members-dialog";
import type { PendingInvitation, Team, TeamMember } from "@/lib/queries";

/**
 * Thin client wrapper used by /workspace/manage. Mounts the dialog open so
 * the page reads as a modal experience; closing routes back to /workspace.
 * Keeps
 * the dialog itself a pure controlled component.
 */
export function WorkspaceMembersDialogShell({
  team,
  currentUserId,
  members,
  pendingInvites,
}: {
  team: Team | null;
  currentUserId: string;
  members: TeamMember[];
  pendingInvites: PendingInvitation[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <WorkspaceMembersDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          // Defer the navigation past the dialog's exit animation so the
          // user sees the modal collapse before the page swaps.
          setTimeout(() => router.push("/workspace"), 180);
        }
      }}
      team={team}
      currentUserId={currentUserId}
      members={members}
      pendingInvites={pendingInvites}
    />
  );
}
