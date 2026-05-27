"use client";

import { UserPlus } from "@/components/icons";
import { useInvite } from "@/components/invite-context";

/**
 * Compact "Invite" affordance for page headers (e.g. a project), so you
 * can pull a teammate into the workspace from where you're working
 * instead of hunting through the sidebar. Opens the shared invite
 * dialog in place. (Projects are workspace-scoped, so this invites to
 * the current workspace — everyone in it sees the project.)
 */
export function InviteButton() {
  const invite = useInvite();
  return (
    <button
      type="button"
      onClick={() => invite.open()}
      className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-foreground ring-1 ring-inset ring-border/70 transition-colors hover:bg-accent/40"
    >
      <UserPlus size={14} className="text-muted-foreground" />
      <span className="max-md:hidden">Invite</span>
    </button>
  );
}
