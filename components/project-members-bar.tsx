"use client";

import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { Plus, X } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar } from "@/components/avatar";
import { addProjectMember, removeProjectMember } from "@/lib/actions";
import type { ProjectMember, Profile } from "@/lib/queries";

interface ProjectMembersBarProps {
  projectId: string;
  initialMembers: ProjectMember[];
  workspaceMembers: Profile[];
  currentUserId: string;
}

/**
 * The Members row on the project page. Renders the roster as a chip
 * stack, with a hover-to-remove control on each chip, plus an "add
 * member" pill that opens a popover of workspace teammates not yet in
 * the project. State is optimistic; the server actions run in the
 * background and revert on error.
 */
export function ProjectMembersBar({
  projectId,
  initialMembers,
  workspaceMembers,
  currentUserId,
}: ProjectMembersBarProps) {
  const [members, setMembers] = useState(initialMembers);
  const [, startTransition] = useTransition();

  const candidates = workspaceMembers.filter(
    (w) => !members.some((m) => m.id === w.id)
  );

  const add = (userId: string) => {
    const profile = workspaceMembers.find((w) => w.id === userId);
    if (!profile) return;
    // Optimistic insert as a 'member' chip; server may upgrade later.
    const synth: ProjectMember = {
      ...profile,
      project_role: "member",
      joined_at: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, synth]);
    startTransition(async () => {
      const res = await addProjectMember(projectId, userId);
      if (res.error) {
        sileo.error({ title: res.error });
        setMembers((prev) => prev.filter((m) => m.id !== userId));
      } else {
        sileo.success({ title: `Added ${profile.name.split(/\s+/)[0]}` });
      }
    });
  };

  const remove = (userId: string) => {
    const removed = members.find((m) => m.id === userId);
    if (!removed) return;
    setMembers((prev) => prev.filter((m) => m.id !== userId));
    startTransition(async () => {
      const res = await removeProjectMember(projectId, userId);
      if (res.error) {
        sileo.error({ title: res.error });
        setMembers((prev) => [...prev, removed]);
        return;
      }
      const first = removed.name.split(/\s+/)[0];
      sileo.success({
        title:
          removed.id === currentUserId ? "Left project" : `Removed ${first}`,
      });
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Chip stack: overlapping avatars with a per-chip remove on hover */}
      <div className="flex items-center -space-x-2">
        {members.map((m) => (
          <MemberChip
            key={m.id}
            member={m}
            isYou={m.id === currentUserId}
            onRemove={() => remove(m.id)}
          />
        ))}
      </div>

      {/* Add member */}
      <Popover>
        <PopoverTrigger
          aria-label="Add member"
          className="focus-ring grid size-[26px] place-items-center rounded-full border border-dashed border-border text-muted-foreground transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] hover:border-foreground/40 hover:text-foreground active:scale-[0.94]"
        >
          <Plus size={12} weight="bold" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[260px] gap-0 p-1">
          {candidates.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-muted-foreground">
              Everyone&apos;s already here.
            </p>
          ) : (
            <>
              <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">
                Add from workspace
              </p>
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => add(c.id)}
                  className="focus-ring flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/40"
                >
                  <Avatar
                    src={c.avatar_url}
                    initials={c.initials}
                    color={c.avatar_color}
                    size={22}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {c.name}
                  </span>
                  {c.department && (
                    <span className="shrink-0 text-[11px] text-muted-foreground/70">
                      {c.department}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MemberChip({
  member,
  isYou,
  onRemove,
}: {
  member: ProjectMember;
  isYou: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className="group relative"
      title={isYou ? `${member.name} (you)` : member.name}
    >
      <Avatar
        src={member.avatar_url}
        initials={member.initials}
        color={member.avatar_color}
        size={26}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={isYou ? "Leave project" : `Remove ${member.name}`}
        className="focus-ring absolute -bottom-0.5 -right-0.5 hidden size-[14px] place-items-center rounded-full bg-foreground text-background ring-2 ring-card transition-transform duration-150 ease-[var(--ease-out)] hover:scale-110 active:scale-90 group-hover:grid"
      >
        <X size={8} weight="bold" />
      </button>
    </div>
  );
}
