"use client";

import { useState } from "react";
import { UserPlus } from "@/components/icons";
import { InviteTeammateDialog } from "@/components/invite-teammate-dialog";
import { cn } from "@/lib/utils";

/**
 * Client wrapper around the "Invite a teammate" secondary CTA so the
 * dialog can be opened inline from server-rendered empty states
 * (Inbox, Assigned-to-me, Upcoming) without bouncing through
 * /workspace/manage. Visually identical to the previous Link-styled
 * SecondaryButton — only the click behavior changes.
 */
export function InviteCTA() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.97]"
        )}
      >
        <UserPlus size={13} weight="bold" />
        Invite a teammate
      </button>
      <InviteTeammateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
